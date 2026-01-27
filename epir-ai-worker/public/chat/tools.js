import { ShopifyMcpClient } from './shopify-mcp-client.ts';

const mcpClient = new ShopifyMcpClient();

export const tools = {
  async get_stone_expertise(stone_name) {
    return await mcpClient.callTool('get_stone_expertise', { stone: stone_name });
  },

  async search_products(filters = {}) {
    const params = { ...filters };
    if (!params.sortKey) {
      params.sortKey = 'BEST_SELLING';
    }
    return await mcpClient.callTool('search_products', params);
  },

  async get_collection_story(collection_handle) {
    return await mcpClient.callTool('get_collection_story', { collection_handle });
  }
};
