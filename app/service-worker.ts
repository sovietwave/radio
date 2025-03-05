const CACHE_NAME = 'sovietwave-cache-v1'
const ASSETS_TO_CACHE = [
     '/',
     '/index.html',
     '/styles/fonts.css',
     '/styles/rangeinput.css',
     '/styles/soviet.css',
     '/styles/navi.css',
     '/src/index.ts',
     '/public/assets/sprites/favicons/apple-touch-icon.png',
     '/public/assets/sprites/favicons/favicon-32x32.png',
     '/public/assets/sprites/favicons/favicon-16x16.png',
     '/public/assets/sprites/logo.svg',
     '/public/assets/sfx/slide.mp3',
     '/public/assets/sfx/click.mp3',
     '/public/assets/sfx/camera.mp3',
     '/public/assets/sprites/bg/mobile/night4.jpg',
]

self.addEventListener('install', (event: ExtendableEvent) => {
     console.log('Service Worker installing.')
     event.waitUntil(
          caches.open(CACHE_NAME).then((cache) => {
               console.log('Service Worker caching files')
               return cache
          })
     )
})

self.addEventListener('activate', (event: ExtendableEvent) => {
     console.log('Service Worker activating.')
     // Take control of all pages immediately
     // event.waitUntil(
     //      Promise.all([
     //           self.clients.claim(),
     //           // Remove old caches
     //           caches.keys().then((cacheNames) => {
     //                return Promise.all(
     //                     cacheNames.map((cacheName) => {
     //                          if (cacheName !== CACHE_NAME) {
     //                               console.log('Deleting old cache:', cacheName)
     //                               return caches.delete(cacheName)
     //                          }
     //                     })
     //                )
     //           }),
     //      ])
     // )
})

// fetch event
self.addEventListener('fetch', (event: FetchEvent) => {
     if (!event.request.url.startsWith(self.location.origin)) {
          return
     }

     // Network-first strategy for HTML documents
     if (event.request.headers.get('accept')?.includes('text/html')) {
          event.respondWith(
               fetch(event.request)
                    .then((response) => {
                         const responseClone = response.clone()
                         caches
                              .open(CACHE_NAME)
                              .then((cache) =>
                                   cache.put(event.request, responseClone)
                              )
                         return response
                    })
                    .catch(() => {
                         return caches
                              .match(event.request)
                              .then(
                                   (response) =>
                                        response || caches.match('/index.html')
                              )
                    })
          )
          return
     }

     // Cache-first strategy for other assets
     event.respondWith(
          caches.match(event.request).then((response) => {
               if (response) {
                    return response
               }

               return fetch(event.request)
                    .then((response) => {
                         // Don't cache non-successful responses or non-GET requests
                         if (!response.ok || event.request.method !== 'GET') {
                              return response
                         }

                         const responseClone = response.clone()
                         caches
                              .open(CACHE_NAME)
                              .then((cache) =>
                                   cache.put(event.request, responseClone)
                              )

                         return response
                    })
                    .catch(() => {
                         // Return a fallback response if network request fails
                         // and there's no cache match
                         if (event.request.url.indexOf('.jpg') > -1) {
                              return caches.match('/assets/sprites/bg/day4.jpg')
                         }
                    })
          })
     )
})
