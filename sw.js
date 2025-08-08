const CACHE_NAME = "zaq_myapp_v3";
const API_URL = "https://jsonplaceholder.typicode.com/posts?_limit=5";

// Files to pre-cache
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

// Install — cache static files AND API data
self.addEventListener('install', (event) => {
    console.log('myApp: installing ...');
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            console.log('myApp SW: Cache opened -', CACHE_NAME);
            await cache.addAll(urlsToCache);

            // Try to fetch and cache API data
            try {
                const response = await fetch(API_URL);
                if (response.ok) {
                    await cache.put(API_URL, response.clone());
                    console.log('myApp SW: API data cached during install.');
                }
            } catch (err) {
                console.warn('myApp SW: Could not fetch API data during install (offline?)');
            }

            self.skipWaiting();
        })()
    );
});

// Activate — remove old caches
self.addEventListener('activate', (event) => {
    console.log('myApp: activating ...');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => {
                        console.log('myApp SW: Deleting old cache:', key);
                        return caches.delete(key);
                    })
            );
        }).then(() => {
            self.clients.claim();
        })
    );
});

// Fetch handler
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Ignore extension requests
    if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
        return;
    }

    // Handle API requests for posts
    if (event.request.url.startsWith(API_URL.split('?')[0])) {
        event.respondWith(
            caches.match(API_URL).then((cachedResponse) => {
                const networkFetch = fetch(event.request)
                    .then((response) => {
                        if (response.ok) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(API_URL, response.clone());
                            });
                        }
                        return response;
                    })
                    .catch(() => {
                        console.warn('myApp SW: Network failed for API.');
                        return cachedResponse || caches.match('./offline-message.json');
                    });

                return networkFetch;
            })
        );
        return;
    }

    // Handle other static files
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).catch(() => {
                console.warn('myApp SW: Static request failed, offline.');
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
