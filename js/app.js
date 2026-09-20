// Main bootstrap.

import { AnimationEngine } from "./animation-engine.js";
import { SkyScene } from "./scenes/sky.js";
import { StarsScene } from "./scenes/stars.js";
import { CloudsScene } from "./scenes/clouds.js";
import { RainScene } from "./scenes/rain.js";
import { SnowScene } from "./scenes/snow.js";
import { LightningScene } from "./scenes/lightning.js";
import { WindScene } from "./scenes/wind.js";
import { getWeather, getLocation } from "./weather-service.js";
import { ui } from "./ui.js";
import { clock } from "./clock.js";
import { Scrubber } from "./scrubber.js";
import { AmbientAudio } from "./audio.js";
import { narrate } from "./narrative.js";
import { places } from "./places.js";
import { RadarMap } from "./radar-map.js";
import { installShortcuts } from "./shortcuts.js";

// Widget mode: chromeless slim layout for embedding. Just needs the query
// param to be set; users can visit ?widget=1 in an <iframe>.
if (new URLSearchParams(location.search).get("widget") === "1") {
  document.documentElement.setAttribute("data-widget", "true");
}

const engine = new AnimationEngine();

const sky = engine.add("sky", new SkyScene(document.getElementById("sky")));
const stars = engine.add("stars", new StarsScene(document.getElementById("stars")));
const clouds = engine.add("clouds", new CloudsScene(document.getElementById("clouds")));
const wind = engine.add("wind", new WindScene(document.getElementById("wind")));
const rain = engine.add("rain", new RainScene(document.getElementById("rain")));
const snow = engine.add("snow", new SnowScene(document.getElementById("snow")));
const lightning = engine.add("lightning", new LightningScene(document.getElementById("lightning")));

const audio = new AmbientAudio();

// Radar map — instantiated lazily once Leaflet has loaded from CDN.
// The CDN `<script>` tag is not deferred relative to this module, so we
// poll briefly on first use rather than hard-fail.
let radar = null;
let radarReady = null;
async function ensureRadar(center) {
  if (radar) return radar;
  if (radarReady) return radarReady;
  radarReady = (async () => {
    // Wait up to 5 s for Leaflet to appear.
    const started = Date.now();
    while (!window.L && Date.now() - started < 5000) {
      await new Promise((r) => setTimeout(r, 80));
    }
    if (!window.L) {
      document.getElementById("radar-card")?.setAttribute("data-unavailable", "true");
      return null;
    }
    radar = new RadarMap({
      mapEl: document.getElementById("radar-map"),
      playBtn: document.getElementById("radar-play"),
      timeLabel: document.getElementById("radar-time"),
      deltaLabel: document.getElementById("radar-delta"),
      frameTrack: document.getElementById("radar-track"),
      fullscreenBtn: document.getElementById("radar-full"),
      card: document.getElementById("radar-card"),
    });
    await radar.init(center || [51.5, 0]).catch((err) => console.warn("Radar init failed:", err));
    return radar;
  })();
  return radarReady;
}

// Hook lightning -> thunder with a realistic delay (2–4 sec after flash).
const origSpawn = lightning._spawnFlash.bind(lightning);
lightning._spawnFlash = function () {
  origSpawn();
  const delay = 1500 + Math.random() * 2500;
  setTimeout(() => audio.thunder(0.8 + Math.random() * 0.4), delay);
};

function resize() { engine.resize(); }
window.addEventListener("resize", resize);
resize();
engine.start();

// App state
const app = {
  place: null,
  weather: null,   // most recent real weather
  sampled: null,   // weather values at the scrubber's simulated time
  bucket: "day",
};

function pickBucket(time, sunrise, sunset) {
  if (!sunrise || !sunset) {
    const h = new Date(time).getHours();
    if (h < 5 || h >= 21) return "night";
    if (h < 7) return "dawn";
    if (h < 17) return "day";
    if (h < 19) return "dusk";
    return "night";
  }
  const win = 60 * 60 * 1000;
  if (time < sunrise - win || time > sunset + win) return "night";
  if (time < sunrise + win) return "dawn";
  if (time > sunset - win) return "dusk";
  if (time < sunrise + 3 * 60 * 60 * 1000) return "morning";
  return "day";
}

