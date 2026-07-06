// UI layer. Renders every data module and handles non-scene interactions
// (search, unit toggle, saved places, tilt, audio toggle).

import { searchCities } from "./weather-service.js";
import { places } from "./places.js";
import { HourlyChart } from "./hourly-chart.js";
import { ComfortStrip } from "./comfort-strip.js";
import { advise } from "./advice.js";
import { buildInsights } from "./insights.js";
import { findActivityWindows } from "./activity.js";
import { buildAlerts } from "./alerts.js";
import { weekendSnapshot } from "./weekend.js";
import { summarizePrecip } from "./precip.js";
import { suggestOutfit } from "./outfit.js";
import { nextTransition } from "./transition.js";

const $ = (sel) => document.querySelector(sel);

const el = {
  temp: $("#temp-value"),
  unitBtn: $("#unit-toggle"),
  placeName: $("#place-name"),
  placeSub: $("#place-sub"),
  placeLocaltime: $("#place-localtime"),
  conditionLabel: $("#condition-label"),
  feelsLike: $("#feels-like"),
  narrative: $("#narrative"),
  dayRange: $("#day-range"),
  dayparts: $("#dayparts"),
  dayRangeMin: $("#day-range-min"),
  dayRangeMax: $("#day-range-max"),
  dayRangeMarker: $("#day-range-marker"),
  metricWind: $("#m-wind"),
  metricWindSub: $("#m-wind-sub"),
  metricWindUnit: $("#m-wind-unit"),
  windBft: $("#m-wind-bft"),
  settingWindUnit: $("#setting-wind-unit"),
  settingTimeFormat: $("#setting-time-format"),
  settingPressureUnit: $("#setting-pressure-unit"),
  metricPressureUnit: $("#m-pressure-unit"),
  metricHumidity: $("#m-humidity"),
  metricHumiditySub: $("#m-humidity-sub"),
  metricPressure: $("#m-pressure"),
  metricPressureSub: $("#m-pressure-sub"),
  metricUV: $("#m-uv"),
  metricUVSub: $("#m-uv-sub"),
  aqArc: $("#aq-arc"),
  aqValue: $("#aq-value"),
  aqLabel: $("#aq-label"),
  aqDetail: $("#aq-detail"),
  aqCard: $("#aq-card"),
  aqTrendLine: $("#aq-trend-line"),
  aqTrendFill: $("#aq-trend-fill"),
  moonLit: $("#moon-lit"),
  moonName: $("#moon-name"),
  moonIllum: $("#moon-illum"),
  moonProgression: $("#moon-progression"),
  sunRise: $("#sun-rise"),
  sunTomorrow: $("#sun-tomorrow"),
  sunSet: $("#sun-set"),
  sunDaylight: $("#sun-daylight"),
  sunCountdown: $("#sun-countdown"),
  sunNextLabel: $("#sun-next-label"),
  windNeedle: $("#wind-needle"),
  advice: $("#advice"),
  adviceText: $("#advice-text"),
  outfit: $("#outfit"),
  outfitIcons: $("#outfit-icons"),
  outfitLabel: $("#outfit-label"),
  outfitHint: $("#outfit-hint"),
  transitionChip: $("#transition-chip"),
  transitionText: $("#transition-text"),
  transitionArrow: $("#transition-arrow"),
  chartSvg: $("#chart-svg"),
  chartHover: $("#chart-hover"),
  pollenCard: $("#pollen-card"),
  pollenLevel: $("#pollen-level"),
  pollenDominant: $("#pollen-dominant"),
  pollenItems: $("#pollen-items"),
  pressureTrend: $("#m-pressure-trend"),
  tempTrend: $("#temp-trend"),
  uvLevel: $("#m-uv-level"),
  humidityComfort: $("#m-humidity-comfort"),
  pressureSparkLine: $("#pressure-spark-line"),
  pressureSparkFill: $("#pressure-spark-fill"),
  humiditySparkLine: $("#humidity-spark-line"),
  humiditySparkFill: $("#humidity-spark-fill"),
  dailySpark: $("#daily-spark"),
  dailyHi: $("#daily-hi"),
  dailyLo: $("#daily-lo"),
  dailySparkDots: $("#daily-spark-dots"),
  dailyDelta: $("#daily-delta"),
  dailyHighlights: $("#daily-highlights"),
  shareBtn: $("#share-btn"),
  installBtn: $("#install-btn"),
  refreshBtn: $("#refresh-btn"),
  fetchedAgo: $("#fetched-ago"),
  dailyIconStrip: $("#daily-icon-strip"),
  settingsBtn: $("#settings-btn"),
  settingsMenu: $("#settings-menu"),
  settingReduceMotion: $("#setting-reduce-motion"),
  settingFocusMode: $("#setting-focus-mode"),
  settingUnitF: $("#setting-unit-f"),
  settingClearPlaces: $("#setting-clear-places"),
  chartPopover: $("#chart-popover"),
  insightsCard: $("#insights-card"),
  insightsList: $("#insights-list"),
  activityCard: $("#activity-card"),
  activityList: $("#activity-list"),
  pinBtn: $("#pin-place"),
  cloudCard: $("#cloud-card"),
  cloudArc: $("#cloud-arc"),
  cloudValue: $("#cloud-value"),
  cloudLabel: $("#cloud-label"),
  cloudHeadline: $("#cloud-headline"),
  cloudDetail: $("#cloud-detail"),
  cloudSparkLine: $("#cloud-spark-line"),
  cloudSparkFill: $("#cloud-spark-fill"),
  precipCard: $("#precip-card"),
  precip24h: $("#precip-24h"),
  precipWeek: $("#precip-week"),
  precipWeekDays: $("#precip-week-days"),
  precipPeak: $("#precip-peak"),
  precipWeekBars: $("#precip-week-bars"),
  alertsStrip: $("#alerts-strip"),
  sunArcMarker: $("#sun-arc-marker"),
  sunArcPath: $("#sun-arc-path"),
  comfortStrip: $("#comfort-strip"),
  weekendChip: $("#weekend-chip"),
  weekendHeadline: $("#weekend-headline"),
  weekendDetail: $("#weekend-detail"),
  weekendIconSat: $("#weekend-icon-sat"),
  weekendIconSun: $("#weekend-icon-sun"),
  forecastTrack: $("#forecast-track"),
  dailyTrack: $("#daily-track"),
  nowcast: $("#nowcast"),
  nowcastHeadline: $("#nowcast-headline"),
  nowcastSub: $("#nowcast-sub"),
  nowcastBars: $("#nowcast-bars"),
  searchInput: $("#search-input"),
  searchResults: $("#search-results"),
  locateBtn: $("#locate-btn"),
  audioBtn: $("#audio-btn"),
  hintText: $("#hint-text"),
  heroInner: document.querySelector(".hero-inner"),
  toast: $("#toast"),
  placesStrip: $("#places-strip"),
};

// Guess sensible defaults from the browser locale for first-time visitors.
// US, Liberia, and Myanmar use Fahrenheit; the US also runs on mph, inHg,
// and prefers 12-hour clocks by default.
const localeDefaults = (() => {
  let region = "";
  try {
    // "en-US" → "US"; also handles "en" (no region) → "".
    region = (Intl.DateTimeFormat().resolvedOptions().locale || "").split("-")[1] || "";
  } catch { /* ignore */ }
  const isImperial = ["US", "LR", "MM"].includes(region.toUpperCase());
  return {
    unit: isImperial ? "F" : "C",
    windUnit: region === "US" ? "mph" : "kmh",
    pressureUnit: region === "US" ? "inhg" : "hpa",
    timeFormat: region === "US" ? "12" : "24",
  };
})();

const state = {
  unit: localStorage.getItem("aether:unit") || localeDefaults.unit,
  windUnit: localStorage.getItem("aether:windUnit") || localeDefaults.windUnit,
  timeFormat: localStorage.getItem("aether:timeFormat") || localeDefaults.timeFormat,
  pressureUnit: localStorage.getItem("aether:pressureUnit") || localeDefaults.pressureUnit,
  weather: null,
  place: null,
  sampledWeather: null, // the weather values at the current scrubber time
  handlers: {},
  chart: null,
  comfortStrip: null,
  sunTimer: null,
  sunArcTimer: null,
  localTimer: null,
};

