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
const BOOT_SPLASH_TOTAL_MS = 4000
const BOOT_SPLASH_FADE_MS = 420
window.setTimeout(() => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__hideBootSplash?.()
    })
  })
}, BOOT_SPLASH_TOTAL_MS - BOOT_SPLASH_FADE_MS)

const shouldAutoUpdateCheck = () => {
  try {
    return localStorage.getItem('jee-planner-auto-updates') !== 'false'
  } catch {
    return true
  }
}

// ----- PWA: in-place auto-update -----
// The user can disable periodic checks from Settings → Updates.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing
        if (!sw) return
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller && shouldAutoUpdateCheck()) {
            reg.update().catch(() => {})
          }
        })
      })

      // Keep update checks user-controlled. Default is ON; Settings can switch it OFF.
      setInterval(() => {
        if (shouldAutoUpdateCheck()) reg.update().catch(() => {})
      }, 30 * 60 * 1000)
    }).catch(() => {})

    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return
      reloading = true
      window.location.reload()
    })
  })
}
