/**
 * KILL SWITCH SERVICE WORKER
 * This service worker clears all caches and unregisters itself.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            return caches.delete(cacheName);
          }),
        );
      })
      .then(() => {
        return self.registration.unregister();
      })
      .then(() => {
        return self.clients.matchAll();
      })
      .then((clients) => {
        clients.forEach((client) => client.navigate(client.url));
      }),
  );
});

console.log('[SW] Kill-switch active. Caches cleared and SW unregistered.');
