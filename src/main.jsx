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

const RELEASE_API = 'https://api.github.com/repos/anurag008w/jee-planner/releases/latest'
const AUTO_UPDATE_KEY = 'jee-planner-auto-updates'
const LAST_CHECK_KEY = 'jee-planner-last-update-check'
const LAST_RELEASE_KEY = 'jee-planner-latest-release'

const shouldAutoUpdateCheck = () => {
  try {
    return localStorage.getItem(AUTO_UPDATE_KEY) !== 'false'
  } catch {
    return true
  }
}

const checkLatestGitHubRelease = async () => {
  if (!shouldAutoUpdateCheck()) return
  try {
    const res = await fetch(RELEASE_API, { headers: { Accept: 'application/vnd.github+json' } })
    if (!res.ok) return
    const data = await res.json()
    localStorage.setItem(LAST_RELEASE_KEY, JSON.stringify(data))
    localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString())
    window.dispatchEvent(new CustomEvent('jee-planner-release-checked', { detail: data }))
  } catch {
    // Offline/GitHub unavailable: keep the last known release information.
  }
}

// ----- PWA: in-place auto-update + GitHub release awareness -----
// The user can disable all periodic update checks from Settings → Updates.
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

      checkLatestGitHubRelease()

      setInterval(() => {
        if (!shouldAutoUpdateCheck()) return
        reg.update().catch(() => {})
        checkLatestGitHubRelease()
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
