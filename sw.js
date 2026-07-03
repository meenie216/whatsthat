// Minimal offline cache so the app works after first load (needed for "add to
// home screen" and for using it away from signal).
const CACHE = "whatsthat-v2";
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
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Network-first: always try the network so code changes reach the device, and
// fall back to cache only when offline. Keeps the app installable/offline-capable
// without pinning stale files during active development.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
