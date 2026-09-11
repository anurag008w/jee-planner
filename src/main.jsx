import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ----- PWA: in-place auto-update (same app, no reinstall) -----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // wait for the next activation so the phone can reload with the latest bundle
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            reg.update();
          }
        });
      });
      // re-check every 30 min so updates merge in silently while app is in background
      setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
    }).catch(() => {});
    // a new SW took control → reload once so the tab runs the fresh bundle
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  });
}