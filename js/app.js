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
  dawnEl: document.getElementById("scrubber-dawn"),
  duskEl: document.getElementById("scrubber-dusk"),
  noonEl: document.getElementById("scrubber-noon"),
  appEl: document.querySelector(".app"),
  onScrub: () => {
    if (!app.weather) return;
    applyScene(app.weather);
    ui.setScrubbing(!clock.isLive());
  },
});

// ---------- Load flow ----------
async function loadByCoords(place) {
  const switching = !!(app.place && (app.place.lat !== place.lat || app.place.lon !== place.lon));
  app.place = place;
  ui.setPlace(place);
  ui.setLoading(`Fetching weather for ${place.name}…`);
  writeHash(place);
  if (switching) {
    // Smooth scroll back to the hero so the new city reads from the top.
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }

  // Drop any scrubber offset so we start live on each new city.
  clock.reset();
  ui.setScrubbing(false);

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
  onVolume: (v) => audio.setVolume?.(v),
  onRefreshInterval: (ms) => setAutoRefreshInterval(ms),
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
  jumpTomorrow: () => {
    // Jump to tomorrow at local noon in the city's timezone when possible.
    const tz = app.weather?.timezone;
    const now = new Date();
    let target;
    if (tz && tz !== "auto") {
      // Compute tomorrow 12:00 in that zone by resolving the local date parts.
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      }).formatToParts(now);
      const year = parseInt(parts.find((p) => p.type === "year").value, 10);
      const month = parseInt(parts.find((p) => p.type === "month").value, 10);
      const day = parseInt(parts.find((p) => p.type === "day").value, 10);
      // Build "tomorrow 12:00" in UTC, then adjust by the zone offset at that
      // instant so the clock in `tz` reads 12:00 local.
      const utcMidday = Date.UTC(year, month - 1, day + 1, 12, 0, 0);
      const probe = new Date(utcMidday);
      const probeStr = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz, hour: "2-digit", hour12: false,
      }).format(probe);
      const probeHour = parseInt(probeStr, 10);
      target = utcMidday - (probeHour - 12) * 3600_000;
    } else {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(12, 0, 0, 0);
      target = d.getTime();
    }
    clock.setOffset(target - Date.now());
    scrubber.sync();
    if (app.weather) applyScene(app.weather);
    ui.setScrubbing(!clock.isLive());
  },
  refresh: () => refreshWeather(),
  jumpToPlaceIndex: (idx) => {
    const list = places.all();
    const target = list[idx];
    if (target) loadByCoords(target);
  },
  share: () => document.getElementById("share-btn")?.click(),
  toggleSettings: () => document.getElementById("settings-btn")?.click(),
  volumeDelta: (step) => {
    const slider = document.getElementById("setting-volume");
    if (!slider) return;
    const current = parseInt(slider.value, 10) || 0;
    const next = Math.max(0, Math.min(100, current + Math.round(step * 100)));
    slider.value = String(next);
    const v = next / 100;
    localStorage.setItem("aether:volume", String(v));
    audio.setVolume?.(v);
    ui.showToast(`Ambient volume ${next}%`, 1200);
  },
  jumpColdest: () => jumpToExtremeHour("cold"),
  jumpWarmest: () => jumpToExtremeHour("hot"),
  jumpUvPeak: () => {
    const peak = app.weather?.uvPeak;
    if (!peak?.time) { ui.showToast("No UV peak data"); return; }
    clock.setOffset(peak.time - Date.now());
    scrubber.sync();
    if (app.weather) applyScene(app.weather);
    ui.setScrubbing(!clock.isLive());
    ui.showToast(`UV peaks at ${Math.round(peak.value)}`);
  },
  togglePresentation: () => {
    const el = document.documentElement;
    const now = el.getAttribute("data-presentation") === "true";
    const next = !now;
    el.setAttribute("data-presentation", next ? "true" : "false");
    if (next) {
      requestWakeLock();
      ui.showToast("Presentation mode on — press P to exit");
    } else {
      releaseWakeLock();
      ui.showToast("Presentation mode off");
    }
  },
});

function jumpToExtremeHour(kind) {
  const hours = app.weather?.hourly || [];
  if (!hours.length) return;
  let best = null;
  for (const h of hours) {
    if (h.temp == null) continue;
    if (!best) { best = h; continue; }
    if (kind === "cold" && h.temp < best.temp) best = h;
    if (kind === "hot" && h.temp > best.temp) best = h;
  }
  if (!best) return;
  clock.setOffset(best.time - Date.now());
  scrubber.sync();
  applyScene(app.weather);
  ui.setScrubbing(!clock.isLive());
  ui.showToast(
    kind === "cold"
      ? `Coldest hour: ${Math.round(best.temp)}°`
      : `Warmest hour: ${Math.round(best.temp)}°`
  );
}

// Wake Lock keeps the screen on during presentation mode. Chrome+Edge, Safari
// 16.4+, Opera, Samsung Internet all support it; other browsers degrade
// silently (the mode still works, the screen may dim).
let wakeLock = null;
async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    }
  } catch { /* ignore — mode still works */ }
}
function releaseWakeLock() {
  wakeLock?.release?.();
  wakeLock = null;
}
// Re-request on visibility return — Wake Lock drops when the tab goes hidden.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden
      && document.documentElement.getAttribute("data-presentation") === "true"
      && !wakeLock) {
    requestWakeLock();
  }
});

// Shareable deep-link in the URL hash: #lat=51.5&lon=-0.12&name=London
function writeHash(place) {
  if (!place || place.lat == null || place.lon == null) return;
  const params = new URLSearchParams();
  params.set("lat", place.lat.toFixed(4));
  params.set("lon", place.lon.toFixed(4));
  if (place.name && place.name !== "Current location") params.set("name", place.name);
  if (place.country) params.set("country", place.country);
  const next = "#" + params.toString();
  if (next !== window.location.hash) {
    history.replaceState(null, "", next);
  }
}

function readHash() {
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const lat = parseFloat(params.get("lat"));
  const lon = parseFloat(params.get("lon"));
  if (!isFinite(lat) || !isFinite(lon)) return null;
  return {
    lat, lon,
    name: params.get("name") || "Shared location",
    country: params.get("country") || "",
  };
}

// Respond to in-page hash changes (user pastes a new link, uses browser back).
window.addEventListener("hashchange", () => {
  const place = readHash();
  if (!place) return;
  const current = app.place;
  if (current && Math.abs(current.lat - place.lat) < 0.01
      && Math.abs(current.lon - place.lon) < 0.01) return;
  loadByCoords(place);
});

// ---------- Start ----------
(async function init() {
  // 1. Honor an explicit URL hash — this is how shared links reopen Aether
  //    on a specific city, even on a device with no saved places.
  const linked = readHash();
  if (linked) {
    await loadByCoords(linked);
    return;
  }
  // 2. Otherwise prefer the most recent saved place — avoids the geolocation
  //    prompt on every load and feels snappier.
  const saved = places.all();
  if (saved.length) {
    await loadByCoords(saved[0]);
    return;
  }
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

// Auto-refresh — user-configurable interval, default 15 minutes.
let autoRefreshTimer = null;
function setAutoRefreshInterval(ms) {
  if (autoRefreshTimer) { clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
  if (!ms || ms < 60_000) return; // "off" or too tight
  autoRefreshTimer = setInterval(() => {
    if (document.hidden) return;
    if (!app.weather || !clock.isLive()) return;
    refreshWeather();
  }, ms);
}
setAutoRefreshInterval(15 * 60_000);

// PWA service worker — optional, best-effort.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

window.__aether = { engine, app, clock, audio };
