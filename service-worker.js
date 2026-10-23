/*
 * Lightweight PWA service worker.
 * - App shell: precached during installation.
 * - HTML navigations: network-first; every successful same-origin HTML response is saved.
 * - Other same-origin assets: stale-while-revalidate.
 */
const CACHE_PREFIX = "program-launcher-pwa-";
const CACHE_VERSION = "v2";
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;
const APP_SHELL = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    // 設定JSONは任意ファイル。存在しなくてもService Workerのインストールを失敗させない。
    try {
      const settingsResponse = await fetch("./program-index.json", { cache: "no-store" });
      if (isCacheable(settingsResponse)) await cache.put("./program-index.json", settingsResponse.clone());
    } catch { /* JSONなし・オフラインでもPWAシェルのインストールを続行 */ }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

function isCacheable(response) {
  return response && response.ok && response.type === "basic";
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      // Clone before returning because a Response body can only be consumed once.
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const saved = await caches.match(request);
    if (saved) return saved;
    const offlinePage = await caches.match(new URL("./offline.html", self.registration.scope).href);
    if (request.mode === "navigate" && offlinePage) return offlinePage;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const update = fetch(request).then(async response => {
    if (isCacheable(response)) await cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || await update || Response.error();
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;
  const isHTML = request.mode === "navigate" || /\.html?$/i.test(path);
  if (isHTML || /\/program-index\.json$/i.test(path)) {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});
