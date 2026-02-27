// StaySharp Service Worker
// Auto-versioned: timestamp is injected by deploy script
const CACHE_VERSION = '1772222161';
const CACHE_NAME = `staysharp-${CACHE_VERSION}`;
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/knives.js',
    './data/static_knives.json',
    './manifest.json',
    './favicon.ico',
    './img/icon-192.png',
    './img/icon-512.png',
    './img/apple-touch-icon.png',
    './img/hero_bg.png',
    './img/empty_state.png',
    './img/result_bg.png',
    './images/schema_right.png',
    './images/schema_left.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k.startsWith('staysharp-') && k !== CACHE_NAME)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    const url = new URL(e.request.url);

    // HTML/CSS/JS: network-first (always fresh when online)
    if (e.request.mode === 'navigate' || url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
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

    // Images/fonts: cache-first (they rarely change)
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
