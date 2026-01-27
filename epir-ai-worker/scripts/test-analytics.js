/*
  Usage:
    NODE_ENV=development node scripts/test-analytics.js
  Ensure wrangler dev is running at http://localhost:8787
*/

const fetch = global.fetch || require('node-fetch');

const ORIGIN = 'http://localhost:8787';
const ENDPOINT = `${ORIGIN}/api/analytics`;
const SECRET = process.env.WEB_PIXEL_SECRET || 'pixel_secret_xxx';

async function sendPixel(sessionId, productId, mainStone) {
  const payload = {
    event_type: 'pixel_event',
    event: 'product_viewed',
    product_id: productId,
    main_stone: mainStone
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
  console.log('sent pixel', sessionId, productId, res.status, data);
}

async function main() {
  const sessionId = process.argv[2] || `test-session-${Date.now()}`;
  console.log('Using session id:', sessionId);

  await sendPixel(sessionId, 'gid://shopify/Product/111', 'ametyst');
  await sendPixel(sessionId, 'gid://shopify/Product/222', 'szafir');
  await sendPixel(sessionId, 'gid://shopify/Product/333', 'ametyst');
}

main().catch((e) => { console.error(e); process.exit(1); });
