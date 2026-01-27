/**
 * EPIR AI PLATFORM v3 - UNIFIED GATEWAY
 * Główny router kierujący ruch do Czatbota, Analityki i Landing Pages.
 */

import { ChatSession } from './chat/session.js';
import { AnalyticsIngestor } from './analytics/ingestor.js';
import { LandingPageHandler } from './landing/handler.js';
import { handleMcpProxy } from './mcp-proxy.ts';
import { RateLimiterDO } from './rate-limiter.ts';
import { SessionDO } from './SessionDO.ts';

// Eksport Durable Object jest wymagany przez Cloudflare, aby środowisko mogło go powiązać z klasą w wrangler.toml
export { ChatSession, RateLimiterDO, SessionDO };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/mcp') {
      return handleMcpProxy(request, env);
    }

    if (path === '/api/analytics') {
      return handleAnalytics(request, env);
    }

    // Debug helpers for local testing: GET/POST session DO
    if (path === '/api/session/get' || path === '/api/session/flush') {
      const sessionId = request.headers.get('X-Session-ID') || crypto.randomUUID();
      const doId = env.SESSION.idFromName(sessionId);
      const stub = env.SESSION.get(doId);

      if (path === '/api/session/get') {
        const resp = await stub.fetch('https://session/get');
        const body = await resp.text();
        return new Response(body, { status: resp.status, headers: { 'Content-Type': 'application/json' } });
      }

      if (path === '/api/session/flush') {
        const resp = await stub.fetch('https://session/flush', { method: 'POST' });
        const body = await resp.text();
        return new Response(body, { status: resp.status, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // --- 1. CZAT (WebSocket) ---
    // Obsługa połączeń z widgetu
    if (path === '/api/chat/ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }

      // Tworzymy sesję (lub wznawiamy na podstawie ID w parametrze)
      // W produkcji warto dodać tu walidację tokenu sesji
      // Durable Objects wymagają ID. Tutaj generujemy nowe unikalne ID dla każdej sesji,
      // ale w praktyce (np. dla utrzymania ciągłości rozmowy) ID powinno być przekazywane z klienta (np. w query param).
      let id;
      const sessionId = url.searchParams.get('sessionId');
      if (sessionId) {
        // Próba odzyskania sesji (uważaj: idFromString rzuca błąd dla nieprawidłowych stringów)
        try {
          id = env.CHAT_SESSIONS.idFromString(sessionId);
        } catch (e) {
          id = env.CHAT_SESSIONS.newUniqueId();
        }
      } else {
        id = env.CHAT_SESSIONS.newUniqueId();
      }

      const stub = env.CHAT_SESSIONS.get(id);
      return stub.fetch(request);
    }

    // --- 2. ANALITYKA (Pixel) ---
    // Endpoint dla tracking.js
    if (path === '/api/pixel') {
      if (request.method === 'OPTIONS') {
        // Obsługa CORS dla preflight request
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
      }

      if (request.method === 'POST') {
        // Przetwarzanie w tle (nie blokuje odpowiedzi)
        ctx.waitUntil(AnalyticsIngestor.handle(request, env));

        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // --- 3. LANDING PAGES (Proxy) ---
    // Obsługa stron promocyjnych (np. epir.pl/lato2025)
    // Jeśli ścieżka nie jest API, próbujemy obsłużyć jako Landing Page
    if (!path.startsWith('/api')) {
      const response = await LandingPageHandler.serve(request, env, ctx);
      const headers = new Headers(response.headers);
      headers.set(
        'Content-Security-Policy',
        [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "connect-src 'self'",
          "img-src 'self' https://cdn.shopify.com data:",
          "font-src 'self' data:"
        ].join('; ')
      );
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('X-Frame-Options', 'SAMEORIGIN');
      return new Response(response.body, {
        status: response.status,
        headers
      });
    }

    // --- 4. ASSETY STATYCZNE (Fallback) ---
    // Jeśli LandingPageHandler nie obsłużył (np. zwrócił 404 dla pliku .css),
    // a mamy binding do assets (Cloudflare Pages), próbujemy pobrać plik bezpośrednio.
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    // --- 5. FALLBACK OSTATECZNY ---
    return new Response('EPIR AI Worker: Endpoint not found', { status: 404 });
  }
};

function getSessionId(request) {
  const headerId = request.headers.get('X-Session-ID');
  if (headerId) return headerId;

  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/epir_session_id=([^;]+)/);
  if (match) return match[1];

  return crypto.randomUUID();
}

function withCors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID'
  };
}

async function handleAnalytics(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = new Set([
    'https://epirbizuteria.pl',
    'https://epir-ai-worker.krzysztofdzugaj.workers.dev'
  ]);
  const corsOrigin = allowedOrigins.has(origin) ? origin : 'null';

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: withCors(corsOrigin) });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: withCors(corsOrigin) });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${env.WEB_PIXEL_SECRET}`) {
    return new Response('Unauthorized', { status: 401, headers: withCors(corsOrigin) });
  }

  const data = await request.json();
  const sessionId = getSessionId(request);
  const doId = env.SESSION.idFromName(sessionId);
  const doStub = env.SESSION.get(doId);

  await doStub.fetch('https://session/update', {
    method: 'POST',
    body: JSON.stringify({
      type: data.event_type,
      ...data
    })
  });

  return new Response(JSON.stringify({ ok: true, session_id: sessionId }), {
    headers: {
      'Content-Type': 'application/json',
      ...withCors(corsOrigin)
    }
  });
}
