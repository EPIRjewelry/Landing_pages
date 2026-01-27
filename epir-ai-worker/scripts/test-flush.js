/*
  Usage:
    NODE_ENV=development node scripts/test-flush.js
  This script sends multiple pixel events to trigger scheduled flush (>=50 events).
*/

const fetch = global.fetch || require('node-fetch');

const ORIGIN = 'http://localhost:8787';
const ENDPOINT = `${ORIGIN}/api/analytics`;
const SECRET = process.env.WEB_PIXEL_SECRET || 'pixel_secret_xxx';

async function sendPixel(sessionId, idx) {
  const payload = {
    event_type: 'pixel_event',
    event: 'product_viewed',
    product_id: `gid://shopify/Product/${1000 + idx}`,
    main_stone: idx % 2 === 0 ? 'ametyst' : 'topaz'
  };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SECRET}`,
      'X-Session-ID': sessionId
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => null);
  console.log('sent pixel', idx, res.status, data);
}

async function main() {
  const sessionId = `flush-session-${Date.now()}`;
  for (let i = 0; i < 55; i += 1) {
    await sendPixel(sessionId, i);
    await new Promise((r) => setTimeout(r, 50));
  }
  console.log('Done sending events; wait ~30s for scheduled flush or call /session/flush manually by doing:');
  console.log(`curl -X POST http://localhost:8787/r2/session/flush -H "X-Session-ID: ${sessionId}"`);
}

main().catch((e) => { console.error(e); process.exit(1); });
