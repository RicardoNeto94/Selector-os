// public/sw.js

self.addEventListener("install", (event) => {
  // Skip waiting so new SW takes over quickly
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Claim clients so it starts controlling pages immediately
  event.waitUntil(self.clients.claim());
});

// Optional: you can add caching logic later.
// Right now this just makes the app "PWA valid" (installable) without
// touching your network behaviour.