function toneToColor(tone) {
  return { dark: "#0b1020", warm: "#2a1c2d", bright: "#7cc0ff" }[tone] || "#0b1020";
}

// ---------- Sampling ----------
// Given a weather object and a timestamp, pick the best-matching hourly
// entry + day for the scrubber.
function sampleAt(weather, ts) {
  if (!weather?.hourly?.length) return weather;
  // Find nearest hourly entry.
  let nearest = weather.hourly[0];
  let bestDiff = Math.abs(nearest.time - ts);
  let idx = 0;
  for (let i = 1; i < weather.hourly.length; i++) {
    const diff = Math.abs(weather.hourly[i].time - ts);
    if (diff < bestDiff) { nearest = weather.hourly[i]; bestDiff = diff; idx = i; }
  }
  // Day bounds for sunrise/sunset at that time.
  const day = (weather.daily || []).reduce((best, d) => {
    if (!d.sunrise) return best;
    const dayCenter = d.sunrise + 12 * 3600_000;
    return !best || Math.abs(ts - dayCenter) < Math.abs(ts - (best.sunrise + 12 * 3600_000))
      ? d : best;
  }, null);

  return {
    ...weather,
    temp: nearest.temp,
    feelsLike: nearest.feelsLike,
    condition: nearest.condition,
    label: nearest.label,
    isDay: nearest.isDay,
    windSpeed: nearest.wind ?? weather.windSpeed,
    windGusts: nearest.gusts ?? weather.windGusts,
    uv: nearest.uv ?? weather.uv,
    sunrise: day?.sunrise ?? weather.sunrise,
    sunset: day?.sunset ?? weather.sunset,
    _sampledIndex: idx,
    _sampledTs: nearest.time,
  };
}

// Apply a weather snapshot to every scene + UI.
function applyScene(weather) {
  const t = clock.now();
  const sampled = sampleAt(weather, t);
  const bucket = pickBucket(t, sampled.sunrise, sampled.sunset);
  app.bucket = bucket;
  app.sampled = sampled;

  const payload = { ...sampled, bucket, daily: weather.daily };

  sky.setWeather(payload);
  stars.setWeather(payload);
  clouds.setWeather(payload);
  rain.setWeather(payload);
  snow.setWeather(payload);
  lightning.setWeather(payload);
  wind.setWeather(payload);

  // UI values reflect the sampled time.
  ui.setSampledWeather(sampled, { highlightHourIndex: sampled._sampledIndex });

  document.documentElement.setAttribute("data-tone", sky.getTone());
  document.querySelector('meta[name="theme-color"]').setAttribute(
    "content", toneToColor(sky.getTone())
  );

  // Update audio to match whatever the scene now shows.
  audio.setWeather(sampled, bucket);

  // In reduced-motion mode, repaint exactly one frame now that weather changed.
  if (app.reducedMotion) engine.tickOnce();
}

// ---------- Scrubber ----------
const scrubber = new Scrubber({
  trackEl: document.getElementById("scrubber-track"),
  thumbEl: document.getElementById("scrubber-thumb"),
  fillEl: document.getElementById("scrubber-fill"),
  timeEl: document.getElementById("scrubber-time"),
  deltaEl: document.getElementById("scrubber-delta"),
  resetEl: document.getElementById("scrubber-reset"),
  sunriseEl: document.getElementById("scrubber-sunrise"),
  sunsetEl: document.getElementById("scrubber-sunset"),
  appEl: document.querySelector(".app"),
  onScrub: () => {
    if (!app.weather) return;
    applyScene(app.weather);
    ui.setScrubbing(!clock.isLive());
  },
});

