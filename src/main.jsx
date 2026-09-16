import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Branded startup splash: the full visible + fade-out startup experience is ~4 seconds.
// Keep this timer independent of React paint so the splash never flashes away early.
const BOOT_SPLASH_TOTAL_MS = 4000
const BOOT_SPLASH_FADE_MS = 420
window.setTimeout(() => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__hideBootSplash?.()
    })
  })
}, BOOT_SPLASH_TOTAL_MS - BOOT_SPLASH_FADE_MS)

// ----- PWA: in-place auto-update (same app, no reinstall) -----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // wait for the next activation so the phone can reload with the latest bundle
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing
        if (!sw) return
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            reg.update()
          }
        })
      })
      // re-check every 30 min so updates merge in silently while app is in background
      setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000)
    }).catch(() => {})
    // a new SW took control → reload once so the tab runs the fresh bundle
    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return
      reloading = true
      window.location.reload()
    })
  })
}