export const ui = {
  init(handlers) {
    state.handlers = handlers || {};
    el.unitBtn.textContent = `°${state.unit}`;
    bindSearch();
    bindUnitToggle();
    bindLocate();
    bindAudio();
    bindShare();
    bindRefresh();
    bindSettings();
    bindTilt();
    bindPin();
    applyStoredPreferences();
    renderPlaces();
    startFetchedTicker();
    state.chart = new HourlyChart({
      svgEl: el.chartSvg,
      hoverEl: el.chartHover,
      popoverEl: el.chartPopover,
      onHoverHour: (ts) => state.handlers.onHourClick?.(ts),
      getUnit: () => state.unit,
      getTimezone: () => state.weather?.timezone,
      getHour12: () => state.timeFormat === "12",
    });
    state.comfortStrip = new ComfortStrip({
      rootEl: el.comfortStrip,
      onCellClick: (ts) => state.handlers.onHourClick?.(ts),
      getUnit: () => state.unit,
    });
    bindInstallPrompt();
  },
  focusSearch() { el.searchInput?.focus(); el.searchInput?.select?.(); },
  toggleUnits() { el.unitBtn?.click(); },
  isSearchOpen() { return !el.searchResults.hidden; },
  closeSearch() { el.searchResults.hidden = true; el.searchInput?.blur(); },
  markRefreshSpin(on) {
    if (!el.refreshBtn) return;
    el.refreshBtn.classList.toggle("spinning", !!on);
  },
  setLoading(text) { el.placeSub.textContent = text; },
  setPlace(place) {
    state.place = place;
    el.placeName.classList.remove("flip-in"); void el.placeName.offsetWidth;
    el.placeName.classList.add("flip-in");
    el.placeName.textContent = place.name || "Unknown";
    const sub = [place.admin1, place.country].filter(Boolean).join(", ");
    el.placeSub.textContent = sub || "—";
    // Reset alert dismissals so a fresh location can re-surface them.
    try { sessionStorage.removeItem("aether:dismissed-alerts"); } catch { /* ignore */ }
    renderPlaces();
    renderPinButton();
  },
  setWeather(weather, { narrative } = {}) {
    state.weather = weather;
    state.sampledWeather = weather; // initially same as live
    renderLiveValues(weather);
    renderMetrics(weather);
    renderAirQuality(weather.airQuality);
    renderMoon(weather.moon);
    renderSun(weather);
    renderHourly(weather);
    renderDaily(weather);
    renderNowcast(weather);
    renderAdvice(weather);
    renderPollen(weather.pollen);
    renderTrends(weather);
    renderInsights(weather);
    renderActivity(weather);
    renderCloudCover(weather);
    renderPrecipSummary(weather);
    renderTransition(weather);
    renderAlerts(weather);
    renderWeekend(weather);
    startLocaltime(weather);
    if (state.chart) state.chart.setHours(weather.hourly);
    if (state.comfortStrip) state.comfortStrip.setHours(weather.hourly);
    if (el.narrative) el.narrative.textContent = narrative || "";
    if (weather.offline) ui.showToast("Offline — showing sample weather");
    // Save summary for the strip so chips can show current temp + time.
    if (state.place) {
      places.updateSummary(state.place, {
        temp: weather.temp,
        condition: weather.condition,
        timezone: weather.timezone,
      });
    }
    renderPlaces();
  },
  /** Called by the scrubber whenever simulated time moves. */
  setSampledWeather(sampled, { highlightHourIndex } = {}) {
    state.sampledWeather = sampled;
    renderLiveValues(sampled, { animate: false });
    renderMetrics(sampled);
    renderAdvice(sampled);
    highlightHour(highlightHourIndex);
    if (state.comfortStrip) state.comfortStrip.highlight(highlightHourIndex);
    if (state.chart && sampled._sampledTs != null) {
      state.chart.setCursor(sampled._sampledTs);
    } else if (state.chart) {
      state.chart.setCursor(sampled.hourly?.[highlightHourIndex]?.time);
    }
  },
  setScrubbing(on) {
    document.documentElement.setAttribute("data-scrubbing", on ? "true" : "false");
    if (on) {
      el.hintText.textContent = "Drag to explore future weather.";
    } else {
      el.hintText.innerHTML = 'Drag the slider, hover the chart, or press <kbd>?</kbd> for shortcuts.';
    }
  },
  setAudioState(on) {
    el.audioBtn.classList.toggle("on", !!on);
    el.audioBtn.setAttribute("aria-label", on ? "Disable ambient sound" : "Enable ambient sound");
    el.audioBtn.setAttribute("title", on ? "Disable ambient sound" : "Enable ambient sound");
  },
  showToast(msg, dur = 2600) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    clearTimeout(el.toast._t);
    el.toast._t = setTimeout(() => (el.toast.hidden = true), dur);
  },
  getUnit: () => state.unit,
};

// ---------- Rendering ----------

function convertTemp(c) { return state.unit === "F" ? c * 9 / 5 + 32 : c; }

function convertWind(kmh) {
  if (kmh == null) return null;
  switch (state.windUnit) {
    case "mph": return kmh * 0.621371;
    case "ms":  return kmh / 3.6;
    case "kt":  return kmh * 0.539957;
    default:    return kmh;
  }
}
function windUnitLabel() {
  return { mph: "mph", ms: "m/s", kt: "kt" }[state.windUnit] || "km/h";
}
function fmtWind(kmh) {
  const v = convertWind(kmh);
  if (v == null) return "—";
  const p = state.windUnit === "ms" || state.windUnit === "kt" ? 1 : 0;
  return v.toFixed(p);
}

function convertPressure(hpa) {
  if (hpa == null) return null;
  switch (state.pressureUnit) {
    case "inhg": return hpa * 0.0295299830714;
    case "mmhg": return hpa * 0.75006157584566;
    default:     return hpa;
  }
}
function pressureUnitLabel() {
  return { inhg: "inHg", mmhg: "mmHg" }[state.pressureUnit] || "hPa";
}
function fmtPressure(hpa) {
  const v = convertPressure(hpa);
  if (v == null) return "—";
  if (state.pressureUnit === "inhg") return v.toFixed(2);
  if (state.pressureUnit === "mmhg") return Math.round(v).toString();
  return Math.round(v).toString();
}

function animateNumber(node, target, format) {
  if (target == null || isNaN(target)) { node.textContent = "–"; return; }
  const prev = parseFloat(node.dataset.v ?? NaN);
  if (isNaN(prev)) {
    node.textContent = format(target);
    node.dataset.v = String(target);
    return;
  }
  const duration = 480;
  const start = performance.now();
  cancelAnimationFrame(node._raf ?? 0);
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = prev + (target - prev) * eased;
    node.textContent = format(v);
    if (t < 1) node._raf = requestAnimationFrame(tick);
    else node.dataset.v = String(target);
  };
  node._raf = requestAnimationFrame(tick);
}

function capitalize(s) { return (s || "").charAt(0).toUpperCase() + (s || "").slice(1); }

function renderLiveValues(w, { animate = true } = {}) {
  const temp = convertTemp(w.temp);
  const feels = convertTemp(w.feelsLike ?? w.temp);
  if (animate) animateNumber(el.temp, temp, (v) => `${Math.round(v)}°`);
  else el.temp.textContent = `${Math.round(temp)}°`;
  el.conditionLabel.textContent = capitalize(w.label);
  el.feelsLike.textContent = `Feels like ${Math.round(feels)}°`;
  renderDayRange(w);
  renderDayparts(w);
  updateTabTitle(w);
}

function updateTabTitle(w) {
  // Only reflect the live weather in the tab title — showing a scrubbed
  // future temperature would confuse readers glancing at the tab strip.
  const live = state.weather;
  if (!live || live.temp == null) return;
  const temp = `${Math.round(convertTemp(live.temp))}°${state.unit}`;
  const cond = capitalize(live.label || "");
  const place = state.place?.name;
  const parts = [`${temp}${cond ? " " + cond : ""}`, place, "Aether"].filter(Boolean);
  document.title = parts.join(" · ");
}

function renderDayparts(w) {
  if (!el.dayparts) return;
  const hrs = w?.hourly || [];
  if (hrs.length < 6) { el.dayparts.hidden = true; return; }
  // Pick a representative hour for each band. Use the sample nearest to the
  // target hour (in the forecast timezone if available).
  const tz = w?.timezone;
  const hourOf = (ts) => {
    if (tz && tz !== "auto") {
      try {
        const parts = new Intl.DateTimeFormat("en-GB", {
          timeZone: tz, hour: "2-digit", hour12: false,
        }).formatToParts(new Date(ts));
        return parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
      } catch { /* */ }
    }
    return new Date(ts).getHours();
  };
  const bands = [
    { key: "morning", label: "Morning", target: 8,  icon: "🌅" },
    { key: "noon",    label: "Noon",    target: 13, icon: "☀️" },
    { key: "evening", label: "Evening", target: 18, icon: "🌆" },
    { key: "night",   label: "Night",   target: 22, icon: "🌙" },
  ];
  // Sunrise-anchored day: use today's daily entry for the anchor hour.
  const items = bands.map((b) => {
    let best = null, bestDist = Infinity;
    for (const h of hrs) {
      if (h.temp == null) continue;
      const dist = Math.abs(hourOf(h.time) - b.target);
      if (dist < bestDist) { best = h; bestDist = dist; }
    }
    return best ? { ...b, hour: best } : null;
  }).filter(Boolean);

  if (items.length < 2) { el.dayparts.hidden = true; return; }
  el.dayparts.hidden = false;
  el.dayparts.innerHTML = items.map((it) => {
    const t = Math.round(convertTemp(it.hour.temp));
    return `
      <button class="daypart" type="button" data-ts="${it.hour.time}">
        <span class="daypart-icon" aria-hidden="true">${it.icon}</span>
        <span class="daypart-label">${it.label}</span>
        <span class="daypart-temp">${t}°</span>
      </button>
    `;
  }).join("");
  el.dayparts.querySelectorAll(".daypart").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ts = parseInt(btn.dataset.ts, 10);
      if (ts) state.handlers.onHourClick?.(ts);
    });
  });
}

function renderDayRange(w) {
  if (!el.dayRange || !el.dayRangeMarker) return;
  // Pull today's min/max from the daily forecast; fall back to nearest hour
  // span if the daily isn't ready yet.
  const today = w.daily?.[0];
  let lo = today?.tempMin, hi = today?.tempMax;
  if (lo == null || hi == null) {
    const hours = (w.hourly || []).slice(0, 24).map((h) => h.temp).filter((v) => v != null);
    if (hours.length < 2) { el.dayRange.hidden = true; return; }
    lo = Math.min(...hours);
    hi = Math.max(...hours);
  }
  if (lo == null || hi == null || lo === hi) {
    el.dayRange.hidden = true;
    return;
  }
  el.dayRange.hidden = false;
  el.dayRangeMin.textContent = `${Math.round(convertTemp(lo))}°`;
  el.dayRangeMax.textContent = `${Math.round(convertTemp(hi))}°`;
  // Marker position: clamp current temp to [lo,hi] so marker stays on track.
  const t = w.temp ?? (lo + hi) / 2;
  const frac = Math.max(0, Math.min(1, (t - lo) / (hi - lo)));
  el.dayRangeMarker.style.left = `${(frac * 100).toFixed(1)}%`;
}

