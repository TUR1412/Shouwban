/* Service Worker (PWA)
   - Cache version follows asset query: 20251222.3
   - Strategy:
     - HTML navigation: network-first, fallback to offline.html
     - Static assets: cache-first, runtime cache update
*/

const CACHE_NAME = 'shouwban-20251222.3';

const PRECACHE_URLS = [
  'index.html',
  'products.html',
  'category.html',
  'product-detail.html',
  'cart.html',
  'checkout.html',
  'compare.html',
  'account.html',
  'orders.html',
  'order-success.html',
  'static-page.html',
  'favorites.html',
  '404.html',
  'offline.html',

  'styles/main.css?v=20251222.3',
  'styles/extensions.css?v=20251222.3',
  'scripts/motion.js?v=20251222.3',
  'scripts/core.js?v=20251222.3',
  'scripts/main.js?v=20251222.3',

  'assets/favicon.svg',
  'assets/manifest.webmanifest',

  'assets/images/hero-placeholder.svg',
  'assets/images/placeholder-about.svg',
  'assets/images/placeholder-lowquality.svg',
  'assets/images/empty-collector.svg',
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

self.addEventListener('message', (event) => {
  const data = event?.data;
  if (data && data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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

function fetchWithTimeout(request, timeoutMs) {
  const ms = Number(timeoutMs) || 0;
  if (ms <= 0) return fetch(request);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('SW fetch timeout')), ms);
    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (!isSameOrigin(request)) return;

  if (isNavigationRequest(request)) {
    event.respondWith(
      fetchWithTimeout(request, 4500)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            try {
              const url = new URL(request.url);
              if (url.pathname.endsWith('/')) return caches.match('index.html');
            } catch {
              // ignore
            }
            return caches.match('offline.html');
          }),
        ),
    );
    return;
  }

  // 静态资源：stale-while-revalidate（先用缓存保证速度，再后台更新）
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          // 仅缓存成功响应（避免缓存 404/opaque）
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(fetchPromise.catch(() => {}));
        return cached;
      }

      return fetchPromise.then((r) => r || new Response('', { status: 504, statusText: 'Offline' }));
    }),
  );
});
