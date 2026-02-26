// StaySharp Service Worker v2.1
// Change CACHE_VERSION on every deploy to trigger update
const CACHE_VERSION = '2.1.0';
const CACHE_NAME = `staysharp-${CACHE_VERSION}`;
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/knives.js',
    './data/static_knives.json',
    './manifest.json',
    './img/icon-192.png',
    './img/icon-512.png',
    './img/apple-touch-icon.png',
    './img/hero_bg.png',
    './img/empty_state.png',
    './img/result_bg.png',
    './images/schema_right.png',
    './images/schema_left.png'
];

// Install: cache all assets, activate immediately
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting(); // Activate new SW immediately
});

// Activate: delete old caches, claim all clients
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k.startsWith('staysharp-') && k !== CACHE_NAME)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim()) // Take control immediately
    );
});

// Fetch: network-first for HTML, cache-first for assets
self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;

    const url = new URL(e.request.url);

    // HTML pages: try network first (always get latest)
    if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
        e.respondWith(
            fetch(e.request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                    return response;
                })
                .catch(() => caches.match(e.request) || caches.match('./index.html'))
        );
        return;
    }

    // CSS/JS: stale-while-revalidate (serve cached, update in background)
    if (url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
        e.respondWith(
            caches.match(e.request).then(cached => {
                const fetchPromise = fetch(e.request).then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                    }
                    return response;
                });
                return cached || fetchPromise;
            })
        );
        return;
    }

    // Everything else (images, fonts): cache-first
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return response;
            });
        }).catch(() => caches.match('./index.html'))
    );
});
