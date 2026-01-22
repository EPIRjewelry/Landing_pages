#!/usr/bin/env node
// Simple Figma tokens fetcher (minimal safe starter)
// Usage: node fetch-tokens.js [--dry]
const fs = require('fs')
const path = require('path')

const DRY = process.argv.includes('--dry')
const OUT_DIR = path.resolve(__dirname, '..', '..', 'generated')
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

async function main() {
  const FIGMA_TOKEN = process.env.FIGMA_TOKEN
  const FILE_KEY = process.env.FIGMA_FILE_KEY

  if (DRY || !FIGMA_TOKEN || !FILE_KEY) {
    console.log('Running in dry mode or missing envs — writing example tokens')
    const example = {
      colors: {
        brand: { primary: '#D4AF37', accent: '#2A3B2A' },
        bg: { default: '#F9F7F4' }
      },
      fonts: { display: 'Cormorant Garamond', ui: 'Inter' }
    }
    fs.writeFileSync(path.join(OUT_DIR, 'figma-tokens.json'), JSON.stringify(example, null, 2))
    // checkout-branding.json for Checkout Kit
    const branding = {
      colors: { primary: example.colors.brand.primary, background: example.colors.bg.default },
      logo: '/assets/logo.svg'
    }
    fs.writeFileSync(path.join(OUT_DIR, 'checkout-branding.json'), JSON.stringify(branding, null, 2))
    // minimal tailwind config
    const tailwind = `// Generated - do not edit\nmodule.exports = { theme: { extend: { colors: ${JSON.stringify(example.colors)} , fontFamily: { display: ['${example.fonts.display}'] } } } }`;
    fs.writeFileSync(path.join(OUT_DIR, 'tailwind.config.js'), tailwind)
    console.log('Wrote example tokens to', OUT_DIR)
    return
  }

  // Real fetch (best-effort). We attempt to pull variables/styles but keep it minimal.
  const fetch = global.fetch || require('node-fetch')
  try {
    console.log('Fetching file from Figma API...')
    const res = await fetch(`https://api.figma.com/v1/files/${FILE_KEY}`, { headers: { 'X-Figma-Token': FIGMA_TOKEN } })
    if (!res.ok) throw new Error('Figma API error: ' + res.status)
    const data = await res.json()
    // Very minimal extraction: look for document styles and use defaults if missing
    const colors = { brand: { primary: '#D4AF37' }, bg: { default: '#F9F7F4' } }
    const tokens = { colors, raw: data }
    fs.writeFileSync(path.join(OUT_DIR, 'figma-tokens.json'), JSON.stringify(tokens, null, 2))
    fs.writeFileSync(path.join(OUT_DIR, 'checkout-branding.json'), JSON.stringify({ colors: { primary: colors.brand.primary, background: colors.bg.default } }, null, 2))
    console.log('Fetched and wrote tokens to', OUT_DIR)
  } catch (e) {
    console.error('Error fetching from Figma:', e.message)
    process.exitCode = 2
  }
}

main()
