import { shopifyFetch } from './client'

const COLLECTION_FIELDS = `
  id
  title
  handle
  description
  descriptionHtml
  image { url altText width height }
  moodImage: metafield(namespace: "custom", key: "mood_image") {
    reference {
      ... on MediaImage {
        image { url altText width height }
      }
    }
  }
  brandStory: metafield(namespace: "custom", key: "brand_story") { value }
  accentColor: metafield(namespace: "custom", key: "accent_color") { value }
`

function mapCollection(node) {
  if (!node) return null

  const moodImage = node.moodImage?.reference?.image
    ? {
        url: node.moodImage.reference.image.url,
        altText: node.moodImage.reference.image.altText || node.title
      }
    : null

  const image = node.image
    ? {
        url: node.image.url,
        altText: node.image.altText || node.title
      }
    : null

  return {
    id: node.id,
    title: node.title,
    handle: node.handle,
    description: node.description,
    descriptionHtml: node.descriptionHtml,
    image,
    moodImage,
    brandStory: node.brandStory?.value || '',
    accentColor: node.accentColor?.value || ''
  }
}

export async function fetchFeaturedCollection(handle) {
  if (handle) {
    const query = `query getCollection($handle: String!) {
      collection(handle: $handle) {
        ${COLLECTION_FIELDS}
      }
    }`

    const data = await shopifyFetch({ query, variables: { handle } })
    return mapCollection(data?.collection)
  }

  const query = `query getCollections {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
      edges { node { ${COLLECTION_FIELDS} } }
    }
  }`

  const data = await shopifyFetch({ query })
  const node = data?.collections?.edges?.[0]?.node
  return mapCollection(node)
}
