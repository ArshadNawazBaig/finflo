const CACHE_NAME = 'loanmaster-v2'; // Increment version to trigger update
const urlsToCache = ['/', '/index.html', '/manifest.json'];

// Install event - Cache initial assets
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Immediate activation of new service worker
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)),
  );
});

// Activate event - Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(), // Take control of all open clients
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Clearing old cache:', cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      }),
    ]),
  );
});

// Fetch event - Network First for HTML/navigation, Cache First for assets
self.addEventListener('fetch', (event) => {
  // Check if it's a navigation request (the main page)
  if (
    event.request.mode === 'navigate' ||
    (event.request.method === 'GET' &&
      event.request.headers.get('accept').includes('text/html'))
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Update cache with latest version
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(event.request);
        }),
    );
    return;
  }

  // Common assets - Cache first
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }),
  );
});
