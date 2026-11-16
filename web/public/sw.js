// Offline cache for the app (scope: /). Network first, cache as fallback; offline page loads get the app shell at '/'.
const VERSION = 'app-v3';
// No '/index.html': Cloudflare answers it with a redirect, and a redirected response can't serve a page load.
const CORE = ['/', '/manifest.webmanifest', '/icon-192.png', '/vocab.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('app-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const cacheable = url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!cacheable) return;
  const nav = e.request.mode === 'navigate';
  e.respondWith(
    fetch(e.request).then(r => { if (r.ok && !nav) { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); } return r; })
      .catch(() => caches.match(e.request).then(m => m || (nav ? caches.match('/') : undefined)))
  );
});
