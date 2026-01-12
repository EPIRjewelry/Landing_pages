# 📝 Metody Edycji Landing Page - Quick Guide

## 3 Sposoby Edycji Treści

### 🎯 Metoda 1: Panel Admin (Najłatwiejsza) ⭐ REKOMENDOWANA

**Dla kogo**: Użytkownicy bez wiedzy technicznej

**Jak edytować**:
1. Otwórz `https://twoja-domena.pages.dev/admin/`
2. Zaloguj się przez Cloudflare Access (Google/GitHub/Email)
3. Edytuj pola tekstowe i toggle switches
4. Kliknij **"Zapisz Zmiany"**
5. Odśwież stronę główną - zmiany są widoczne ✅

**Co możesz edytować**:
- ✏️ Wszystkie teksty (tytuły, opisy, CTA)
- 🖼️ Ścieżki do obrazów
- 🔄 Włączanie/wyłączanie sekcji
- 📦 Dodawanie/usuwanie produktów, opinii, FAQ
- 🔗 Linki Shopify i Product IDs
- 📊 Google Analytics ID

**Zalety**:
- ✅ Brak potrzeby deployment
- ✅ Zmiany w czasie rzeczywistym
- ✅ Intuicyjny interfejs
- ✅ Live preview

---

### ⚙️ Metoda 2: Edycja API (Dla Zaawansowanych)

**Dla kogo**: Deweloperzy, automatyzacja

**Przykład - Zmiana tytułu Hero przez PowerShell**:
```powershell
$config = Invoke-RestMethod -Uri "https://twoja-domena.pages.dev/api/load"
$config.sections.hero.title = "Nowy Tytuł"
Invoke-RestMethod -Uri "https://twoja-domena.pages.dev/api/save" -Method POST -Body ($config | ConvertTo-Json -Depth 10) -ContentType "application/json"
```

**Przykład - Python**:
```python
import requests

# Pobierz config
config = requests.get("https://twoja-domena.pages.dev/api/load").json()

# Edytuj
config['sections']['hero']['title'] = "Nowy Tytuł"

# Zapisz
requests.post("https://twoja-domena.pages.dev/api/save", json=config)
```

**Zalety**:
- ✅ Automatyzacja (cron jobs, webhooks)
- ✅ Bulk edits
- ✅ Integracja z innymi systemami

---

### 📄 Metoda 3: Bezpośrednia Edycja Pliku (Developerska)

**Dla kogo**: Developerzy z dostępem do repo

**Jak edytować**:
1. Edytuj `config-seed.json` lokalnie
2. Upload do KV przez API init:
   ```powershell
   Invoke-RestMethod -Uri "https://twoja-domena.pages.dev/api/init" -Method POST
   ```
3. Lub bezpośrednio przez Wrangler:
   ```powershell
   wrangler kv:key put --binding=LANDING_CONFIG "landing-config:epir-rings" --path="config-seed.json"
   ```

**Zalety**:
- ✅ Git versioning
- ✅ Code review workflow
- ✅ Backup automatyczny

---

## 🖼️ Jak Edytować Grafiki

### Metoda A: Przez Panel Admin

**KROK 1: Wrzuć plik do folderu**
```powershell
Copy-Item "C:\Users\user\Desktop\moj-obraz.jpg" "d:\Landing_pages\epir-landing\public\images\rings\moj-obraz.jpg"
```

**KROK 2: Deploy**
```powershell
cd d:\Landing_pages\epir-landing
wrangler pages deploy public
```

**KROK 3: Edytuj ścieżkę w admin**
1. Otwórz `/admin/`
2. Znajdź pole "Ścieżka do obrazu"
3. Wpisz: `/images/rings/moj-obraz.jpg`
4. Zapisz

### Metoda B: Użyj URL zewnętrznego

W polu "Ścieżka do obrazu" wklej pełny URL:
```
https://images.unsplash.com/photo-XXXXXX?q=80&w=1200
```

### Metoda C: Cloudflare R2 (Najlepsze dla dużej ilości zdjęć)

```powershell
# Upload
wrangler r2 object put autorag-epir-website-rag-0b92dc/rings/produkt1.jpg --file="C:\moje-zdjecie.jpg"

# Użyj w admin
# Ścieżka: https://pub-XXXXXXX.r2.dev/rings/produkt1.jpg
```

---

## 🔀 Włączanie/Wyłączanie Sekcji

### Przez Panel Admin

