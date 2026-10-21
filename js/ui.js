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
import { narrate } from "./narrative.js";

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
  dayRangeMin: $("#day-range-min"),
  dayRangeMax: $("#day-range-max"),
  dayRangeMarker: $("#day-range-marker"),
  metricWind: $("#m-wind"),
  metricWindSub: $("#m-wind-sub"),
  windBft: $("#m-wind-bft"),
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
  sunRise: $("#sun-rise"),
  sunSet: $("#sun-set"),
  sunDaylight: $("#sun-daylight"),
  sunCountdown: $("#sun-countdown"),
  sunNextLabel: $("#sun-next-label"),
  windNeedle: $("#wind-needle"),
  advice: $("#advice"),
  adviceText: $("#advice-text"),
  chartSvg: $("#chart-svg"),
  chartHover: $("#chart-hover"),
  pollenCard: $("#pollen-card"),
  pollenLevel: $("#pollen-level"),
  pollenDominant: $("#pollen-dominant"),
  pollenItems: $("#pollen-items"),
  pressureTrend: $("#m-pressure-trend"),
  tempTrend: $("#temp-trend"),
  yesterdayDelta: $("#yesterday-delta"),
  yesterdayDeltaArrow: $("#yesterday-delta-arrow"),
  yesterdayDeltaText: $("#yesterday-delta-text"),
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
  dailySparkRain: $("#daily-spark-rain"),
  dailyDelta: $("#daily-delta"),
  shareBtn: $("#share-btn"),
  installBtn: $("#install-btn"),
  refreshBtn: $("#refresh-btn"),
  fetchedAgo: $("#fetched-ago"),
  dailyIconStrip: $("#daily-icon-strip"),
  settingsBtn: $("#settings-btn"),
  settingsMenu: $("#settings-menu"),
  settingReduceMotion: $("#setting-reduce-motion"),
  settingUnitF: $("#setting-unit-f"),
  settingWindMph: $("#setting-wind-mph"),
  settingClock12h: $("#setting-clock-12h"),
  settingClearPlaces: $("#setting-clear-places"),
  settingResetAll: $("#setting-reset-all"),
  metricWindUnit: $("#m-wind-unit"),
  chartPopover: $("#chart-popover"),
  insightsCard: $("#insights-card"),
  insightsList: $("#insights-list"),
  activityCard: $("#activity-card"),
  activityList: $("#activity-list"),
  alertsStrip: $("#alerts-strip"),
  sunArcMarker: $("#sun-arc-marker"),
  sunArcPath: $("#sun-arc-path"),
  sunArcGoldenAm: $("#sun-arc-golden-am"),
  sunArcGoldenPm: $("#sun-arc-golden-pm"),
  sunGolden: $("#sun-golden"),
  sunGoldenAm: $("#sun-golden-am"),
  sunGoldenPm: $("#sun-golden-pm"),
  sunDelta: $("#sun-delta"),
  comfortStrip: $("#comfort-strip"),
  weekendChip: $("#weekend-chip"),
  weekendHeadline: $("#weekend-headline"),
  weekendDetail: $("#weekend-detail"),
  weekendIconSat: $("#weekend-icon-sat"),
  weekendIconSun: $("#weekend-icon-sun"),
  forecastTrack: $("#forecast-track"),
  rainSummary: $("#rain-summary"),
  rainSummaryTotal: $("#rain-summary-total"),
  rainSummaryWindow: $("#rain-summary-window"),
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

const state = {
  unit: localStorage.getItem("aether:unit") || "C",
  windUnit: localStorage.getItem("aether:windUnit") || "kmh",
  clock12h: localStorage.getItem("aether:clock12h") === "1",
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

function convertWind(kmh) {
  if (kmh == null) return null;
  return state.windUnit === "mph" ? kmh * 0.621371 : kmh;
}
function windUnitLabel() { return state.windUnit === "mph" ? "mph" : "km/h"; }
function fmtWind(kmh) {
  const v = convertWind(kmh);
  return v == null ? "—" : `${Math.round(v)} ${windUnitLabel()}`;
}

// Visibility reads in miles whenever the user prefers mph (the sibling imperial
// unit), otherwise in km with one decimal.
function formatVisibility(meters) {
  if (meters == null) return "—";
  if (state.windUnit === "mph") {
    const miles = meters / 1609.344;
    return `${Math.round(miles * 10) / 10} mi`;
  }
  const km = meters / 1000;
  return `${Math.round(km * 10) / 10} km`;
}

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
    renderAlerts(weather);
    renderWeekend(weather);
    startLocaltime(weather);
    if (state.chart) state.chart.setHours(weather.hourly);
    if (state.comfortStrip) state.comfortStrip.setHours(weather.hourly);
    // Build the narrative here so it picks up state.unit / state.windUnit; the
    // old opt-passed-in path still wins when a caller supplies one explicitly.
    if (el.narrative) {
      const line = narrative != null ? narrative : narrate(weather, {
        fmtTemp: (c) => `${Math.round(convertTemp(c))}°`,
        fmtTempDelta: (c) => `${Math.round(c * (state.unit === "F" ? 9 / 5 : 1))}°`,
        fmtWind: (kmh) => fmtWind(kmh),
      });
      el.narrative.textContent = line || "";
    }
    if (weather.offline) ui.showToast("Offline — showing sample weather");
    // Save summary for the strip so chips can show current temp.
    if (state.place) {
      places.updateSummary(state.place, {
        temp: weather.temp,
        condition: weather.condition,
        timezone: weather.timezone,
      });
    }
    renderPlaces();
    updateFavicon(weather);
    updateTabTitle(weather);
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
    // Reflect scrubbed weather in the tab icon too.
    updateFavicon(sampled);
    updateTabTitle(sampled);
  },
  setScrubbing(on) {
    state.scrubbing = !!on;
    document.documentElement.setAttribute("data-scrubbing", on ? "true" : "false");
    if (on) {
      el.hintText.textContent = "Drag to explore future weather.";
    } else {
      el.hintText.innerHTML = 'Drag the slider, hover the chart, or press <kbd>?</kbd> for shortcuts.';
    }
    renderYesterdayDelta(state.weather);
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
  renderYesterdayDelta(w);
}

