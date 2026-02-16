// Service Worker for Merhav Hadaat — Offline Support
const CACHE_NAME = 'merhav-hadaat-v12';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './styles-modals.css',
    './data.js',
    './app.js',
    './manifest.json',
    './icon.svg',
    './icon-192.png',
    './icon-512.png',
    'https://fonts.googleapis.com/css2?family=Assistant:wght@200;300;400;600;700;800&family=Frank+Ruhl+Libre:wght@300;400;500;700;900&display=swap'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (response.ok && event.request.method === 'GET') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                if (event.request.destination === 'document') return caches.match('./index.html');
            });
        })
    );
});
