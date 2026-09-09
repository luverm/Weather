// Simple service worker: cache the shell, network-first for everything else.
// Bump CACHE_VERSION on any deploy that changes which files exist.

const CACHE_VERSION = "aether-v14";
const SHELL = [
  "./",
  "./index.html",
  "./styles/main.css",
  "./manifest.json",
  "./js/app.js",
  "./js/animation-engine.js",
  "./js/clock.js",
  "./js/input.js",
  "./js/ui.js",
  "./js/weather-service.js",
  "./js/scrubber.js",
  "./js/audio.js",
  "./js/places.js",
  "./js/narrative.js",
  "./js/radar-map.js",
  "./js/advice.js",
  "./js/hourly-chart.js",
  "./js/comfort-strip.js",
  "./js/insights.js",
  "./js/activity.js",
  "./js/alerts.js",
  "./js/weekend.js",
  "./js/shortcuts.js",
  "./js/scenes/sky.js",
  "./js/scenes/stars.js",
  "./js/scenes/clouds.js",
  "./js/scenes/rain.js",
  "./js/scenes/snow.js",
  "./js/scenes/lightning.js",
  "./js/scenes/wind.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Weather/geocoding calls: network-only so the user always sees fresh data
  // when online; an offline failure falls through to the mock in weather-service.
  if (url.hostname.endsWith("open-meteo.com")) return;

  // Same-origin shell: cache-first, falling back to network.
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(req);
      if (cached) {
        // Update in background.
        fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); }).catch(() => {});
        return cached;
      }
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return cached || Response.error();
      }
    })());
  }
});
