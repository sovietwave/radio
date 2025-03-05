self.addEventListener("install", event => {
    event.waitUntil(
        caches.open('app-cache').then(cache => {
            console.log("...caching shell assets")
            cache.addAll([
            './',
            './index.html',
            './styles/fonts.css',
            './styles/rangeinput.css',
            './styles/soviet.css',
            './styles/navi.css',
            './src/index.ts',
            './assets/sprites/favicons/apple-touch-icon.png',
            './assets/sprites/favicons/favicon-32x32.png',
            './assets/sprites/favicons/favicon-16x16.png'
            ]);
        })
    );
})

// activate event 
self.addEventListener("activate", event => {
    console.log("Service Worker ACTIVATED!")
})

// fetch event 
self.addEventListener("fetch", event => {
    // console.log("Fetch event...", event)
})