function renderMetrics(w) {
  el.metricWind.textContent = w.windSpeed != null ? fmtWind(w.windSpeed) : "—";
  if (el.metricWindUnit) el.metricWindUnit.textContent = windUnitLabel();
  const dir = w.windDir;
  const dirLabel = dir != null ? cardinal(dir) : null;
  const gustStr = w.windGusts != null ? `${fmtWind(w.windGusts)} ${windUnitLabel()}` : "—";
  el.metricWindSub.textContent = dirLabel
    ? `${dirLabel} · gust ${gustStr}`
    : `gust ${gustStr}`;
  if (el.windNeedle && dir != null) {
    // Wind direction is where wind comes FROM, so the needle points TO that direction.
    el.windNeedle.setAttribute("transform", `rotate(${dir})`);
    el.windNeedle.style.opacity = "1";
  } else if (el.windNeedle) {
    el.windNeedle.style.opacity = "0.3";
  }
  if (el.windBft) {
    const bft = beaufort(w.windSpeed);
    if (bft) {
      el.windBft.className = `trend ${bft.cls}`;
      el.windBft.textContent = bft.label;
    } else {
      el.windBft.textContent = "";
    }
  }
  el.metricHumidity.textContent = Math.round(w.humidity ?? 0);
  el.metricHumiditySub.textContent = w.dewPoint != null
    ? `dew ${Math.round(convertTemp(w.dewPoint))}°`
    : "dew —";
  if (el.humidityComfort) {
    const pill = humidityComfort(w.humidity, w.dewPoint, w.temp);
    if (pill) {
      el.humidityComfort.className = `trend ${pill.cls}`;
      el.humidityComfort.textContent = pill.label;
    } else {
      el.humidityComfort.textContent = "";
    }
  }
  el.metricPressure.textContent = w.pressure != null ? fmtPressure(w.pressure) : "—";
  if (el.metricPressureUnit) el.metricPressureUnit.textContent = pressureUnitLabel();
  el.metricPressureSub.textContent = w.visibility != null
    ? `visibility ${Math.round((w.visibility / 1000) * 10) / 10} km`
    : "visibility —";
  el.metricUV.textContent = w.uv != null ? Math.round(w.uv) : "—";
  if (el.uvLevel) {
    const lvl = uvLevel(w.uv);
    if (lvl) {
      el.uvLevel.className = `trend ${lvl.cls}`;
      el.uvLevel.textContent = lvl.label;
    } else {
      el.uvLevel.textContent = "";
    }
  }
  if (w.uvPeak?.time) {
    el.metricUVSub.textContent = `peak ${Math.round(w.uvPeak.value)} at ${fmtTime(w.uvPeak.time)}`;
  } else {
    el.metricUVSub.textContent = "peak —";
  }
  renderPressureSparkline(w);
}

function humidityComfort(rh, dew, temp) {
  if (rh == null) return null;
  // Prioritize dew-point-based mugginess at warm temps.
  if (temp != null && temp >= 18 && dew != null) {
    if (dew >= 21) return { label: "Muggy", cls: "up" };
    if (dew >= 18) return { label: "Humid", cls: "up" };
  }
  if (rh >= 85) return { label: "Damp", cls: "down" };
  if (rh >= 70) return { label: "Humid", cls: "flat" };
  if (rh <= 25) return { label: "Dry", cls: "up" };
  if (rh <= 35) return { label: "Crisp", cls: "flat" };
  return { label: "Comfy", cls: "down" };
}

function beaufort(kmh) {
  if (kmh == null) return null;
  if (kmh < 1) return { label: "Calm", cls: "down" };
  if (kmh < 6) return { label: "Light air", cls: "down" };
  if (kmh < 12) return { label: "Light breeze", cls: "down" };
  if (kmh < 20) return { label: "Gentle", cls: "flat" };
  if (kmh < 29) return { label: "Moderate", cls: "flat" };
  if (kmh < 39) return { label: "Fresh", cls: "up" };
  if (kmh < 50) return { label: "Strong", cls: "up" };
  if (kmh < 62) return { label: "Near gale", cls: "up" };
  if (kmh < 75) return { label: "Gale", cls: "up" };
  if (kmh < 89) return { label: "Strong gale", cls: "up" };
  if (kmh < 103) return { label: "Storm", cls: "up" };
  if (kmh < 118) return { label: "Violent storm", cls: "up" };
  return { label: "Hurricane", cls: "up" };
}

function uvLevel(v) {
  if (v == null) return null;
  if (v < 3) return { label: "Low", cls: "down" };
  if (v < 6) return { label: "Moderate", cls: "flat" };
  if (v < 8) return { label: "High", cls: "up" };
  if (v < 11) return { label: "Very High", cls: "up" };
  return { label: "Extreme", cls: "up" };
}

function renderPressureSparkline(w) {
  drawSparkline(
    el.pressureSparkLine, el.pressureSparkFill,
    (w.hourly || []).map((h) => h.pressure).filter((v) => v != null).slice(0, 12),
    { minSpan: 1.5 }
  );
  drawSparkline(
    el.humiditySparkLine, el.humiditySparkFill,
    (w.hourly || []).map((h) => h.humidity).filter((v) => v != null).slice(0, 12),
    { minSpan: 10, fixedMin: 0, fixedMax: 100 }
  );
}

function drawSparkline(lineEl, fillEl, series, { minSpan = 1, fixedMin, fixedMax } = {}) {
  if (!lineEl || !fillEl) return;
  if (series.length < 2) {
    lineEl.setAttribute("d", "");
    fillEl.setAttribute("d", "");
    return;
  }
  const min = fixedMin != null ? fixedMin : Math.min(...series);
  const max = fixedMax != null ? fixedMax : Math.max(...series);
  const span = Math.max(minSpan, max - min);
  const W = 100, H = 24, PAD = 1.5;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const x = (i) => PAD + (i / (series.length - 1)) * innerW;
  const y = (v) => PAD + innerH - ((v - min) / span) * innerH;
  let line = "";
  series.forEach((v, i) => { line += (i === 0 ? "M" : "L") + x(i).toFixed(1) + "," + y(v).toFixed(1) + " "; });
  const fill = `${line}L${x(series.length - 1).toFixed(1)},${(H - PAD).toFixed(1)} L${x(0).toFixed(1)},${(H - PAD).toFixed(1)} Z`;
  lineEl.setAttribute("d", line.trim());
  fillEl.setAttribute("d", fill);
}

function aqColor(aqi) {
  if (aqi == null) return "#9aa4b2";
  if (aqi <= 50) return "#78d06a";
  if (aqi <= 100) return "#ffd36a";
  if (aqi <= 150) return "#ff9f5c";
  if (aqi <= 200) return "#ff6a6a";
  if (aqi <= 300) return "#b75cff";
  return "#8a3a3a";
}

function renderAirQuality(aq) {
  if (!aq) { el.aqCard.style.opacity = 0.5; return; }
  el.aqCard.style.opacity = 1;
  const color = aqColor(aq.aqi);
  el.aqCard.style.color = color;
  el.aqValue.textContent = aq.aqi != null ? Math.round(aq.aqi) : "—";
  el.aqLabel.textContent = aq.label || "—";
  // Circumference of r=20 is ~125.66 — we use 126 in the SVG.
  const frac = Math.max(0, Math.min(1, (aq.aqi ?? 0) / 200));
  el.aqArc.setAttribute("stroke-dashoffset", String(126 * (1 - frac)));
  el.aqDetail.textContent =
    `PM2.5 ${aq.pm25 != null ? Math.round(aq.pm25) : "—"} · O₃ ${aq.o3 != null ? Math.round(aq.o3) : "—"}`;
  renderAqTrend(aq);
}

function renderAqTrend(aq) {
  if (!el.aqTrendLine || !el.aqTrendFill) return;
  const pts = (aq?.trend || []).map((p) => p.aqi);
  if (pts.length < 2) {
    el.aqTrendLine.setAttribute("d", "");
    el.aqTrendFill.setAttribute("d", "");
    return;
  }
  drawSparkline(el.aqTrendLine, el.aqTrendFill, pts, { minSpan: 20 });
}

function renderMoon(moon) {
  if (!moon) return;
  el.moonName.textContent = moon.name;
  el.moonIllum.textContent = Math.round(moon.illum * 100);
  renderMoonProgression(moon);
  // Render lit region as a path. phase: 0 new, 0.5 full, 1 new again.
  const r = 18;
  const phase = moon.phase;
  // Two semicircles + a horizontal ellipse representing the terminator.
  // waxing: right side lit (phase 0..0.5); waning: left side (0.5..1).
  const waxing = phase < 0.5;
  const outer = waxing
    ? `M 0 ${-r} A ${r} ${r} 0 0 1 0 ${r}`
    : `M 0 ${-r} A ${r} ${r} 0 0 0 0 ${r}`;
  // Terminator ellipse x-radius goes 1 -> 0 -> 1 across the cycle.
  const termX = Math.abs(Math.cos(phase * 2 * Math.PI)) * r;
  const large = Math.cos(phase * 2 * Math.PI) > 0 ? 0 : 1;
  const termSweep = waxing ? (Math.cos(phase * 2 * Math.PI) > 0 ? 0 : 1)
                           : (Math.cos(phase * 2 * Math.PI) > 0 ? 1 : 0);
  const terminator = `A ${termX} ${r} 0 ${large} ${termSweep} 0 ${-r} Z`;
  el.moonLit.setAttribute("d", outer + " " + terminator);
}

function renderMoonProgression(moon) {
  if (!el.moonProgression) return;
  // Distance in cycle to the next 0 (new) and 0.5 (full).
  const CYCLE_DAYS = 29.5305882;
  const phase = moon.phase;
  const toNew  = ((1 - phase) % 1) * CYCLE_DAYS;
  const toFull = ((0.5 - phase + 1) % 1) * CYCLE_DAYS;
  const closer = toNew < toFull ? { kind: "new", days: toNew }
                                : { kind: "full", days: toFull };
  const other  = toNew < toFull ? { kind: "full", days: toFull }
                                : { kind: "new", days: toNew };
  const fmt = (label, days) => {
    if (days < 1) return `${label} within a day`;
    const rounded = Math.round(days);
    return `${label} in ${rounded}d`;
  };
  el.moonProgression.textContent =
    `${fmt(closer.kind === "new" ? "New" : "Full", closer.days)} · ${fmt(other.kind === "new" ? "New" : "Full", other.days)}`;
}

