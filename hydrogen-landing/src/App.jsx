import React from 'react'
import ShopifyProducts from './ShopifyProducts'

export default function App() {
  return (
    <div style={{fontFamily: 'system-ui, sans-serif', color: '#121212', background:'#f9f7f4', minHeight:'100vh'}}>
      <header style={{padding:'48px 24px', textAlign:'center'}}>
        <p style={{letterSpacing:'0.2em', fontSize:12, color:'#7a6f63'}}>EPIR ART JEWELLERY</p>
        <h1 style={{fontSize:40, margin:'12px 0'}}>Organiczna biżuteria z natury</h1>
        <p style={{maxWidth:720, margin:'0 auto', fontSize:16, color:'#4a433d'}}>
          Ręcznie tworzone pierścionki, kolczyki i wisiory z kamieniami szlachetnymi. Edytuj ten landing, dodaj CTA i sekcje kolekcji.
        </p>
        <div style={{marginTop:24, display:'flex', justifyContent:'center', gap:12}}>
          <a href="https://epirbizuteria.pl/collections/nowosci-1" target="_blank" rel="noreferrer" style={{padding:'12px 20px', background:'#121212', color:'#fff', borderRadius:8, textDecoration:'none'}}>Zobacz nowości</a>
          <a href="https://epirbizuteria.pl" target="_blank" rel="noreferrer" style={{padding:'12px 20px', border:'1px solid #121212', color:'#121212', borderRadius:8, textDecoration:'none'}}>Przejdź do sklepu</a>
        </div>
      </header>

      <main style={{padding:'0 24px 64px'}}>
        <section style={{maxWidth:1100, margin:'0 auto'}}>
          <h2 style={{fontSize:28, textAlign:'center', marginBottom:8}}>Wybrane produkty</h2>
          <p style={{textAlign:'center', color:'#4a433d', marginBottom:32}}>Ładowane dynamicznie z Shopify Storefront API.</p>
          <ShopifyProducts />
        </section>
      </main>

      <footer style={{padding:'32px 24px', textAlign:'center', background:'#ece7df', color:'#3a332d'}}>
        <p>EPIR Jewellery — Wrocław | Ręcznie tworzone kolekcje inspirowane naturą</p>
      </footer>
    </div>
  )
}
