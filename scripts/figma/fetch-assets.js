#!/usr/bin/env node
// Minimal assets fetcher placeholder for Figma -> generated/assets-map.json
// Usage: node fetch-assets.js [--dry]
const fs = require('fs')
const path = require('path')

const DRY = process.argv.includes('--dry')
const OUT_DIR = path.resolve(__dirname, '..', '..', 'generated')
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

async function main() {
  const FIGMA_TOKEN = process.env.FIGMA_TOKEN
  const FILE_KEY = process.env.FIGMA_FILE_KEY

  if (DRY || !FIGMA_TOKEN || !FILE_KEY) {
    console.log('Dry mode or missing envs — writing example assets-map')
    const example = {
      assets: {
        'icon-cart': 'https://cdn.example.com/assets/icon-cart-v1.svg',
        'hero-01': 'https://cdn.example.com/assets/hero-01-v1.jpg'
      }
    }
    fs.writeFileSync(path.join(OUT_DIR, 'assets-map.json'), JSON.stringify(example, null, 2))
    console.log('Wrote example assets-map to', OUT_DIR)
    return
  }

  // Best-effort: call Figma images API to get image urls (map only)
  const fetch = global.fetch || require('node-fetch')
  try {
    const params = new URLSearchParams({ format: 'png' })
    const url = `https://api.figma.com/v1/images/${FILE_KEY}?${params.toString()}`
    const res = await fetch(url, { headers: { 'X-Figma-Token': FIGMA_TOKEN } })
    if (!res.ok) throw new Error('Figma images API error: ' + res.status)
    const data = await res.json()
    // data.images is id->url map; we create a trivial assets map referencing node ids
    const assets = {}
    for (const id of Object.keys(data.images || {})) {
      assets[id] = data.images[id]
    }
    fs.writeFileSync(path.join(OUT_DIR, 'assets-map.json'), JSON.stringify({ assets }, null, 2))
    console.log('Wrote assets-map.json to', OUT_DIR)
  } catch (e) {
    console.error('Error fetching images from Figma:', e.message)
    process.exitCode = 2
  }
}

main()
