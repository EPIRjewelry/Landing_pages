export class ShopifyMcpClient {
  constructor() {
    this.endpoint = '/api/mcp';
    this.maxRetries = 3;
  }

  async callTool(toolName, params) {
    const payload = {
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: toolName,
      params
    };

    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error.message || 'RPC error');
        }

        return data.result;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
      }
    }

    console.warn('MCP call failed:', lastError);
    return { error: 'Przepraszam, nie mogę teraz odpowiedzieć' };
  }
}
