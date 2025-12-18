/* Service Worker (PWA)
   - Cache version follows asset query: 20251218.1
   - Strategy:
     - HTML navigation: network-first, fallback to offline.html
     - Static assets: cache-first, runtime cache update
*/

const CACHE_NAME = 'shouwban-20251218.1';

const PRECACHE_URLS = [
  'index.html',
  'products.html',
  'category.html',
  'product-detail.html',
  'cart.html',
  'checkout.html',
  'static-page.html',
  'favorites.html',
  '404.html',
  'offline.html',

  'styles/main.css?v=20251218.1',
  'styles/extensions.css?v=20251218.1',
  'scripts/main.js?v=20251218.1',

  'assets/favicon.svg',
  'assets/manifest.webmanifest',

  'assets/images/hero-placeholder.svg',
  'assets/images/placeholder-about.svg',
  'assets/images/placeholder-lowquality.svg',
  'assets/images/figurine-1.svg',
  'assets/images/figurine-2.svg',
  'assets/images/figurine-3.svg',
  'assets/images/figurine-4.svg',
  'assets/images/figurine-5.svg',
  'assets/images/figurine-6.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isSameOrigin(request) {
  try {
    const url = new URL(request.url);
    return url.origin === self.location.origin;
  } catch {
    return false;
  }
}

function isNavigationRequest(request) {
  if (request.mode === 'navigate') return true;
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (!isSameOrigin(request)) return;

  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match('offline.html')),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      });
    }),
  );
});

