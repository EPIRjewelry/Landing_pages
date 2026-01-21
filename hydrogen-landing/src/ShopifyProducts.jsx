import React, { useEffect, useState } from 'react'

const SHOPIFY_DOMAIN = import.meta.env.VITE_STORE_DOMAIN || 'epirbizuteria.pl'
const STOREFRONT_TOKEN = import.meta.env.VITE_STOREFRONT_TOKEN
if (!STOREFRONT_TOKEN) console.warn('VITE_STOREFRONT_TOKEN is not set — Storefront API requests may fail')
const GRAPHQL_URL = `https://${SHOPIFY_DOMAIN}/api/2023-10/graphql.json`

function ProductModal({ product, onClose }) {
  const images = product.images?.edges?.map(edge => edge.node.src).filter(Boolean)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [product])

  if (!images?.length) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '1.5rem',
          padding: '1.5rem',
          maxWidth: 520,
          width: '90%',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        <img
          src={images[index]}
          alt={product.title}
          style={{ width: '100%', borderRadius: '1rem', marginBottom: '1rem', height: 320, objectFit: 'cover' }}
        />
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: '1rem' }}>
          {images.map((src, idx) => (
            <img
              key={src}
              src={src}
              alt={`Zdjęcie ${idx + 1}`}
              style={{
                width: 64,
                height: 64,
                objectFit: 'cover',
                borderRadius: 12,
                border: idx === index ? '2px solid var(--color-accent-gold)' : '1px solid #ccc',
                cursor: 'pointer'
              }}
              onClick={() => setIndex(idx)}
            />
          ))}
        </div>
        <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.3rem' }}>{product.title}</h3>
        <p style={{ margin: 0, color: '#5b4a3f' }}>{product.description}</p>
        <a
          href={`https://${SHOPIFY_DOMAIN}/products/${product.id.split('/').pop()}`}
          target='_blank'
          rel='noreferrer'
          style={{ display: 'inline-block', marginTop: '1rem', color: '#1b1004', fontWeight: 600 }}
        >
          Przejdź do sklepu ↗
        </a>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'transparent',
            border: 'none',
            fontSize: 24,
            cursor: 'pointer'
          }}
          aria-label='Zamknij'
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default function ShopifyProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeProduct, setActiveProduct] = useState(null)

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true)
      setError(null)
      try {
        const query = `query { products(first: 8) { edges { node { id title description images(first: 5) { edges { node { src altText } } } } } } }`
        const response = await fetch(GRAPHQL_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN
          },
          body: JSON.stringify({ query })
        })
        const json = await response.json()
        if (json.data?.products) {
          setProducts(json.data.products.edges.map(edge => edge.node))
        } else {
          setError('Brak danych z API')
        }
      } catch (err) {
        setError('Błąd pobierania: ' + err.message)
      }
      setLoading(false)
    }

    fetchProducts()
  }, [])

  if (loading) {
    return <p style={{ marginBottom: 0 }}>Ładowanie produktów...</p>
  }

  if (error) {
    return (
      <p style={{ color: 'red', marginBottom: 0 }}>
        Błąd: {error}
      </p>
    )
  }

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
          gap: 24,
          justifyItems: 'center'
        }}
      >
        {products.map(product => (
          <article
            key={product.id}
            style={{
              width: '100%',
              maxWidth: 280,
              borderRadius: '1.25rem',
              background: '#fdfbf7',
              boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
              padding: '1.25rem',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'transform 0.25s ease, box-shadow 0.25s ease'
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-6px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            onClick={() => setActiveProduct(product)}
          >
            <div style={{ borderRadius: '1rem', overflow: 'hidden', marginBottom: '1rem' }}>
              {product.images?.edges?.[0]?.node?.src ? (
                <img
                  src={product.images.edges[0].node.src}
                  alt={product.images.edges[0].node.altText || product.title}
                  style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{ height: 200, background: '#e8e4df', borderRadius: '1rem' }} />
              )}
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem' }}>{product.title}</h3>
            <p style={{ margin: 0, color: '#5b4a3f', fontSize: '0.95rem', minHeight: 48 }}>{product.description}</p>
          </article>
        ))}
      </div>
      {activeProduct && <ProductModal product={activeProduct} onClose={() => setActiveProduct(null)} />}
    </>
  )
}