/**
 * Pages Function - Shopify Rings
 * GET /api/shopify-rings
 * Pobiera produkty typu "Ring" z Storefront API używając sekretu env.SHOPIFY_STOREFRONT_TOKEN
 */

export async function onRequestGet(context) {
  const { env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  const token = env.SHOPIFY_STOREFRONT_TOKEN || '';
  const shopDomain = env.SHOP_DOMAIN || '';

  if (!token || !shopDomain) {
    return new Response(JSON.stringify({ error: 'Shopify token or domain not configured' }), {
      status: 500,
      headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders)
    });
  }

  const graphql = `query fetchRings($first: Int = 24, $productType: String = "Ring") {
    products(first: $first, query: "product_type:$productType") {
      edges {
        node {
          id
          title
          handle
          description
          images(first: 4) { edges { node { url altText } } }
          variants(first: 10) { edges { node { id sku title priceV2 { amount currencyCode } availableForSale } } }
          onlineStoreUrl
        }
      }
    }
  }`;

  try {
    const resp = await fetch(`https://${shopDomain}/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': token
      },
      body: JSON.stringify({ query: graphql })
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: 'Shopify request failed', details: text }), {
        status: 502,
        headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders)
      });
    }

    const data = await resp.json();
    const products = (data.data && data.data.products && data.data.products.edges) ? data.data.products.edges.map(e => e.node) : [];

    const mapped = products.map(p => {
      const firstImage = (p.images && p.images.edges && p.images.edges[0]) ? p.images.edges[0].node.url : '/images/rings/placeholder.jpg';
      const variants = (p.variants && p.variants.edges) ? p.variants.edges.map(v => ({ id: v.node.id, title: v.node.title, price: v.node.priceV2 && v.node.priceV2.amount })) : [];
      const minPrice = variants.length ? variants[0].price : null;
      return {
        shopify_product_id: p.id,
        name: p.title,
        description: (p.description || '').substring(0, 200),
        price: minPrice ? `${minPrice} ${variants[0].priceV2 ? variants[0].priceV2.currencyCode : ''}` : '',
        image: firstImage,
        variants: variants,
        onlineStoreUrl: p.onlineStoreUrl || '' ,
        cta_text: 'Zobacz w sklepie'
      };
    });

    return new Response(JSON.stringify({ products: mapped }), {
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

// OPTIONS for CORS
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
