import { CacheManager } from './CacheManager';

type Env = {
  SHOPIFY_STORE_URL: string;
  SHOPIFY_API_VERSION?: string;
  [key: string]: string | undefined;
};

const JSONRPC_ERROR = {
  PARSE_ERROR: { code: -32700, message: 'Parse error' },
  INVALID_REQUEST: { code: -32600, message: 'Invalid Request' },
  METHOD_NOT_FOUND: { code: -32601, message: 'Method not found' },
  INVALID_PARAMS: { code: -32602, message: 'Invalid params' },
  INTERNAL_ERROR: { code: -32603, message: 'Internal error' },
  AUTH_REQUIRED: { code: -32001, message: 'Auth required (session token missing)' }
};

const ALLOWED_METHODS: Set<string> = new Set([
  'get_stone_expertise',
  'search_products',
  'search_shop_catalog',
  'get_collection_story',
  'get_catalog',
  'get_product_catalog',
  'get_cart',
  'add_item_to_cart',
  'remove_item_from_cart',
  'update_cart',
  'idt'
]);

const ALLOWED_FILTERS: Set<string> = new Set([
  'occasion_type',
  'main_stone',
  'metal_type',
  'design_style'
]);

const CACHE_KEYS = {
  stone: (name: string) => `v1:stone_profile:${String(name || '').toLowerCase()}`,
  collection: (handle: string) => `v1:collection_enhanced:${String(handle || '').toLowerCase()}`
};

const TTL = {
  stone: 24 * 60 * 60,
  collection: 60 * 60
};

const DEFAULT_API_VERSION = '2024-01';

function jsonRpcResponse(id: string | number | null, result: any): Record<string, any> {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id: string | number | null, error: { code: number; message: string }): Record<string, any> {
  return { jsonrpc: '2.0', id, error };
}

function sanitizeString(input: unknown): string {
  return String(input || '').trim();
}

function sanitizeSearchParams(params: Record<string, any> = {}): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!ALLOWED_FILTERS.has(key)) continue;
    if (typeof value !== 'string' || value.trim().length === 0) continue;
    sanitized[key] = sanitizeString(value).replace(/[^a-zA-Z0-9\s\-ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, '');
  }
  return sanitized;
}

function buildProductQuery(filters: Record<string, string>): string {
  const terms: string[] = [];
  for (const [key, value] of Object.entries(filters)) {
    terms.push(`metafield:custom.${key}:${value}`);
  }
  return terms.join(' AND ');
}

function normalizeHandle(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function normalizeShopDomain(value: string): string {
  return String(value || '')
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
}

function extractSessionToken(request: Request): string | undefined {
  const explicit = request.headers.get('X-Shopify-Session-Token');
  if (explicit) return explicit.trim();
  const auth = request.headers.get('Authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return undefined;
}

async function graphQlRequest(
  env: Env,
  query: string,
  variables?: Record<string, any>,
  sessionToken?: string
): Promise<{ data: any; response: Response }> {
  const shopDomain = normalizeShopDomain(env.SHOPIFY_STORE_URL);
  const apiVersion = env.SHOPIFY_API_VERSION || DEFAULT_API_VERSION;
  const endpoint = `https://${shopDomain}/api/${apiVersion}/graphql.json`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables })
  });

  const payload = await response.json();
  if (!response.ok || payload.errors) {
    const details = payload.errors?.map((err) => err.message).join('; ');
    const status = response.status ? `${response.status} ${response.statusText}` : 'Unknown status';
    throw new Error(`Shopify GraphQL error (${status}): ${details || 'No error details'}`);
  }

  return { data: payload.data, response };
}

