import React from 'react'
import { createRoot } from 'react-dom/client'

import './styles/tailwind.css'
import App from './App'
import ShopifyProducts from './ShopifyProducts'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
