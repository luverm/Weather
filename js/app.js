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

const engine = new AnimationEngine();

const sky = engine.add("sky", new SkyScene(document.getElementById("sky")));
const stars = engine.add("stars", new StarsScene(document.getElementById("stars")));
const clouds = engine.add("clouds", new CloudsScene(document.getElementById("clouds")));
const wind = engine.add("wind", new WindScene(document.getElementById("wind")));
const rain = engine.add("rain", new RainScene(document.getElementById("rain")));
const snow = engine.add("snow", new SnowScene(document.getElementById("snow")));
const lightning = engine.add("lightning", new LightningScene(document.getElementById("lightning")));

const audio = new AmbientAudio();

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

// ---------- Load flow ----------
async function loadByCoords(place) {
  app.place = place;
  ui.setPlace(place);
  ui.setLoading(`Fetching weather for ${place.name}…`);

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

ui.init({
  onSearchSelect: (place) => { places.add(place); loadByCoords(place); },
  onLocate: () => useGeolocation(),
  onAudioToggle: () => toggleAudio(),
  onPlaceClick: (place) => loadByCoords(place),
  onHourClick: (ts) => {
    clock.setOffset(ts - Date.now());
    scrubber.sync();
    if (app.weather) applyScene(app.weather);
    ui.setScrubbing(!clock.isLive());
  },
});

// ---------- Start ----------
(async function init() {
  // Prefer the most recent saved place if we have one — avoids the geolocation
  // prompt on every load and feels snappier.
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
  if (document.hidden) engine.stop();
  else engine.start();
});

// Re-render scenes at the top of each minute so "live" view ticks forward.
setInterval(() => {
  if (!app.weather || !clock.isLive()) return;
  applyScene(app.weather);
}, 60_000);

// PWA service worker — optional, best-effort.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

window.__aether = { engine, app, clock, audio };
