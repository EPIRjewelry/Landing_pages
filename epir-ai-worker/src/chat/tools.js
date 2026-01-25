export const EPIR_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_stone_expertise',
      description:
        'Pobiera eksperckie informacje o kamieniu z metaobiektu stone_profile (twardość, mitologia, instrukcje pielęgnacji).',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['stone_name'],
        properties: {
          stone_name: {
            type: 'string',
            description: 'Nazwa kamienia (np. "Opal", "Diament", "Szafir").'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_granular_products',
      description:
        'Wyszukuje produkty używając Search API na podstawie metafields (custom.main_stone, custom.metal_type, custom.canonical_parent).',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          main_stone: {
            type: 'string',
            description: 'Główny kamień (metafield custom.main_stone).'
          },
          metal_type: {
            type: 'string',
            description: 'Typ metalu (metafield custom.metal_type), np. "Złoto 585".'
          },
          canonical_parent: {
            type: 'string',
            description: 'Identyfikator kolekcji/rodzica (metafield custom.canonical_parent).'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'match_set_items',
      description:
        'Wyszukuje produkty pasujące do zestawu na podstawie custom.set_reference.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['product_id'],
        properties: {
          product_id: {
            type: 'string',
            description: 'Globalny ID produktu Shopify (np. gid://shopify/Product/1234567890).'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_collection_story',
      description:
        'Pobiera opis filozofii kolekcji z metaobiektu collection_enhanced (pole philosophy).',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['collection_name'],
        properties: {
          collection_name: {
            type: 'string',
            description: 'Nazwa kolekcji (np. "Van Gogh").'
          }
        }
      }
    }
  }
];
