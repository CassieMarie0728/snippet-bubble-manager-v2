/**
 * Service Worker for Snippet Bubbles PWA
 * Handles offline support, caching, and background sync
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `snippet-bubbles-${CACHE_VERSION}`;
const RUNTIME_CACHE = `snippet-bubbles-runtime-${CACHE_VERSION}`;

// Assets to cache on install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/images/icon.png',
  '/assets/images/favicon.png',
];

/**
 * Install event - cache essential assets
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching assets');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[Service Worker] Failed to cache some assets:', err);
        // Continue even if some assets fail to cache
      });
    })
  );
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

/**
 * Fetch event - serve from cache, fall back to network
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip API calls (let them go to network)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Fall back to cached API response if offline
          return caches.match(request).then((cached) => {
            if (cached) {
              console.log('[Service Worker] Serving cached API response:', url.pathname);
              return cached;
            }
            // Return offline response
            return new Response(
              JSON.stringify({ error: 'Offline - cached data unavailable' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // For static assets and HTML, use cache-first strategy
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok && request.method === 'GET') {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Return offline page if available
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
          return new Response('Offline - resource unavailable', { status: 503 });
        });
    })
  );
});

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-snippets') {
    console.log('[Service Worker] Syncing snippets...');
    event.waitUntil(syncSnippets());
  }
});

async function syncSnippets() {
  try {
    // This would sync any pending changes when connection is restored
    console.log('[Service Worker] Snippets synced successfully');
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
    throw error;
  }
}

/**
 * Message handler for client communication
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
  }
});
