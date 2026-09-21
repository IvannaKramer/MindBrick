// sw.js – service worker: makes MindBrick work without internet once it has been opened.
//
// - On install, every file listed in sw-files.js is stored in a cache.
// - Requests are answered from the cache at once, and refreshed from the network in the background
//   ("stale while revalidate"), so an update shows up the next time the page is opened.
// - sw-files.js is written by `npm run sw`; its VERSION changes whenever a file changes, which is
//   what makes the browser install the new worker.
importScripts("sw-files.js"); // defines VERSION and FILES

const CACHE = `mindbrick-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n.startsWith("mindbrick-") && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request, { ignoreSearch: true });
    const fresh = fetch(request).then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    });
    if (cached) {
      fresh.catch(() => {}); // offline: the cached copy is all we need
      return cached;
    }
    return fresh;
  })());
});