// "Vs same hour yesterday" chip. Pinned to live temp, so it stays stable while
// the scrubber moves; shown only when yesterday data exists AND we're viewing
// the current moment.
function renderYesterdayDelta(w) {
  if (!el.yesterdayDelta) return;
  const live = state.weather;
  const y = live?.yesterday;
  if (!y || live?.temp == null || state.scrubbing) {
    el.yesterdayDelta.hidden = true;
    return;
  }
  // Delta is a temperature difference — scale, not offset — so we convert the
  // raw ΔC into either ΔC or ΔF depending on the user's unit.
  const rawDelta = live.temp - y.temp;
  const unitScale = state.unit === "F" ? 9 / 5 : 1;
  const delta = rawDelta * unitScale;
  const rounded = Math.round(delta * 10) / 10;
  if (Math.abs(rounded) < 0.5) {
    el.yesterdayDeltaArrow.textContent = "≈";
    el.yesterdayDeltaText.textContent = "same as yesterday";
    el.yesterdayDelta.dataset.dir = "flat";
  } else {
    const sign = rounded > 0 ? "▲" : "▼";
    const magnitude = Math.abs(Math.round(rounded));
    el.yesterdayDeltaArrow.textContent = sign;
    el.yesterdayDeltaText.textContent =
      `${magnitude}° ${rounded > 0 ? "warmer" : "cooler"} than yesterday`;
    el.yesterdayDelta.dataset.dir = rounded > 0 ? "up" : "down";
  }
  el.yesterdayDelta.hidden = false;
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
  el.metricWind.textContent = w.windSpeed != null ? Math.round(convertWind(w.windSpeed)) : "—";
  if (el.metricWindUnit) el.metricWindUnit.textContent = windUnitLabel();
  const dir = w.windDir;
  const dirLabel = dir != null ? cardinal(dir) : null;
  const gustStr = w.windGusts != null ? fmtWind(w.windGusts) : "—";
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
  el.metricPressure.textContent = Math.round(w.pressure ?? 0);
  const visLabel = w.visibility != null
    ? `visibility ${formatVisibility(w.visibility)}`
    : "visibility —";
  const pressureStory = pressureNarrative(w.pressureTrend);
  el.metricPressureSub.textContent = pressureStory
    ? `${visLabel} · ${pressureStory}`
    : visLabel;
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

function fmtTime(ts) {
  if (!ts) return "—";
  const tz = state.weather?.timezone;
  const h12 = state.clock12h;
  const opts = { hour: "2-digit", minute: "2-digit", hour12: h12 };
  if (tz && tz !== "auto") {
    try {
      return new Intl.DateTimeFormat(undefined, { timeZone: tz, ...opts }).format(new Date(ts));
    } catch { /* fall through */ }
  }
  if (h12) {
    return new Intl.DateTimeFormat(undefined, opts).format(new Date(ts));
  }
  const d = new Date(ts);
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
  renderGoldenHour(w);
  renderDaylightDelta(w);
  scheduleSunCountdown(w);
  scheduleSunArc(w);
}

// Golden hour: ~first and last hour of daylight. The band is clamped so very
// short polar daylight still renders something sensible.
function renderGoldenHour(w) {
  const sr = w?.sunrise, ss = w?.sunset;
  const daylight = sr && ss ? ss - sr : 0;
  if (!sr || !ss || daylight <= 0) {
    if (el.sunGolden) el.sunGolden.hidden = true;
    hideGoldenBands();
    return;
  }
  const bandMs = Math.min(60 * 60_000, daylight / 2);
  const amEnd = sr + bandMs;
  const pmStart = ss - bandMs;
  if (el.sunGoldenAm) el.sunGoldenAm.textContent = `${fmtTime(sr)}–${fmtTime(amEnd)}`;
  if (el.sunGoldenPm) el.sunGoldenPm.textContent = `${fmtTime(pmStart)}–${fmtTime(ss)}`;
  if (el.sunGolden) el.sunGolden.hidden = false;

  // Paint the matching bands on the sun arc. pathLength is normalized to 1000,
  // so fractions map directly onto dash lengths. We approximate t-fraction on
  // the arc with the time-fraction of daylight — close enough visually since
  // the quadratic bezier is symmetric.
  const total = 1000;
  const amFrac = bandMs / daylight;
  const pmFrac = bandMs / daylight;
  const amLen = Math.round(amFrac * total);
  const pmLen = Math.round(pmFrac * total);
  const pmStartLen = total - pmLen;
  if (el.sunArcGoldenAm) {
    el.sunArcGoldenAm.setAttribute("stroke-dasharray", `${amLen} ${total}`);
    el.sunArcGoldenAm.setAttribute("stroke-dashoffset", "0");
    el.sunArcGoldenAm.setAttribute("stroke-opacity", "0.55");
  }
  if (el.sunArcGoldenPm) {
    // Shift the single dash to start at pmStartLen along the path so only the
    // trailing portion renders. Negative dash-offset moves the pattern toward
    // the path end — avoids a zero-length dash that round linecap would show
    // as a stray dot at the sunrise position.
    el.sunArcGoldenPm.setAttribute("stroke-dasharray", `${pmLen} ${total}`);
    el.sunArcGoldenPm.setAttribute("stroke-dashoffset", `${-pmStartLen}`);
    el.sunArcGoldenPm.setAttribute("stroke-opacity", "0.55");
  }
}

function hideGoldenBands() {
  if (el.sunArcGoldenAm) el.sunArcGoldenAm.setAttribute("stroke-opacity", "0");
  if (el.sunArcGoldenPm) el.sunArcGoldenPm.setAttribute("stroke-opacity", "0");
}

// Day-length delta vs tomorrow (positive = tomorrow is longer).
function renderDaylightDelta(w) {
  if (!el.sunDelta) return;
  const d = w?.daily;
  if (!d || d.length < 2 || !d[0]?.sunrise || !d[0]?.sunset || !d[1]?.sunrise || !d[1]?.sunset) {
    el.sunDelta.hidden = true;
    return;
  }
  const today = d[0].sunset - d[0].sunrise;
  const tomorrow = d[1].sunset - d[1].sunrise;
  const deltaSec = Math.round((tomorrow - today) / 1000);
  if (Math.abs(deltaSec) < 10) {
    el.sunDelta.textContent = "Same length tomorrow";
    el.sunDelta.hidden = false;
    el.sunDelta.dataset.dir = "flat";
    return;
  }
  const abs = Math.abs(deltaSec);
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  const parts = [];
  if (mins) parts.push(`${mins}m`);
  parts.push(`${secs}s`);
  const dir = deltaSec > 0 ? "longer" : "shorter";
  el.sunDelta.textContent = `${deltaSec > 0 ? "+" : "−"}${parts.join(" ")} ${dir} tomorrow`;
  el.sunDelta.dataset.dir = deltaSec > 0 ? "up" : "down";
  el.sunDelta.hidden = false;
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
    // Candidates: upcoming sunrises & sunsets, plus their adjacent golden
    // hour bookends. The soonest wins, with golden hour preferred inside
    // its own window (so "golden hour now · ends in Xm" takes precedence).
    const candidates = [];
    const BAND = 60 * 60_000;
    for (const d of w.daily) {
      if (d.sunrise && d.sunset) {
        const bandSize = Math.min(BAND, (d.sunset - d.sunrise) / 2);
        const amEnd = d.sunrise + bandSize;
        const pmStart = d.sunset - bandSize;
        // During golden hour window: show its remaining time.
        if (now >= d.sunrise && now <= amEnd) {
          candidates.push({ ts: amEnd, label: "Golden hour ends in", imminent: true });
        }
        if (now >= pmStart && now <= d.sunset) {
          candidates.push({ ts: d.sunset, label: "Golden hour ends in", imminent: true });
        }
        // Within 60 min of next golden hour start: show countdown.
        if (d.sunrise > now && d.sunrise - now <= BAND) {
          candidates.push({ ts: d.sunrise, label: "Golden hour in", imminent: true });
        }
        if (pmStart > now && pmStart - now <= BAND) {
          candidates.push({ ts: pmStart, label: "Golden hour in", imminent: true });
        }
      }
      if (d.sunrise && d.sunrise > now) candidates.push({ ts: d.sunrise, label: "Sunrise in" });
      if (d.sunset && d.sunset > now) candidates.push({ ts: d.sunset, label: "Sunset in" });
    }
    if (!candidates.length) {
      if (el.sunCountdown) el.sunCountdown.textContent = "";
      if (el.sunNextLabel) el.sunNextLabel.textContent = "Sun";
      return;
    }
    // Pick: imminent golden-hour signals win over distant sunrise/sunset.
    candidates.sort((a, b) => {
      if ((a.imminent ? 1 : 0) !== (b.imminent ? 1 : 0)) return b.imminent - a.imminent;
      return a.ts - b.ts;
    });
    const next = candidates[0];
    const mins = Math.max(0, Math.round((next.ts - now) / 60_000));
    const label = mins >= 60
      ? `${Math.floor(mins / 60)}h ${mins % 60}m`
      : `${mins}m`;
    if (el.sunNextLabel) el.sunNextLabel.textContent = next.label;
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
}

function startLocaltime(w) {
  if (state.localTimer) { clearInterval(state.localTimer); state.localTimer = null; }
  if (!el.placeLocaltime) return;
  const tz = w?.timezone;
  if (!tz || tz === "auto") {
    // Fall back to browser — still useful.
    el.placeLocaltime.textContent = "";
    return;
  }
  const update = () => {
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
  state.localTimer = setInterval(update, 10_000);
}

function renderInsights(w) {
  if (!el.insightsCard || !el.insightsList) return;
  const tz = w?.timezone;
  const fmt = (ts) => fmtTime(ts);
  const weekday = (ts) => new Date(ts).toLocaleDateString(undefined, {
    weekday: "short",
    ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });
  const items = buildInsights(w, {
    fmtTime: fmt,
    weekday,
    fmtTemp: (c) => `${Math.round(convertTemp(c))}°`,
    fmtWind: (kmh) => fmtWind(kmh),
  });
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
  const alerts = buildAlerts(w, {
    fmtTemp: (c) => `${Math.round(convertTemp(c))}°`,
    fmtWind: (kmh) => fmtWind(kmh),
  });
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
  const items = findActivityWindows(w, {
    fmtTemp: (c) => `${Math.round(convertTemp(c))}°`,
    fmtWind: (kmh) => fmtWind(kmh),
  });
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
      el.pressureTrend.textContent = `${arrow} ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`;
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
  renderRainSummary(w);
  el.forecastTrack.innerHTML = "";
  const hours = (w.hourly || []).slice(0, 24);
  // Find peak/trough. Only annotate when the spread is meaningful (≥3°) so a
  // mostly-flat day doesn't acquire silly "peak" / "cool" badges.
  const { peakIdx, troughIdx } = findExtremes(hours);
  hours.forEach((h, i) => {
    // Sunrise/sunset divider between adjacent hours that cross day/night.
    if (i > 0 && hours[i - 1].isDay !== h.isDay) {
      const divider = document.createElement("div");
      divider.className = "forecast-divider";
      const rising = h.isDay;
      divider.innerHTML = `
        <span class="forecast-divider-glyph" aria-hidden="true">${rising ? sunriseGlyph() : sunsetGlyph()}</span>
        <span class="forecast-divider-text">${rising ? "Sunrise" : "Sunset"} ~ ${fmtTime(h.time)}</span>
      `;
      el.forecastTrack.appendChild(divider);
    }
    const item = document.createElement("div");
    item.className = "forecast-item";
    item.dataset.ts = h.time;
    const badge = i === peakIdx ? '<span class="forecast-badge peak" title="Warmest in the next 24 hours">peak</span>'
      : i === troughIdx ? '<span class="forecast-badge trough" title="Coolest in the next 24 hours">cool</span>'
      : "";
    item.innerHTML = `
      ${badge}
      <span class="forecast-time">${fmtTime(h.time)}</span>
      <span class="forecast-icon">${iconFor(h.condition)}</span>
      <span class="forecast-temp">${Math.round(convertTemp(h.temp))}°</span>
      <span class="forecast-pop ${h.pop < 20 ? "dim" : ""}">${h.pop}%</span>
    `;
    item.addEventListener("click", () => state.handlers.onHourClick?.(h.time));
    // Mirror hover onto the chart cursor so the chart and list read together.
    item.addEventListener("mouseenter", () => state.chart?.setCursor?.(h.time));
    item.addEventListener("mouseleave", () => {
      // Return the cursor to whatever the current sampled time is (live or
      // scrubbed) so the chart doesn't blink to an empty state.
      const sampledTs = state.sampledWeather?._sampledTs;
      state.chart?.setCursor?.(sampledTs ?? null);
    });
    el.forecastTrack.appendChild(item);
  });
}

function sunriseGlyph() {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="14" r="3.5"/><path d="M5 20h14M12 7v3M8 10l1.5 1.5M16 10l-1.5 1.5M12 4l-2 3h4z"/></svg>`;
}
function sunsetGlyph() {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="14" r="3.5"/><path d="M5 20h14M12 10V7M8 10l1.5 1.5M16 10l-1.5 1.5M12 4l2 3h-4z"/></svg>`;
}

// Barometric trend into plain-English hint. Only speaks up when the 3-hour
// delta is big enough that a sailor's rule of thumb would call it something.
function pressureNarrative(trend) {
  if (!trend || trend.delta == null) return null;
  const d = trend.delta;
  if (d >= 3) return "clearing fast";
  if (d >= 0.8) return "settling in";
  if (d <= -3) return "front approaching";
  if (d <= -0.8) return "change ahead";
  return null;
}

function findExtremes(hours) {
  if (hours.length < 3) return { peakIdx: -1, troughIdx: -1 };
  let hi = -Infinity, lo = Infinity, peakIdx = -1, troughIdx = -1;
  for (let i = 0; i < hours.length; i++) {
    const t = hours[i].temp;
    if (t == null) continue;
    if (t > hi) { hi = t; peakIdx = i; }
    if (t < lo) { lo = t; troughIdx = i; }
  }
  if (hi - lo < 3) return { peakIdx: -1, troughIdx: -1 };
  return { peakIdx, troughIdx };
}

function highlightHour(index) {
  const items = el.forecastTrack.querySelectorAll(".forecast-item");
  items.forEach((it, i) => it.classList.toggle("active", i === index));
}

// Scan the next 24 hours of hourly precipitation. If the sky is essentially
// dry, surface a "dry 24h ahead" pill; otherwise show total mm + the driest
// 3-hour window (where you could reasonably step outside).
function renderRainSummary(w) {
  if (!el.rainSummary) return;
  const hours = (w.hourly || []).slice(0, 24);
  if (hours.length < 6) { el.rainSummary.hidden = true; return; }

  let total = 0;
  for (const h of hours) total += Math.max(0, h.precip || 0);
  const prettyTotal = total >= 10 ? `${total.toFixed(0)}mm` : `${total.toFixed(1)}mm`;

  // "Dry" threshold matches a passing drizzle you'd shrug off.
  const DRY = 0.3;
  if (total < DRY) {
    el.rainSummaryTotal.textContent = "Dry";
    el.rainSummaryWindow.textContent = "no rain next 24h";
    el.rainSummary.dataset.dry = "true";
    el.rainSummary.dataset.heavy = "false";
    el.rainSummary.hidden = false;
    return;
  }

  // Slide a 3-hour window across the hourly series and pick the window with
  // minimum total precip. Score ties with the lowest pop sum so a 0% window
  // beats a 0% + 10% + 0% window of the same mm total.
  const WIN = 3;
  let bestStart = 0;
  let bestPrecip = Infinity;
  let bestPop = Infinity;
  for (let i = 0; i + WIN <= hours.length; i++) {
    let p = 0, pop = 0;
    for (let j = 0; j < WIN; j++) {
      p += Math.max(0, hours[i + j].precip || 0);
      pop += hours[i + j].pop || 0;
    }
    if (p < bestPrecip - 0.01 || (Math.abs(p - bestPrecip) < 0.01 && pop < bestPop)) {
      bestPrecip = p;
      bestPop = pop;
      bestStart = i;
    }
  }
  const windowStart = hours[bestStart].time;
  const windowEnd = hours[bestStart + WIN - 1].time + 3600_000;
  el.rainSummaryTotal.textContent = prettyTotal;
  el.rainSummaryWindow.textContent =
    bestPrecip < 0.05
      ? `driest ${fmtTime(windowStart)}–${fmtTime(windowEnd)}`
      : `wet throughout`;
  el.rainSummary.dataset.dry = "false";
  el.rainSummary.dataset.heavy = total >= 10 ? "true" : "false";
  el.rainSummary.hidden = false;
}

function renderDaily(w) {
  el.dailyTrack.innerHTML = "";
  const days = (w.daily || []).slice(0, 7);
  if (!days.length) return;
  renderDailyIconStrip(days);
  renderDailySpark(days);
  renderDailyDelta(days);
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
    const tzOpt = tz && tz !== "auto" ? { timeZone: tz } : {};
    const dayLabel = dt.toLocaleDateString(undefined, { weekday: "short", ...tzOpt });
    const dayNum = dt.toLocaleDateString(undefined, { day: "numeric", ...tzOpt });
    const day = i === 0
      ? `Today`
      : `${dayLabel} <span class="daily-daynum">${escapeHtml(dayNum)}</span>`;
    const left = ((d.tempMin - gMin) / span) * 100;
    const width = ((d.tempMax - d.tempMin) / span) * 100;
    const item = document.createElement("div");
    item.className = `daily-item${i === 0 ? " today" : ""}`;
    item.dataset.ts = d.time;
    item.dataset.day = String(i);
    const gustLabel = (d.gustsMax && d.gustsMax >= 25)
      ? ` · gusts ${fmtWind(d.gustsMax)}`
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
    item.setAttribute("tabindex", "0");
    item.setAttribute("role", "button");
    item.setAttribute("aria-expanded", "false");
    item.addEventListener("click", () => toggleDailyExpand(item, d, w));
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleDailyExpand(item, d, w);
      }
    });
    item.addEventListener("mouseenter", () => highlightDay(i));
    item.addEventListener("mouseleave", () => highlightDay(null));
    item.addEventListener("focus", () => highlightDay(i));
    item.addEventListener("blur", () => highlightDay(null));
    el.dailyTrack.appendChild(item);
  });
}

