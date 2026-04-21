// Main bootstrap: wire scenes into the engine, fetch weather, keep state in sync.

import { AnimationEngine } from "./animation-engine.js";
import { SkyScene } from "./scenes/sky.js";
import { StarsScene } from "./scenes/stars.js";
import { CloudsScene } from "./scenes/clouds.js";
import { RainScene } from "./scenes/rain.js";
import { SnowScene } from "./scenes/snow.js";
import { LightningScene } from "./scenes/lightning.js";
import { WindScene } from "./scenes/wind.js";
import { getWeather, getLocation, CONDITIONS } from "./weather-service.js";
import { ui } from "./ui.js";

const engine = new AnimationEngine();

// Scene registration. Order reflects drawing order (canvas stacking handles that,
// we just need every scene ticking).
const sky = engine.add("sky", new SkyScene(document.getElementById("sky")));
const stars = engine.add("stars", new StarsScene(document.getElementById("stars")));
const clouds = engine.add("clouds", new CloudsScene(document.getElementById("clouds")));
const wind = engine.add("wind", new WindScene(document.getElementById("wind")));
const rain = engine.add("rain", new RainScene(document.getElementById("rain")));
const snow = engine.add("snow", new SnowScene(document.getElementById("snow")));
const lightning = engine.add("lightning", new LightningScene(document.getElementById("lightning")));

function resize() { engine.resize(); }
window.addEventListener("resize", resize);
resize();
engine.start();

// ---------- Apply a weather snapshot to every scene and the UI ----------
function applyWeather(place, weather) {
  // Decide the time-of-day bucket from sunrise/sunset once here so every
  // scene sees a consistent value.
  const bucket = pickBucket(weather);
  const payload = { ...weather, bucket };

  sky.setWeather(payload);
  stars.setWeather(payload);
  clouds.setWeather(payload);
  rain.setWeather(payload);
  snow.setWeather(payload);
  lightning.setWeather(payload);
  wind.setWeather(payload);

  ui.setPlace(place);
  ui.setWeather(weather);

  // Flip CSS tone so glass panels stay legible on bright palettes.
  document.documentElement.setAttribute("data-tone", sky.getTone());
  // Update theme-color for mobile chrome.
  document.querySelector('meta[name="theme-color"]').setAttribute(
    "content",
    toneToColor(sky.getTone())
  );

  if (weather.offline) ui.showToast("Offline — showing sample weather");
}

function pickBucket(w) {
  if (!w.sunrise || !w.sunset) {
    const h = new Date().getHours();
    if (h < 5 || h >= 21) return "night";
    if (h < 7) return "dawn";
    if (h < 17) return "day";
    if (h < 19) return "dusk";
    return "night";
  }
  const now = Date.now();
  const win = 60 * 60 * 1000;
  if (now < w.sunrise - win || now > w.sunset + win) return "night";
  if (now < w.sunrise + win) return "dawn";
  if (now > w.sunset - win) return "dusk";
  if (now < w.sunrise + 3 * 60 * 60 * 1000) return "morning";
  return "day";
}

function toneToColor(tone) {
  return { dark: "#0b1020", warm: "#2a1c2d", bright: "#7cc0ff" }[tone] || "#0b1020";
}

// ---------- Flow ----------
async function loadByCoords(place) {
  ui.setLoading(`Fetching weather for ${place.name}…`);
  const w = await getWeather(place.lat, place.lon);
  applyWeather(place, w);
}

async function useGeolocation() {
  ui.setLoading("Locating…");
  try {
    const { lat, lon } = await getLocation();
    const place = { name: "Current location", lat, lon };
    await loadByCoords(place);
  } catch (err) {
    ui.showToast("Location denied — pick a city");
    // Fallback to a known city.
    await loadByCoords({ name: "Reykjavík", country: "Iceland", lat: 64.1466, lon: -21.9426 });
  }
}

ui.init({
  onSearchSelect: (place) => loadByCoords(place),
  onLocate: () => useGeolocation(),
});

// ---------- Start ----------
// Try geolocation silently on first load, with a sensible default fallback.
(async function init() {
  try {
    const { lat, lon } = await getLocation();
    await loadByCoords({ name: "Current location", lat, lon });
  } catch {
    // User denied or unsupported — pick an interesting default.
    await loadByCoords({ name: "Reykjavík", country: "Iceland", lat: 64.1466, lon: -21.9426 });
  }
})();

// Pause when the tab is hidden to save battery, resume on return.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) engine.stop();
  else engine.start();
});

// Expose for debugging in the console — harmless in production.
window.__aether = { engine, applyWeather, CONDITIONS };
