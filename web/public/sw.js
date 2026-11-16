// Offline cache for the app (scope: /). Network first, cache as fallback; page loads fall back to the app shell.
const VERSION = 'app-v2';
const CORE = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/vocab.json'];
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
      .catch(() => caches.match(e.request).then(m => m || (nav ? caches.match('/index.html') : undefined)))
  );
});
