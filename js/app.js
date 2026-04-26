// Main bootstrap.

import { AnimationEngine } from "./animation-engine.js";
import { SkyScene } from "./scenes/sky.js";
import { StarsScene } from "./scenes/stars.js";
import { CloudsScene } from "./scenes/clouds.js";
import { RainScene } from "./scenes/rain.js";
import { SnowScene } from "./scenes/snow.js";
import { LightningScene } from "./scenes/lightning.js";
import { WindScene } from "./scenes/wind.js";
import { getWeather, getLocation, getCachedWeather } from "./weather-service.js";
import { ui } from "./ui.js";
import { clock } from "./clock.js";
import { Scrubber } from "./scrubber.js";
import { AmbientAudio } from "./audio.js";
import { narrate } from "./narrative.js";
import { places } from "./places.js";
import { RadarMap } from "./radar-map.js";
import { installShortcuts } from "./shortcuts.js";

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
  ticksEl: document.getElementById("scrubber-ticks"),
  appEl: document.querySelector(".app"),
  onScrub: () => {
    if (!app.weather) return;
    applyScene(app.weather);
    ui.setScrubbing(!clock.isLive());
  },
});

// ---------- Load flow ----------
async function loadByCoords(place) {
  app.place = place;
  ui.setPlace(place);
  ui.setLoading(`Fetching weather for ${place.name}…`);
  syncUrl(place);

  // Drop any scrubber offset so we start live on each new city.
  clock.reset();
  ui.setScrubbing(false);

  // Instant first paint from cache, if any — feels snappy on revisit.
  const cached = getCachedWeather(place.lat, place.lon);
  if (cached) {
    app.weather = cached;
    ui.setWeather(cached, { narrative: narrate(cached) });
    applyScene(cached);
  }

  const w = await getWeather(place.lat, place.lon);
  app.weather = w;

  // Render full UI (live + forecasts + narrative).
  ui.setWeather(w, { narrative: narrate(w) });

  // Apply to scenes at current (live) time.
  applyScene(w);

  // Update scrubber bounds to this location's sunrise/sunset.
  scrubber.setBounds({ start: Date.now(), sunrise: w.sunrise, sunset: w.sunset });

  // Move the radar to the new location (fire-and-forget; resolves later).
  ensureRadar([place.lat, place.lon]).then((r) => r?.setCenter(place.lat, place.lon, place.name));
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
  onReduceMotion: (on) => setReducedMotion(on),
  onPlaceClick: (place) => loadByCoords(place),
  onHourClick: (ts) => {
    clock.setOffset(ts - Date.now());
    scrubber.sync();
    if (app.weather) applyScene(app.weather);
    ui.setScrubbing(!clock.isLive());
  },
  onResetLive: () => {
    scrubber.reset();
    if (app.weather) applyScene(app.weather);
    ui.setScrubbing(false);
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
  nudge: (hours) => {
    clock.setOffset(clock.offset() + hours * 3600_000);
    scrubber.sync();
    if (app.weather) applyScene(app.weather);
    ui.setScrubbing(!clock.isLive());
  },
  refresh: () => refreshWeather(),
  togglePin: () => {
    if (!app.place) return;
    places.togglePin(app.place);
    ui.refreshPlaces?.();
    const isPinned = places.all().find((p) => places.idFor(p) === places.idFor(app.place))?.pinned;
    ui.showToast(isPinned ? `Pinned ${app.place.name}` : `Unpinned ${app.place.name}`);
  },
  cyclePlace: (dir) => {
    const all = places.all();
    if (!all.length) return;
    if (!app.place) return loadByCoords(all[0]);
    const curId = places.idFor(app.place);
    const idx = all.findIndex((p) => places.idFor(p) === curId);
    const next = (idx + dir + all.length) % all.length;
    loadByCoords(all[next]);
  },
});

function syncUrl(place) {
  if (!place || place.lat == null || place.lon == null) return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("lat", place.lat.toFixed(4));
    url.searchParams.set("lon", place.lon.toFixed(4));
    if (place.name && place.name !== "Current location") {
      url.searchParams.set("name", place.name);
    } else {
      url.searchParams.delete("name");
    }
    history.replaceState(null, "", url);
  } catch { /* */ }
}

function parseUrlPlace() {
  try {
    const p = new URLSearchParams(window.location.search);
    const lat = parseFloat(p.get("lat"));
    const lon = parseFloat(p.get("lon"));
    if (!isFinite(lat) || !isFinite(lon)) return null;
    return { name: p.get("name") || "Linked location", lat, lon };
  } catch { return null; }
}

// ---------- Start ----------
(async function init() {
  // 1. URL param wins (deep-linked city shared by another user).
  const urlPlace = parseUrlPlace();
  if (urlPlace) {
    await loadByCoords(urlPlace);
    return;
  }
  // 2. Prefer the most recent saved place if we have one — avoids the
  // geolocation prompt on every load and feels snappier.
  const saved = places.all();
  if (saved.length) {
    await loadByCoords(saved[0]);
    return;
  }
  // 3. Fall back to the user's location, then Reykjavík.
  try {
    const { lat, lon } = await getLocation();
    await loadByCoords({ name: "Current location", lat, lon });
  } catch {
    await loadByCoords({ name: "Reykjavík", country: "Iceland", lat: 64.1466, lon: -21.9426 });
  }
})();

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

// Auto-refresh every 15 minutes (but only when live and visible).
setInterval(() => {
  if (document.hidden) return;
  if (!app.weather || !clock.isLive()) return;
  refreshWeather();
}, 15 * 60_000);

// PWA service worker — optional, best-effort.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

window.__aether = { engine, app, clock, audio };