function fmtTime(ts) {
  if (!ts) return "—";
  const tz = state.weather?.timezone;
  const hour12 = state.timeFormat === "12";
  if (tz && tz !== "auto") {
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone: tz, hour: hour12 ? "numeric" : "2-digit",
        minute: "2-digit", hour12,
      }).format(new Date(ts));
    } catch { /* fall through */ }
  }
  const d = new Date(ts);
  if (hour12) {
    let h = d.getHours(); const suffix = h < 12 ? "am" : "pm";
    h = h % 12 || 12;
    return `${h}:${d.getMinutes().toString().padStart(2, "0")}${suffix}`;
  }
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function renderSun(w) {
  el.sunRise.textContent = fmtTime(w.sunrise);
  el.sunSet.textContent = fmtTime(w.sunset);
  if (w.sunrise && w.sunset) {
    const mins = Math.round((w.sunset - w.sunrise) / 60_000);
    const hh = Math.floor(mins / 60);
    const mm = mins % 60;
    el.sunDaylight.textContent = `${hh}h ${mm}m`;
  } else el.sunDaylight.textContent = "—";
  renderSunTomorrow(w);
  scheduleSunCountdown(w);
  scheduleSunArc(w);
}

function renderSunTomorrow(w) {
  if (!el.sunTomorrow) return;
  const today = w?.daily?.[0];
  const tmrw  = w?.daily?.[1];
  if (!today?.sunrise || !today?.sunset || !tmrw?.sunrise || !tmrw?.sunset) {
    el.sunTomorrow.textContent = "";
    return;
  }
  // Compare "clock time" of the events, not the timestamps (a whole day
  // separates them). Reduce each to seconds-since-midnight in the local
  // (or forecast) day; the timezone lives on the weather object.
  const tz = w?.timezone;
  const minOf = (ts) => {
    try {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz && tz !== "auto" ? tz : undefined,
        hour: "2-digit", minute: "2-digit", hour12: false,
      }).formatToParts(new Date(ts));
      const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
      const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
      return h * 60 + m;
    } catch {
      const d = new Date(ts); return d.getHours() * 60 + d.getMinutes();
    }
  };
  const dRise = minOf(tmrw.sunrise) - minOf(today.sunrise);
  const dSet  = minOf(tmrw.sunset)  - minOf(today.sunset);
  const fmt = (delta, kind) => {
    if (Math.abs(delta) < 1) return `${kind} unchanged`;
    const abs = Math.abs(delta);
    const dir = delta > 0 ? "later" : "earlier";
    return `${kind} ${abs}m ${dir}`;
  };
  el.sunTomorrow.textContent = `Tomorrow: ${fmt(dRise, "sunrise")} · ${fmt(dSet, "sunset")}`;
}

function scheduleSunArc(w) {
  if (!el.sunArcMarker || !el.sunArcPath) return;
  if (state.sunArcTimer) { clearInterval(state.sunArcTimer); state.sunArcTimer = null; }
  if (!w?.sunrise || !w?.sunset) return;

  const update = () => {
    const now = Date.now();
    const sr = w.sunrise, ss = w.sunset;
    let frac;
    if (now < sr) {
      // Before sunrise: ride the night arc fraction toward 0 (left horizon).
      frac = 0;
    } else if (now > ss) {
      frac = 1;
    } else {
      frac = (now - sr) / (ss - sr);
    }
    // Quadratic Bezier from (10,74) to (190,74) via (100,-26). The midpoint
    // (50% t) reaches y = 0.5*(74) + 0.5*(74 + 2*(-26-74)/2*(...)) — easier
    // to evaluate the curve directly.
    const t = clamp01(frac);
    const x = (1 - t) ** 2 * 10 + 2 * (1 - t) * t * 100 + t ** 2 * 190;
    const y = (1 - t) ** 2 * 74 + 2 * (1 - t) * t * -26 + t ** 2 * 74;
    el.sunArcMarker.setAttribute("cx", x.toFixed(1));
    el.sunArcMarker.setAttribute("cy", y.toFixed(1));
    // After sunset, dim the marker so it visually settles.
    const isUp = now >= sr && now <= ss;
    el.sunArcMarker.style.opacity = isUp ? "1" : "0.45";
  };
  update();
  state.sunArcTimer = setInterval(update, 60_000);
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

function scheduleSunCountdown(w) {
  if (state.sunTimer) { clearInterval(state.sunTimer); state.sunTimer = null; }
  if (!w?.daily?.length) return;
  const update = () => {
    const now = Date.now();
    let nextTs = null, nextKind = null;
    for (const d of w.daily) {
      for (const [ts, kind] of [[d.sunrise, "Sunrise"], [d.sunset, "Sunset"]]) {
        if (ts && ts > now && (!nextTs || ts < nextTs)) { nextTs = ts; nextKind = kind; }
      }
    }
    if (!nextTs) {
      if (el.sunCountdown) el.sunCountdown.textContent = "";
      if (el.sunNextLabel) el.sunNextLabel.textContent = "Sun";
      return;
    }
    const mins = Math.max(0, Math.round((nextTs - now) / 60_000));
    const label = mins >= 60
      ? `${Math.floor(mins / 60)}h ${mins % 60}m`
      : `${mins}m`;
    if (el.sunNextLabel) el.sunNextLabel.textContent = `${nextKind} in`;
    if (el.sunCountdown) el.sunCountdown.textContent = label;
  };
  update();
  state.sunTimer = setInterval(update, 30_000);
}

function renderAdvice(w) {
  const text = advise(w);
  if (!el.advice || !el.adviceText) return;
  if (text) {
    el.adviceText.textContent = text;
    el.advice.hidden = false;
  } else {
    el.advice.hidden = true;
  }
  renderOutfit(w);
}

function renderTransition(w) {
  if (!el.transitionChip || !el.transitionText) return;
  const t = nextTransition(w, 12);
  if (!t) { el.transitionChip.hidden = true; return; }
  el.transitionChip.hidden = false;
  el.transitionText.textContent = `${t.label} · ${fmtTime(t.time)}`;
  el.transitionChip.setAttribute("data-to", t.to);
  if (el.transitionArrow) {
    const symbols = { rain: "🌧", snow: "❄", storm: "⛈", fog: "🌫", clouds: "☁", clear: "☀" };
    el.transitionArrow.textContent = symbols[t.to] || "→";
  }
  el.transitionChip.onclick = () => {
    state.handlers.onHourClick?.(t.time);
  };
}

function renderOutfit(w) {
  if (!el.outfit) return;
  const s = suggestOutfit(w);
  if (!s) { el.outfit.hidden = true; return; }
  el.outfit.hidden = false;
  el.outfit.setAttribute("data-tier", s.tier);
  el.outfitIcons.textContent = s.icons;
  el.outfitLabel.textContent = s.label;
  el.outfitHint.textContent = s.hint;
}

function startLocaltime(w) {
  if (state.localTimer) { clearInterval(state.localTimer); state.localTimer = null; }
  if (!el.placeLocaltime) return;
  const tz = w?.timezone;
  const hasTz = !!tz && tz !== "auto";
  if (!hasTz) el.placeLocaltime.textContent = "";
  const update = () => {
    if (!hasTz) return;
    try {
      const parts = new Intl.DateTimeFormat([], {
        timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
        weekday: "short", timeZoneName: "short",
      }).formatToParts(new Date());
      const day = parts.find((p) => p.type === "weekday")?.value ?? "";
      const hour = parts.find((p) => p.type === "hour")?.value ?? "";
      const minute = parts.find((p) => p.type === "minute")?.value ?? "";
      const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
      el.placeLocaltime.innerHTML =
        `<span class="clock-dot" aria-hidden="true"></span>` +
        `${escapeHtml(day)} ${escapeHtml(hour)}:${escapeHtml(minute)} <span style="color:var(--fg-dim)">${escapeHtml(tzName)}</span>`;
    } catch {
      el.placeLocaltime.textContent = "";
    }
  };
  update();
  // Tick every 10 s regardless of hero tz so chip times keep pace when the
  // active place has no timezone but saved chips do.
  state.localTimer = setInterval(() => { update(); tickPlaceChipTimes(); }, 10_000);
}

function tickPlaceChipTimes() {
  if (!el.placesStrip) return;
  const chips = el.placesStrip.querySelectorAll(".place-chip");
  if (!chips.length) return;
  const all = places.all();
  chips.forEach((chip) => {
    const id = chip.dataset.id;
    const p = all.find((x) => x.id === id);
    if (!p) return;
    const t = localTimeIn(p.timezone);
    const node = chip.querySelector(".place-chip-time");
    if (t && node) node.textContent = t;
  });
}

function renderInsights(w) {
  if (!el.insightsCard || !el.insightsList) return;
  const tz = w?.timezone;
  const fmt = (ts) => fmtTime(ts);
  const weekday = (ts) => new Date(ts).toLocaleDateString(undefined, {
    weekday: "short",
    ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });
  const items = buildInsights(w, { fmtTime: fmt, weekday });
  if (!items.length) {
    el.insightsCard.hidden = true;
    return;
  }
  el.insightsCard.hidden = false;
  el.insightsList.innerHTML = items.map((it, i) => `
    <li data-i="${i}" ${it.ts ? `data-ts="${it.ts}" style="cursor:pointer"` : ""}>
      <span class="insight-icon">${it.icon}</span>
      <span class="insight-meta">
        <span class="insight-label">${escapeHtml(it.label)}</span>
        <span class="insight-value">${escapeHtml(it.value)}</span>
      </span>
    </li>
  `).join("");
  el.insightsList.querySelectorAll("li[data-ts]").forEach((li) => {
    li.addEventListener("click", () => {
      const ts = parseInt(li.dataset.ts, 10);
      if (ts) state.handlers.onHourClick?.(ts);
    });
  });
}

function renderWeekend(w) {
  if (!el.weekendChip) return;
  const snap = weekendSnapshot(w);
  if (!snap) {
    el.weekendChip.hidden = true;
    return;
  }
  el.weekendChip.hidden = false;
  el.weekendChip.dataset.tone = snap.tone;
  el.weekendIconSat.textContent = snap.iconSat;
  el.weekendIconSun.textContent = snap.iconSun;
  el.weekendHeadline.textContent = snap.headline;
  const range = (snap.hi != null && isFinite(snap.hi))
    ? `${Math.round(convertTemp(snap.hi))}° / ${Math.round(convertTemp(snap.lo))}°`
    : "—";
  const wd = (d, label) => d ? `${label} ${Math.round(convertTemp(d.tempMax))}°` : null;
  const parts = [range, wd(snap.sat, "Sat"), wd(snap.sun, "Sun")].filter(Boolean);
  el.weekendDetail.textContent = parts.join(" · ");
  el.weekendChip.onclick = () => {
    if (snap.ts) state.handlers.onHourClick?.(snap.ts);
  };
}

function renderAlerts(w) {
  if (!el.alertsStrip) return;
  const alerts = buildAlerts(w);
  // Respect per-place dismissals so the user isn't nagged.
  const dismissed = getDismissedAlerts();
  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (!visible.length) {
    el.alertsStrip.hidden = true;
    el.alertsStrip.innerHTML = "";
    return;
  }
  el.alertsStrip.hidden = false;
  el.alertsStrip.innerHTML = visible.map((a) => `
    <button class="alert-pill alert-${a.severity}" type="button"
            data-id="${escapeHtml(a.id)}" ${a.ts ? `data-ts="${a.ts}"` : ""}
            title="${escapeHtml(a.detail)}">
      <span class="alert-dot" aria-hidden="true"></span>
      <span class="alert-title">${escapeHtml(a.title)}</span>
      <span class="alert-detail">${escapeHtml(a.detail)}</span>
      <span class="alert-close" aria-label="Dismiss alert">×</span>
    </button>
  `).join("");
  el.alertsStrip.querySelectorAll(".alert-pill").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      const isClose = ev.target.classList.contains("alert-close");
      if (isClose) {
        ev.stopPropagation();
        const id = btn.dataset.id;
        rememberDismissedAlert(id);
        btn.remove();
        if (!el.alertsStrip.children.length) el.alertsStrip.hidden = true;
        return;
      }
      const ts = parseInt(btn.dataset.ts, 10);
      if (ts) state.handlers.onHourClick?.(ts);
    });
  });
}

