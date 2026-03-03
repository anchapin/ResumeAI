const CACHE_NAME = 'resumeai-cache-v1';
const ASSETS_TO_CACHE = ['/', '/index.html', '/manifest.json', '/favicon.ico'];

// Install event - caching basic assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
  self.skipWaiting();
});

// Activate event - cleaning up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

// Fetch event - Stale-While-Revalidate for assets, Network-First for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls - Network-First
  if (url.pathname.startsWith('/api/v1/') || url.pathname.startsWith('/generate/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful GET requests
          if (event.request.method === 'GET' && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        }),
    );
    return;
  }

  // Static assets - Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    }),
  );
});
