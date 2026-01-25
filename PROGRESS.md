# 📍 STAN PROJEKTU EPIR-AI-WORKER

**Data aktualizacji:** 2026-01-25  
**Repozytorium:** https://github.com/EPIRjewelry/Landing_pages  
**Branch:** `main`

---

## ✅ CO JEST GOTOWE I WYPCHNIĘTE

### Struktura katalogów `/epir-ai-worker`:
```
/epir-ai-worker
├── wrangler.toml          # Konfiguracja Cloudflare (D1, AI, Durable Objects)
├── src
│   ├── worker.js          # Gateway (Router ruchu)
│   ├── chat
│   │   ├── session.js     # Mózg (Durable Object + Groq + Tool Loop)
│   │   └── tools.js       # Definicje narzędzi MCP (JSON Schema)
│   ├── shopify
│   │   └── service.js     # Ręce (GraphQL Service, Metafields logic)
│   ├── analytics
│   │   └── ingestor.js    # Analityka (Fire-and-forget do D1)
│   └── landing
│       └── handler.js     # Inteligentne Proxy dla Landing Page
└── public
    └── assets             # Widget JS (do uzupełnienia)
```

### Pliki zaimplementowane:
- [x] `wrangler.toml` – bindingi do AI, D1, Durable Objects
- [x] `src/worker.js` – routing: czat, analityka, landing, assety
- [x] `src/chat/session.js` – ChatSession (Durable Object, Groq, WebSocket, Tool Loop)
- [x] `src/chat/tools.js` – 4 narzędzia MCP (get_stone_expertise, search_granular_products, match_set_items, get_collection_story)
- [x] `src/shopify/service.js` – ShopifyService (GraphQL, metaobjects, metafields)
- [x] `src/analytics/ingestor.js` – zapis zdarzeń do D1
- [x] `src/landing/handler.js` – proxy landing pages + wstrzykiwanie widgetu AI
- [x] `COPILOT_MASTER_PLAN.md` – specyfikacja projektu

---

## 🔜 CO DALEJ (następne kroki)

### Priorytet 1: Dynamiczne Landing Pages (metaobjects)
1. **Utworzyć metaobject `landing_page` w Shopify Admin** z polami:
   - slug (Single line text)
   - hero_image (File)
   - headline (Single line text)
   - subheadline (Multi-line text)
   - cta_text (Single line text)
   - cta_link (URL)
   - featured_products (Product list)
   - seo_title (Single line text)
   - seo_description (Multi-line text)

2. **Rozszerzyć `ShopifyService`** – dodać metodę `getLandingPageBySlug(slug)` pobierającą metaobject przez Storefront API.

3. **Zaktualizować `landing/handler.js`** – jeśli istnieje metaobject dla sluga → renderuj dynamicznie; jeśli nie → fallback do statycznego HTML.

### Priorytet 2: Assety i testy
4. **Dodać assety widgetu** – pliki JS/CSS do `public/assets/` (assistant.js, assistant.css).
5. **Testy integracyjne** – sprawdzić całość na Cloudflare (czat, analityka, proxy).
6. **Walidacja edge-case'ów** – obsługa błędów, nieprawidłowe dane wejściowe.

### Priorytet 3: Dokumentacja i CI/CD
7. **README.md** – instrukcja uruchomienia, zmienne środowiskowe.
8. **CI/CD** – automatyczny deploy na Cloudflare Workers.

---

## 🏗️ ARCHITEKTURA HYBRYDOWA (PLAN)

```
┌─────────────────────────────────────────────────────────────┐
│                    SHOPIFY ADMIN                            │
│  Metaobject: landing_page (slug, hero, CTA, products, SEO)  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ Storefront API
┌─────────────────────────────────────────────────────────────┐
│                 CLOUDFLARE WORKER (Gateway)                 │
│  - Rozpoznaje slug → pobiera metaobject                     │
│  - Renderuje HTML (SSR) lub przekazuje do Hydrogen          │
│  - Wstrzykuje widget AI, personalizuje (UTM, kampania)      │
│  - Cache na edge                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    HYDROGEN (opcjonalnie)                   │
│  - Renderuje landing pages jako komponenty React            │
│  - Pełna kontrola nad layoutem                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 CHECKLIST PRZED DEPLOYEM

- [ ] Ustawić zmienne środowiskowe w Cloudflare:
  - `GROQ_API_KEY`
  - `SHOPIFY_ADMIN_TOKEN`
  - `SHOPIFY_STOREFRONT_TOKEN` (jeśli używasz Storefront API)
- [ ] Utworzyć bazę D1 i wstawić ID do `wrangler.toml`
- [ ] Zainstalować zależności: `npm install groq-sdk @cloudflare/ai itty-router`
- [ ] Zainstalować Wrangler: `npm install -D wrangler`
- [ ] Deploy: `npx wrangler deploy`

---

## 🔗 PRZYDATNE LINKI

- Repozytorium: https://github.com/EPIRjewelry/Landing_pages
- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Shopify Storefront API: https://shopify.dev/docs/api/storefront
- Groq SDK: https://github.com/groq/groq-typescript

---

**Ostatni commit:** `chore: pełna synchronizacja kodu epir-ai-worker`
