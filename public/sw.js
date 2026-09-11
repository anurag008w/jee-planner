// sw.js — JEE Planner service worker v3 (silent in-place auto-update, no reinstall).
const CACHE = 'jee-planner-v3';
const ASSET_RE = /\/assets\/.+\.(js|css|woff2?|png|svg|webp|avif|json)$/;
const NAV_RE = /^\/(index\.html)?(\?.*)?$/;

self.addEventListener('install', (e) => {
  // take over immediately → next changes land in the SAME installed app moment update arrives
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    await self.clients.claim();
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // /api/* → network-first (live data from the planner server)
  if (req.url.includes('/api/')) {
    e.respondWith(networkFirst(req));
    return;
  }
  const u = new URL(req.url);
  const isNav = req.mode === 'navigate' || NAV_RE.test(u.pathname opera);
  if (isNav) {
    // app shell → network-first, fall back to cached copy (still opens offline)
    e.respondWith(networkFirst(req).catch(() => caches.match(req).then(m => m || caches.match('/'))));
    return;
  }
  if (ASSET_RE.test(u.pathname)) {
    // hashed assets are immutable → stale-while-revalidate keeps instant loads
    e.respondWith(staleWhileRevalidate(req));
  }
});

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res && (res.status === 200 || res.type === 'opaque')) {
      const copy = res.clone();
      const cache = await caches.open(CACHE);
      cache.put(req, copy);
    }
    return res;
  } catch (_) {
    return (await caches.match(req)) || Response.error();
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const fetchP = fetch(req)
    .then(res => {
      if (res && (res.status === 200 || res.type === 'opaque')) {
        cache.put(req, res.clone());
      }
      return res;
    })
    .catch(() => cached);
  return cached || fetchP;
}
