/* ══ penUang Service Worker ══ */
const CACHE_NAME = "penuang-v1";

/* File yang di-cache saat install */
const PRECACHE = [
  "./index.html",
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,400&family=DM+Sans:wght@300;400;500;600&display=swap",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js"
];

/* Install — cache file utama */
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        PRECACHE.map(url => cache.add(url).catch(() => {}))
      );
    })
  );
});

/* Activate — hapus cache lama */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Fetch — cache-first untuk aset, network-first untuk data */
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  /* Abaikan request non-GET dan chrome-extension */
  if (event.request.method !== "GET") return;
  if (url.protocol === "chrome-extension:") return;

  /* SheetDB API — selalu ambil dari network */
  if (url.hostname === "sheetdb.io") return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        /* Offline fallback — kembalikan index.html */
        if (event.request.destination === "document") {
          return caches.match("./index.html");
        }
      });
    })
  );
});
