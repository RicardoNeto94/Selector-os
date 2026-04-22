const CACHE_NAME = "selectoros-v5";

// Only static assets
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.ico",
];

// INSTALL
self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// ACTIVATE
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

// FETCH
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 🚫 NEVER cache API
  if (request.url.includes("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // 🚫 NEVER cache Supabase
  if (request.url.includes("supabase")) {
    event.respondWith(fetch(request));
    return;
  }

  // ✅ Static files only (CSS, JS)
  if (
    request.url.includes("/_next/") ||
    request.url.endsWith(".css") ||
    request.url.endsWith(".js")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request);
      })
    );
    return;
  }

  // 🌐 Pages → always network first
  event.respondWith(
    fetch(request).catch(() => caches.match("/"))
  );
});