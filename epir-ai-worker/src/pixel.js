// Shopify Web Pixel - Client Side Tracking
// Opis: Przechwytuje zdarzenia przeglądania produktów i kolekcji, wysyłając je do EPIR AI Worker.
// Lokalizacja: Zainstaluj to w adminie Shopify jako Custom Pixel lub w extensions/my-web-pixel/src/index.js

import { register } from "@shopify/web-pixels-extension";

register(async ({ analytics, browser, settings }) => {
    
    // Configuration
    const WORKER_ENDPOINT = "https://epir-ai-worker.krzysztofdzugaj.workers.dev/api/analytics";
    
    // Helper to get or create Session ID (kinda persistent)
    // Pixels run in sandbox, localStorage access is restricted to the sandbox storage.
    // analytics.clientId is a good stable identifier provided by Shopify.
    // We will use analytics.clientId as our session_id linkage.
    
    const sendToWorker = async (type, payload) => {
        try {
            // Retrieve clientId async
           const clientId = await browser.cookie.get('_shopify_y') || 'unknown'; 
           // Or better, use the init data if available. 
           // But strictly, we should use the event data itself.
           
           // However, standard architecture uses clientId to link to server sessions.
           // Let's use the payload mapped ID.
           
           const body = {
               session_id: payload.clientId, // Map Shopify Client ID to our Session ID
               type: type,
               payload: payload
           };

           // Fire and forget (keepalive for page transitions)
           fetch(WORKER_ENDPOINT, {
               method: "POST",
               headers: {
                   "Content-Type": "application/json"
               },
               body: JSON.stringify(body),
               keepalive: true
           });
           
        } catch (e) {
            console.error("EPIR Pixel Error:", e);
        }
    };

    // 1. Subscribe to Product Viewed
    analytics.subscribe("product_viewed", (event) => {
        sendToWorker("product_viewed", {
            clientId: event.clientId,
            timestamp: event.timestamp,
            url: event.context.window.location.href,
            product_id: event.data.productVariant?.product?.id,
            total_price: event.data.productVariant?.price?.amount,
            currency: event.data.productVariant?.price?.currencyCode,
            title: event.data.productVariant?.product?.title,
            variant: event.data.productVariant?.title
        });
    });

    // 2. Subscribe to Collection Viewed
    analytics.subscribe("collection_viewed", (event) => {
        sendToWorker("collection_viewed", {
            clientId: event.clientId,
            timestamp: event.timestamp,
            url: event.context.window.location.href,
            collection_id: event.data.collection?.id,
            title: event.data.collection?.title
        });
    });

    // 3. Subscribe to Add to Cart
    analytics.subscribe("product_added_to_cart", (event) => {
        sendToWorker("product_added_to_cart", {
             clientId: event.clientId,
             timestamp: event.timestamp,
             lines: event.data.cartLine
        });
    });
    
});
