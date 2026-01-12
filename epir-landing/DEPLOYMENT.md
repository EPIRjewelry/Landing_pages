# 🚀 Dokumentacja Wdrożenia - EPIR Landing Page

## 📋 Spis Treści
1. [Uruchomienie Projektu](#uruchomienie-projektu)
2. [Konfiguracja Cloudflare Access](#konfiguracja-cloudflare-access)
3. [Zarządzanie Treścią](#zarządzanie-treścią)
4. [Zarządzanie Obrazami](#zarządzanie-obrazami)
5. [Integracja Google Analytics](#integracja-google-analytics)
6. [Integracja Shopify](#integracja-shopify)

---

## 🎯 Uruchomienie Projektu

### 1. Inicjalizacja Konfiguracji

**KROK 1: Deploy projektu do Cloudflare Pages**
```powershell
cd d:\Landing_pages\epir-landing
wrangler pages deploy public
```

**KROK 2: Inicjalizacja konfiguracji w KV**
Po deployment, otwórz przeglądarkę i wykonaj request:
```
POST https://twoja-domena.pages.dev/api/init
```

Możesz to zrobić przez:
- **PowerShell**:
  ```powershell
  Invoke-RestMethod -Uri "https://twoja-domena.pages.dev/api/init" -Method POST
  ```
- **Przeglądarkę**: Otwórz DevTools Console i wykonaj:
  ```javascript
  fetch('/api/init', { method: 'POST' }).then(r => r.json()).then(console.log)
  ```

**KROK 3: Weryfikacja**
Otwórz stronę główną: `https://twoja-domena.pages.dev` - powinna załadować się z domyślną konfiguracją.

---

## 🔐 Konfiguracja Cloudflare Access

Zabezpiecz panel administracyjny `/admin/` przed nieautoryzowanym dostępem.

### Krok 1: Włącz Cloudflare Access w Dashboard

1. Zaloguj się do [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Wybierz domenę projektu
3. Przejdź do **Zero Trust** → **Access** → **Applications**
4. Kliknij **Add an application** → **Self-hosted**

### Krok 2: Konfiguracja Application

**Basic Information:**
- **Application name**: `EPIR Admin Panel`
- **Session Duration**: `24 hours`
- **Application domain**:
  - `https://twoja-domena.pages.dev`
  - Path: `/admin/*`

**Identity providers:** (wybierz co najmniej jeden)
- ✅ Google (OAuth)
- ✅ GitHub
- ✅ One-time PIN (email)

### Krok 3: Utwórz Policy

**Policy Name**: `EPIR Admin Access`

**Define rules:**
- **Action**: `Allow`
- **Rule type**: `Emails`
- **Value**: Dodaj swoje emaile (np. `twoj-email@gmail.com`)

**Przykład:**
```
Emails:
- jankowalski@gmail.com
- admin@epirbizuteria.pl
```

### Krok 4: Testowanie

1. Otwórz: `https://twoja-domena.pages.dev/admin/`
2. Zostaniesz przekierowany do logowania Cloudflare Access
3. Wybierz metodę logowania (Google/GitHub/Email)
4. Po autoryzacji uzyskasz dostęp do panelu

---

## 🎨 Zarządzanie Treścią

### Panel Administracyjny

**URL**: `https://twoja-domena.pages.dev/admin/`

### Edycja Sekcji

Każda sekcja ma:
1. **Toggle Switch** (✓/✗) - włącz/wyłącz sekcję na stronie
2. **Pola tekstowe** - edytuj tytuły, opisy, linki
3. **Listy elementów** - dodawaj/usuwaj produkty, opinie, FAQ

### Workflow Edycji

```
1. Otwórz panel admin → /admin/
2. Edytuj pola (zmiany są lokalne w przeglądarce)
3. Kliknij "Zapisz Zmiany" → zapisuje do KV storage
4. Odśwież stronę główną → zmiany są widoczne
```

### Włączanie/Wyłączanie Sekcji

**Przykład**: Wyłączenie sekcji Testimonials
1. Otwórz `/admin/`
2. Znajdź sekcję "Opinie Klientów"
3. Kliknij toggle switch (wyłącz)
4. Kliknij "Zapisz Zmiany"
5. Sekcja zniknie ze strony głównej

---

## 🖼️ Zarządzanie Obrazami

### Struktura Folderów

```
/public/images/
├── rings/              # Obrazy pierścionków
├── trust-badges/       # Ikony/loga certyfikatów
├── testimonials/       # Zdjęcia klientów i produktów
└── hero-rings.jpg      # Główny obraz hero
```

### Metoda 1: Lokalne Pliki (Proste)

**KROK 1: Dodaj obraz do folderu**
```powershell
# Skopiuj obraz do odpowiedniego folderu
Copy-Item "C:\Users\user\Desktop\moj-pierscionek.jpg" "d:\Landing_pages\epir-landing\public\images\rings\solitaire-classic.jpg"
```

**KROK 2: Edytuj ścieżkę w admin panelu**
1. Otwórz `/admin/`
2. Znajdź produkt (np. "Solitaire Classic")
3. W polu "Ścieżka do obrazu" wpisz: `/images/rings/solitaire-classic.jpg`
4. Zapisz zmiany

**KROK 3: Deploy**
```powershell
wrangler pages deploy public
```

### Metoda 2: Cloudflare R2 (Zaawansowane)

**Zalety:**
- Nieograniczona przestrzeń
- CDN automatycznie
- Nie wymaga re-deployment

**Konfiguracja** (już skonfigurowana w `wrangler.toml`):
```toml
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "autorag-epir-website-rag-0b92dc"
```

**Upload obrazu do R2:**
```powershell
wrangler r2 object put autorag-epir-website-rag-0b92dc/rings/solitaire.jpg --file="C:\Users\user\Desktop\solitaire.jpg"
```

**Użycie w admin panelu:**
Ścieżka: `https://pub-XXXXXXX.r2.dev/rings/solitaire.jpg`

---

## 📊 Integracja Google Analytics 4

### Krok 1: Uzyskaj Measurement ID

1. Zaloguj się do [Google Analytics](https://analytics.google.com/)
2. **Admin** → **Data Streams** → **Web**
3. Skopiuj **Measurement ID** (format: `G-XXXXXXXXXX`)

### Krok 2: Dodaj do Panelu Admin

1. Otwórz `/admin/`
2. W sekcji "Konfiguracja Strony"
3. Wklej Measurement ID w pole "Google Analytics 4 ID"
4. Zapisz zmiany

### Krok 3: Weryfikacja

1. Otwórz stronę główną
2. Otwórz DevTools Console
3. Powinieneś zobaczyć: `✅ GA4 initialized: G-XXXXXXXXXX`
4. W Google Analytics → **Realtime** → sprawdź ruch

### Śledzone Eventy

Landing page automatycznie śledzi:
- ✅ `click_hero_cta` - kliknięcie głównego CTA
- ✅ `click_nav` - nawigacja w menu
- ✅ `add_to_cart` - dodanie produktu do koszyka
- ✅ `toggle_faq` - otwarcie pytania FAQ
- ✅ `click_cta_primary` / `click_cta_secondary` - kliknięcia końcowych CTA

---

## 🛒 Integracja Shopify

### Krok 1: Uzyskaj Storefront Access Token

1. Zaloguj się do **Shopify Admin**
2. **Settings** → **Apps and sales channels** → **Develop apps**
3. Kliknij **Create an app** (nazwa: `EPIR Landing Page`)
4. **Configure Storefront API**
5. Zaznacz uprawnienia:
   - ✅ `Read products`
   - ✅ `Read product listings`
6. **Install app** → Skopiuj **Storefront Access Token**

### Krok 2: Dodaj do Panelu Admin

1. Otwórz `/admin/`
2. Przewiń do sekcji "Konfiguracja Shopify"
3. Wklej:
   - **Storefront Access Token**: `shpat_xxxxx...`
   - **Store Domain**: `twoj-sklep.myshopify.com`
4. Zapisz zmiany

### Krok 3: Dodaj Product IDs do Produktów

1. W Shopify Admin otwórz produkt
2. Skopiuj **Product ID** z URL (np. `7234567890123`)
3. W `/admin/` znajdź produkt
4. Wklej ID w pole "Shopify Product ID"
5. Zapisz zmiany

### Testowanie

Kliknij "Dodaj do koszyka" na produkcie - powinien działać Shopify checkout.

---

## 🔄 Aktualizacja i Deployment

### Lokalne testowanie

```powershell
# Uruchom wrangler dev (local server)
wrangler pages dev public
```
Otwórz: `http://localhost:8788`

### Deployment do produkcji

```powershell
# Deploy do Cloudflare Pages
wrangler pages deploy public
```

### Rollback (powrót do poprzedniej wersji)

```powershell
# Lista deploymentów
wrangler pages deployment list

# Rollback do konkretnego ID
wrangler pages deployment rollback <deployment-id>
```

---

## 🐛 Troubleshooting

### Problem: "Config not found"
**Rozwiązanie**: Wykonaj `/api/init` (POST request)

### Problem: Admin panel nie wymaga logowania
**Rozwiązanie**: Sprawdź konfigurację Cloudflare Access - policy musi wskazywać na `/admin/*`

### Problem: Obrazy nie ładują się
**Rozwiązanie**: 
1. Sprawdź ścieżkę (case-sensitive)
2. Wykonaj `wrangler pages deploy public` po dodaniu obrazów
3. Lub użyj pełnego URL (Unsplash/R2)

### Problem: Shopify Buy Button nie działa
**Rozwiązanie**:
1. Sprawdź Storefront Access Token (czy jest aktywny w Shopify Admin)
2. Sprawdź Product ID (czy produkt jest published)
3. Otwórz Console w przeglądarce - szukaj błędów Shopify SDK

---

## 📞 Wsparcie

W razie problemów sprawdź logi Cloudflare:
```powershell
wrangler pages deployment tail
```

Lub otwórz **Cloudflare Dashboard** → **Pages** → **View logs**

---

**Dokumentacja utworzona: 11.01.2026**  
**Wersja projektu: 1.0**