function getDismissedAlerts() {
  try {
    const raw = sessionStorage.getItem("aether:dismissed-alerts");
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function rememberDismissedAlert(id) {
  try {
    const set = getDismissedAlerts();
    set.add(id);
    sessionStorage.setItem("aether:dismissed-alerts", JSON.stringify([...set]));
  } catch { /* ignore */ }
}

function renderActivity(w) {
  if (!el.activityCard || !el.activityList) return;
  const items = findActivityWindows(w);
  if (!items.length) {
    el.activityCard.hidden = true;
    return;
  }
  el.activityCard.hidden = false;
  el.activityList.innerHTML = items.map((it) => {
    const startStr = fmtTime(it.start);
    const endStr = fmtTime(it.end);
    const why = (it.why || []).slice(0, 3).map(escapeHtml).join(" · ");
    return `
      <li data-ts="${it.start}" data-kind="${it.kind}">
        <span class="activity-icon">${it.icon}</span>
        <span class="activity-meta">
          <span class="activity-label">${escapeHtml(it.label)}</span>
          <span class="activity-window">${escapeHtml(startStr)} – ${escapeHtml(endStr)}</span>
          <span class="activity-why">${why}</span>
        </span>
        <span class="activity-score" aria-label="Score ${it.score} out of 100">${it.score}</span>
      </li>
    `;
  }).join("");
  el.activityList.querySelectorAll("li[data-ts]").forEach((li) => {
    li.addEventListener("click", () => {
      const ts = parseInt(li.dataset.ts, 10);
      if (ts) state.handlers.onHourClick?.(ts);
    });
  });
}

function renderCloudCover(w) {
  if (!el.cloudCard) return;
  const c = w?.cloudCover;
  if (c == null || isNaN(c)) { el.cloudCard.style.opacity = 0.5; return; }
  el.cloudCard.style.opacity = 1;
  const pct = Math.max(0, Math.min(100, Math.round(c)));
  el.cloudValue.textContent = `${pct}%`;
  el.cloudArc.setAttribute("stroke-dashoffset", String(126 * (1 - pct / 100)));

  let headline, tone, detail;
  if (pct < 15)      { headline = "Clear";           tone = "clear";    detail = "Blue sky, no cloud deck."; }
  else if (pct < 40) { headline = "Mostly clear";    tone = "clear";    detail = "Scattered high clouds."; }
  else if (pct < 70) { headline = "Partly cloudy";   tone = "mixed";    detail = "Broken cloud cover."; }
  else if (pct < 90) { headline = "Mostly cloudy";   tone = "cloudy";   detail = "Thick deck overhead."; }
  else               { headline = "Overcast";        tone = "cloudy";   detail = "Full grey ceiling."; }

  el.cloudCard.setAttribute("data-tone", tone);
  el.cloudHeadline.textContent = headline;
  el.cloudDetail.textContent = detail;
  if (el.cloudLabel) el.cloudLabel.textContent = w.isDay ? "☀ day" : "🌙 night";

  const series = (w.hourly || [])
    .map((h) => h.cloudCover)
    .filter((v) => v != null)
    .slice(0, 12);
  drawSparkline(el.cloudSparkLine, el.cloudSparkFill, series, {
    minSpan: 20, fixedMin: 0, fixedMax: 100,
  });
}

function renderPrecipSummary(w) {
  if (!el.precipCard) return;
  const s = summarizePrecip(w);
  if (!s.hasAny) { el.precipCard.hidden = true; return; }
  el.precipCard.hidden = false;

  const fmt24 = s.next24 < 1 && s.next24 > 0 ? s.next24.toFixed(1) : Math.round(s.next24);
  const fmtWeek = s.weekTotal < 1 && s.weekTotal > 0 ? s.weekTotal.toFixed(1) : Math.round(s.weekTotal);
  el.precip24h.textContent = fmt24;
  el.precipWeek.textContent = fmtWeek;
  if (el.precipWeekDays) {
    if (s.wetDays === 0) {
      el.precipWeekDays.textContent = "· dry week";
      el.precipWeekDays.className = "trend flat";
    } else {
      el.precipWeekDays.textContent = `· ${s.wetDays} wet ${s.wetDays === 1 ? "day" : "days"}`;
      el.precipWeekDays.className = "trend";
    }
  }

  // Peak line: prefer "starts at X" if it's currently dry, else "heaviest at X".
  if (el.precipPeak) {
    if (s.next24 < 0.5 && s.weekTotal >= 0.5 && s.wettest) {
      const day = new Date(s.wettest.time).toLocaleDateString(undefined, { weekday: "long" });
      const amt = s.wettest.precip < 1 ? s.wettest.precip.toFixed(1) : Math.round(s.wettest.precip);
      el.precipPeak.textContent = `Wettest day: ${day} · ${amt} mm`;
    } else if (s.firstWetHour && s.firstWetHour.time > Date.now() + 30 * 60_000 && s.peak?.time) {
      el.precipPeak.textContent = `Starts around ${fmtTime(s.firstWetHour.time)} · peak ${fmtTime(s.peak.time)}`;
    } else if (s.peak && s.peak.precip >= 0.1) {
      const p = s.peak.precip < 1 ? s.peak.precip.toFixed(1) : Math.round(s.peak.precip);
      el.precipPeak.textContent = `Peak intensity ${p} mm at ${fmtTime(s.peak.time)}`;
    } else {
      el.precipPeak.textContent = "Passing sprinkles — nothing sustained.";
    }
  }

  // Weekly bars: normalize to the wettest day.
  if (el.precipWeekBars) {
    const max = Math.max(0.1, ...s.week.map((d) => d.precip));
    el.precipWeekBars.innerHTML = s.week.map((d) => {
      const pct = Math.max(4, Math.round((d.precip / max) * 100));
      const label = d.time
        ? new Date(d.time).toLocaleDateString(undefined, { weekday: "narrow" })
        : "";
      const amt = d.precip < 1 && d.precip > 0
        ? d.precip.toFixed(1)
        : Math.round(d.precip);
      const isDry = d.precip < 0.1;
      const title = `${new Date(d.time || Date.now()).toLocaleDateString(undefined, { weekday: "long" })} · ${amt} mm · ${Math.round(d.pop)}% chance`;
      return `
        <div class="precip-bar${isDry ? " dry" : ""}" title="${escapeHtml(title)}">
          <span class="precip-bar-fill" style="height:${pct}%"></span>
          <span class="precip-bar-label">${escapeHtml(label)}</span>
        </div>
      `;
    }).join("");
  }
}

function renderPollen(pollen) {
  if (!el.pollenCard) return;
  if (!pollen || !pollen.items?.length) {
    el.pollenCard.hidden = true;
    return;
  }
  el.pollenCard.hidden = false;
  el.pollenLevel.textContent = pollen.level;
  el.pollenLevel.setAttribute("data-level", pollen.level);
  el.pollenDominant.textContent = `${pollen.dominant.label} dominant`;
  el.pollenItems.innerHTML = pollen.items.map((p) =>
    `<span>${escapeHtml(p.label)} ${p.value.toFixed(1)}</span>`
  ).join("");
}

function renderTrends(w) {
  // Pressure trend.
  if (el.pressureTrend) {
    if (w.pressureTrend) {
      const { direction, delta } = w.pressureTrend;
      const arrow = direction === "rising" ? "▲" : direction === "falling" ? "▼" : "→";
      const cls = direction === "rising" ? "up" : direction === "falling" ? "down" : "flat";
      el.pressureTrend.className = `trend ${cls}`;
      // Show delta in the user's active pressure unit.
      const convDelta = convertPressure(delta);
      const p = state.pressureUnit === "inhg" ? 2
              : state.pressureUnit === "mmhg" ? 1 : 1;
      el.pressureTrend.textContent = `${arrow} ${convDelta >= 0 ? "+" : ""}${convDelta.toFixed(p)}`;
    } else {
      el.pressureTrend.textContent = "";
    }
  }
  // Temperature trend: next-3-hours delta vs now.
  if (el.tempTrend) {
    const hrs = w.hourly || [];
    const cur = w.temp;
    const future = hrs.find((h) => h.time > Date.now() + 2.5 * 3600_000);
    if (future && cur != null) {
      const delta = future.temp - cur;
      if (Math.abs(delta) < 1) {
        el.tempTrend.className = "temp-trend flat";
        el.tempTrend.textContent = "→ steady";
      } else {
        el.tempTrend.className = delta > 0 ? "temp-trend up" : "temp-trend down";
        el.tempTrend.textContent = `${delta > 0 ? "▲" : "▼"} ${Math.round(Math.abs(delta))}°/3h`;
      }
    } else {
      el.tempTrend.textContent = "";
    }
  }
}

function cardinal(deg) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const i = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return dirs[i];
}

function renderHourly(w) {
  el.forecastTrack.innerHTML = "";
  for (const h of (w.hourly || []).slice(0, 24)) {
    const item = document.createElement("div");
    item.className = "forecast-item";
    item.dataset.ts = h.time;
    const windDisplay = h.wind != null ? fmtWind(h.wind) : null;
    const windPart = h.windDir != null && windDisplay != null
      ? `<span class="forecast-wind" title="Wind ${windDisplay} ${windUnitLabel()} from ${cardinal(h.windDir)}">
           <svg class="forecast-wind-arrow" viewBox="-6 -6 12 12" aria-hidden="true" style="transform:rotate(${h.windDir}deg)">
             <path d="M 0 -4 L 2 3 L 0 1 L -2 3 Z" fill="currentColor"/>
           </svg>
           <span class="forecast-wind-val">${windDisplay}</span>
         </span>`
      : `<span class="forecast-wind forecast-wind-empty" aria-hidden="true"></span>`;
    item.innerHTML = `
      <span class="forecast-time">${fmtTime(h.time)}</span>
      <span class="forecast-icon">${iconFor(h.condition)}</span>
      <span class="forecast-temp">${Math.round(convertTemp(h.temp))}°</span>
      ${windPart}
      <span class="forecast-pop ${h.pop < 20 ? "dim" : ""}">${h.pop}%</span>
    `;
    item.addEventListener("click", () => state.handlers.onHourClick?.(h.time));
    el.forecastTrack.appendChild(item);
  }
}

function highlightHour(index) {
  const items = el.forecastTrack.querySelectorAll(".forecast-item");
  items.forEach((it, i) => it.classList.toggle("active", i === index));
}

function renderDaily(w) {
  el.dailyTrack.innerHTML = "";
  const days = (w.daily || []).slice(0, 7);
  if (!days.length) return;
  renderDailyIconStrip(days);
  renderDailySpark(days);
  renderDailyDelta(days);
  renderDailyHighlights(days);
  // Global min/max for the range bar.
  let gMin = Infinity, gMax = -Infinity;
  for (const d of days) {
    if (d.tempMin < gMin) gMin = d.tempMin;
    if (d.tempMax > gMax) gMax = d.tempMax;
  }
  const span = Math.max(1, gMax - gMin);
  days.forEach((d, i) => {
    const dt = new Date(d.time);
    const tz = state.weather?.timezone;
    const day = i === 0 ? "Today" : dt.toLocaleDateString(undefined, {
      weekday: "short",
      ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
    });
    const left = ((d.tempMin - gMin) / span) * 100;
    const width = ((d.tempMax - d.tempMin) / span) * 100;
    const item = document.createElement("div");
    item.className = "daily-item";
    item.dataset.ts = d.time;
    const gustLabel = (d.gustsMax && d.gustsMax >= 25)
      ? ` · gusts ${fmtWind(d.gustsMax)} ${windUnitLabel()}`
      : "";
    const popLabel = d.pop >= 30 ? ` · ${d.pop}% rain` : "";
    const extra = gustLabel || popLabel ? `<span class="daily-gust">${popLabel}${gustLabel}</span>` : "";
    item.innerHTML = `
      <span class="daily-day">${day}</span>
      <span class="daily-icon">${iconFor(d.condition)}</span>
      <div class="daily-range">
        <div class="daily-range-fill" style="left:${left}%;width:${Math.max(8, width)}%"></div>
      </div>
      <span class="daily-temp-min">${Math.round(convertTemp(d.tempMin))}°</span>
      <span class="daily-temp-max">${Math.round(convertTemp(d.tempMax))}°</span>
      ${extra}
    `;
    item.addEventListener("click", () => toggleDailyExpand(item, d, w));
    el.dailyTrack.appendChild(item);
  });
}

function renderDailyIconStrip(days) {
  if (!el.dailyIconStrip) return;
  el.dailyIconStrip.innerHTML = days.map((d) =>
    `<span class="strip-day" title="${escapeHtml(d.label || d.condition || "")}">${iconFor(d.condition)}</span>`
  ).join("");
}

function renderDailySpark(days) {
  if (!el.dailyHi || !el.dailyLo || !el.dailySparkDots) return;
  const W = 600, H = 60, PAD = 10, TOP = 6, BOT = 6;
  const hi = days.map((d) => d.tempMax).filter((v) => v != null);
  const lo = days.map((d) => d.tempMin).filter((v) => v != null);
  if (!hi.length || !lo.length) return;
  const tMin = Math.min(...lo);
  const tMax = Math.max(...hi);
  const span = Math.max(4, tMax - tMin);
  const innerW = W - PAD * 2;
  const innerH = H - TOP - BOT;
  const x = (i) => PAD + (i / (days.length - 1)) * innerW;
  const y = (v) => TOP + innerH - ((v - tMin) / span) * innerH;
  const linePath = (arr) => arr.map((v, i) => (i === 0 ? "M" : "L") + x(i).toFixed(1) + "," + y(v).toFixed(1)).join(" ");
  el.dailyHi.setAttribute("d", linePath(days.map((d) => d.tempMax)));
  el.dailyLo.setAttribute("d", linePath(days.map((d) => d.tempMin)));
  // Dots at each day + per-day temp labels above/below
  el.dailySparkDots.innerHTML = "";
  const tz = state.weather?.timezone;
  const dayLabel = (d, i) => i === 0 ? "Today"
    : new Date(d.time).toLocaleDateString(undefined, {
        weekday: "long", ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
      });
  const makeDot = (cx, cy, cls, tip, idx) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", cx.toFixed(1));
    c.setAttribute("cy", cy.toFixed(1));
    c.setAttribute("r", "2.5");
    c.setAttribute("class", cls);
    c.dataset.idx = String(idx);
    const t = document.createElementNS("http://www.w3.org/2000/svg", "title");
    t.textContent = tip;
    c.appendChild(t);
    c.addEventListener("click", () => scrollToDailyRow(idx));
    c.addEventListener("pointerenter", () => highlightDailyRow(idx, true));
    c.addEventListener("pointerleave", () => highlightDailyRow(idx, false));
    return c;
  };
  days.forEach((d, i) => {
    const name = dayLabel(d, i);
    if (d.tempMax != null) {
      const hi = Math.round(convertTemp(d.tempMax));
      const lo = d.tempMin != null ? ` / ${Math.round(convertTemp(d.tempMin))}°` : "";
      el.dailySparkDots.appendChild(makeDot(x(i), y(d.tempMax), "dot-hi", `${name}: ${hi}°${lo}`, i));
    }
    if (d.tempMin != null) {
      const hi = d.tempMax != null ? `${Math.round(convertTemp(d.tempMax))}° / ` : "";
      const lo = Math.round(convertTemp(d.tempMin));
      el.dailySparkDots.appendChild(makeDot(x(i), y(d.tempMin), "dot-lo", `${name}: ${hi}${lo}°`, i));
    }
  });
}