1. Otwórz `/admin/`
2. Znajdź sekcję (np. "Opinie Klientów")
3. Kliknij toggle switch: ✓ (aktywna) lub ✗ (nieaktywna)
4. Zapisz zmiany

### Przez API

```powershell
$config = Invoke-RestMethod -Uri "https://twoja-domena.pages.dev/api/load"
$config.sections.testimonials.active = $false  # Wyłącz
Invoke-RestMethod -Uri "https://twoja-domena.pages.dev/api/save" -Method POST -Body ($config | ConvertTo-Json -Depth 10) -ContentType "application/json"
```

---

## 📋 Dostępne Sekcje do Edycji

| Sekcja | Toggle | Edytowalne elementy |
|--------|--------|---------------------|
| **Hero** | ✓ | Tytuł, podtytuł, opis, CTA, obraz tła |
| **Trust Signals** | ✓ | Tytuł, 3-5 odznak (ikona, tytuł, opis) |
| **Produkty** | ✓ | Tytuł, podtytuł, lista 2-8 produktów |
| **Opinie** | ✓ | Tytuł, podtytuł, lista 3-6 opinii |
| **FAQ** | ✓ | Tytuł, podtytuł, lista 5-10 pytań |
| **CTA Finalne** | ✓ | Tytuł, opis, 2 przyciski CTA, obraz tła |

---

## 🎨 Struktura Produktu

Każdy produkt ma:
```json
{
  "name": "Nazwa produktu",
  "description": "Krótki opis (max 150 znaków)",
  "price": "12,500 PLN",
  "image": "/images/rings/produkt.jpg",
  "shopify_product_id": "7234567890123",
  "cta_text": "Dodaj do koszyka"
}
```

**Dodawanie produktu przez admin**:
1. Przewiń do sekcji "Produkty"
2. Kliknij **"+ Dodaj produkt"**
3. Wypełnij pola
4. Zapisz

---

## 💡 Tips & Tricks

### Podgląd Zmian Przed Zapisem
W admin panelu kliknij **"Podgląd"** - otworzy się nowa karta ze stroną główną.

### Najlepsze Praktyki dla Obrazów
- **Format**: WEBP lub JPG
- **Rozmiar**: 
  - Hero: 2400x1600px (16:9)
  - Produkty: 1200x1200px (1:1)
  - Testimonials: 400x400px (1:1)
- **Optymalizacja**: Użyj [TinyPNG](https://tinypng.com/) przed uploadem

### Backup Konfiguracji
```powershell
# Pobierz i zapisz lokalnie
Invoke-RestMethod -Uri "https://twoja-domena.pages.dev/api/load" | ConvertTo-Json -Depth 10 | Out-File "backup-$(Get-Date -Format 'yyyy-MM-dd').json"
```

### Restore z Backupu
```powershell
$backup = Get-Content "backup-2026-01-11.json" | ConvertFrom-Json
Invoke-RestMethod -Uri "https://twoja-domena.pages.dev/api/save" -Method POST -Body ($backup | ConvertTo-Json -Depth 10) -ContentType "application/json"
```

---

## ⚡ Quick Commands

### Lokalne testowanie
```powershell
wrangler pages dev public
# Otwórz: http://localhost:8788
```

### Deployment
```powershell
wrangler pages deploy public
```

### Sprawdzenie logów
```powershell
wrangler pages deployment tail
```

### Reset konfiguracji do domyślnej
```powershell
Invoke-RestMethod -Uri "https://twoja-domena.pages.dev/api/init" -Method POST
```

---

## 🆘 Najczęstsze Problemy

### Nie widzę zmian po zapisie
**Rozwiązanie**: Wyczyść cache przeglądarki (Ctrl + Shift + R) lub otwórz w trybie incognito.

### Obrazy nie ładują się
**Rozwiązanie**: Sprawdź ścieżkę (case-sensitive!). `/Images/` ≠ `/images/`

### Panel admin wymaga ciągle logowania
**Rozwiązanie**: Zwiększ "Session Duration" w Cloudflare Access do 24h.

---

## 📚 Linki Pomocnicze

- [Pełna dokumentacja deployment](./DEPLOYMENT.md)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Shopify Storefront API](https://shopify.dev/docs/api/storefront)
- [Google Analytics Events](https://developers.google.com/analytics/devguides/collection/ga4/events)

---

**Utworzono: 11.01.2026**  
**Dla projektu: EPIR Landing Page - Pierścionki**
