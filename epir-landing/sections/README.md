premium-bundle.liquid

Opis:
Sekcja "Premium Bundle (Zestaw)" do użycia w motywie Shopify. Renderuje wizualną ofertę zestawu (główny produkt + dodatek) korzystając z metafieldu produktu `custom.do_kompletu` (typ: list.product_reference).

Instrukcje:
- Skopiuj plik `premium-bundle.liquid` do katalogu `sections` Twojego motywu (lub zamień, jeśli już istnieje podobna sekcja).
- Upewnij się, że produkty mają skonfigurowany metafield `custom.do_kompletu` (typ: list.product_reference).
- W ustawieniach sekcji możesz włączyć `debug_mode` aby zobaczyć zawartość metafield w Theme Editorze.

Uwagi techniczne:
- Plik używa standardowych tagów Liquid i `<style>` zamiast `{% style %}` dla kompatybilności z edytorami i linterami.
- Skrypt JS dodaje produkty do koszyka przez `cart/add.js` i obsługuje fallback dla `Shopify.routes.root`.

Testy:
- Przebadaj przypadki: brak produktów w metafield, brak dostępnych wariantów, odpowiedź błędu od serwera podczas dodawania do koszyka.