import { ShopifyProxyHandler } from './handlers/ShopifyProxyHandler';

const ALLOWED_ORIGINS = [
  'https://epirbizuteria.pl',
  'https://epir-ai-worker.krzysztofdzugaj.workers.dev'
];

function withCors(origin, headers = {}) {
  return {
    ...headers,
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

async function checkRateLimit(env, request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const id = env.RATE_LIMITER.idFromName(ip);
  const stub = env.RATE_LIMITER.get(id);
  const response = await stub.fetch('https://rate-limiter/check', {
    method: 'POST',
    body: JSON.stringify({ tokens: 1 })
  });
  return response.ok;
}

export async function handleMcpProxy(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return new Response('Forbidden', { status: 403 });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: withCors(origin) });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: withCors(origin) });
  }

  const allowed = await checkRateLimit(env, request);
  if (!allowed) {
    return new Response('Rate limit exceeded', { status: 429, headers: withCors(origin) });
  }

  const handler = new ShopifyProxyHandler(env);
  const response = await handler.handle(request);
  const responseHeaders = new Headers(response.headers);
  Object.entries(withCors(origin)).forEach(([key, value]) => responseHeaders.set(key, value));
  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders
  });
}
