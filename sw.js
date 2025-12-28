const CACHE_NAME = "uk-theory-cache-v1";
const urlsToCache = [
  "/uk-theory-web/",
  "/uk-theory-web/index.html",
  "/uk-theory-web/style.css",
  "/uk-theory-web/app.js",
  "/uk-theory-web/manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
