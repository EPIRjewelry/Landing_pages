export const SHOPIFY_DOMAIN = import.meta.env.VITE_STORE_DOMAIN || 'epirbizuteria.pl'
export const STOREFRONT_TOKEN = import.meta.env.VITE_STOREFRONT_TOKEN
export const STOREFRONT_API_VERSION = import.meta.env.VITE_STOREFRONT_API_VERSION || '2024-10'

const GRAPHQL_URL = `https://${SHOPIFY_DOMAIN}/api/${STOREFRONT_API_VERSION}/graphql.json`

export async function shopifyFetch({ query, variables }) {
  if (!STOREFRONT_TOKEN) {
    throw new Error('Brak VITE_STOREFRONT_TOKEN. Uzupełnij .env')
  }

  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN
    },
    body: JSON.stringify({ query, variables })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Shopify API error (${response.status}): ${text}`)
  }

  const json = await response.json()
  if (json.errors?.length) {
    throw new Error(json.errors.map(err => err.message).join('; '))
  }

  return json.data
}
