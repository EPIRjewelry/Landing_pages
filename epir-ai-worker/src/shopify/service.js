export class ShopifyService {
  constructor(env) {
    this.env = env;
    this.storeUrl = env.SHOPIFY_STORE_URL;
    this.apiVersion = env.SHOPIFY_API_VERSION;
    this.token = env.SHOPIFY_ADMIN_TOKEN;

    if (!this.storeUrl || !this.apiVersion) {
      throw new Error('Missing Shopify configuration: SHOPIFY_STORE_URL or SHOPIFY_API_VERSION');
    }
    if (!this.token) {
      throw new Error('Missing Shopify admin token: SHOPIFY_ADMIN_TOKEN');
    }

    this.endpoint = `https://${this.storeUrl}/admin/api/${this.apiVersion}/graphql.json`;
  }

  async graphql(query, variables = {}) {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.token
      },
      body: JSON.stringify({ query, variables })
    });

    const payload = await response.json();

    if (!response.ok || payload.errors) {
      const details = payload.errors?.map((err) => err.message).join('; ');
      const status = response.status ? `${response.status} ${response.statusText}` : 'Unknown status';
      throw new Error(`Shopify GraphQL error (${status}): ${details || 'No error details'}`);
    }

    return payload.data;
  }

  normalizeHandle(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  async getStoneExpertise(stoneName) {
    const handle = this.normalizeHandle(stoneName);

    const query = `
      query GetStoneProfile($handle: String!) {
        metaobjectByHandle(handle: { type: "stone_profile", handle: $handle }) {
          fields { key value }
        }
      }
    `;

    const data = await this.graphql(query, { handle });
    const fields = data?.metaobjectByHandle?.fields || [];
    const map = Object.fromEntries(fields.map((field) => [field.key, field.value]));

    return {
      hardness: map.hardness || null,
      mythology: map.mythology || null,
      care_instructions: map.care_instructions || null
    };
  }

  async searchGranularProducts(filters = {}) {
    const terms = [];

    if (filters.main_stone) {
      terms.push(`metafield:custom.main_stone:${filters.main_stone}`);
    }
    if (filters.metal_type) {
      terms.push(`metafield:custom.metal_type:${filters.metal_type}`);
    }
    if (filters.canonical_parent) {
      terms.push(`metafield:custom.canonical_parent:${filters.canonical_parent}`);
    }

    const query = `
      query SearchGranularProducts($q: String!) {
        products(first: 20, query: $q) {
          edges {
            node {
              id
              title
              handle
              productType
            }
          }
        }
      }
    `;

    const q = terms.join(' AND ');
    const data = await this.graphql(query, { q });

    return data?.products?.edges?.map((edge) => edge.node) || [];
  }

  async matchSetItems(productId) {
    const query = `
      query GetSetReference($id: ID!) {
        product(id: $id) {
          metafield(namespace: "custom", key: "set_reference") {
            value
          }
        }
      }
    `;

    const data = await this.graphql(query, { id: productId });
    const setReference = data?.product?.metafield?.value;

    if (!setReference) {
      return [];
    }

    const searchQuery = `
      query SearchSetItems($q: String!) {
        products(first: 20, query: $q) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
      }
    `;

    const q = `metafield:custom.set_reference:${setReference}`;
    const searchData = await this.graphql(searchQuery, { q });

    return searchData?.products?.edges?.map((edge) => edge.node) || [];
  }

  async getCollectionStory(collectionName) {
    const handle = this.normalizeHandle(collectionName);

    const query = `
      query GetCollectionEnhanced($handle: String!) {
        metaobjectByHandle(handle: { type: "collection_enhanced", handle: $handle }) {
          fields { key value }
        }
      }
    `;

    const data = await this.graphql(query, { handle });
    const fields = data?.metaobjectByHandle?.fields || [];
    const map = Object.fromEntries(fields.map((field) => [field.key, field.value]));

    return {
      philosophy: map.philosophy || null
    };
  }
}
