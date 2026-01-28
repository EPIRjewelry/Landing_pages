const WORKER_URL = process.env.WORKER_URL || 'https://epir-ai-platform-v3.krzysztofdzugaj.workers.dev/api/mcp';

async function run() {
  console.log('Testing MCP proxy via Worker:', WORKER_URL);

  const tests = [
    { id: 1, method: 'get_product_catalog', params: { limit: 3 } },
    { id: 2, method: 'search_shop_catalog', params: { query: 'ring', limit: 10 } },
    { id: 3, method: 'idt', params: {} },
    { id: 4, method: 'update_cart', params: { cartId: 'fake-cart', lines: [{ id: 'line-1', quantity: 2 }] } }
  ];

  for (const t of tests) {
    const payload = { jsonrpc: '2.0', id: t.id, method: t.method, params: t.params };
    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Origin': 'https://epirbizuteria.pl' },
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      console.log('\nTest:', t.method);
      console.log('Status:', res.status);
      console.log('Response:', text);
    } catch (err) {
      console.error('Request failed for', t.method, err);
    }
  }
}

run();
