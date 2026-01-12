# Hydrogen, Storefront API i Admin API w ekosystemie epirbizuteria.pl – analiza i rekomendacje

## 1. Hydrogen jako alternatywa dla landing page

Hydrogen to framework React od Shopify do budowy headlessowych sklepów i stron e-commerce. Może być alternatywą dla klasycznego landing page, gdy:
- Chcesz pełnej kontroli nad UX/UI, dynamicznych integracji (np. chatbot, web-pixel), personalizacji i wydajności (SSR, SEO).
- Masz dostęp do programistów React i nie ogranicza Cię ekosystem theme app extension.
- Nie potrzebujesz gotowych aplikacji Shopify (nie wszystkie są dostępne w Hydrogen).

Hydrogen nie zastąpi Twoich aplikacji asystenckich, ale może być świetnym wyborem dla nowoczesnego, dynamicznego landing page.

## 2. Przykłady zapytań i integracji

**Storefront API (frontend, landing, chatbot):**
- Pobieranie produktów:
  ```graphql
  query {
    products(first: 5) { edges { node { id title description } } }
  }
  ```
- Rekomendacje, personalizacja, dynamiczne prezentacje produktów.
- Integracja z chatbotem: pobieranie danych o produktach, kolekcjach, koszyku.

**Admin API (backend, automatyzacje, web-pixel):**
- Pobieranie zamówień:
  ```graphql
  query {
    orders(first: 3) { edges { node { id name totalPrice } } }
  }
  ```
- Automatyzacja statusów, powiadomienia, obsługa eventów (webhooki).
- Integracja z web-pixel: śledzenie zdarzeń, przesyłanie danych do analityki.

## 3. Storefront API vs Admin API – porównanie

| Cecha                | Storefront API                        | Admin API                                 |
|----------------------|---------------------------------------|-------------------------------------------|
| Zakres               | Produkty, kolekcje, koszyk, checkout, personalizacja | Zamówienia, klienci, produkty, eventy, automatyzacje |
| Bezpieczeństwo       | Publiczny token (Storefront Access Token) | Wymaga autoryzacji (OAuth, klucz API)     |
| Limity               | 1000 pkt/min (GraphQL)                | 1000 pkt/min (GraphQL), 40 req/s (REST)   |
| Typowe zastosowania  | Frontend, chatbot, landing page       | Backend, automatyzacje, zarządzanie sklepem |
| Dostępność           | Dla wszystkich sklepów                | Wymaga uprawnień administracyjnych        |

**Storefront API** – idealny do dynamicznego frontendu, chatbotów, landing page, personalizacji.  
**Admin API** – do backendu, automatyzacji, zarządzania zamówieniami, eventami, web-pixel.

## 4. Checklist wdrożeniowy i rekomendacje

- [ ] Wybierz architekturę landing page (Hydrogen vs klasyczny motyw)
- [ ] Skonfiguruj Storefront API (token, uprawnienia)
- [ ] Skonfiguruj Admin API (aplikacja, OAuth, klucze)
- [ ] Zaimplementuj pobieranie produktów (Storefront API)
- [ ] Zintegruj chatbot i web-pixel (Storefront API/Admin API)
- [ ] Wdróż automatyzacje backendowe (Admin API, webhooki)
- [ ] Przetestuj limity, bezpieczeństwo, wydajność

**Rekomendacja:**  
Hydrogen warto rozważyć do landing page, jeśli zależy Ci na nowoczesności, wydajności i pełnej kontroli nad UI. Storefront API i Admin API to wspólny fundament dla wszystkich Twoich aplikacji – zadbaj o spójność integracji i bezpieczeństwo tokenów.

---

Notatka gotowa do dalszego wykorzystania w projekcie. W razie potrzeby mogę rozwinąć dowolny punkt lub przygotować przykładowe fragmenty kodu do integracji.