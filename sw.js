// Offline cache: app shell + data. Bump VERSION when files change.
const VERSION='v6';
const CORE=['./','index.html','vocab.json','manifest.webmanifest','icon-192.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  // network first (fresh content), fall back to cache when offline
  e.respondWith(fetch(e.request).then(r=>{if(r.ok&&(new URL(e.request.url).origin===location.origin||/fonts\.(googleapis|gstatic)\.com/.test(e.request.url))){const c=r.clone();caches.open(VERSION).then(x=>x.put(e.request,c))}return r})
    .catch(()=>caches.match(e.request).then(m=>m||caches.match('index.html'))));
});
