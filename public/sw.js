// public/sw.js

const CACHE_NAME = "selectoros-v2";

// 🔹 Only cache static assets
const STATIC_ASSETS = [
  "/",
  "/favicon.ico",
  "/manifest.json",
];

// INSTALL
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// ACTIVATE
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

// FETCH
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 🚫 NEVER cache API
  if (url.pathname.startsWith("/api")) {
    event.respondWith(fetch(request));
    return;
  }

  // 🚫 NEVER cache dynamic menu pages
  if (url.pathname.startsWith("/menu")) {
    event.respondWith(fetch(request));
    return;
  }

  // ✅ STATIC FILES → cache first
  if (
    url.origin === self.location.origin &&
    (
      url.pathname.startsWith("/_next") ||
      url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".jpg") ||
      url.pathname.endsWith(".svg")
    )
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // 🌐 DEFAULT → network only (NO CACHE)
  event.respondWith(fetch(request));
});