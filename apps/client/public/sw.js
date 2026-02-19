const CACHE_NAME = 'financeflow-v2'; // Increment version to trigger update
const urlsToCache = ['/', '/index.html', '/manifest.json', '/ff-icon.svg'];

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
  const url = new URL(event.request.url);

  // Skip service worker entirely for payment routes - no caching, no fallback
  if (url.pathname.includes('/payment/')) {
    event.respondWith(
      fetch(event.request).catch((error) => {
        console.error('Payment route fetch failed:', error);
        // Return a basic error response instead of trying to cache
        return new Response('Payment page loading...', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        });
      }),
    );
    return;
  }

  // Check if it's a navigation request (the main page)
  if (
    event.request.mode === 'navigate' ||
    (event.request.method === 'GET' &&
      event.request.headers.get('accept')?.includes('text/html'))
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Only cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
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
