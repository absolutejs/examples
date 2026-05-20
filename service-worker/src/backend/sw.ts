// Service worker script served at /sw.js
// This is the raw JavaScript string that gets served to the browser.

export const SW_SCRIPT = /* js */ `
const CACHE_NAME = "absolutejs-sw-demo-v1";
const PRECACHE_URLS = ["/assets/png/absolutejs-temp.png", "/assets/ico/favicon.ico"];

const broadcastStatus = (status, detail) => {
  self.clients.matchAll().then((clients) => {
    for (const client of clients) {
      client.postMessage({ type: "sw-status", status, ...detail });
    }
  });
};

self.addEventListener("install", (event) => {
  broadcastStatus("installing");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => {
        broadcastStatus("installed");
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", (event) => {
  broadcastStatus("activating");
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => {
        broadcastStatus("activated");
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (!request.url.startsWith("http")) return;

  const url = new URL(request.url);

  // Cache-first for /assets/ — serve from cache if available, fall back to network
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Return cached version with a header so the page knows it came from cache
          const headers = new Headers(cached.headers);
          headers.set("X-SW-Cache", "true");
          return new Response(cached.body, {
            status: cached.status,
            statusText: cached.statusText,
            headers,
          });
        }
        // Not in cache — fetch from network (don't auto-cache, let the user do it via Cache card)
        return fetch(request);
      })
    );
    return;
  }

  // Network-first for everything else (navigation, scripts, etc.)
  // Only provide offline fallback, don't auto-cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          return new Response(
            "<html><body><h1>Offline</h1><p>This page is not cached.</p></body></html>",
            { headers: { "Content-Type": "text/html" }, status: 503 }
          );
        })
      )
    );
    return;
  }
});

self.addEventListener("message", (event) => {
  const { data } = event;

  if (data.type === "ping") {
    event.source.postMessage({ type: "pong", timestamp: Date.now() });
    return;
  }

  if (data.type === "get-cache-keys") {
    caches.open(CACHE_NAME).then((cache) =>
      cache.keys().then((requests) => {
        const urls = requests.map((r) => r.url);
        event.source.postMessage({ type: "cache-keys", urls });
      })
    );
    return;
  }

  if (data.type === "cache-url") {
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(data.url))
      .then(() => event.source.postMessage({ type: "cache-url-done", url: data.url }))
      .catch((error) =>
        event.source.postMessage({
          type: "cache-url-error",
          url: data.url,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    return;
  }

  if (data.type === "delete-cache") {
    caches.open(CACHE_NAME).then((cache) =>
      cache.delete(data.url).then((deleted) => {
        event.source.postMessage({ type: "delete-cache-done", url: data.url, deleted });
      })
    );
    return;
  }

  if (data.type === "clear-cache") {
    caches.delete(CACHE_NAME).then(() => {
      caches.open(CACHE_NAME).then(() => {
        event.source.postMessage({ type: "clear-cache-done" });
      });
    });
    return;
  }

  if (data.type === "get-status") {
    event.source.postMessage({ type: "sw-status", status: "activated", cacheName: CACHE_NAME });
    return;
  }
});
`;
