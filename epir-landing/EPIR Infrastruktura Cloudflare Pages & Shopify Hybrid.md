# **EPIR: Infrastruktura Cloudflare Pages & Shopify Hybrid**

Ten dokument zawiera instrukcje techniczne i plan plików dla Twojego projektu, zlokalizowanego w D:\\epir-landing.

## **1\. Architektura Projektu**

Zastosujemy strukturę przyjazną dla Cloudflare Pages:

* /public \- katalog główny dla plików statycznych (HTML, obrazy).  
* /assets \- (opcjonalnie) dla lokalnych zasobów.

## **2\. Narzędzia (Pre-requisites)**

Zanim uruchomisz komendy, upewnij się, że masz zainstalowane:

1. **Node.js** (potrzebny do obsługi Wranglera \- CLI Cloudflare).  
2. **Git** (do kontroli wersji i deployu).  
3. **VS Code** (Twój edytor).

## **3\. Komendy PowerShell (Instalacja Automatyczna)**

Otwórz PowerShell jako Administrator i wklej poniższy blok. Skrypt utworzy folder, strukturę i zainstaluje niezbędne narzędzia.

\# Przejdź na dysk D  
d:

\# Utwórz folder projektu  
mkdir epir-landing  
cd epir-landing

\# Utwórz folder public dla Cloudflare  
mkdir public

\# Zainstaluj Wrangler globalnie (narzędzie Cloudflare)  
npm install \-g wrangler

\# Zainicjuj repozytorium Git  
git init

\# Utwórz plik konfiguracyjny Wranglera  
\# To powie Cloudflare, że pliki są w folderze /public  
Set-Content \-Path "wrangler.toml" \-Value 'name \= "epir-landing"\`ncompatibility\_date \= "2024-01-01"\`n\[pages\_build\_config\]\`ndirectory \= "public"'

\# Otwórz projekt w VS Code  
code .

## **4\. Dalsze Kroki w VS Code (MCP Cloudflare)**

Gdy folder otworzy się w VS Code:

1. Skopiuj kod index.html (poniżej) do pliku public/index.html.  
2. Otwórz terminal w VS Code (Ctrl \+ \`).  
3. Zaloguj się do Cloudflare: wrangler login.  
4. Wykonaj pierwszy deploy: wrangler pages deploy public.

## **5\. Integracja z Shopify**

W sekcji "Discovery Grid" w kodzie HTML przygotowałem miejsca na Twoje linki. Możesz tam wstawić bezpośrednie adresy do kategorii w Twoim głównym sklepie Shopify.