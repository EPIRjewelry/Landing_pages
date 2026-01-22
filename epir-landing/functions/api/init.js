/**
 * Cloudflare Pages Function - Initialize Config
 * POST /api/init
 * 
 * Inicjalizuje KV storage z domyślną konfiguracją
 * Uruchom to raz po deployment
 */

export async function onRequestPost(context) {
  const { env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    // Domyślny config (z config-seed.json)
    const defaultConfig = {
      "site": {
        "title": "EPIR | Pierścionki Zaręczynowe",
        "description": "Wyjątkowe pierścionki zaręczynowe. Ręcznie wykonane z najwyższej jakości materiałów.",
        "ga4_id": "G-XXXXXXXXXX"
      },
      "sections": {
        "hero": {
          "active": true,
          "title": "Pierścionki które",
          "subtitle": "opowiadają historię",
          "description": "Odkryj kolekcję pierścionków zaręczynowych, każdy wykonany ręcznie przez polskich mistrzów złotnictwa.",
          "cta_text": "Odkryj Kolekcję",
          "cta_link": "#products",
          "background_image": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=2574",
          "overlay_opacity": 0.5
        },
        "products": {
          "active": true,
          "title": "Nasza Kolekcja",
          "subtitle": "// UNIKATY EPIR",
          "items": [
            {
              "id": 1,
              "shopify_product_id": "",
              "name": "Solitaire Classic",
              "description": "Klasyczny solitaire z diamentem 1ct w oprawie z białego złota Au585.",
              "price": "12,500 PLN",
              "image": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=1200",
              "cta_text": "Dodaj do koszyka"
            },
            {
              "id": 2,
              "shopify_product_id": "",
              "name": "Organic Moissanite",
              "description": "Nowoczesna oprawa organiczna z moissanitem 2ct - maksymalny blask i ogień.",
              "price": "8,900 PLN",
              "image": "https://images.unsplash.com/photo-1617038220319-276d3cfab638?q=80&w=1200",
              "cta_text": "Dodaj do koszyka"
            }
          ]
        },
        "trust": {
          "active": true,
          "title": "Gwarancja Jakości",
          "badges": [
            {
              "icon": "shield-check",
              "title": "100% Au585",
              "description": "Certyfikowane złoto próby 585"
            },
            {
              "icon": "gem",
              "title": "Certyfikaty GIA",
              "description": "Kamienie z międzynarodowymi certyfikatami"
            },
            {
              "icon": "truck",
              "title": "Darmowa Dostawa",
              "description": "Bezpieczna przesyłka kurierem w całej Polsce"
            }
          ]
        },
        "testimonials": {
          "active": true,
          "title": "Opinie Klientów",
          "subtitle": "// CO MÓWIĄ O NAS",
          "items": [
            {
              "id": 1,
              "name": "Anna K.",
              "location": "Warszawa",
              "rating": 5,
              "text": "Pierścionek zaręczynowy od EPIR to arcydzieło. Jakość wykonania i dbałość o detale są niesamowite.",
              "image": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400",
              "product_image": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=400"
            }
          ]
        },
        "faq": {
          "active": true,
          "title": "Najczęściej Zadawane Pytania",
          "subtitle": "// FAQ",
          "items": [
            {
              "id": 1,
              "question": "Jak dobrać odpowiedni rozmiar pierścionka?",
              "answer": "Oferujemy bezpłatny zestaw do pomiaru rozmiaru, który wyślemy do Ciebie kurierem."
            },
            {
              "id": 2,
              "question": "Jaki jest czas realizacji zamówienia?",
              "answer": "Standardowe pierścionki z kolekcji realizujemy w 5-7 dni roboczych."
            }
          ]
        },
        "cta_final": {
          "active": true,
          "title": "Gotowy na Początek Waszej Historii?",
          "description": "Umów się na bezpłatną konsultację w naszym showroomie lub zamów online.",
          "primary_cta": {
            "text": "Umów Konsultację",
            "link": "#contact"
          },
          "secondary_cta": {
            "text": "Zobacz Pełną Kolekcję",
            "link": "https://epirbizuteria.pl/collections/pierscionki"
          },
          "background_image": "https://images.unsplash.com/photo-1617038220319-276d3cfab638?q=80&w=2574"
        }
        }
    };

    // Zapisz do KV
    const configKey = 'landing-config:epir-rings';
    await env.LANDING_CONFIG.put(configKey, JSON.stringify(defaultConfig));

    return new Response(JSON.stringify({
      success: true,
      message: 'Config initialized successfully',
      config: defaultConfig
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to initialize config',
      message: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
