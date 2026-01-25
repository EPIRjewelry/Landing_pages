/**
 * INTELLIGENT LANDING PAGE PROXY
 * Wstrzykuje widget i personalizuje treść.
 */

export const LandingPageHandler = {
  async serve(request, env, ctx) {
    const url = new URL(request.url);

    // Prosty routing do plików statycznych (np. /lato2025 -> lato2025.html)
    // Zakładamy, że pliki leżą w folderze public/landings/ w projekcie Pages
    let pageName = url.pathname.replace(/^\/+/, '').replace(/\/+$/, '') || 'index';
    if (pageName.includes('.')) pageName = 'index'; // Security fallback

    // W środowisku Workers assets są dostępne pod env.ASSETS (gdy zintegrowane z Pages)
    // Jeśli używasz czystego Workera, tutaj musiałbyś fetchować z R2 lub zewnętrznego URL
    // Poniższa wersja zakłada deployment jako Cloudflare Pages Function lub Worker z Asset Binding

    // Symulacja pobrania assetu (w prawdziwym Workerze: env.ASSETS.fetch)
    // Tutaj fallback: jeśli nie mamy env.ASSETS, zwracamy placeholder
    let response;
    if (env.ASSETS) {
      try {
        const assetUrl = new URL(`/landings/${pageName}.html`, request.url);
        response = await env.ASSETS.fetch(new Request(assetUrl, request));
      } catch (e) {
        return new Response('Błąd pobierania Landing Page', { status: 500 });
      }
    } else {
      // Fallback dla deweloperki
      response = new Response(`<html><body><h1>Landing: ${pageName}</h1></body></html>`, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    if (!response || !response.ok) return new Response('Not Found', { status: 404 });

    // Wstrzykiwanie Widgetu
    return new HTMLRewriter().on('body', new ChatInjector(url)).transform(response);
  }
};

class ChatInjector {
  constructor(url) {
    this.url = url;
  }
  element(element) {
    const campaign = this.url.searchParams.get('utm_campaign') || 'direct';
    element.append(
      `
      <script>
        window.EPIR_AI_CONFIG = {
          mode: 'landing',
          apiUrl: '/api/chat/ws',
          context: { campaign: '${campaign}' }
        };
      </script>
      <script src="/assets/assistant.js" defer></script>
      <link rel="stylesheet" href="/assets/assistant.css">
      <div id="epir-ai-root"></div>
    `,
      { html: true }
    );
  }
}
