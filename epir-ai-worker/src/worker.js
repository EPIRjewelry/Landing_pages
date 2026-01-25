/**
 * EPIR AI PLATFORM v3 - UNIFIED GATEWAY
 * Główny router kierujący ruch do Czatbota, Analityki i Landing Pages.
 */

import { ChatSession } from './chat/session.js';
import { AnalyticsIngestor } from './analytics/ingestor.js';
import { LandingPageHandler } from './landing/handler.js';

// Eksport Durable Object jest wymagany przez Cloudflare, aby środowisko mogło go powiązać z klasą w wrangler.toml
export { ChatSession };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

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
      return LandingPageHandler.serve(request, env, ctx);
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
