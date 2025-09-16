const CACHE_NAME = 'vivarch-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/qr-code-generator.html',
  '/mobile-quoter.html',
  '/zone-allocation.html',
  '/url-shortening-service.html',
  '/programme survey/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icon.png',
  '/logo.png',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Navigation requests: network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return res;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For other requests: cache-first then network
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      return res;
    })).catch(() => {})
  );
});
