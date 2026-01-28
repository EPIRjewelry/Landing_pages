import {register} from "@shopify/web-pixels-extension";

register(async ({ analytics, browser, init }) => {
    const customerId = init?.data?.customer?.id ?? null;
    
    let sessionId: string | null = null;
    try {
      sessionId = await browser.sessionStorage.getItem('_epir_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await browser.sessionStorage.setItem('_epir_session_id', sessionId);
      }
    } catch (e) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    
    // Endpoint nowego Workera
    const WORKER_URL = 'https://epir-ai-worker.krzysztofdzugaj.workers.dev/api/pixel';

    async function sendPixelEvent(eventType: string, eventData: unknown) {
      try {
        const response = await fetch(WORKER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            type: eventType, 
            sessionId,
            customerId,
            data: eventData,
            url: typeof window !== 'undefined' ? window.location.href : ''
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result && result.activate_chat) {
            window.dispatchEvent(new CustomEvent('epir:activate-chat', {
              detail: { reason: result.reason }
            }));
          }
        }
      } catch (err) {
        console.warn('[EPIR Pixel] Send failed:', err);
      }
    }

    analytics.subscribe('page_viewed', (event) => sendPixelEvent('page_viewed', event));
    analytics.subscribe('product_viewed', (event) => sendPixelEvent('product_viewed', event));
    analytics.subscribe('cart_updated', (event) => sendPixelEvent('cart_updated', event));
    analytics.subscribe('checkout_started', (event) => sendPixelEvent('checkout_started', event));
});
