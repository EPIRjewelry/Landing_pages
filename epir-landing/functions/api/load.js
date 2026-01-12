/**
 * Cloudflare Pages Function - Load Config
 * GET /api/load
 * 
 * Pobiera konfigurację landing page z KV storage
 */

export async function onRequestGet(context) {
  const { env, request } = context;
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    // Pobierz config z KV
    const configKey = 'landing-config:epir-rings';
    let config = await env.LANDING_CONFIG.get(configKey, { type: 'json' });
    
    // Jeśli nie ma w KV, zwróć domyślny config (fallback)
    if (!config) {
      return new Response(JSON.stringify({
        error: 'Config not found. Please initialize it via admin panel.',
        fallback: true
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify(config), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to load config',
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
