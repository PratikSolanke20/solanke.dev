/**
 * AyurSkin Pro — Service Worker
 * Enables PWA installability, offline capability, and background sync.
 * This SW implements a "Network First" strategy for API calls
 * and "Cache First" for static assets.
 */

const CACHE_NAME = 'ayurskin-pro-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Static assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/scan.html',
  '/blog.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/hero_3d.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// ============================================================
// INSTALL EVENT — Pre-cache critical assets
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[AyurSkin SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[AyurSkin SW] Pre-caching assets');
        // Use addAll for critical assets, individual adds for external (may fail)
        return cache.addAll([
          '/',
          '/index.html',
          '/scan.html',
          '/blog.html',
          '/style.css',
          '/hero_3d.png',
          '/manifest.json',
          '/icons/icon-192x192.png',
          '/icons/icon-512x512.png'
        ]);
      })
      .then(() => {
        console.log('[AyurSkin SW] Pre-cache complete');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((err) => {
        console.warn('[AyurSkin SW] Pre-cache partial failure (non-critical):', err);
      })
  );
});

// ============================================================
// ACTIVATE EVENT — Clean up old caches
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[AyurSkin SW] Activating...');
  event.waitUntil(
    Promise.all([
      // Remove outdated caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[AyurSkin SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Take control of all open clients immediately
      self.clients.claim()
    ])
  );
  console.log('[AyurSkin SW] Active and controlling all pages');
});

// ============================================================
// FETCH EVENT — Intelligent caching strategy
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // --- Strategy 1: Network-only for API calls ---
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'You are offline. Please check your internet connection.' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // --- Strategy 2: Network-only for non-GET requests ---
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // --- Strategy 3: Cache First, falling back to Network for static assets ---
  if (
    url.origin === location.origin ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Serve from cache, but update cache in background (stale-while-revalidate)
            const fetchPromise = fetch(request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  const responseClone = networkResponse.clone();
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseClone);
                  });
                }
                return networkResponse;
              })
              .catch(() => {});
            return cachedResponse;
          }

          // Not in cache — fetch from network and cache it
          return fetch(request)
            .then((networkResponse) => {
              if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
                return networkResponse;
              }
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
              return networkResponse;
            })
            .catch(() => {
              // Offline fallback for HTML pages
              if (request.destination === 'document') {
                return caches.match('/index.html');
              }
              return new Response('', { status: 408, statusText: 'Offline' });
            });
        })
    );
    return;
  }

  // --- Default: Network First ---
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

// ============================================================
// BACKGROUND SYNC — For future offline scan queueing
// ============================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-scan-results') {
    console.log('[AyurSkin SW] Background sync triggered');
  }
});

// ============================================================
// PUSH NOTIFICATIONS — Ready for future implementation
// ============================================================
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'AyurSkin Pro';
  const options = {
    body: data.body || 'Your skin analysis is ready!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data.url;
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

console.log('[AyurSkin SW] Service Worker loaded ✅');