// Visually tie a daily row to its sparkline mark + precip bar. Hovering a
// row dims the others so the eye tracks across the two views.
function highlightDay(idx) {
  const nodes = el.dailySpark?.querySelectorAll("[data-day]");
  if (!nodes) return;
  nodes.forEach((n) => {
    if (idx == null) n.classList.remove("faded", "active");
    else if (parseInt(n.dataset.day, 10) === idx) {
      n.classList.add("active");
      n.classList.remove("faded");
    } else {
      n.classList.add("faded");
      n.classList.remove("active");
    }
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
  days.forEach((d, i) => {
    if (d.tempMax != null) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", x(i).toFixed(1));
      c.setAttribute("cy", y(d.tempMax).toFixed(1));
      c.setAttribute("r", "2.5");
      c.setAttribute("class", "dot-hi");
      c.dataset.day = String(i);
      el.dailySparkDots.appendChild(c);
    }
    if (d.tempMin != null) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", x(i).toFixed(1));
      c.setAttribute("cy", y(d.tempMin).toFixed(1));
      c.setAttribute("r", "2.5");
      c.setAttribute("class", "dot-lo");
      c.dataset.day = String(i);
      el.dailySparkDots.appendChild(c);
    }
  });
  // Precip bars anchored to the baseline so a week's rainfall shape reads
  // alongside the temperature lines.
  if (el.dailySparkRain) {
    el.dailySparkRain.innerHTML = "";
    const maxPrecip = Math.max(1, ...days.map((d) => d.precip ?? 0));
    const baseY = H - 2;
    const maxBarH = 10;
    const halfW = Math.min(16, innerW / Math.max(1, days.length) * 0.35);
    days.forEach((d, i) => {
      const p = d.precip ?? 0;
      if (p < 0.1) return;
      const barH = (p / maxPrecip) * maxBarH;
      const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      r.setAttribute("x", (x(i) - halfW).toFixed(1));
      r.setAttribute("y", (baseY - barH).toFixed(1));
      r.setAttribute("width", (halfW * 2).toFixed(1));
      r.setAttribute("height", barH.toFixed(1));
      r.setAttribute("rx", "1.2");
      r.setAttribute("opacity", (0.3 + Math.min(1, p / 10) * 0.6).toFixed(2));
      r.dataset.day = String(i);
      el.dailySparkRain.appendChild(r);
    });
  }
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

function toggleDailyExpand(item, d, w) {
  const existing = item.querySelector(".daily-expand");
  if (existing) {
    existing.remove();
    item.dataset.expanded = "false";
    item.setAttribute("aria-expanded", "false");
    return;
  }
  // Build mini hourly bars for the 12 daytime-ish hours of that day. Use the
  // 7-day hourly series so days 2-7 also render real values.
  const dayStart = new Date(d.time);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = dayStart.getTime() + 24 * 3600_000;
  const series = w.hourlyWeek?.length ? w.hourlyWeek : w.hourly;
  const hrs = (series || []).filter((h) => h.time >= dayStart.getTime() && h.time < dayEnd);
  if (!hrs.length) {
    // For days beyond the 24h hourly range, just show summary text.
    const summary = document.createElement("div");
    summary.className = "daily-expand";
    summary.style.gridTemplateColumns = "1fr";
    summary.innerHTML = `<span style="padding:8px;color:var(--fg-dim);font-size:12px">Pop ${d.pop}% · gust up to ${fmtWind(d.gustsMax ?? 0)} · UV ${Math.round(d.uvMax ?? 0)}</span>`;
    item.appendChild(summary);
    item.dataset.expanded = "true";
    item.setAttribute("aria-expanded", "true");
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
  const barsHtml = stepped.map((h) => {
    const pct = ((h.temp - tMin) / tSpan) * 100;
    const height = 10 + (pct / 100) * 36;
    const precipLevel = h.pop >= 60 ? 2 : h.pop >= 25 ? 1 : 0;
    const hh = new Date(h.time).getHours().toString().padStart(2, "0");
    return `<div class="daily-expand-bar" data-precip="${precipLevel}" style="height:${height.toFixed(1)}px" title="${hh}:00 · ${Math.round(convertTemp(h.temp))}° · ${h.pop}%"><span>${Math.round(convertTemp(h.temp))}°</span></div>`;
  }).join("");
  // Little footer summarising the day: sunrise/sunset + rain + gust + UV.
  const metaBits = [];
  if (d.sunrise && d.sunset) metaBits.push(`☀ ${fmtTime(d.sunrise)}–${fmtTime(d.sunset)}`);
  if ((d.precip ?? 0) >= 0.1) metaBits.push(`${d.precip.toFixed(1)}mm`);
  if ((d.pop ?? 0) >= 20) metaBits.push(`${d.pop}% rain`);
  if ((d.gustsMax ?? 0) >= 15) metaBits.push(`gust ${fmtWind(d.gustsMax)}`);
  if ((d.uvMax ?? 0) >= 3) metaBits.push(`UV ${Math.round(d.uvMax)}`);
  const metaHtml = metaBits.length
    ? `<div class="daily-expand-meta">${metaBits.map(escapeHtml).join(" · ")}</div>`
    : "";
  box.innerHTML = `<div class="daily-expand-bars">${barsHtml}</div>${metaHtml}`;
  item.appendChild(box);
  item.dataset.expanded = "true";
  item.setAttribute("aria-expanded", "true");
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
const BASE_TITLE = "Aether — Interactive Weather";
function updateTabTitle(w) {
  const temp = w?.temp;
  const place = state.place?.name;
  if (temp == null) { document.title = BASE_TITLE; return; }
  const t = `${Math.round(convertTemp(temp))}°`;
  document.title = place ? `${t} · ${place} · Aether` : `${t} · Aether`;
}

// Build a condition-aware favicon so the browser tab reflects the weather.
// Keeps the data URL tiny (SVG only) and is idempotent — the <link rel="icon">
// element is reused across updates.
function updateFavicon(w) {
  if (!w) return;
  const svg = faviconSvg(w.condition, w.isDay);
  const href = "data:image/svg+xml," + encodeURIComponent(svg);
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  if (link.getAttribute("href") !== href) link.setAttribute("href", href);
}

function faviconSvg(condition, isDay) {
  const bg = "#0b1020";
  const sun = "#fff1c9", moon = "#dfe4f3", cloud = "#cfd6e4", drop = "#9ad1ff";
  const base = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
    <rect width='64' height='64' rx='14' fill='${bg}'/>`;
  const close = "</svg>";
  switch (condition) {
    case "clear":
      return isDay === false
        ? `${base}<path d='M44 36a16 16 0 11-16-20 12 12 0 0016 20z' fill='${moon}'/>${close}`
        : `${base}<circle cx='32' cy='32' r='14' fill='${sun}'/><g stroke='${sun}' stroke-width='3' stroke-linecap='round'><path d='M32 10v6M32 48v6M10 32h6M48 32h6M16 16l4 4M44 44l4 4M16 48l4-4M44 20l4-4'/></g>${close}`;
    case "clouds":
      return `${base}<path d='M20 42a9 9 0 010-18 11 11 0 0121-2 9 9 0 013 20H20z' fill='${cloud}'/>${close}`;
    case "rain":
      return `${base}<path d='M20 36a9 9 0 010-18 11 11 0 0121-2 9 9 0 013 20H20z' fill='${cloud}'/>
        <g stroke='${drop}' stroke-width='3' stroke-linecap='round'>
          <path d='M22 44l-3 8M34 44l-3 8M46 44l-3 8'/>
        </g>${close}`;
    case "snow":
      return `${base}<path d='M20 36a9 9 0 010-18 11 11 0 0121-2 9 9 0 013 20H20z' fill='${cloud}'/>
        <g fill='${drop}'><circle cx='22' cy='48' r='2.4'/><circle cx='34' cy='52' r='2.4'/><circle cx='46' cy='48' r='2.4'/></g>${close}`;
    case "storm":
      return `${base}<path d='M20 34a9 9 0 010-18 11 11 0 0121-2 9 9 0 013 20H20z' fill='${cloud}'/>
        <path d='M34 36l-6 10h7l-5 8' fill='none' stroke='${sun}' stroke-width='3' stroke-linejoin='round' stroke-linecap='round'/>${close}`;
    case "fog":
      return `${base}<g stroke='${cloud}' stroke-width='4' stroke-linecap='round'>
          <path d='M12 22h40M12 32h32M18 42h40M18 52h30'/>
        </g>${close}`;
    default:
      return `${base}<circle cx='32' cy='32' r='14' fill='${sun}'/>${close}`;
  }
}

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

function localTimeFor(tz) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date());
  } catch { return ""; }
}

// Refresh the saved-places strip once a minute so the per-city local times
// tick forward. renderPlaces() reads the current state so it stays in sync
// with the active city, saved list, and unit settings.
setInterval(() => {
  if (el.placesStrip && !el.placesStrip.hidden) renderPlaces();
}, 60_000);

// ---------- Saved places strip ----------
function renderPlaces() {
  const all = places.all();
  if (!all.length) { el.placesStrip.hidden = true; el.placesStrip.innerHTML = ""; return; }
  el.placesStrip.hidden = false;
  const activeId = state.place ? places.idFor(state.place) : null;
  el.placesStrip.innerHTML = all.map((p) => {
    const active = places.idFor(p) === activeId;
    const icon = p.condition ? `<span class="place-chip-icon" aria-hidden="true">${iconFor(p.condition)}</span>` : "";
    // Inactive chips carry a tiny local-time readout when we know the city's
    // timezone — handy for a saved-places strip that spans continents.
    const time = (!active && p.timezone && p.timezone !== "auto") ? localTimeFor(p.timezone) : "";
    return `
      <div class="place-chip ${active ? "active" : ""}" data-id="${p.id}">
        ${icon}
        <span>${escapeHtml(p.name)}</span>
        ${p.temp != null ? `<span class="temp">${Math.round(convertTemp(p.temp))}°</span>` : ""}
        ${time ? `<span class="place-chip-time" aria-hidden="true">${escapeHtml(time)}</span>` : ""}
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
    if (el.settingUnitF) el.settingUnitF.checked = state.unit === "F";
    if (state.weather) ui.setWeather(state.weather);
  });
  el.metricWindUnit?.addEventListener("click", () => {
    state.windUnit = state.windUnit === "mph" ? "kmh" : "mph";
    localStorage.setItem("aether:windUnit", state.windUnit);
    if (el.settingWindMph) el.settingWindMph.checked = state.windUnit === "mph";
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

  el.settingWindMph?.addEventListener("change", () => {
    const desired = el.settingWindMph.checked ? "mph" : "kmh";
    if (state.windUnit !== desired) {
      state.windUnit = desired;
      localStorage.setItem("aether:windUnit", state.windUnit);
      if (state.weather) ui.setWeather(state.weather);
    }
  });

  el.settingClock12h?.addEventListener("change", () => {
    const desired = !!el.settingClock12h.checked;
    if (state.clock12h !== desired) {
      state.clock12h = desired;
      localStorage.setItem("aether:clock12h", desired ? "1" : "0");
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

  el.settingResetAll?.addEventListener("click", () => {
    if (!confirm("Reset all preferences to defaults?")) return;
    const keys = ["aether:unit", "aether:windUnit", "aether:clock12h", "aether:reduceMotion"];
    for (const k of keys) {
      try { localStorage.removeItem(k); } catch { /* ignore */ }
    }
    state.unit = "C";
    state.windUnit = "kmh";
    state.clock12h = false;
    el.unitBtn.textContent = `°${state.unit}`;
    if (el.settingUnitF) el.settingUnitF.checked = false;
    if (el.settingWindMph) el.settingWindMph.checked = false;
    if (el.settingClock12h) el.settingClock12h.checked = false;
    if (el.settingReduceMotion) el.settingReduceMotion.checked = false;
    document.documentElement.setAttribute("data-reduce-motion", "false");
    state.handlers.onReduceMotion?.(false);
    if (state.weather) ui.setWeather(state.weather);
    ui.showToast("Preferences reset");
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
  if (el.settingUnitF) el.settingUnitF.checked = state.unit === "F";
  if (el.settingWindMph) el.settingWindMph.checked = state.windUnit === "mph";
  if (el.settingClock12h) el.settingClock12h.checked = state.clock12h;
}

// Exposed so app.js can query the current preference on boot.
ui.isReduceMotion = () => localStorage.getItem("aether:reduceMotion") === "1";

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
    el.fetchedAgo.textContent = "· " + label;
    el.fetchedAgo.classList.toggle("stale", minutes >= 20);
  };
  update();
  setInterval(update, 30_000);

  // Make the chip actionable: a click or Enter triggers the same refresh
  // the toolbar button runs. Keyboard focusable so screen-reader users can
  // reach it from the footer.
  if (el.fetchedAgo && !el.fetchedAgo.dataset.bound) {
    el.fetchedAgo.dataset.bound = "1";
    el.fetchedAgo.setAttribute("role", "button");
    el.fetchedAgo.setAttribute("tabindex", "0");
    el.fetchedAgo.title = "Refresh now";
    const click = () => el.refreshBtn?.click();
    el.fetchedAgo.addEventListener("click", click);
    el.fetchedAgo.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); click(); }
    });
  }
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
    const sun = (today?.sunrise && today?.sunset)
      ? `☀ ${fmtTime(today.sunrise)}–${fmtTime(today.sunset)}`
      : null;
    const windStr = w.windSpeed != null
      ? `Wind ${fmtWind(w.windSpeed)}${w.windDir != null ? ` ${cardinal(w.windDir)}` : ""}`
      : null;
    const lines = [
      `Aether · ${placeName}`,
      `${capitalize(w.label)} · ${t(w.temp)} (feels ${t(w.feelsLike ?? w.temp)})`,
      today ? `Today: ${t(today.tempMin)} / ${t(today.tempMax)} · ${today.pop}% precip` : null,
      windStr,
      w.humidity != null ? `Humidity ${Math.round(w.humidity)}%` : null,
      w.uv != null ? `UV ${Math.round(w.uv)}` : null,
      w.airQuality?.aqi != null ? `AQI ${Math.round(w.airQuality.aqi)} (${w.airQuality.label})` : null,
      sun,
    ].filter(Boolean);
    const text = lines.join("\n");
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Aether — ${placeName}`, text, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
        ui.showToast("Summary copied to clipboard");
      }
      el.shareBtn.classList.add("just-copied");
      setTimeout(() => el.shareBtn.classList.remove("just-copied"), 600);
    } catch (err) {
      if (err?.name !== "AbortError") ui.showToast("Share failed");
    }
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