// ---------- URL hash routing ----------
function encodePlaceHash(place) {
  if (!place || place.lat == null || place.lon == null) return "";
  const lat = Number(place.lat).toFixed(4);
  const lon = Number(place.lon).toFixed(4);
  const name = place.name ? encodeURIComponent(place.name) : "";
  const country = place.country ? encodeURIComponent(place.country) : "";
  return `#p=${lat},${lon}` + (name ? `,${name}` : "") + (country ? `,${country}` : "");
}
function parsePlaceHash(hash) {
  if (!hash || !hash.startsWith("#p=")) return null;
  const raw = hash.slice(3);
  const parts = raw.split(",");
  const lat = parseFloat(parts[0]);
  const lon = parseFloat(parts[1]);
  if (!isFinite(lat) || !isFinite(lon)) return null;
  return {
    lat,
    lon,
    name: parts[2] ? decodeURIComponent(parts[2]) : `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    country: parts[3] ? decodeURIComponent(parts[3]) : null,
  };
}
function samePlace(a, b) {
  if (!a || !b) return false;
  return Math.abs(a.lat - b.lat) < 0.0005 && Math.abs(a.lon - b.lon) < 0.0005;
}

// "America/Los_Angeles" -> "Los Angeles"; "Europe/Paris" -> "Paris".
function tzToLabel(tz) {
  if (!tz || typeof tz !== "string") return null;
  const parts = tz.split("/");
  const city = parts[parts.length - 1];
  if (!city) return null;
  return city.replace(/_/g, " ");
}

// ---------- Local cache for instant boot ----------
const LAST_KEY = "aether:lastWeather";
const PER_CITY_KEY = "aether:cityWeather";
const LAST_TTL_MS = 6 * 3600_000;

function placeCacheKey(place) {
  if (!place || place.lat == null || place.lon == null) return null;
  return `${place.lat.toFixed(3)},${place.lon.toFixed(3)}`;
}

function readPerCityCache() {
  try {
    return JSON.parse(localStorage.getItem(PER_CITY_KEY)) || {};
  } catch { return {}; }
}

function cacheLastWeather(place, weather) {
  const entry = {
    place: { name: place.name, country: place.country, admin1: place.admin1, lat: place.lat, lon: place.lon },
    weather,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(entry));
    // Per-city cache — keep at most 8 entries to bound storage.
    const bag = readPerCityCache();
    const key = placeCacheKey(place);
    if (key) bag[key] = entry;
    const keys = Object.keys(bag);
    if (keys.length > 8) {
      keys.sort((a, b) => (bag[a].savedAt || 0) - (bag[b].savedAt || 0));
      for (const k of keys.slice(0, keys.length - 8)) delete bag[k];
    }
    localStorage.setItem(PER_CITY_KEY, JSON.stringify(bag));
  } catch { /* quota, private mode, etc. — ignore */ }
}

function loadLastWeather() {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry?.weather || !entry.place) return null;
    if (Date.now() - (entry.savedAt || 0) > LAST_TTL_MS) return null;
    return entry;
  } catch { return null; }
}

function loadCityWeather(place) {
  const key = placeCacheKey(place);
  if (!key) return null;
  const bag = readPerCityCache();
  const entry = bag[key];
  if (!entry) return null;
  if (Date.now() - (entry.savedAt || 0) > LAST_TTL_MS) return null;
  return entry;
}

// ---------- Load flow ----------
async function loadByCoords(place) {
  const previousPlace = app.place;
  app.place = place;
  ui.setPlace(place);
  ui.setLoading(`Fetching weather for ${place.name}…`);
  // Reflect the current city in the URL so it can be shared/bookmarked.
  const newHash = encodePlaceHash(place);
  if (newHash && location.hash !== newHash) {
    app._suppressHash = true;
    history.replaceState(null, "", newHash);
    // The event may still fire in some engines; clear the flag next tick.
    setTimeout(() => { app._suppressHash = false; }, 0);
  }

  // Drop any scrubber offset so we start live on each new city.
  clock.reset();
  ui.setScrubbing(false);

  // Optimistic paint from per-city cache while the network fetch resolves,
  // but only when switching to a different city (else we'd stomp on live).
  const cached = loadCityWeather(place);
  const switching = !previousPlace || !samePlace(previousPlace, place);
  if (cached && switching) {
    app.weather = cached.weather;
    ui.setWeather(cached.weather, { narrative: narrate(cached.weather) });
    applyScene(cached.weather);
    scrubber.setBounds({ start: Date.now(), sunrise: cached.weather.sunrise, sunset: cached.weather.sunset });
  }

  const w = await getWeather(place.lat, place.lon);
  app.weather = w;
  // Upgrade a "Current location" fallback name using the timezone the API
  // returned (e.g., "America/Los_Angeles" -> "Los Angeles"). Doesn't run
  // for named cities from search / saved places.
  if (place.name === "Current location" && w.timezone && w.timezone !== "auto") {
    const nicer = tzToLabel(w.timezone);
    if (nicer) {
      place.name = `Near ${nicer}`;
      ui.setPlace(place);
    }
  }

  // Render full UI (live + forecasts + narrative).
  ui.setWeather(w, { narrative: narrate(w) });

  // Apply to scenes at current (live) time.
  applyScene(w);

  // Update scrubber bounds to this location's sunrise/sunset.
  scrubber.setBounds({ start: Date.now(), sunrise: w.sunrise, sunset: w.sunset });

  // Move the radar to the new location (fire-and-forget; resolves later).
  ensureRadar([place.lat, place.lon]).then((r) => r?.setCenter(place.lat, place.lon, place.name));

  // Persist for next boot (only real payloads — never save the offline mock).
  if (!w.offline) cacheLastWeather(place, w);
}

async function useGeolocation() {
  ui.setLoading("Locating…");
  try {
    const { lat, lon } = await getLocation();
    await loadByCoords({ name: "Current location", lat, lon });
  } catch {
    ui.showToast("Location denied — pick a city");
    await loadByCoords({ name: "Reykjavík", country: "Iceland", lat: 64.1466, lon: -21.9426 });
  }
}

async function toggleAudio() {
  if (audio.isEnabled()) await audio.disable();
  else {
    await audio.enable();
    if (app.sampled) audio.setWeather(app.sampled, app.bucket);
  }
  ui.setAudioState(audio.isEnabled());
}

async function refreshWeather() {
  if (!app.place) return;
  ui.markRefreshSpin(true);
  try {
    await loadByCoords(app.place);
  } finally {
    setTimeout(() => ui.markRefreshSpin(false), 700);
  }
}

function setReducedMotion(on) {
  app.reducedMotion = !!on;
  if (on) {
    engine.stop();
    // Paint a single frame so the sky reflects the current weather state.
    engine.tickOnce();
  } else if (!document.hidden) {
    engine.start();
  }
}

ui.init({
  onSearchSelect: (place) => { places.add(place); loadByCoords(place); },
  onLocate: () => useGeolocation(),
  onAudioToggle: () => toggleAudio(),
  onRefresh: () => refreshWeather(),
  onRefreshIntervalChange: (ms) => scheduleAutoRefresh(ms),
  onReduceMotion: (on) => setReducedMotion(on),
  onPlaceClick: (place) => loadByCoords(place),
  onHourClick: (ts) => {
    clock.setOffset(ts - Date.now());
    scrubber.sync();
    if (app.weather) applyScene(app.weather);
    ui.setScrubbing(!clock.isLive());
  },
});

// Apply saved reduce-motion preference on boot.
if (ui.isReduceMotion?.()) setReducedMotion(true);

// Keyboard shortcuts.
installShortcuts({
  focusSearch: () => ui.focusSearch(),
  locate: () => useGeolocation(),
  toggleUnits: () => ui.toggleUnits(),
  toggleAudio: () => toggleAudio(),
  toggleFullscreenRadar: () => document.getElementById("radar-full")?.click(),
  toggleRadar: () => document.getElementById("radar-play")?.click(),
  resetScrubber: () => scrubber.reset(),
  toggleSettings: () => document.getElementById("settings-btn")?.click(),
  refresh: () => refreshWeather(),
  toggleCompact: () => {
    const cb = document.getElementById("setting-compact");
    if (!cb) return;
    cb.checked = !cb.checked;
    cb.dispatchEvent(new Event("change"));
  },
  cyclePlace: (dir) => {
    const list = places.all();
    if (list.length < 2) return;
    const currentId = app.place ? places.idFor(app.place) : null;
    const idx = Math.max(0, list.findIndex((p) => places.idFor(p) === currentId));
    const next = list[(idx + dir + list.length) % list.length];
    if (next) loadByCoords(next);
  },
  nudge: (hours) => {
    clock.setOffset(clock.offset() + hours * 3600_000);
    scrubber.sync();
    if (app.weather) applyScene(app.weather);
    ui.setScrubbing(!clock.isLive());
  },
});

// ---------- Start ----------
(async function init() {
  // Highest priority: a deep-link in the URL hash.
  const linked = parsePlaceHash(location.hash);
  if (linked) {
    places.add(linked);
    await loadByCoords(linked);
    return;
  }
  // If we cached a recent weather payload for the most recent place, paint
  // it immediately so the app is legible before the network fetch returns,
  // then start the normal fetch on top.
  const cached = loadLastWeather();
  const saved = places.all();
  const nextPlace = saved[0] || cached?.place;
  if (cached && nextPlace && cached.place.lat === nextPlace.lat && cached.place.lon === nextPlace.lon) {
    app.place = nextPlace;
    app.weather = cached.weather;
    ui.setPlace(nextPlace);
    ui.setWeather(cached.weather, { narrative: narrate(cached.weather) });
    applyScene(cached.weather);
    scrubber.setBounds({ start: Date.now(), sunrise: cached.weather.sunrise, sunset: cached.weather.sunset });
  }
  if (nextPlace) {
    await loadByCoords(nextPlace);
    return;
  }
  try {
    const { lat, lon } = await getLocation();
    await loadByCoords({ name: "Current location", lat, lon });
  } catch {
    await loadByCoords({ name: "Reykjavík", country: "Iceland", lat: 64.1466, lon: -21.9426 });
  }
})();

window.addEventListener("hashchange", () => {
  if (app._suppressHash) return;
  const linked = parsePlaceHash(location.hash);
  if (linked && !samePlace(linked, app.place)) {
    places.add(linked);
    loadByCoords(linked);
  }
});

// When the browser reconnects, quietly refresh so the offline mock is
// replaced with live data. Guard against double-fires from the auto-refresh.
window.addEventListener("online", () => {
  if (!app.place) return;
  refreshWeather();
});

// ---------- Lifecycle ----------
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    engine.stop();
  } else if (!app.reducedMotion) {
    engine.start();
  } else {
    engine.tickOnce();
  }
});

// Re-render scenes at the top of each minute so "live" view ticks forward.
setInterval(() => {
  if (!app.weather || !clock.isLive()) return;
  applyScene(app.weather);
}, 60_000);

// Auto-refresh on a user-adjustable schedule (5m/15m/30m/1h/off).
// Rebuilds the timer whenever the setting changes.
let autoRefreshTimer = null;
function scheduleAutoRefresh(intervalMs) {
  if (autoRefreshTimer != null) { clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
  const ms = Number.isFinite(intervalMs) ? intervalMs : 15 * 60_000;
  if (ms <= 0) return;
  autoRefreshTimer = setInterval(() => {
    if (document.hidden) return;
    if (!app.weather || !clock.isLive()) return;
    refreshWeather();
  }, ms);
}
{
  const stored = parseInt(localStorage.getItem("aether:refreshInterval"), 10);
  scheduleAutoRefresh(Number.isFinite(stored) ? stored : 15 * 60_000);
}

// PWA service worker — optional, best-effort.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

window.__aether = { engine, app, clock, audio };
