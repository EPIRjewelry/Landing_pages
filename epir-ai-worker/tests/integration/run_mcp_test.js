const WORKER_URL = process.env.WORKER_URL || 'https://epir-ai-platform-v3.krzysztofdzugaj.workers.dev/api/mcp';

async function run() {
  console.log('Testing MCP proxy via Worker:', WORKER_URL);

  const payload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'get_catalog',
    params: { limit: 3 }
  };

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://epirbizuteria.pl'
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(2);
  }
}

run();