function scrollToDailyRow(idx) {
  const rows = el.dailyTrack?.querySelectorAll(".daily-item");
  const row = rows?.[idx];
  if (!row) return;
  row.scrollIntoView({ behavior: "smooth", block: "center" });
  row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash");
  if (row.dataset.expanded !== "true") row.click();
}

function highlightDailyRow(idx, on) {
  const rows = el.dailyTrack?.querySelectorAll(".daily-item");
  const row = rows?.[idx];
  if (!row) return;
  row.classList.toggle("hover-preview", !!on);
}

function renderDailyDelta(days) {
  if (!el.dailyDelta) return;
  if (days.length < 2) { el.dailyDelta.textContent = ""; return; }
  const today = days[0], tmrw = days[1];
  if (today.tempMax == null || tmrw.tempMax == null) {
    el.dailyDelta.textContent = "";
    return;
  }
  const deltaC = tmrw.tempMax - today.tempMax;
  // Scale delta to the active unit: °F spans 1.8x a °C span.
  const deltaDisplay = Math.round(state.unit === "F" ? deltaC * 9 / 5 : deltaC);
  const dPop = (tmrw.pop ?? 0) - (today.pop ?? 0);
  const parts = [];
  if (deltaDisplay > 0) parts.push(`${deltaDisplay}° warmer`);
  else if (deltaDisplay < 0) parts.push(`${Math.abs(deltaDisplay)}° cooler`);
  else parts.push("similar temp");
  if (Math.abs(dPop) >= 20) {
    parts.push(dPop > 0 ? `+${dPop}% rain` : `${dPop}% rain`);
  }
  el.dailyDelta.textContent = `Tomorrow: ${parts.join(" · ")}`;
}

