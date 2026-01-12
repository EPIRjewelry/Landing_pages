# EPIR – Metapola, Kontekst, Integracja AI, RAG i Best Practices (Archiwum 10.01.2026)

**Opis:**  
Kompleksowe podsumowanie praktyk, architektury i wzorców wdrożeniowych dla agenta AI, landing page (Hydrogen), edge backendu (Cloudflare Workers, Durable Objects, RAG) oraz integracji z Shopify. Dokument łączy wcześniejsze wnioski z nowymi, pogłębionymi sekcjami dotyczącymi metapól, kontekstu sesji, enrichingu RAG, bezpieczeństwa, wydajności i automatyzacji.

**Powiązane raporty / Deep dives:**
- [Raport ADK: Architektura i Implementacja Analitycznego Agenta w Google Cloud (2025/2026)](ADK_raport_20260110.md)

---

## 1. Metapola i metadane Shopify – kluczowe zastosowania
- Przechowywanie ustrukturyzowanych danych o produktach, klientach, zamówieniach, sklepie (np. cechy, preferencje, tagi AI, opisy do personalizacji, statusy workflow).
- Wzbogacanie kontekstu rozmowy agenta AI i rekomendacji na landing page.
- Synchronizacja danych sesji (np. preferencje klienta, ostatnio oglądane produkty) między Durable Objects a Shopify.
- Wspieranie precyzyjnego filtrowania, personalizacji, storytellingu i automatyzacji (np. flagi workflow, priorytety marketingowe).

**Praktyka:**  
- Pobieraj tylko potrzebne metapola (filtruj po namespace/kluczu).
- Używaj publicznych metapól do dynamicznego renderowania landing page i personalizacji (Hydrogen).
- Cache’uj metadane na czas sesji w Durable Objects lub na edge (Cloudflare).
- Wzbogacaj prompt LLM/RAG o metadane produktów i klientów.

---

## 2. Integracja MCP z Durable Objects – budowanie kontekstu sesji
- **MCP (Model Context Protocol):** Bezstanowe narzędzia do pobierania danych z Shopify (np. search_shop_catalog).
- **Durable Objects:** Stanowe obiekty na Cloudflare, przechowujące historię czatu, ID użytkownika, metadane kontekstowe (np. is_vip, preferencje).
- **Cel:** Połączenie bezstanowych narzędzi MCP z kontekstem sesji w DO umożliwia dynamiczną, spersonalizowaną obsługę (np. VIP-owie widzą inne produkty).

**Przykład przepływu:**  
1. Worker pobiera metadane klienta z Shopify (np. tag VIP) i zapisuje w DO.
2. LLM generuje prompt z kontekstem (np. „Klient jest VIP”).
3. Wywołanie MCP (np. search_shop_catalog) z dynamicznymi filtrami.
4. Wynik wraca do LLM, który generuje spersonalizowaną odpowiedź.

---

## 3. RAG i wzbogacanie wektorów o metadane
- **RAG (Retrieval-Augmented Generation):** Wyszukiwanie semantyczne + metadane = precyzyjne, szybkie i kontekstowe odpowiedzi.
- **Wzbogacanie:**  
  - Metadane (np. kategoria, materiał, in_stock) dołączane do wektorów umożliwiają pre-filtering (np. tylko pierścionki z białego złota).
  - Metadane przekazywane do LLM jako kontekst (np. cena, SKU, status magazynowy).
- **Praktyka:**  
  - Przygotuj dane do indeksowania jako JSON z polami embedding + struct_data (metadane).
  - Używaj filtrów po stronie bazy wektorowej (np. Vertex AI Vector Search) zamiast po stronie klienta.

---

## 4. Best Practices, ograniczenia i automatyzacja

### Limity i pułapki
- Shopify: 250 metapól na obiekt, 64KB na pole, leaky bucket dla REST, limity kosztów w GraphQL.
- LLM: limity tokenów i zapytań na minutę.
- Nieustrukturyzowane opisy i niespójne tagi utrudniają AI precyzyjne odpowiedzi.

### Najlepsze praktyki
- **Exponential backoff:** Każde wywołanie API opakuj w retry z backoffem i jitterem.
- **Cache:** Przechowuj rzadko zmieniające się dane (np. polityki sklepu) na edge.
- **Metapola jako źródło prawdy:** Wszystkie twarde dane trzymaj w metapolach, nie w opisach.
- **Spójna taksonomia:** Dokumentuj i waliduj strukturę metapól, tagów, metaobiektów.
- **Bezpieczeństwo:**  
  - Klucze i sekrety trzymaj w menedżerze sekretów (Cloudflare, Google).
  - Waliduj HMAC dla webhooków.
  - Zasada najmniejszych uprawnień (scopes).
- **Wydajność i UX:**  
  - Streaming odpowiedzi LLM.
  - Asynchroniczność, kolejki dla długich zadań.
  - Wskaźniki ładowania i optymistyczne UI.
- **Automatyzacja:**  
  - Skrypty/agent do zarządzania workflow (np. status_workflow, priorytet_marketingowy).
  - Webhooki do aktualizacji kontekstu sesji i enrichingu RAG.

---

## 5. Przykłady i wzorce

