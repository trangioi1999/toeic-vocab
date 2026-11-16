// Offline cache for the app (scope: /). Network first, cache as fallback; offline page loads get the app shell at '/'.
const VERSION = 'app-v5';
// No '/index.html': Cloudflare answers it with a redirect, and a redirected response can't serve a page load.
const CORE = ['/', '/manifest.webmanifest', '/icon-192.png']; // vocab.json may need a login: cached on first fetch
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

// Web push from FCM (data-only: { title, body, url }) → notification; a click opens or focuses the app.
self.addEventListener('push', e => {
  let d = {};
  try { const j = e.data ? e.data.json() : {}; d = j.data || j; } catch (err) { d = {}; }
  const title = d.title || 'Kho Từ TOEIC';
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || '', icon: '/icon-192.png', badge: '/icon-192.png', data: { url: d.url || '/' }, tag: d.url || 'app',
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const win = list.find(c => c.url && c.url.startsWith(self.location.origin));
    if (win) return win.focus().then(() => win.navigate(url));
    return self.clients.openWindow(url);
  }));
});
