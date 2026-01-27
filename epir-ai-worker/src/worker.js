/**
 * EPIR AI PLATFORM v3 - UNIFIED GATEWAY
 * Główny router kierujący ruch do Czatbota, Analityki i Landing Pages.
 */

import { ChatSession } from './chat/session.js';
import { AnalyticsIngestor } from './analytics/ingestor.js';
import { AnalyticsService } from './analytics/service.js';
import { LandingPageHandler } from './landing/handler.js';
import { handleMcpProxy } from './mcp-proxy.ts';
import { RateLimiterDO } from './rate-limiter.ts';
import { SessionDO } from './SessionDO.ts';
// Import HTML for dashboard
import dashboardHtml from './analytics/dashboard.html';

// Eksport Durable Object jest wymagany przez Cloudflare, aby środowisko mogło go powiązać z klasą w wrangler.toml
export { ChatSession, RateLimiterDO, SessionDO };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- 0. DASHBOARD (Admin) ---
    if (path === '/admin/dashboard') {
        const key = url.searchParams.get('key');
        if (key !== env.ADMIN_SECRET) {
             return new Response('Unauthorized', { status: 401 });
        }
        return new Response(dashboardHtml, {
             headers: { 'Content-Type': 'text/html' }
        });
    }

    if (path === '/admin/api/leads') {
        const key = request.headers.get('X-Admin-Key');
        if (key !== env.ADMIN_SECRET) {
             return new Response('Unauthorized', { status: 401 });
        }
        const service = new AnalyticsService(env.DB);
        const leads = await service.getHotLeads();
        const stats = await service.getDailyStats();
        
        return new Response(JSON.stringify({ leads, stats }), {
             headers: { 'Content-Type': 'application/json' }
        });
    }

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
  // CORS Handling (Permissive for Analytics)
  if (request.method === 'OPTIONS') {
    return new Response(null, { 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  // 1. Odbiór danych (zakładamy standard Shopify Pixel Payload)
  let payload;
  try {
    payload = await request.json();
  } catch(e) {
    return new Response('Invalid JSON', { status: 400 });
  }

  // Wyciągamy kluczowe identyfikatory
  // Shopify Pixels wysyłają clientId w głównym obiekcie
  const clientId = payload.clientId || payload.client_id;
  const eventName = payload.name || payload.type || 'unknown_event';
  
  // Jeśli brak clientId, traktujemy event jako anonimowy, ale zapisujemy
  const effectiveSessionId = clientId || 'anonymous';

  // 2. Lookup w D1: Czy ten clientId ma aktywną sesję DO?
  let linkedSessionId = null;
  if (clientId) {
    try {
      // Szybki odczyt z tabeli mapującej
      const mapping = await env.DB.prepare(
        'SELECT session_id FROM customer_sessions WHERE client_id = ?'
      ).bind(clientId).first();
      
      if (mapping) {
        linkedSessionId = mapping.session_id;
      }
    } catch (e) {
      console.error('Mapping Lookup Error:', e);
    }
  }

  // 3. Logika zapisu i przekierowania
  
  // A) Zawsze zapisz do "Cold Store" (D1 Events) dla BigQuery
  // Używamy linkedSessionId jeśli jest (żeby spiąć historię), w przeciwnym razie clientId
  const storageId = linkedSessionId || effectiveSessionId;
  const eventPayload = JSON.stringify(payload);
  
  // Fire-and-forget insert (waitUntil)
  env.DB.prepare(
    `INSERT INTO events (session_id, type, payload) VALUES (?, ?, ?)`
  ).bind(storageId, eventName, eventPayload).run().catch(err => console.error('D1 Insert Error', err));


  // B) Jeśli znaleziono aktywną sesję DO -> Wyślij sygnał (Hot Path)
  if (linkedSessionId) {
    try {
      const id = env.CHAT_SESSIONS.idFromString(linkedSessionId);
      const stub = env.CHAT_SESSIONS.get(id);
      
      // Asynchroniczne powiadomienie DO
      stub.fetch('https://fake-host/internal/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: eventName, payload: payload })
      });
    } catch (e) {
      console.error('DO Signal Error:', e);
    }
  }

  // Odpowiedź 200 OK (szybka)
  return new Response(JSON.stringify({ received: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*' 
    }
  });
}


