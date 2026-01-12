# EPIR Asystent – Strategia, architektura i praktyki wdrożeniowe (stan na 10.01.2026)

**Opis:**
To archiwum zawiera kluczowe wnioski, praktyki i rekomendacje wypracowane podczas rozwoju platformy EPIR Asystent, ze szczególnym uwzględnieniem integracji Shopify (Hydrogen, Storefront API, Admin API), architektury edge-first (Cloudflare Workers/Pages, Durable Objects), modularnych mikroserwisów, zarządzania wiedzą (RAG, Gemini, Google Workspace) oraz strategii AI/commerce.

**Powiązane raporty / Deep dives:**
- [Raport ADK: Architektura i Implementacja Analitycznego Agenta w Google Cloud (2025/2026)](ADK_raport_20260110.md)

---

## 1. Lista tematów badawczych
- Integracja Shopify Hydrogen z Cloudflare Workers/Pages
- Orkiestracja agentów AI (MCP, Durable Objects, RAG)
- Automatyzacja zarządzania produktami (Storefront API, Admin API, Buy Button)
- Edge-first commerce (SSR/SSG, D1, web-pixel, analityka)
- Federacja mikroserwisów i separacja stanu (Two Rivers, Signal-Bridge)
- Privacy-by-design i granularne scope’y
- Tech-Craft: integracja AI z rzemiosłem i personalizacją
- Automatyzacja archiwizacji wiedzy (Gemini, Google Workspace, markdown/CSV)
- Wzorce wdrożeniowe dla landing page i asystenta klienta
- Rekomendacje dla przyszłych integracji (Vision, LLM, OAuth, OpenAPI)

## 2. Workflow archiwizacji i ekstrakcji wiedzy
- Używaj szablonów markdown/CSV do ręcznego lub półautomatycznego tagowania i opisywania dokumentów.
- W Google Workspace/Gemini stosuj prompt:
  > Wyszukaj dokumenty dotyczące [temat], wyodrębnij cytaty, streszczenia i kluczowe checklisty, oznacz je tagami: [tagi].
- Regularnie aktualizuj listę tematów badawczych i archiwizuj nowe materiały pod powyższym tytułem.

## 3. Najważniejsze wnioski
- Modularna architektura edge-first i systematyczna archiwizacja wiedzy przyspieszają iterację i wdrażanie nowych funkcji.
- Integracja AI/commerce wymaga ścisłego rozdziału stanu, granularnych uprawnień i automatyzacji procesów.
- Warto korzystać z narzędzi AI (Gemini, RAG) do ekstrakcji i organizacji wiedzy z własnych repozytoriów i dokumentów.

## 4. Checklisty i szablony
- [ ] Regularnie aktualizuj archiwum pod powyższym tytułem.
- [ ] Uzupełniaj listę tematów badawczych o nowe zagadnienia.
- [ ] Wdrażaj workflow ekstrakcji wiedzy z Google Workspace/Gemini.
- [ ] Dokumentuj wdrożenia i wnioski w formacie markdown/CSV.

---

*Plik utworzony automatycznie przez GitHub Copilot na prośbę użytkownika, 10.01.2026.*