### Przykładowe metapola (produkty, klienci, workflow)
- `custom.material_glowny`, `custom.proba_metalu`, `custom.kamien_centralny`, `custom.szlif_kamienia`, `custom.certyfikat`
- `custom.inspiracja_kolekcji`, `custom.rekomendacja_stylisty`, `custom.symbolika_produktu`
- `custom.status_workflow`, `custom.priorytet_marketingowy`, `custom.data_dodania_do_sklepu`

### Przykładowe zapytania GraphQL/Hydrogen
```graphql
query {
  product(id: "gid://shopify/Product/123456789") {
    metafields(namespace: "ai", first: 10) {
      edges { node { key value } }
    }
  }
}
```
```js
import {useShopQuery, gql} from '@shopify/hydrogen';
const {data} = useShopQuery({
  query: gql`
    query {
      product(handle: "piercing-silver") {
        metafields(namespace: "ai", first: 5) {
          edges { node { key value } }
        }
      }
    }
  `
});
```

### Przykład enrichingu RAG (Vertex AI)
```json
{"id": "prod_123_chunk_1", "embedding": [...], "struct_data": {"product_id": "123", "category": "pierścionki", "in_stock": true}}
```

---

## 6. Monitoring, obsługa błędów, retry

- **Monitoring:** Logi, metryki, alerty (np. na 401/5xx) – Google Cloud Logging/Monitoring, Cloudflare Analytics.
- **Obsługa błędów:**  
  - Retry/backoff dla 429/5xx.
  - 401 – nie retry, tylko loguj i ewentualnie odśwież token.
- **Przykład dekoratora retry (Python):**
```python
def retry_with_backoff_async(...):
    # ... kod z backoffem i jitterem ...
```

---

## 7. Unifikacja aplikacji i workflow wdrożeniowy

- Zunifikowana architektura: jeden backend, jedna baza, wspólne sesje, zunifikowane scope’y i webhooki.
- Checklista migracji: branch, migracja kodu, zależności, testy regresji, wdrożenie.
- Typowe błędy: konflikty zależności, sesje, zmienne środowiskowe, trasy API.

---

**Podsumowanie:**  
Całość dokumentacji stanowi kompletny przewodnik po wdrożeniu, integracji i utrzymaniu agenta AI dla Shopify z edge backendem, RAG, Durable Objects i nowoczesnym podejściem do metadanych. Kluczowe są: ustrukturyzowane dane (metapola), dynamiczny kontekst sesji (DO), enrich RAG, retry/backoff, automatyzacja i bezpieczeństwo.

---

# 8. Raport z Przeszukiwania Zasobów: Ekosystem EPIR & Agentic Commerce (10.01.2026)

**Zakres:** Dokumentacja Google Drive, E-maile, Notatki techniczne
**Status:** Zakończono

## 8.1. Najnowsze zasoby (Listopad 2025 – Styczeń 2026)
Tabela zasobów z ostatnich 3 miesięcy pozwala szybko zidentyfikować kluczowe, aktualne materiały (oznaczone jako "HOT"). Obejmuje checklisty, strategie, PoC, audyty, mapy myśli, dokumentację techniczną i analizy.

## 8.2. Synteza tematyczna (grupowanie wyników)

### A. Architektura: MCP i Durable Objects
- Przejście z monolitu na federacyjną architekturę MCP (Model Context Protocol).
- Klucz: separacja strumienia konwersacyjnego (AgentDO) od analitycznego (PixelDO) – wzorzec "Two Rivers".
- Signal-Bridge: Pixel przekazuje sygnały semantyczne (np. "Frustracja klienta") do Agenta przez Service Bindings.

### B. Analityka i AdSensei (Google Cloud)
- AdSensei jako osobny agent analityczny (Google Cloud Run, Docker, BigQuery).
- Wzorzec "Fire-and-Forget" – szybka odpowiedź Shopify, ciężkie analizy w tle.
- Enrichment: automatyczne raporty, scoring, integracja z GA4.

### C. Web Pixel i Frontend
- Problemy z bundlingiem @shopify/web-pixels-extension (esbuild) rozwiązane przez lokalne pliki .d.ts.
- Uproszczenie kodu Pixela, lepsza izolacja i wydajność.

### D. Hosting i Infrastruktura (Hydrogen/Oxygen vs Vercel)
- Cloudflare Workers (Oxygen) wygrywa z Fly.io i Vercel (brak cold starts, Durable Objects, niższe koszty).

### E. Tech-Craft i Archiwizacja Wiedzy
- Integracja IT z rzemiosłem (Blender, DaVinci, automatyzacja oprawy kamieni).
- RAG: wektoryzacja dokumentacji technicznej maszyn i procesów – wsparcie dla produkcji.

## 8.3. Rekomendacje i elementy do natychmiastowego wdrożenia
- Checklista audytu agenta: gotowa do użycia (MVP, RAG, Hybrid).
- Repozytorium asystent-adk-v2: wdrożenie "Read-Only SQL" dla bezpieczeństwa.
- Rotacja tokenów Admin API (Shopify Plus): manualna rotacja i przechowywanie w Secrets Managerze.

## 8.4. Wartość raportu
- Umożliwia szybkie zorientowanie się w stanie ekosystemu EPIR.
- Ułatwia onboarding, planowanie i podejmowanie decyzji operacyjnych.
- Stanowi spójne uzupełnienie archiwum wiedzy i strategii agentic commerce.
