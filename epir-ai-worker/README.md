# epir-ai-worker

Brief notes (Winter 2026 / Renaissance MCP)

- This worker proxies the agent's tool calls to Shopify MCP endpoint:
  `https://{SHOPIFY_STORE_URL}/api/mcp`.
- No Shopify admin tokens are required in the worker's environment.
- Cart operations require a customer session token (passed as `Authorization: Bearer <token>` or `X-Shopify-Session-Token`).

Quick integration test:

```bash
# run the integration script (requires node 18+)
npm run test:integration
```

If you want, add more integration tests or CI steps to validate MCP responses.