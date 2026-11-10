import React from 'react'
import ReactDOM from 'react-dom/client'
import { Buffer } from 'buffer'
import { Providers } from './wallet/Providers'
import { AuthProvider } from './lib/auth'
import App from './App'
import './styles.css'
import cfg from './config/config.json'
import { activeNetworks, names } from './config/chains'
import { netTheme } from './components/Chain'

;(globalThis as { Buffer?: typeof Buffer }).Buffer ??= Buffer

// Single mode: the whole UI takes the network's colors. Multi mode: brand turquoise + 4-chain strip.
Object.entries(netTheme()).forEach(([k, v]) => document.documentElement.style.setProperty(k, v))
document.title = `${cfg.brand} — ${cfg.tagline}`
document.querySelector('meta[name="description"]')?.setAttribute('content', `${cfg.positioning} Pay creators in $${cfg.symbol} on ${names(activeNetworks, 'and')}.`)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers><AuthProvider><App /></AuthProvider></Providers>
  </React.StrictMode>,
)
