import { CacheManager } from './CacheManager';

type Env = {
  SHOPIFY_STORE_URL: string;
  SHOPIFY_API_VERSION: string;
  SHOPIFY_ADMIN_TOKEN: string;
  [key: string]: string | undefined;
};

const JSONRPC_ERROR = {
  PARSE_ERROR: { code: -32700, message: 'Parse error' },
  INVALID_REQUEST: { code: -32600, message: 'Invalid Request' },
  METHOD_NOT_FOUND: { code: -32601, message: 'Method not found' },
  INVALID_PARAMS: { code: -32602, message: 'Invalid params' },
  INTERNAL_ERROR: { code: -32603, message: 'Internal error' }
};

const ALLOWED_METHODS: Set<string> = new Set([
  'get_stone_expertise',
  'search_products',
  'get_collection_story',
  'get_catalog',
  'get_cart',
  'add_item_to_cart',
  'remove_item_from_cart'
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

async function graphQlRequest(env: Env, query: string, variables?: Record<string, any>): Promise<{ data: any; response: Response }> {
  const shopDomain = normalizeShopDomain(env.SHOPIFY_STORE_URL);
  const endpoint = `https://${shopDomain}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_TOKEN
    },
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
    try {
      let result;
      if (method === 'get_stone_expertise') {
        result = await this.getStoneExpertise(params, request, start);
      } else if (method === 'get_collection_story') {
        result = await this.getCollectionStory(params, request, start);
      } else if (method === 'search_products') {
        result = await this.searchProducts(params, request, start);
      } else if (method === 'get_catalog') {
        result = await this.getCatalog(params, request, start);
      } else if (method === 'get_cart') {
        result = await this.getCart(params, request, start);
      } else if (method === 'add_item_to_cart') {
        result = await this.addItemToCart(params, request, start);
      } else if (method === 'remove_item_from_cart') {
        result = await this.removeItemFromCart(params, request, start);
      } else {
        return new Response(JSON.stringify(jsonRpcError(id, JSONRPC_ERROR.METHOD_NOT_FOUND)), { status: 404 });
      }

      return new Response(JSON.stringify(jsonRpcResponse(id, result)), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('MCP Proxy error:', error);
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
      const query = `
        query GetStoneProfile($handle: String!) {
          metaobjectByHandle(handle: { type: "stone_profile", handle: $handle }) {
            fields { key value }
          }
        }
      `;
      const { data, response } = await graphQlRequest(this.env, query, { handle });
      this.logRateLimit(response);
      const fields = data?.metaobjectByHandle?.fields || [];
      const map = Object.fromEntries(fields.map((field) => [field.key, field.value]));
      const body = JSON.stringify({
        hardness: map.hardness || null,
        mythology: map.mythology || null,
        care_instructions: map.care_instructions || null
      });
      return new Response(body, { headers: { 'Content-Type': 'application/json' } });
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
      const query = `
        query GetCollectionEnhanced($handle: String!) {
          metaobjectByHandle(handle: { type: "collection_enhanced", handle: $handle }) {
            fields { key value }
          }
        }
      `;
      const { data, response } = await graphQlRequest(this.env, query, { handle: collectionHandle });
      this.logRateLimit(response);
      const fields = data?.metaobjectByHandle?.fields || [];
      const map = Object.fromEntries(fields.map((field) => [field.key, field.value]));
      const body = JSON.stringify({
        philosophy: map.philosophy || null
      });
      return new Response(body, { headers: { 'Content-Type': 'application/json' } });
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

    const queryString = buildProductQuery(filters);
    const sortKey = params.sortKey && typeof params.sortKey === 'string' ? params.sortKey : 'BEST_SELLING';

    const query = `
      query SearchProducts($query: String!) {
        products(first: 10, query: $query, sortKey: ${sortKey}) {
          edges {
            node {
              id
              title
              handle
              metafield(namespace: "custom", key: "main_stone") { value }
              metafield(namespace: "custom", key: "metal_type") { value }
              metafield(namespace: "custom", key: "design_style") { value }
              metafield(namespace: "custom", key: "occasion_type") { value }
            }
          }
        }
      }
    `;

    const { data, response } = await graphQlRequest(this.env, query, { query: queryString });
    this.logRateLimit(response);

    const products = data?.products?.edges?.map((edge) => edge.node) || [];
    this.logStructured(request, 'search_products', false, start);
    return products;
  }

  async getCatalog(params: Record<string, any>, request: Request, start: number): Promise<any[]> {
    // Wrapper for listing products with support for limits and simple query
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 50);
    const queryTerm = params.query ? `query: "${params.query}", ` : '';
    
    // We can re-use search logic or specialized query
    const query = `
      query GetCatalog {
        products(first: ${limit}, ${queryTerm}sortKey: BEST_SELLING) {
          edges {
            node {
              id
              title
              handle
              description
              priceRange {
                minVariantPrice { amount currencyCode }
              }
              compareAtPriceRange {
                minVariantPrice { amount currencyCode }
              }
              images(first: 1) {
                edges { node { url } }
              }
              variants(first: 10) {
                 edges {
                   node {
                     id
                     title
                     price { amount currencyCode }
                     availableForSale
                   }
                 }
              }
            }
          }
        }
      }
    `;
    
    // Uses Admin API by default as per existing search_products.
    const { data, response } = await graphQlRequest(this.env, query);
    this.logRateLimit(response);
    
    const products = data?.products?.edges?.map((edge: any) => edge.node) || [];
    this.logStructured(request, 'get_catalog', false, start);
    return products;
  }

  async getCart(params: Record<string, any>, request: Request, start: number): Promise<any> {
    const { cartId } = params;
    if (!cartId) throw new Error('Missing cartId');

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

    const { data } = await graphQlRequest(this.env, query, { cartId });
    this.logStructured(request, 'get_cart', false, start);
    return data?.cart || null;
  }

  async addItemToCart(params: Record<string, any>, request: Request, start: number): Promise<any> {
    const { cartId, lines } = params; // lines: [{ merchandiseId, quantity }]
    
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
       const { data: createData } = await graphQlRequest(this.env, createQuery, { lines });
       if (createData?.cartCreate?.userErrors?.length > 0) {
         throw new Error(createData.cartCreate.userErrors.map((e: any) => e.message).join(', '));
       }
       targetCartId = createData?.cartCreate?.cart?.id;
       this.logStructured(request, 'create_cart_implicit', false, start);
       return createData?.cartCreate?.cart;
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
        const { data } = await graphQlRequest(this.env, query, { cartId: targetCartId, lines });
        if (data?.cartLinesAdd?.userErrors?.length > 0) {
            throw new Error(data.cartLinesAdd.userErrors.map((e: any) => e.message).join(', '));
        }
        this.logStructured(request, 'add_item_to_cart', false, start);
        return data?.cartLinesAdd?.cart;
    }
  }

  async removeItemFromCart(params: Record<string, any>, request: Request, start: number): Promise<any> {
     const { cartId, lineIds } = params; // lineIds: string[]
     if (!cartId) throw new Error('Missing cartId');
     if (!lineIds || !Array.isArray(lineIds)) throw new Error('Missing lineIds array');

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

    const { data } = await graphQlRequest(this.env, query, { cartId, lineIds });
    if (data?.cartLinesRemove?.userErrors?.length > 0) {
        throw new Error(data.cartLinesRemove.userErrors.map((e: any) => e.message).join(', '));
    }
    this.logStructured(request, 'remove_item_from_cart', false, start);
    return data?.cartLinesRemove?.cart;
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
