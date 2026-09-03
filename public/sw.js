const CACHE_NAME = "vaxeron-v7";

const STATIC_ASSETS = [
  "/manifest.json",
  "/vaxeron-favicon.png",
  "/vaxeron-icon-192.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }

            return null;
          })
        )
      ),
      self.clients.claim(),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (
    url.pathname.startsWith("/api/") ||
    request.url.includes("supabase")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  /*
   * Always fetch Next.js files from the network.
   * This prevents old CSS and JavaScript bundles from being reused.
   */
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(fetch(request));
    return;
  }

  /*
   * Always load page navigations from the network.
   */
  if (request.mode === "navigate") {
    event.respondWith(fetch(request));
    return;
  }

  /*
   * Cache only stable image assets.
   * Use network first so updated logos and backgrounds appear immediately.
   */
  if (
    /\.(png|jpg|jpeg|webp|gif|svg|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }

          const responseClone = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });

          return response;
        })
        .catch(() => caches.match(request))
    );

    return;
  }

  /*
   * Do not cache CSS, JavaScript, JSON or other application files.
   */
  event.respondWith(fetch(request));
});
