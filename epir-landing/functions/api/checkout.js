/**
 * Pages Function - Create Shopify Checkout
 * POST /api/checkout
 * Body: { variantId: string, quantity?: number }
 */

export async function onRequestPost(context) {
  const { env, request } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    const token = env.SHOPIFY_STOREFRONT_TOKEN || '';
    const shopDomain = env.SHOP_DOMAIN || '';

    if (!token || !shopDomain) {
      return new Response(JSON.stringify({ error: 'Shopify not configured' }), {
        status: 500,
        headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders)
      });
    }

    const body = await request.json();
    const variantId = body && body.variantId;
    const quantity = body && body.quantity ? parseInt(body.quantity, 10) : 1;

    if (!variantId) {
      return new Response(JSON.stringify({ error: 'variantId required' }), {
        status: 400,
        headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders)
      });
    }

    const mutation = `mutation checkoutCreate($input: CheckoutCreateInput!) {
      checkoutCreate(input: $input) {
        checkout { id webUrl }
        userErrors { field message }
      }
    }`;

    const variables = {
      input: {
        lineItems: [ { variantId: variantId, quantity: quantity } ]
      }
    };

    const resp = await fetch(`https://${shopDomain}/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': token
      },
      body: JSON.stringify({ query: mutation, variables })
    });

    const result = await resp.json();

    if (!resp.ok || result.errors || (result.data && result.data.checkoutCreate && result.data.checkoutCreate.userErrors && result.data.checkoutCreate.userErrors.length)) {
      return new Response(JSON.stringify({ error: 'Shopify checkout failed', details: result }), {
        status: 502,
        headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders)
      });
    }

    const checkout = result.data.checkoutCreate.checkout;
    return new Response(JSON.stringify({ checkoutUrl: checkout.webUrl, checkoutId: checkout.id }), {
      status: 200,
      headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders)
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Exception', message: err.message }), {
      status: 500,
      headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders)
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
