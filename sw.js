/* Offline cache for the hosted web build. Not used by Electron or the iOS app (they bundle everything).
   App shell: network-first (so updates land). Images: cache-first. PeerJS signalling is never cached. */
const VERSION = 'bigcon-v1.5-1';
const SHELL = ['./', 'index.html', 'platform.js', 'vendor/peerjs.min.js', 'manifest.webmanifest', 'icon.png', 'favicon.ico'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;            // CDN / PeerJS cloud / STUN: pass through
  const isImg = /\.(png|jpe?g|gif|webp|ico)$/i.test(url.pathname);
  if (isImg) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })));
  } else {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req)));
  }
});
