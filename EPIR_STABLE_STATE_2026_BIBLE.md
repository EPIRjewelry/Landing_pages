# EPIR ASYSTENT - STABLE STATE BIBLE 2026
Data: 28.01.2026
Wersja: Phoenix Monorepo / Cloudflare Native

## I. PRZYKAZANIA ARCHITEKTURY (COMMANDMENTS)

1.  **ZERO SEKRETÓW W KODZIE**
    *   Plik `wrangler.toml` jest publiczny i czysty.
    *   ŻADNYCH kluczy API, haseł czy tokenów w plikach konfiguracyjnych.
    *   Wszystkie sekrety (np. `SHOPIFY_ADMIN_TOKEN`) żyją wyłącznie w Cloudflare Encrypted Secrets (`npx wrangler secret put`).

2.  **JEDEN HANDLER, JEDNA PRAWDA**
    *   `ShopifyProxyHandler.ts` jest jedynym punktem dostępu Agenta do Shopify.
    *   Nie twórz nowych "pomocników" na boku. Rozszerzaj Proxy.
    *   Używamy `SHOPIFY_ADMIN_TOKEN` jako głównego klucza do bramy (Admin API), chyba że specyfika UX wymusi inaczej.

3.  **MONOREPO STRUCTURE**
    *   `d:\Landing_pages` to root.
    *   `epir-ai-worker` to mózg operacji (Cloudflare Worker).
    *   `epir-ai` (Shopify App) jest sub-modułem workspace.
    *   Zależności zarządzane przez `npm workspaces`.

4.  **BRAMA JEST OTWARTA (DLA ADMINA)**
    *   Dashboard `/admin/dashboard` nie ma hardcodowanego hasła w kodzie.
    *   Bezpieczeństwo opiera się na dostępie do infrastruktury Cloudflare, a nie na `if (password == "123")` w JS.

## II. MCP - MODEL CONTEXT PROTOCOL

Agent posiada następujące narzędzia (Tools):

| Narzędzie | Opis |
|-----------|------|
| `get_stone_expertise` | Wiedza ekspercka o kamieniach (Metaobjects) |
| `get_collection_story` | Storytelling kolekcji (Metaobjects) |
| `search_products` | Wyszukiwanie semantyczne/admin produktów |
| `get_catalog` | Przeglądanie katalogu |
| `get_cart` | Wgląd w koszyk (z użyciem Admin API/Proxy) |
| `add_item_to_cart` | Dodawanie do koszyka (Backend mutation) |
| `remove_item_from_cart` | Usuwanie z koszyka |

## III. STAN WDROŻENIA (DEPLOYMENT STATE)

*   **URL**: `https://epir-ai-platform-v3.krzysztofdzugaj.workers.dev`
*   **Env**: Production
*   **Wrangler**: Sanitized (No [vars] secrets)
*   **Worker**: Simplified (No Auth Checks for Dashboard)

## IV. PROCEDURA AKTUALIZACJI

1.  Wprowadź zmiany w `epir-ai-worker/src`.
2.  Sprawdź `wrangler.toml` (czy nie dodałeś sekretów przypadkiem!).
3.  `npx wrangler deploy`
4.  Git Commit & Push.

---
*Niech ta konfiguracja służy jako fundament pod ekspansję 2026. Amen.*
