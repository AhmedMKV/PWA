const CACHE_NAME = "zaq_myapp_v4";
const API_URL = "https://jsonplaceholder.typicode.com/posts?_limit=5";

// Static assets to cache
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './offline-message.json',
    './images/icons/web-app-manifest-192x192.png',
    './images/icons/web-app-manifest-512x512.png'
];

// Install event — cache static files AND posts
self.addEventListener('install', (event) => {
    console.log('SW: Installing...');
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            await cache.addAll(urlsToCache);

            // Cache posts just like icons
            try {
                const response = await fetch(API_URL);
                if (response.ok) {
                    await cache.put(API_URL, response.clone());
                    console.log('SW: Posts cached during install.');
                }
            } catch (err) {
                console.warn('SW: Could not fetch posts during install.', err);
            }

            self.skipWaiting();
        })()
    );
});

// Activate event — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch event — serve from cache when offline
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Handle posts API requests
    if (event.request.url.startsWith(API_URL.split('?')[0])) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (response.ok) {
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(API_URL, response.clone());
                        });
                    }
                    return response;
                })
                .catch(() => {
                    console.log('SW: Serving cached posts.');
                    return caches.match(API_URL)
                        .then(cached => cached || caches.match('./offline-message.json'));
                })
        );
        return;
    }

    // Handle other requests
    event.respondWith(
        caches.match(event.request).then(response =>
            response || fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            })
        )
    );
});
