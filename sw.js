const CACHE_NAME = 'manantial-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles/tailwind.css',
  './styles/custom.css',
  './app/main.js',
  './data/horarios.json', // <-- Ruta actualizada aquí
  './assets/img/manantialtours_logo.jpg',
  './assets/img/hyundai_h350.jpg',
  './assets/img/dfsk_glory580.jpg'
];

// Instalar el Service Worker y guardar archivos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Archivos guardados en caché exitosamente');
        return cache.addAll(urlsToCache);
      })
  );
});

// Interceptar peticiones para servir desde caché (Modo Offline)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Devuelve el archivo de caché si existe, si no, lo busca en internet
        return response || fetch(event.request);
      })
  );
});

// Actualizar el caché cuando haya una nueva versión
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});