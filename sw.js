const CACHE_NAME = 'fatura-hesaplama-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// Yükleme (install) olayında önbelleği oluştur ve dosyaları ekle
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Önbellek açıldı');
                return cache.addAll(urlsToCache);
            })
    );
});

// Getirme (fetch) olayında önbelleği kontrol et
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Eğer istek önbellekte varsa, oradan döndür.
                if (response) {
                    return response;
                }
                // Yoksa, ağı kullanarak isteği yap.
                return fetch(event.request);
            })
    );
});