function renderDailyHighlights(days) {
  if (!el.dailyHighlights) return;
  if (!days || days.length < 3) { el.dailyHighlights.hidden = true; return; }
  const tz = state.weather?.timezone;
  const dayName = (ts, i) => i === 0 ? "Today" : new Date(ts).toLocaleDateString(undefined, {
    weekday: "short", ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });

  let warmest = 0, coolest = 0, swingIdx = 0;
  let bestSwing = -Infinity;
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    if (d.tempMax != null && d.tempMax > days[warmest].tempMax) warmest = i;
    if (d.tempMin != null && d.tempMin < days[coolest].tempMin) coolest = i;
    const swing = (d.tempMax ?? 0) - (d.tempMin ?? 0);
    if (swing > bestSwing) { bestSwing = swing; swingIdx = i; }
  }

  const chips = [];
  const wDay = days[warmest], cDay = days[coolest], sDay = days[swingIdx];
  const warmSpread = (wDay.tempMax ?? 0) - (cDay.tempMax ?? 0);
  const coolSpread = (cDay.tempMin ?? 0) - (wDay.tempMin ?? 0);

  // Only surface warmest/coolest chips when they're actually distinct.
  if (wDay.tempMax != null && warmest !== coolest && warmSpread >= 1.5) {
    chips.push({
      icon: "🔆", kind: "warmest",
      text: `Warmest ${dayName(wDay.time, warmest)} · ${Math.round(convertTemp(wDay.tempMax))}°`,
      idx: warmest,
    });
  }
  if (cDay.tempMin != null && warmest !== coolest && Math.abs(coolSpread) >= 1.5) {
    chips.push({
      icon: "❄️", kind: "coolest",
      text: `Coolest ${dayName(cDay.time, coolest)} · ${Math.round(convertTemp(cDay.tempMin))}°`,
      idx: coolest,
    });
  }
  // Biggest swing only shows if it's notable AND not a duplicate of warmest.
  if (bestSwing >= 12 && swingIdx !== warmest && swingIdx !== coolest) {
    chips.push({
      icon: "↕️", kind: "swing",
      text: `${dayName(sDay.time, swingIdx)} swings ${Math.round(convertTemp(sDay.tempMin))}° → ${Math.round(convertTemp(sDay.tempMax))}°`,
      idx: swingIdx,
    });
  }

  if (!chips.length) {
    el.dailyHighlights.hidden = true;
    return;
  }
  el.dailyHighlights.hidden = false;
  el.dailyHighlights.innerHTML = chips.map((c) =>
    `<button class="daily-highlight" type="button" data-idx="${c.idx}" data-kind="${c.kind}">
      <span class="daily-highlight-icon" aria-hidden="true">${c.icon}</span>
      <span class="daily-highlight-text">${escapeHtml(c.text)}</span>
    </button>`
  ).join("");
  el.dailyHighlights.querySelectorAll(".daily-highlight").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx, 10);
      scrollToDailyRow(idx);
    });
  });
}

function toggleDailyExpand(item, d, w) {
  const existing = item.querySelector(".daily-expand");
  if (existing) {
    existing.remove();
    item.dataset.expanded = "false";
    return;
  }
  // Build mini hourly bars for the 12 daytime-ish hours of that day, if we
  // have them in the hourly series (only first 24h). Otherwise skip.
  const dayStart = new Date(d.time);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = dayStart.getTime() + 24 * 3600_000;
  const hrs = (w.hourly || []).filter((h) => h.time >= dayStart.getTime() && h.time < dayEnd);
  if (!hrs.length) {
    // For days beyond the 24h hourly range, just show summary text.
    const summary = document.createElement("div");
    summary.className = "daily-expand";
    summary.style.gridTemplateColumns = "1fr";
    summary.innerHTML = `<span style="padding:8px;color:var(--fg-dim);font-size:12px">Pop ${d.pop}% · gust up to ${fmtWind(d.gustsMax ?? 0)} ${windUnitLabel()} · UV ${Math.round(d.uvMax ?? 0)}</span>`;
    item.appendChild(summary);
    item.dataset.expanded = "true";
    return;
  }
  const tMin = Math.min(...hrs.map((h) => h.temp));
  const tMax = Math.max(...hrs.map((h) => h.temp));
  const tSpan = Math.max(1, tMax - tMin);
  const box = document.createElement("div");
  box.className = "daily-expand";
  // Fit up to 12 sampled hours evenly across the day.
  const stepped = [];
  const step = Math.max(1, Math.floor(hrs.length / 12));
  for (let i = 0; i < hrs.length && stepped.length < 12; i += step) stepped.push(hrs[i]);
  box.innerHTML = stepped.map((h) => {
    const pct = ((h.temp - tMin) / tSpan) * 100;
    const height = 10 + (pct / 100) * 36;
    const precipLevel = h.pop >= 60 ? 2 : h.pop >= 25 ? 1 : 0;
    const hh = new Date(h.time).getHours().toString().padStart(2, "0");
    return `<div class="daily-expand-bar" data-precip="${precipLevel}" style="height:${height.toFixed(1)}px" title="${hh}:00 · ${Math.round(convertTemp(h.temp))}° · ${h.pop}%"><span>${Math.round(convertTemp(h.temp))}°</span></div>`;
  }).join("");
  item.appendChild(box);
  item.dataset.expanded = "true";
}

function renderNowcast(w) {
  const nowcast = (w.nowcast || []).filter((n) => n.time > Date.now());
  // Find first >0.1 precip entry.
  const first = nowcast.find((n) => n.precip > 0.1);
  if (!first) {
    el.nowcast.hidden = true;
    return;
  }
  const inMin = Math.max(0, Math.round((first.time - Date.now()) / 60_000));
  const kind = first.code >= 71 && first.code <= 86 ? "Snow" : "Rain";
  el.nowcastHeadline.textContent = inMin === 0
    ? `${kind} now`
    : `${kind} in ${inMin} minute${inMin === 1 ? "" : "s"}`;
  // 2h outlook summary.
  const totalMm = nowcast.reduce((s, n) => s + (n.precip || 0), 0);
  el.nowcastSub.textContent = `${totalMm.toFixed(1)} mm expected in the next 2 hours`;
  // Bars (time-labeled, clickable to scrub).
  el.nowcastBars.innerHTML = "";
  const slice = nowcast.slice(0, 8);
  const maxP = Math.max(0.5, ...slice.map((n) => n.precip || 0));
  slice.forEach((n, i) => {
    const bar = document.createElement("button");
    bar.type = "button";
    bar.className = "nowcast-bar";
    bar.style.height = `${Math.max(2, (n.precip / maxP) * 28)}px`;
    const mins = Math.round((n.time - Date.now()) / 60_000);
    bar.title = `+${Math.max(0, mins)} min · ${n.precip.toFixed(1)} mm`;
    bar.setAttribute("aria-label", bar.title);
    bar.addEventListener("click", () => state.handlers.onHourClick?.(n.time));
    el.nowcastBars.appendChild(bar);
  });
  el.nowcast.hidden = false;
}

// ---------- Icons ----------
function iconFor(condition) {
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

// ---------- Saved places strip ----------
function renderPinButton() {
  if (!el.pinBtn) return;
  const p = state.place;
  const canPin = !!(p && p.name && p.lat != null && p.lon != null);
  if (!canPin) { el.pinBtn.hidden = true; return; }
  const isSaved = places.isSaved(p);
  el.pinBtn.hidden = false;
  el.pinBtn.classList.toggle("saved", isSaved);
  el.pinBtn.setAttribute("aria-pressed", isSaved ? "true" : "false");
  el.pinBtn.setAttribute("title", isSaved ? "Unsave this location" : "Save this location");
  el.pinBtn.setAttribute("aria-label", isSaved ? "Unsave this location" : "Save this location");
}

function localTimeIn(tz) {
  if (!tz || tz === "auto") return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date());
  } catch { return null; }
}

function renderPlaces() {
  const all = places.all();
  if (!all.length) { el.placesStrip.hidden = true; el.placesStrip.innerHTML = ""; return; }
  el.placesStrip.hidden = false;
  const activeId = state.place ? places.idFor(state.place) : null;
  el.placesStrip.innerHTML = all.map((p) => {
    const active = places.idFor(p) === activeId;
    const localTime = localTimeIn(p.timezone);
    return `
      <div class="place-chip ${active ? "active" : ""}" data-id="${p.id}">
        <span class="place-chip-name">${escapeHtml(p.name)}</span>
        ${localTime ? `<span class="place-chip-time" title="Local time">${localTime}</span>` : ""}
        ${p.temp != null ? `<span class="temp">${Math.round(convertTemp(p.temp))}°</span>` : ""}
        <span class="close" data-action="remove" aria-label="Remove">
          <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
        </span>
      </div>`;
  }).join("");
  el.placesStrip.querySelectorAll(".place-chip").forEach((chip) => {
    const id = chip.dataset.id;
    const item = all.find((p) => p.id === id);
    chip.addEventListener("click", (e) => {
      if (e.target.closest('[data-action="remove"]')) {
        places.remove(item);
        renderPlaces();
        return;
      }
      state.handlers.onPlaceClick?.(item);
    });
  });
}

// ---------- Bindings ----------
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

const runSearch = debounce(async (q) => {
  const results = await searchCities(q);
  renderSearchResults(results);
}, 200);

function renderSearchResults(results) {
  if (!results.length) { el.searchResults.hidden = true; el.searchResults.innerHTML = ""; return; }
  el.searchResults.innerHTML = results.map((r, i) => `
    <li role="option" data-index="${i}">
      <span>${escapeHtml(r.name)}${r.admin1 ? `, ${escapeHtml(r.admin1)}` : ""}</span>
      <span class="sub">${escapeHtml(r.country || "")}</span>
    </li>
  `).join("");
  el.searchResults.hidden = false;
  el.searchResults._items = results;
}

function showRecentsIfAny() {
  const recents = places.all().slice(0, 5);
  if (!recents.length) { el.searchResults.hidden = true; return; }
  const itemsHtml = recents.map((r, i) => `
    <li role="option" data-index="${i}">
      <span>${escapeHtml(r.name)}${r.admin1 ? `, ${escapeHtml(r.admin1)}` : ""}</span>
      <span class="sub">${escapeHtml(r.country || "")}</span>
    </li>
  `).join("");
  el.searchResults.innerHTML = `<li class="recent-heading">Recent places</li>${itemsHtml}`;
  el.searchResults._items = recents;
  el.searchResults.hidden = false;
}

