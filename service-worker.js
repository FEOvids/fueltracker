const CACHE_NAME = 'fueltracker-v3-offline';

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll([
        '/',
        '/index.html',
        '/manifest.json'
    ])));
    self.skipWaiting();
});

self.addEventListener('fetch', e => {
    // Don't cache maps or geocoding APIs to avoid stale location data
    if (e.request.url.includes('nominatim') || e.request.url.includes('cartocdn')) return; 
    
    e.respondWith(
        caches.match(e.request).then(res => {
            return res || fetch(e.request).catch(() => caches.match('/'));
        })
    );
});