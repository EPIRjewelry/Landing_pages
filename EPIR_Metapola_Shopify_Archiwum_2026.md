# Metapola i metadane Shopify – praktyczne zastosowanie w AI agencie, Cloudflare i landing page (10.01.2026)

**Opis:**  
Podsumowanie kluczowych praktyk i wniosków dotyczących wykorzystania metapól/metadanych Shopify w architekturze AI agenta, landing page (Hydrogen) i edge backendzie (Cloudflare Workers, Durable Objects, RAG).

---

## Najważniejsze wnioski i praktyki

### 1. Zastosowania metapól/metadanych
- Przechowywanie dodatkowych danych o produktach, klientach, zamówieniach, sklepie (np. cechy, preferencje, tagi AI, opisy do personalizacji).
- Wzbogacanie kontekstu rozmowy agenta AI i rekomendacji na landing page.
- Synchronizacja danych sesji (np. preferencje klienta, ostatnio oglądane produkty) między Durable Objects a Shopify.

### 2. Praktyka wdrożeniowa
- Pobieraj tylko potrzebne metapola (filtruj po namespace/kluczu).
- Używaj publicznych metapól do dynamicznego renderowania landing page i personalizacji (Hydrogen).
- Cache’uj metadane na czas sesji w Durable Objects lub na edge (Cloudflare).
- Wzbogacaj prompt LLM/RAG o metadane produktów i klientów.

### 3. Ograniczenia i dobre praktyki
- Limit: do 250 metapól na obiekt, do 64KB na pole.
- Stosuj namespace i czytelne klucze (np. `ai.description`, `personalization.style`).
- Wrażliwe dane trzymaj jako prywatne metapola (nie udostępniaj przez Storefront API).
- Dokumentuj strukturę metapól w repozytorium i ustal konwencje nazewnictwa.

### 4. Przykłady zastosowań
- **Personalizacja:** Agent AI dynamicznie dostosowuje rekomendacje na podstawie metapól klienta.
- **Wzbogacanie katalogu:** Metapola produktów (np. „AI_description”, „gemstone_type”) wykorzystywane do lepszych odpowiedzi i wyszukiwania.
- **Integracja z Durable Objects:** Przechowywanie i synchronizacja kontekstu sesji (np. preferencje, historia) z metapolami Shopify.
- **RAG:** Metapola jako tagi/atrybuty do wzbogacania dokumentów w bazie wektorowej.

### 5. Przykładowe zapytania (bez kluczy/sektretów)
- Pobieranie metapól produktu (GraphQL):
  ```graphql
  query {
    product(id: "gid://shopify/Product/123456789") {
      metafields(namespace: "ai", first: 10) {
        edges {
          node {
            key
            value
          }
        }
      }
    }
  }
  ```
- Pobieranie metapól w Hydrogen (React):
  ```js
  import {useShopQuery, gql} from '@shopify/hydrogen';

  const {data} = useShopQuery({
    query: gql`
      query {
        product(handle: "piercing-silver") {
          metafields(namespace: "ai", first: 5) {
            edges {
              node { key value }
            }
          }
        }
      }
    `
  });
  ```

---

**Podsumowanie:**  
Metapola/metadane Shopify to klucz do personalizacji, kontekstualizacji i rozszerzania możliwości agenta AI oraz landing page. Najważniejsze: pobieraj tylko to, co potrzebne, cache’uj na edge, rozdzielaj dane publiczne/prywatne i trzymaj się ustalonych konwencji.
