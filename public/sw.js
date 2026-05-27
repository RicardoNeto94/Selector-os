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

  // 🚫 never cache non-GET
  if(request.method !== "GET"){
    return;
  }

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

  // 🚫 NEVER cache Next.js dynamic chunks
  if (request.url.includes("/_next/")) {

    event.respondWith(
      fetch(request)
    );

    return;
  }

  // ✅ cache only static assets
  if (
    request.url.endsWith(".css") ||
    request.url.endsWith(".js") ||
    request.url.endsWith(".png") ||
    request.url.endsWith(".jpg") ||
    request.url.endsWith(".svg")
  ) {

    event.respondWith(

      caches.match(request).then((cached)=>{

        return cached || fetch(request).then((response)=>{

          const responseClone =
            response.clone();

          caches.open(CACHE_NAME).then((cache)=>{
            cache.put(request,responseClone);
          });

          return response;

        });

      })

    );

    return;

  }

  // 🌐 pages = always network first
  event.respondWith(

    fetch(request).catch(()=>
      caches.match("/")
    )

  );

});