// Minimal Service Worker - Sadece uygulamanın yüklenebilir (PWA) olmasını sağlar
self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    // Offline ilk yaklaşım veritabanında olduğu için burada sadece pass-through yapıyoruz
});