async function callShopifyMcp(env: Env, method: string, params: Record<string, any> = {}, sessionToken?: string): Promise<any> {
  const shopDomain = normalizeShopDomain(env.SHOPIFY_STORE_URL);
  const endpoint = `https://${shopDomain}/api/mcp`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  const id = Math.floor(Math.random() * 1e9);
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params })
    });
  } catch (e) {
    throw new Error('MCP_ERROR:' + JSON.stringify({ code: -32003, message: e?.message || String(e || 'fetch error') }));
  }

  let payload;
  try {
    payload = await response.json();
  } catch (e) {
    throw new Error('MCP_ERROR:' + JSON.stringify({ code: -32004, message: 'invalid JSON from MCP' }));
  }

  if (!response.ok || payload.error) {
    // Throw structured error so caller can convert into JSON-RPC error payload
    const errorBody = payload?.error || { code: -32002, message: `MCP proxy error: ${response.status}` };
    throw new Error('MCP_ERROR:' + JSON.stringify(errorBody));
  }
  return payload.result;
}

export class ShopifyProxyHandler {
  env: Env;
  cacheManager: CacheManager;

  constructor(env: Env) {
    this.env = env;
    this.cacheManager = new CacheManager();
  }

  async handle(request: Request): Promise<Response> {
    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response(JSON.stringify(jsonRpcError(null, JSONRPC_ERROR.PARSE_ERROR)), { status: 400 });
    }

    if (!payload || payload.jsonrpc !== '2.0' || !payload.method) {
      return new Response(JSON.stringify(jsonRpcError(payload?.id ?? null, JSONRPC_ERROR.INVALID_REQUEST)), {
        status: 400
      });
    }

    const { id, method, params = {} } = payload as { id?: string | number | null; method?: string; params?: Record<string, any> };
    if (!ALLOWED_METHODS.has(method)) {
      return new Response(JSON.stringify(jsonRpcError(id, JSONRPC_ERROR.METHOD_NOT_FOUND)), { status: 404 });
    }

