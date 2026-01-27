import { CacheManager } from './CacheManager';

const JSONRPC_ERROR = {
  PARSE_ERROR: { code: -32700, message: 'Parse error' },
  INVALID_REQUEST: { code: -32600, message: 'Invalid Request' },
  METHOD_NOT_FOUND: { code: -32601, message: 'Method not found' },
  INVALID_PARAMS: { code: -32602, message: 'Invalid params' },
  INTERNAL_ERROR: { code: -32603, message: 'Internal error' }
};

const ALLOWED_METHODS = new Set([
  'get_stone_expertise',
  'search_products',
  'get_collection_story'
]);

const ALLOWED_FILTERS = new Set([
  'occasion_type',
  'main_stone',
  'metal_type',
  'design_style'
]);

const CACHE_KEYS = {
  stone: (name) => `v1:stone_profile:${String(name || '').toLowerCase()}`,
  collection: (handle) => `v1:collection_enhanced:${String(handle || '').toLowerCase()}`
};

const TTL = {
  stone: 24 * 60 * 60,
  collection: 60 * 60
};

function jsonRpcResponse(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, error) {
  return { jsonrpc: '2.0', id, error };
}

function sanitizeString(input) {
  return String(input || '').trim();
}

function sanitizeSearchParams(params = {}) {
  const sanitized = {};
  for (const [key, value] of Object.entries(params)) {
    if (!ALLOWED_FILTERS.has(key)) continue;
    if (typeof value !== 'string' || value.trim().length === 0) continue;
    sanitized[key] = sanitizeString(value).replace(/[^a-zA-Z0-9\s\-ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, '');
  }
  return sanitized;
}

function buildProductQuery(filters) {
  const terms = [];
  for (const [key, value] of Object.entries(filters)) {
    terms.push(`metafield:custom.${key}:${value}`);
  }
  return terms.join(' AND ');
}

function normalizeHandle(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function normalizeShopDomain(value) {
  return String(value || '')
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
}

async function graphQlRequest(env, query, variables) {
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
  constructor(env) {
    this.env = env;
    this.cacheManager = new CacheManager();
  }

  async handle(request) {
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

    const { id, method, params = {} } = payload;
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

  async getStoneExpertise(params, request, start) {
    const stone = sanitizeString(params.stone || params.stone_name);
    if (!stone) {
      throw new Error('Missing stone');
    }

    const handle = normalizeHandle(stone);
    const cacheKey = CACHE_KEYS.stone(handle);
    const fetcher = async () => {
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

  async getCollectionStory(params, request, start) {
    const collectionHandle = normalizeHandle(params.collection_handle || params.collection_name);
    if (!collectionHandle) {
      throw new Error('Missing collection handle');
    }

    const cacheKey = CACHE_KEYS.collection(collectionHandle);
    const fetcher = async () => {
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

  async searchProducts(params, request, start) {
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

  logStructured(request, toolName, cacheHit, start) {
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

  logRateLimit(response) {
    const apiCallLimit = response.headers.get('X-Shopify-Shop-Api-Call-Limit');
    if (!apiCallLimit) return;
    const [used, total] = apiCallLimit.split('/').map(Number);
    if (Number.isFinite(used) && Number.isFinite(total) && used / total > 0.8) {
      console.warn(`Approaching Shopify rate limit: ${used}/${total}`);
    }
  }
}
