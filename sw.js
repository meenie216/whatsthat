// Minimal offline cache so the app works after first load (needed for "add to
// home screen" and for using it away from signal).
const CACHE = "whatsthat-v1";
const ASSETS = [
  "index.html",
  "css/style.css",
  "js/main.js",
  "js/sensors.js",
  "js/data.js",
  "js/geo.js",
  "js/orientation.js",
  "js/projection.js",
  "js/overlay.js",
  "data/pois.sample.json",
  "manifest.webmanifest",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});