function bindSearch() {
  el.searchInput.addEventListener("input", (e) => {
    const v = e.target.value.trim();
    if (v.length < 2) {
      showRecentsIfAny();
      return;
    }
    runSearch(v);
  });
  el.searchInput.addEventListener("blur", () => {
    setTimeout(() => (el.searchResults.hidden = true), 150);
  });
  el.searchInput.addEventListener("focus", () => {
    if (el.searchInput.value.trim().length < 2) {
      showRecentsIfAny();
    } else if (el.searchResults._items?.length) {
      el.searchResults.hidden = false;
    }
  });
  el.searchResults.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    const i = parseInt(li.dataset.index, 10);
    const item = el.searchResults._items?.[i];
    if (!item) return;
    el.searchInput.value = item.name;
    el.searchResults.hidden = true;
    places.add(item);
    state.handlers.onSearchSelect?.(item);
  });
}

function bindUnitToggle() {
  el.unitBtn.addEventListener("click", () => {
    state.unit = state.unit === "C" ? "F" : "C";
    localStorage.setItem("aether:unit", state.unit);
    el.unitBtn.textContent = `°${state.unit}`;
    if (state.weather) ui.setWeather(state.weather);
  });
}

function bindLocate() {
  el.locateBtn.addEventListener("click", () => state.handlers.onLocate?.());
}

function bindAudio() {
  el.audioBtn.addEventListener("click", () => state.handlers.onAudioToggle?.());
}

let deferredInstallPrompt = null;
function bindInstallPrompt() {
  if (!el.installBtn) return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    el.installBtn.hidden = false;
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    el.installBtn.hidden = true;
    ui.showToast("Aether installed");
  });
  el.installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === "accepted") el.installBtn.hidden = true;
    deferredInstallPrompt = null;
  });
}

function bindRefresh() {
  if (!el.refreshBtn) return;
  el.refreshBtn.addEventListener("click", () => state.handlers.onRefresh?.());
}

function bindSettings() {
  if (!el.settingsBtn || !el.settingsMenu) return;
  const close = () => {
    el.settingsMenu.hidden = true;
    el.settingsBtn.setAttribute("aria-expanded", "false");
  };
  const open = () => {
    el.settingsMenu.hidden = false;
    el.settingsBtn.setAttribute("aria-expanded", "true");
  };
  el.settingsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (el.settingsMenu.hidden) open(); else close();
  });
  document.addEventListener("click", (e) => {
    if (el.settingsMenu.hidden) return;
    if (e.target.closest("#settings-menu") || e.target.closest("#settings-btn")) return;
    close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el.settingsMenu.hidden) close();
  });

  el.settingReduceMotion?.addEventListener("change", () => {
    const on = el.settingReduceMotion.checked;
    document.documentElement.setAttribute("data-reduce-motion", on ? "true" : "false");
    localStorage.setItem("aether:reduceMotion", on ? "1" : "0");
    state.handlers.onReduceMotion?.(on);
  });

  el.settingFocusMode?.addEventListener("change", () => {
    const on = el.settingFocusMode.checked;
    document.documentElement.setAttribute("data-focus", on ? "true" : "false");
    localStorage.setItem("aether:focus", on ? "1" : "0");
  });

  el.settingUnitF?.addEventListener("change", () => {
    const wantF = el.settingUnitF.checked;
    const desired = wantF ? "F" : "C";
    if (state.unit !== desired) {
      state.unit = desired;
      localStorage.setItem("aether:unit", state.unit);
      el.unitBtn.textContent = `°${state.unit}`;
      if (state.weather) ui.setWeather(state.weather);
    }
  });

  el.settingWindUnit?.addEventListener("change", () => {
    const u = el.settingWindUnit.value;
    if (["kmh", "mph", "ms", "kt"].includes(u) && state.windUnit !== u) {
      state.windUnit = u;
      localStorage.setItem("aether:windUnit", u);
      if (state.weather) ui.setWeather(state.weather);
    }
  });

  el.settingTimeFormat?.addEventListener("change", () => {
    const f = el.settingTimeFormat.value;
    if ((f === "12" || f === "24") && state.timeFormat !== f) {
      state.timeFormat = f;
      localStorage.setItem("aether:timeFormat", f);
      if (state.weather) ui.setWeather(state.weather);
    }
  });

  el.settingPressureUnit?.addEventListener("change", () => {
    const u = el.settingPressureUnit.value;
    if (["hpa", "inhg", "mmhg"].includes(u) && state.pressureUnit !== u) {
      state.pressureUnit = u;
      localStorage.setItem("aether:pressureUnit", u);
      if (state.weather) ui.setWeather(state.weather);
    }
  });

  el.settingClearPlaces?.addEventListener("click", () => {
    if (!confirm("Clear all saved places?")) return;
    for (const p of places.all()) places.remove(p);
    renderPlaces();
    ui.showToast("Saved places cleared");
    close();
  });
}

function applyStoredPreferences() {
  const reduce = localStorage.getItem("aether:reduceMotion") === "1";
  if (reduce) {
    document.documentElement.setAttribute("data-reduce-motion", "true");
    if (el.settingReduceMotion) el.settingReduceMotion.checked = true;
    // Defer so app.js has time to install the handler.
    queueMicrotask(() => state.handlers.onReduceMotion?.(true));
  }
  const focus = localStorage.getItem("aether:focus") === "1";
  if (focus) {
    document.documentElement.setAttribute("data-focus", "true");
    if (el.settingFocusMode) el.settingFocusMode.checked = true;
  }
  if (el.settingUnitF) el.settingUnitF.checked = state.unit === "F";
  if (el.settingWindUnit) el.settingWindUnit.value = state.windUnit;
  if (el.settingTimeFormat) el.settingTimeFormat.value = state.timeFormat;
  if (el.settingPressureUnit) el.settingPressureUnit.value = state.pressureUnit;
}

// Exposed so app.js can query the current preference on boot.
ui.isReduceMotion = () => localStorage.getItem("aether:reduceMotion") === "1";

// Kept in sync with the auto-refresh interval in app.js (15 min while live).
const REFRESH_INTERVAL_MS = 15 * 60_000;

function startFetchedTicker() {
  const update = () => {
    if (!el.fetchedAgo || !state.weather?.fetchedAt) {
      if (el.fetchedAgo) el.fetchedAgo.textContent = "";
      return;
    }
    const ms = Date.now() - state.weather.fetchedAt;
    const minutes = Math.max(0, Math.floor(ms / 60_000));
    const label =
      minutes < 1 ? "Just now" :
      minutes < 60 ? `Updated ${minutes}m ago` :
      `Updated ${Math.floor(minutes / 60)}h ago`;

    // Show "next in Xm" if we're still inside the auto-refresh window and
    // it's less than 10m away — earlier than that isn't interesting.
    let suffix = "";
    const remaining = REFRESH_INTERVAL_MS - ms;
    if (remaining > 0 && remaining <= 10 * 60_000) {
      const minsLeft = Math.max(1, Math.ceil(remaining / 60_000));
      suffix = ` · next in ${minsLeft}m`;
    } else if (remaining <= 0 && minutes < 60) {
      suffix = " · refreshing…";
    }
    el.fetchedAgo.textContent = "· " + label + suffix;
    el.fetchedAgo.classList.toggle("stale", minutes >= 20);
  };
  update();
  setInterval(update, 30_000);
}

function bindShare() {
  if (!el.shareBtn) return;
  el.shareBtn.addEventListener("click", async () => {
    const w = state.weather;
    if (!w) { ui.showToast("No weather to share yet"); return; }
    const placeName = state.place?.name || "Here";
    const unit = state.unit;
    const t = (v) => `${Math.round(unit === "F" ? v * 9 / 5 + 32 : v)}°${unit}`;
    const today = w.daily?.[0];
    const lines = [
      `Aether · ${placeName}`,
      `${capitalize(w.label)} · ${t(w.temp)} (feels ${t(w.feelsLike ?? w.temp)})`,
      today ? `Today: ${t(today.tempMin)} / ${t(today.tempMax)} · ${today.pop}% precip` : null,
      `Wind ${fmtWind(w.windSpeed)} ${windUnitLabel()}${w.windDir != null ? ` ${cardinal(w.windDir)}` : ""}`,
      w.uv != null ? `UV ${Math.round(w.uv)}` : null,
      w.airQuality?.aqi != null ? `AQI ${Math.round(w.airQuality.aqi)} (${w.airQuality.label})` : null,
    ].filter(Boolean);
    const text = lines.join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: `Aether — ${placeName}`, text });
      } else {
        await navigator.clipboard.writeText(text);
        ui.showToast("Summary copied to clipboard");
      }
      el.shareBtn.classList.add("just-copied");
      setTimeout(() => el.shareBtn.classList.remove("just-copied"), 600);
    } catch (err) {
      if (err?.name !== "AbortError") ui.showToast("Share failed");
    }
  });
}

function bindPin() {
  if (!el.pinBtn) return;
  el.pinBtn.addEventListener("click", () => {
    const p = state.place;
    if (!p) return;
    if (places.isSaved(p)) {
      places.remove(p);
      ui.showToast(`Removed ${p.name} from saved`);
    } else {
      places.add(p);
      if (state.weather?.temp != null) {
        places.updateSummary(p, {
          temp: state.weather.temp,
          condition: state.weather.condition,
          timezone: state.weather.timezone,
        });
      }
      ui.showToast(`Saved ${p.name}`);
    }
    renderPinButton();
    renderPlaces();
  });
}

function bindTilt() {
  if (!el.heroInner) return;
  let frame = 0;
  const onMove = (e) => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const r = el.heroInner.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width - 0.5;
      const my = (e.clientY - r.top) / r.height - 0.5;
      el.heroInner.style.setProperty("--rx", `${(-my * 3).toFixed(2)}deg`);
      el.heroInner.style.setProperty("--ry", `${(mx * 4).toFixed(2)}deg`);
    });
  };
  const reset = () => {
    el.heroInner.style.setProperty("--rx", "0deg");
    el.heroInner.style.setProperty("--ry", "0deg");
  };
  el.heroInner.addEventListener("pointermove", onMove);
  el.heroInner.addEventListener("pointerleave", reset);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Export renderPlaces so the app can refresh the strip after a load.
ui.refreshPlaces = renderPlaces;
