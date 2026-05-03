const CACHE_NAME = 'zowe-v15';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/style.css',
  '/images/zoe.jpg',
  '/images/signature_zoe_premium.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-HTTP et extensions navigateur
  if (!url.protocol.startsWith('http')) return;

  // /admin/* toujours Network First — jamais mis en cache
  if (url.pathname.startsWith('/admin')) {
    event.respondWith(fetch(request));
    return;
  }

  // Network first pour les pages HTML et les fonctions Netlify
  if (request.mode === 'navigate' || url.pathname.startsWith('/.netlify/')) {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Cache first pour les assets statiques
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      }).catch(() => caches.match('/offline.html'));
    })
  );
});