    const start = Date.now();
    const sessionToken = extractSessionToken(request);
    try {
      let result;
      if (method === 'get_stone_expertise') {
        result = await this.getStoneExpertise(params, request, start);
      } else if (method === 'get_collection_story') {
        result = await this.getCollectionStory(params, request, start);
      } else if (method === 'search_products') {
        result = await this.searchProducts(params, request, start);
      } else if (method === 'search_shop_catalog') {
        result = await this.searchShopCatalog(params, request, start);
      } else if (method === 'get_catalog') {
        result = await this.getCatalog(params, request, start);
      } else if (method === 'get_product_catalog') {
        result = await this.getProductCatalog(params, request, start);
      } else if (method === 'get_cart') {
        result = await this.getCart(params, request, start, sessionToken);
      } else if (method === 'add_item_to_cart') {
        result = await this.addItemToCart(params, request, start, sessionToken);
      } else if (method === 'remove_item_from_cart') {
        result = await this.removeItemFromCart(params, request, start, sessionToken);
      } else if (method === 'update_cart') {
        result = await this.updateCart(params, request, start, sessionToken);
      } else if (method === 'idt') {
        result = await this.idt(params, request, start, sessionToken);
      } else {
        return new Response(JSON.stringify(jsonRpcError(id, JSONRPC_ERROR.METHOD_NOT_FOUND)), { status: 404 });
      }

      return new Response(JSON.stringify(jsonRpcResponse(id, result)), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('MCP Proxy error:', error);
      const message = error instanceof Error ? error.message : String(error || 'Unknown error');
      if (message.includes('AUTH_REQUIRED')) {
        return new Response(JSON.stringify(jsonRpcError(id, JSONRPC_ERROR.AUTH_REQUIRED)), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (message.startsWith('MCP_ERROR:')) {
        try {
          const payload = JSON.parse(message.slice('MCP_ERROR:'.length));
          return new Response(JSON.stringify(jsonRpcError(id, { code: payload.code || -32002, message: payload.message || 'MCP error' })), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (e) {
          // fallthrough to internal error
        }
      }

      return new Response(JSON.stringify(jsonRpcError(id, JSONRPC_ERROR.INTERNAL_ERROR)), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async getStoneExpertise(params: Record<string, any>, request: Request, start: number): Promise<any> {
    const stone = sanitizeString(params.stone || params.stone_name);
    if (!stone) {
      throw new Error('Missing stone');
    }

    const handle = normalizeHandle(stone);
    const cacheKey = CACHE_KEYS.stone(handle);
    const fetcher = async (): Promise<Response> => {
      const result = await callShopifyMcp(this.env, 'get_stone_expertise', { stone: handle });
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
    };

    const { response, hit } = await this.cacheManager.getCached(cacheKey, fetcher, TTL.stone);
    const result = await response.json();
    this.logStructured(request, 'get_stone_expertise', hit, start);
    return result;
  }

  async getCollectionStory(params: Record<string, any>, request: Request, start: number): Promise<any> {
    const collectionHandle = normalizeHandle(params.collection_handle || params.collection_name);
    if (!collectionHandle) {
      throw new Error('Missing collection handle');
    }

    const cacheKey = CACHE_KEYS.collection(collectionHandle);
    const fetcher = async (): Promise<Response> => {
      const result = await callShopifyMcp(this.env, 'get_collection_story', { collection_handle: collectionHandle });
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
    };

    const { response, hit } = await this.cacheManager.getCached(cacheKey, fetcher, TTL.collection);
    const result = await response.json();
    this.logStructured(request, 'get_collection_story', hit, start);
    return result;
  }

  async searchProducts(params: Record<string, any>, request: Request, start: number): Promise<any[]> {
    const filters = sanitizeSearchParams(params || {});
    if (Object.keys(filters).length === 0) {
      throw new Error('Missing filters');
    }

    const filtersObj = filters;
    const sortKey = params.sortKey && typeof params.sortKey === 'string' ? params.sortKey : 'BEST_SELLING';

    const result = await callShopifyMcp(this.env, 'search_products', { filters: filtersObj, sortKey });

    this.logStructured(request, 'search_products', false, start);
    return result || [];
  }

  async getCatalog(params: Record<string, any>, request: Request, start: number): Promise<any[]> {
    // Wrapper for listing products with support for limits and simple query
    
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 50);
    const queryTerm = params.query || null;

    const result = await callShopifyMcp(this.env, 'get_catalog', { limit, query: queryTerm });
    this.logStructured(request, 'get_catalog', false, start);
    return result || [];
  }

  async getProductCatalog(params: Record<string, any>, request: Request, start: number): Promise<any[]> {
    // Public fallback implementation using the public products.json endpoint
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 250);
    const page = Math.max(Number(params.page) || 1, 1);
    const shopDomain = normalizeShopDomain(this.env.SHOPIFY_STORE_URL);
    const endpoint = `https://${shopDomain}/products.json?limit=${limit}&page=${page}`;

    let res: Response;
    try {
      res = await fetch(endpoint, { headers: { 'Accept': 'application/json' } });
    } catch (e) {
      console.error('getProductCatalog fetch failed', e);
      throw new Error('MCP_ERROR:' + JSON.stringify({ code: -32005, message: 'Failed to fetch public catalog', details: e?.message || String(e || 'fetch error') }));
    }

    // If access forbidden, retry with browser-like headers and attempt redirect host fallback
    if (res.status === 403) {
      console.warn('getProductCatalog initial fetch returned 403, retrying with browser UA');
      const browserHeaders = {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
        Referer: `https://${shopDomain}/`,
      };
      try {
        res = await fetch(endpoint, { headers: browserHeaders });
      } catch (e) {
        console.error('getProductCatalog retry fetch failed', e);
        throw new Error('MCP_ERROR:' + JSON.stringify({ code: -32005, message: 'Failed to fetch public catalog on retry', details: e?.message || String(e || 'fetch error') }));
      }
    }

    if (res.status === 403) {
      // Try following root redirect to discover custom domain
      try {
        const root = await fetch(`https://${shopDomain}/`, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
        const finalUrl = root.url || '';
        const finalHost = finalUrl ? new URL(finalUrl).host : null;
        if (finalHost && finalHost !== shopDomain) {
          const fallbackEndpoint = `https://${finalHost}/products.json?limit=${limit}&page=${page}`;
          console.warn('getProductCatalog attempting fallback to host', finalHost);
          try {
            res = await fetch(fallbackEndpoint, { headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0', Referer: `https://${finalHost}/` } });
          } catch (e) {
            console.error('getProductCatalog fallback fetch failed', e);
            throw new Error('MCP_ERROR:' + JSON.stringify({ code: -32005, message: 'Failed to fetch public catalog on fallback', details: e?.message || String(e || 'fetch error') }));
          }
        }
      } catch (e) {
        console.warn('getProductCatalog root redirect check failed', e?.message || e);
      }
    }

    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      console.error('getProductCatalog bad response', res.status, bodyText);
      throw new Error('MCP_ERROR:' + JSON.stringify({ code: -32006, message: `Public catalog returned ${res.status}`, details: bodyText }));
    }

    let payload: any;
    try {
      payload = await res.json();
    } catch (e) {
      console.error('getProductCatalog invalid JSON', e);
      throw new Error('MCP_ERROR:' + JSON.stringify({ code: -32004, message: 'Invalid JSON from public catalog' }));
    }

    const products = Array.isArray(payload.products) ? payload.products : [];
    this.logStructured(request, 'get_product_catalog', false, start);
    return products;
  }

  async searchShopCatalog(params: Record<string, any>, request: Request, start: number): Promise<any[]> {
    // Fallback semantic-like search by fetching a reasonable window of products and filtering locally
    const q = String(params.query || '').trim();
    if (!q) throw new Error('Missing query');

    const limit = Math.min(Math.max(Number(params.limit) || 50, 1), 250);
    const shopDomain = normalizeShopDomain(this.env.SHOPIFY_STORE_URL);
    const endpoint = `https://${shopDomain}/products.json?limit=${limit}`;

    let res: Response;
    try {
      res = await fetch(endpoint, { headers: { 'Accept': 'application/json' } });
    } catch (e) {
      console.error('searchShopCatalog fetch failed', e);
      throw new Error('MCP_ERROR:' + JSON.stringify({ code: -32005, message: 'Failed to fetch products for search', details: e?.message || String(e || 'fetch error') }));
    }

    // Retry with browser-like headers if forbidden and attempt redirect host fallback
    if (res.status === 403) {
      console.warn('searchShopCatalog initial fetch returned 403, retrying with browser UA');
      const browserHeaders = {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
        Referer: `https://${shopDomain}/`,
      };
      try {
        res = await fetch(endpoint, { headers: browserHeaders });
      } catch (e) {
        console.error('searchShopCatalog retry fetch failed', e);
        throw new Error('MCP_ERROR:' + JSON.stringify({ code: -32005, message: 'Failed to fetch products for search on retry', details: e?.message || String(e || 'fetch error') }));
      }
    }

    if (res.status === 403) {
      try {
        const root = await fetch(`https://${shopDomain}/`, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
        const finalUrl = root.url || '';
        const finalHost = finalUrl ? new URL(finalUrl).host : null;
        if (finalHost && finalHost !== shopDomain) {
          const fallbackEndpoint = `https://${finalHost}/products.json?limit=${limit}`;
          console.warn('searchShopCatalog attempting fallback to host', finalHost);
          try {
            res = await fetch(fallbackEndpoint, { headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0', Referer: `https://${finalHost}/` } });
          } catch (e) {
            console.error('searchShopCatalog fallback fetch failed', e);
            throw new Error('MCP_ERROR:' + JSON.stringify({ code: -32005, message: 'Failed to fetch products for search on fallback', details: e?.message || String(e || 'fetch error') }));
          }
        }
      } catch (e) {
        console.warn('searchShopCatalog root redirect check failed', e?.message || e);
      }
    }

    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      console.error('searchShopCatalog bad response', res.status, bodyText);
      throw new Error('MCP_ERROR:' + JSON.stringify({ code: -32006, message: `Products endpoint returned ${res.status}`, details: bodyText }));
    }

    let payload: any;
    try {
      payload = await res.json();
    } catch (e) {
      console.error('searchShopCatalog invalid JSON', e);
      throw new Error('MCP_ERROR:' + JSON.stringify({ code: -32004, message: 'Invalid JSON from products endpoint' }));
    }

    const products = Array.isArray(payload.products) ? payload.products : [];

    const qLower = q.toLowerCase();
    const filtered = products.filter((p: any) => {
      const title = String(p.title || '').toLowerCase();
      const handle = String(p.handle || '').toLowerCase();
      const body = String(p.body_html || '').toLowerCase();
      const tags = (p.tags || '').toString().toLowerCase();
      return title.includes(qLower) || handle.includes(qLower) || body.includes(qLower) || tags.includes(qLower);
    });

    this.logStructured(request, 'search_shop_catalog', false, start);
    return filtered;
  }

  async idt(params: Record<string, any>, request: Request, start: number, sessionToken?: string): Promise<any> {
    // Identity & Discovery Tool: returns minimal identity info based on session token
    if (!sessionToken) throw new Error('AUTH_REQUIRED');
    // For privacy, return a masked token preview and indicate authenticated
    const preview = `${sessionToken.slice(0, 8)}...${sessionToken.slice(-4)}`;
    this.logStructured(request, 'idt', false, start);
    return { authenticated: true, tokenPreview: preview };
  }

  async updateCart(params: Record<string, any>, request: Request, start: number, sessionToken?: string): Promise<any> {
    // Update quantities or replace lines in the cart -- requires auth/session
    if (!sessionToken) throw new Error('AUTH_REQUIRED');
    const { cartId, lines } = params; // lines: [{ id: lineId, quantity }]
    if (!cartId) throw new Error('Missing cartId');
    if (!Array.isArray(lines) || lines.length === 0) throw new Error('Missing lines to update');

    // Try to use MCP first (if store implements it); fallback to GraphQL via POST
    try {
      const res = await callShopifyMcp(this.env, 'update_cart', { cartId, lines }, sessionToken);
      this.logStructured(request, 'update_cart', false, start);
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e || '');
      if (msg.includes('Method not found')) {
        // Fallback to GraphQL cartLinesUpdate if possible
        const mutation = `
          mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
            cartLinesUpdate(cartId: $cartId, lines: $lines) {
              cart { id lines(first: 50) { edges { node { id quantity } } } cost { totalAmount { amount currencyCode } } }
              userErrors { field message }
            }
          }
        `;
        const variables = { cartId, lines };
        const { data } = await graphQlRequest(this.env, mutation, variables, sessionToken);
        if (data?.cartLinesUpdate?.userErrors?.length > 0) {
          throw new Error(data.cartLinesUpdate.userErrors.map((u: any) => u.message).join(', '));
        }
        this.logStructured(request, 'update_cart_fallback_graphql', false, start);
        return data.cartLinesUpdate?.cart || null;
      }
      throw e;
    }
  }

  async getCart(params: Record<string, any>, request: Request, start: number, sessionToken?: string): Promise<any> {
    const { cartId } = params;
    if (!cartId) throw new Error('Missing cartId');
    if (!sessionToken) throw new Error('AUTH_REQUIRED');

    // Trying to access Cart via Admin API might be limited. 
    // If strict Admin context is used, we might need to map this to DraftOrders or assume Admin Cart access enabled.
    const query = `
      query GetCart($cartId: ID!) {
        cart(id: $cartId) {
          id
          checkoutUrl
          cost {
            totalAmount { amount currencyCode }
            subtotalAmount { amount currencyCode }
          }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    product { title handle }
                    price { amount currencyCode }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const result = await callShopifyMcp(this.env, 'get_cart', { cartId }, sessionToken);
    this.logStructured(request, 'get_cart', false, start);
    return result || null;
  }

  async addItemToCart(params: Record<string, any>, request: Request, start: number, sessionToken?: string): Promise<any> {
    const { cartId, lines } = params; // lines: [{ merchandiseId, quantity }]
    if (!sessionToken) throw new Error('AUTH_REQUIRED');
    
    let targetCartId = cartId;

    if (!targetCartId) {
      // Create cart
       const createQuery = `
         mutation LinkCartCreate($lines: [CartLineInput!]) {
           cartCreate(input: { lines: $lines }) {
             cart { id checkoutUrl }
             userErrors { field message }
           }
         }
       `;
      const createRes = await callShopifyMcp(this.env, 'add_item_to_cart', { lines }, sessionToken);
      if (createRes?.userErrors?.length > 0) {
        throw new Error(createRes.userErrors.map((e: any) => e.message).join(', '));
      }
      targetCartId = createRes?.cart?.id;
      this.logStructured(request, 'create_cart_implicit', false, start);
      return createRes?.cart;
    } else {
        const query = `
          mutation AddToCart($cartId: ID!, $lines: [CartLineInput!]!) {
            cartLinesAdd(cartId: $cartId, lines: $lines) {
              cart {
                id
                lines(first: 50) {
                   edges { node { id quantity } }
                }
                cost { totalAmount { amount currencyCode } }
              }
              userErrors { field message }
            }
          }
        `;
        const res = await callShopifyMcp(this.env, 'add_item_to_cart', { cartId: targetCartId, lines }, sessionToken);
        if (res?.userErrors?.length > 0) {
            throw new Error(res.userErrors.map((e: any) => e.message).join(', '));
        }
        this.logStructured(request, 'add_item_to_cart', false, start);
        return res?.cart;
    }
  }

      async removeItemFromCart(params: Record<string, any>, request: Request, start: number, sessionToken?: string): Promise<any> {
     const { cartId, lineIds } = params; // lineIds: string[]
     if (!cartId) throw new Error('Missing cartId');
     if (!lineIds || !Array.isArray(lineIds)) throw new Error('Missing lineIds array');
       if (!sessionToken) throw new Error('AUTH_REQUIRED');

     const query = `
       mutation RemoveFromCart($cartId: ID!, $lineIds: [ID!]!) {
         cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
           cart {
             id
             lines(first: 50) {
                edges { node { id quantity } }
             }
             cost { totalAmount { amount currencyCode } }
           }
           userErrors { field message }
         }
       }
     `;

    const res = await callShopifyMcp(this.env, 'remove_item_from_cart', { cartId, lineIds }, sessionToken);
    if (res?.userErrors?.length > 0) {
        throw new Error(res.userErrors.map((e: any) => e.message).join(', '));
    }
    this.logStructured(request, 'remove_item_from_cart', false, start);
    return res?.cart;
  }

  logStructured(request: Request, toolName: string, cacheHit: boolean, start: number): void {
    console.log(
      JSON.stringify({
        level: 'info',
        tool: toolName,
        cache: cacheHit ? 'HIT' : 'MISS',
        latency_ms: Date.now() - start,
        ip: request.headers.get('CF-Connecting-IP'),
        user_agent: request.headers.get('User-Agent'),
        timestamp: new Date().toISOString()
      })
    );
  }

  logRateLimit(response: Response): void {
    const apiCallLimit = response.headers.get('X-Shopify-Shop-Api-Call-Limit');
    if (!apiCallLimit) return;
    const [used, total] = apiCallLimit.split('/').map(Number);
    if (Number.isFinite(used) && Number.isFinite(total) && used / total > 0.8) {
      console.warn(`Approaching Shopify rate limit: ${used}/${total}`);
    }
  }
}
