// Client-side loader: pobiera produkty typu Ring z serwera i podmienia config.sections.products.items
window.loadShopifyRings = async function() {
  try {
    const resp = await fetch('/api/shopify-rings');
    if (!resp.ok) {
      console.warn('shopify-rings fetch failed', resp.status);
      return;
    }
    const data = await resp.json();
    if (!data || !Array.isArray(data.products)) return;

    // Ensure global config exists
    if (typeof config !== 'object' || !config.sections) {
      console.warn('Config not loaded yet');
      return;
    }

    // Map to expected format by renderProducts()
    const items = data.products.map((p, idx) => ({
      id: idx + 1,
      shopify_product_id: p.shopify_product_id,
      name: p.name,
      description: p.description,
      price: p.price || '',
      image: p.image || '/images/rings/placeholder.jpg',
      cta_text: p.cta_text || 'Zobacz w sklepie',
      variants: p.variants || [],
      onlineStoreUrl: p.onlineStoreUrl || ''
    }));

    // Replace products in config
    if (!config.sections.products) config.sections.products = { active: true, title: 'Nasza Kolekcja', subtitle: '', items: [] };
    config.sections.products.items = items;

    // Re-render products if function available
    if (typeof renderProducts === 'function') {
      renderProducts();
    }

    console.log('✅ Loaded Shopify rings:', items.length);
  } catch (err) {
    console.warn('Error loading shopify rings:', err);
  }
};
