// UI layer: reads from weather state, handles search, unit toggle,
// micro-interactions, and animated value transitions.

import { searchCities } from "./weather-service.js";

const $ = (sel) => document.querySelector(sel);

const tempEl = $("#temp-value");
const unitBtn = $("#unit-toggle");
const placeName = $("#place-name");
const placeSub = $("#place-sub");
const conditionLabel = $("#condition-label");
const feelsLike = $("#feels-like");
const metricWind = $("#m-wind");
const metricHumidity = $("#m-humidity");
const metricPressure = $("#m-pressure");
const metricUV = $("#m-uv");
const forecastTrack = $("#forecast-track");
const searchInput = $("#search-input");
const searchResults = $("#search-results");
const locateBtn = $("#locate-btn");
const hintText = $("#hint-text");
const heroInner = document.querySelector(".hero-inner");
const toastEl = $("#toast");

let state = {
  unit: localStorage.getItem("aether:unit") || "C", // "C" | "F"
  weather: null,
  place: null,
  onSearchSelect: null,
  onLocate: null,
};

// ---------- Public API ----------
export const ui = {
  init({ onSearchSelect, onLocate }) {
    state.onSearchSelect = onSearchSelect;
    state.onLocate = onLocate;
    unitBtn.textContent = `°${state.unit}`;
    bindSearch();
    bindUnitToggle();
    bindLocate();
    bindTilt();
  },
  setLoading(text) {
    placeSub.textContent = text;
  },
  setPlace(place) {
    state.place = place;
    placeName.classList.remove("flip-in"); void placeName.offsetWidth;
    placeName.classList.add("flip-in");
    placeName.textContent = place.name || "Unknown";
    const sub = [place.admin1, place.country].filter(Boolean).join(", ");
    placeSub.textContent = sub || "—";
  },
  setWeather(w) {
    state.weather = w;
    const temp = convertTemp(w.temp);
    const feels = convertTemp(w.feelsLike);
    animateNumber(tempEl, temp, (v) => `${Math.round(v)}°`);
    conditionLabel.textContent = capitalize(w.label);
    feelsLike.textContent = `Feels like ${Math.round(feels)}°`;
    metricWind.textContent = Math.round(w.windSpeed ?? 0);
    metricHumidity.textContent = Math.round(w.humidity ?? 0);
    metricPressure.textContent = Math.round(w.pressure ?? 0);
    metricUV.textContent = w.uv != null ? Math.round(w.uv) : "—";
    renderForecast(w.hourly || []);
    hintText.textContent = hintForCondition(w.condition);
  },
  showToast(msg, dur = 2600) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => (toastEl.hidden = true), dur);
  },
  getUnit: () => state.unit,
};

// ---------- Helpers ----------
function convertTemp(c) {
  if (state.unit === "F") return c * 9 / 5 + 32;
  return c;
}

function animateNumber(el, target, format) {
  if (target == null || isNaN(target)) { el.textContent = "–"; return; }
  const prev = parseFloat(el.dataset.v ?? NaN);
  if (isNaN(prev)) {
    el.textContent = format(target);
    el.dataset.v = String(target);
    return;
  }
  const duration = 500;
  const start = performance.now();
  cancelAnimationFrame(el._raf ?? 0);
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = prev + (target - prev) * eased;
    el.textContent = format(v);
    if (t < 1) el._raf = requestAnimationFrame(tick);
    else el.dataset.v = String(target);
  };
  el._raf = requestAnimationFrame(tick);
}

function capitalize(s) { return (s || "").charAt(0).toUpperCase() + (s || "").slice(1); }

function hintForCondition(c) {
  switch (c) {
    case "clear": return "Move your cursor — the sky responds.";
    case "clouds": return "Hover the clouds, they drift with you.";
    case "rain": return "Hover the surface — ripples follow.";
    case "snow": return "Sweep to nudge the flakes.";
    case "storm": return "Wait for the sky to flash.";
    case "fog": return "The mist reacts to your motion.";
    default: return "Move your cursor — the sky responds.";
  }
}

