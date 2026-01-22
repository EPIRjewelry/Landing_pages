/**
 * Cloudflare Pages Function - Save Config
 * POST /api/save
 * 
 * Zapisuje konfigurację landing page do KV storage
 * ZABEZPIECZENIE: Wymaga Cloudflare Access lub prostego tokenu
 */

export async function onRequestPost(context) {
  const { env, request } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cf-Access-Jwt-Assertion',
    'Content-Type': 'application/json'
  };

  try {
    // Required: Cloudflare Access JWT assertion
    const accessJwt = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!accessJwt) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Pobierz dane z request body
    const config = await request.json();
    
    // Walidacja podstawowa
    if (!config.site || !config.sections) {
      return new Response(JSON.stringify({
        error: 'Invalid config structure',
        required: ['site', 'sections']
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Nie zapisuj sekretów Shopify do KV
    if (config.shopify) {
      delete config.shopify.storefront_access_token;
      delete config.shopify.store_domain;
    }

    // Zapisz do KV
    const configKey = 'landing-config:epir-rings';
    await env.LANDING_CONFIG.put(configKey, JSON.stringify(config));
    
    // Opcjonalnie: zapisz timestamp do historii
    const historyKey = `landing-history:epir-rings:${Date.now()}`;
    await env.LANDING_CONFIG.put(historyKey, JSON.stringify({
      timestamp: new Date().toISOString(),
      config: config
    }), {
      expirationTtl: 60 * 60 * 24 * 30 // 30 dni
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Config saved successfully',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to save config',
      message: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle OPTIONS for CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cf-Access-Jwt-Assertion'
    }
  });
}