function renderForecast(hourly) {
  forecastTrack.innerHTML = "";
  for (const h of hourly.slice(0, 10)) {
    const d = new Date(h.time);
    const item = document.createElement("div");
    item.className = "forecast-item";
    item.innerHTML = `
      <span class="forecast-time">${d.getHours().toString().padStart(2, "0")}:00</span>
      <span class="forecast-icon">${iconFor(h.condition)}</span>
      <span class="forecast-temp">${Math.round(convertTemp(h.temp))}°</span>
    `;
    forecastTrack.appendChild(item);
  }
}

function iconFor(condition) {
  // Tiny inline SVGs — no external icon dependency.
  const common = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
  switch (condition) {
    case "clear":
      return `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" ${common}/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" ${common}/></svg>`;
    case "clouds":
      return `<svg viewBox="0 0 24 24"><path d="M7 17a4 4 0 010-8 5 5 0 019.9-1A4 4 0 0117 17H7z" ${common}/></svg>`;
    case "rain":
      return `<svg viewBox="0 0 24 24"><path d="M7 14a4 4 0 010-8 5 5 0 019.9-1A4 4 0 0117 14H7z" ${common}/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2" ${common}/></svg>`;
    case "snow":
      return `<svg viewBox="0 0 24 24"><path d="M7 14a4 4 0 010-8 5 5 0 019.9-1A4 4 0 0117 14H7z" ${common}/><path d="M9 18v2M12 17v3M15 18v2" ${common}/></svg>`;
    case "storm":
      return `<svg viewBox="0 0 24 24"><path d="M7 13a4 4 0 010-8 5 5 0 019.9-1A4 4 0 0117 13H7z" ${common}/><path d="M12 13l-2 4h3l-2 4" ${common}/></svg>`;
    case "fog":
      return `<svg viewBox="0 0 24 24"><path d="M4 10h16M4 14h12M6 18h14" ${common}/></svg>`;
    default:
      return `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" ${common}/></svg>`;
  }
}

// ---------- Search (debounced) ----------
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

const runSearch = debounce(async (q) => {
  const results = await searchCities(q);
  renderSearchResults(results);
}, 200);

function renderSearchResults(results) {
  if (!results.length) { searchResults.hidden = true; searchResults.innerHTML = ""; return; }
  searchResults.innerHTML = results.map((r, i) => `
    <li role="option" data-index="${i}">
      <span>${escapeHtml(r.name)}${r.admin1 ? `, ${escapeHtml(r.admin1)}` : ""}</span>
      <span class="sub">${escapeHtml(r.country || "")}</span>
    </li>
  `).join("");
  searchResults.hidden = false;
  searchResults._items = results;
}

function bindSearch() {
  searchInput.addEventListener("input", (e) => {
    const v = e.target.value.trim();
    if (v.length < 2) { searchResults.hidden = true; return; }
    runSearch(v);
  });
  searchInput.addEventListener("blur", () => {
    setTimeout(() => (searchResults.hidden = true), 150);
  });
  searchInput.addEventListener("focus", () => {
    if (searchResults._items?.length) searchResults.hidden = false;
  });
  searchResults.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    const i = parseInt(li.dataset.index, 10);
    const item = searchResults._items?.[i];
    if (!item) return;
    searchInput.value = item.name;
    searchResults.hidden = true;
    state.onSearchSelect?.(item);
  });
}

function bindUnitToggle() {
  unitBtn.addEventListener("click", () => {
    state.unit = state.unit === "C" ? "F" : "C";
    localStorage.setItem("aether:unit", state.unit);
    unitBtn.textContent = `°${state.unit}`;
    if (state.weather) ui.setWeather(state.weather);
  });
}

function bindLocate() {
  locateBtn.addEventListener("click", () => state.onLocate?.());
}

// Subtle tilt on the hero card based on cursor position inside the card.
function bindTilt() {
  if (!heroInner) return;
  let frame = 0;
  const onMove = (e) => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const r = heroInner.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width - 0.5;
      const my = (e.clientY - r.top) / r.height - 0.5;
      heroInner.style.setProperty("--rx", `${(-my * 3).toFixed(2)}deg`);
      heroInner.style.setProperty("--ry", `${(mx * 4).toFixed(2)}deg`);
    });
  };
  const reset = () => {
    heroInner.style.setProperty("--rx", "0deg");
    heroInner.style.setProperty("--ry", "0deg");
  };
  heroInner.addEventListener("pointermove", onMove);
  heroInner.addEventListener("pointerleave", reset);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
