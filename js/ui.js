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

const $ = (sel) => document.querySelector(sel);

const el = {
  temp: $("#temp-value"),
  unitBtn: $("#unit-toggle"),
  tempAlt: $("#temp-alt"),
  placeName: $("#place-name"),
  placeSub: $("#place-sub"),
  placeLocaltime: $("#place-localtime"),
  conditionLabel: $("#condition-label"),
  conditionText: $("#condition-text"),
  conditionIcon: $("#condition-icon"),
  feelsLike: $("#feels-like"),
  feelsLikeText: $("#feels-like-text"),
  yesterdayDelta: $("#yesterday-delta"),
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
  aqAdvice: $("#aq-advice"),
  aqCard: $("#aq-card"),
  aqTrendLine: $("#aq-trend-line"),
  aqTrendFill: $("#aq-trend-fill"),
  moonLit: $("#moon-lit"),
  moonName: $("#moon-name"),
  moonIllum: $("#moon-illum"),
  moonStrip: $("#moon-strip"),
  stargazing: $("#stargazing"),
  stargazingText: $("#stargazing-text"),
  sunRise: $("#sun-rise"),
  sunSet: $("#sun-set"),
  sunDaylight: $("#sun-daylight"),
  sunCountdown: $("#sun-countdown"),
  sunNextLabel: $("#sun-next-label"),
  sunDaylightDelta: $("#sun-daylight-delta"),
  windNeedle: $("#wind-needle"),
  advice: $("#advice"),
  adviceText: $("#advice-text"),
  chartSvg: $("#chart-svg"),
  chartHover: $("#chart-hover"),
  pollenCard: $("#pollen-card"),
  pollenLevel: $("#pollen-level"),
  pollenDominant: $("#pollen-dominant"),
  pollenItems: $("#pollen-items"),
  pollenAdvice: $("#pollen-advice"),
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
  dailyPrecipBars: $("#daily-precip-bars"),
  dailyDelta: $("#daily-delta"),
  dailyExtremes: $("#daily-extremes"),
  dailyRainTotal: $("#daily-rain-total"),
  dailyBest: $("#daily-best"),
  shareBtn: $("#share-btn"),
  installBtn: $("#install-btn"),
  refreshBtn: $("#refresh-btn"),
  fetchedAgo: $("#fetched-ago"),
  dailyIconStrip: $("#daily-icon-strip"),
  settingsBtn: $("#settings-btn"),
  settingsMenu: $("#settings-menu"),
  settingReduceMotion: $("#setting-reduce-motion"),
  settingUnitF: $("#setting-unit-f"),
  settingDualUnit: $("#setting-dual-unit"),
  settingClearPlaces: $("#setting-clear-places"),
  chartPopover: $("#chart-popover"),
  insightsCard: $("#insights-card"),
  insightsList: $("#insights-list"),
  activityCard: $("#activity-card"),
  activityList: $("#activity-list"),
  alertsStrip: $("#alerts-strip"),
  sunArcMarker: $("#sun-arc-marker"),
  sunArcPath: $("#sun-arc-path"),
  sunArcRiseLabel: $("#sun-arc-rise-label"),
  sunArcSetLabel: $("#sun-arc-set-label"),
  sunGoldLeft: $("#sun-gold-left"),
  sunGoldRight: $("#sun-gold-right"),
  sunBlueLeft: $("#sun-blue-left"),
  sunBlueRight: $("#sun-blue-right"),
  photoWindow: $("#photo-window"),
  photoWindowLabel: $("#photo-window-label"),
  photoWindowDetail: $("#photo-window-detail"),
  comfortStrip: $("#comfort-strip"),
  rainSummary: $("#rain-summary"),
  rainSummaryTotal: $("#rain-summary-total"),
  rainSummaryDetail: $("#rain-summary-detail"),
  rainSummaryStrip: $("#rain-summary-strip"),
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

const state = {
  unit: localStorage.getItem("aether:unit") || "C",
  dualUnit: localStorage.getItem("aether:dual-unit") === "1",
  weather: null,
  place: null,
  sampledWeather: null, // the weather values at the current scrubber time
  handlers: {},
  chart: null,
  comfortStrip: null,
  sunTimer: null,
  sunArcTimer: null,
  photoWindowTimer: null,
  localTimer: null,
};

// Photo-window durations (minutes). Golden hour is the warm, low-sun period
// just after sunrise / just before sunset; blue hour straddles the horizon on
// the other side. These are approximations — true durations depend on latitude
// and season, but they match the window photographers care about to ±10 min.
const GOLDEN_MIN = 60;
const BLUE_MIN = 30;

export const ui = {
  init(handlers) {
    state.handlers = handlers || {};
    el.unitBtn.textContent = `°${state.unit}`;
    bindSearch();
    bindUnitToggle();
    bindTempCopy();
    bindLocate();
    bindAudio();
    bindShare();
    bindRefresh();
    bindSettings();
    bindTilt();
    bindSunCardJump();
    bindToTop();
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
  toggleDualUnit() {
    state.dualUnit = !state.dualUnit;
    try { localStorage.setItem("aether:dual-unit", state.dualUnit ? "1" : "0"); } catch { /* ignore */ }
    if (el.settingDualUnit) el.settingDualUnit.checked = state.dualUnit;
    if (state.weather) ui.setWeather(state.weather);
    ui.showToast(state.dualUnit ? "Showing both °C and °F" : "Single unit");
  },
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
    // Soft fade on the hero + metric block so the switch reads as a transition
    // rather than a jarring content swap.
    if (el.heroInner) {
      el.heroInner.classList.remove("fade-in"); void el.heroInner.offsetWidth;
      el.heroInner.classList.add("fade-in");
    }
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
    renderMoonStrip(weather.moonSeries, weather.timezone);
    renderStargazing(weather);
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
    renderRainSummary(weather);
    updateDocumentChrome(weather);
    startLocaltime(weather);
    if (state.chart) {
      state.chart.setHours(weather.hourly);
      state.chart.setDaily(weather.daily);
      state.chart.setUvPeak(weather.uvPeak);
    }
    if (state.comfortStrip) state.comfortStrip.setHours(weather.hourly);
    if (el.narrative) el.narrative.textContent = narrative || "";
    if (weather.offline) ui.showToast("Offline — showing sample weather");
    // Save summary for the strip so chips can show current temp.
    if (state.place) {
      places.updateSummary(state.place, {
        temp: weather.temp, condition: weather.condition,
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
  if (el.tempAlt) {
    if (state.dualUnit && w.temp != null) {
      const other = state.unit === "C" ? w.temp * 9 / 5 + 32 : w.temp;
      const label = state.unit === "C" ? "°F" : "°C";
      el.tempAlt.textContent = `${Math.round(other)}${label}`;
      el.tempAlt.hidden = false;
    } else {
      el.tempAlt.hidden = true;
    }
  }
  if (el.conditionText) {
    el.conditionText.textContent = capitalize(w.label);
    if (el.conditionIcon) el.conditionIcon.innerHTML = iconFor(w.condition);
  } else {
    el.conditionLabel.textContent = capitalize(w.label);
  }
  if (el.feelsLikeText) el.feelsLikeText.textContent = `Feels like ${Math.round(feels)}°`;
  else el.feelsLike.textContent = `Feels like ${Math.round(feels)}°`;
  renderYesterdayDelta(w);
  renderDayRange(w);
  renderTempGlow(w.temp);
}

// Set the halo colour behind the hero temperature. Maps °C through a cold →
// warm → hot gradient so the room instantly reads warmer or cooler without
// hunting for the digits.
function renderTempGlow(tempC) {
  const wrap = el.temp?.closest(".temp-wrap");
  if (!wrap || tempC == null) return;
  // Clamp so arctic & tropical never saturate too hard.
  const t = Math.max(-15, Math.min(40, tempC));
  // Stops: -15 deep blue, 0 pale blue, 15 soft green, 25 amber, 35 red.
  const stops = [
    { t: -15, r: 110, g: 155, b: 255 },
    { t:   0, r: 154, g: 209, b: 255 },
    { t:  15, r: 170, g: 230, b: 180 },
    { t:  25, r: 255, g: 200, b: 140 },
    { t:  35, r: 255, g: 110, b:  90 },
  ];
  let [a, b] = [stops[0], stops[stops.length - 1]];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) { a = stops[i]; b = stops[i + 1]; break; }
  }
  const span = Math.max(1, b.t - a.t);
  const frac = (t - a.t) / span;
  const r = Math.round(a.r + (b.r - a.r) * frac);
  const g = Math.round(a.g + (b.g - a.g) * frac);
  const bl = Math.round(a.b + (b.b - a.b) * frac);
  wrap.style.setProperty("--temp-glow", `rgba(${r}, ${g}, ${bl}, 0.35)`);
}

function renderYesterdayDelta(w) {
  const chip = el.yesterdayDelta;
  if (!chip) return;
  // Only valid against the live reading; a scrubber-sampled temperature
  // compared with yesterday-at-this-actual-moment would mislead.
  if (w._sampledIndex != null) { chip.hidden = true; return; }
  if (w.temp == null || w.yesterdayTemp == null) { chip.hidden = true; return; }
  // Delta in the user's current unit, so the display reads naturally even in °F.
  const deltaC = w.temp - w.yesterdayTemp;
  const deltaDisplay = state.unit === "F" ? deltaC * 9 / 5 : deltaC;
  const rounded = Math.round(deltaDisplay * 10) / 10;
  // Below 0.3°C the "difference" is noise — mark it "same as yesterday".
  if (Math.abs(deltaC) < 0.3) {
    chip.dataset.dir = "same";
    chip.textContent = `same as yesterday`;
  } else {
    chip.dataset.dir = deltaC > 0 ? "up" : "down";
    const sign = deltaC > 0 ? "+" : "−";
    chip.textContent = `${sign}${Math.abs(rounded).toFixed(1)}° vs yesterday`;
  }
  chip.hidden = false;
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
  el.metricWind.textContent = Math.round(w.windSpeed ?? 0);
  const dir = w.windDir;
  const dirLabel = dir != null ? cardinal(dir) : null;
  el.metricWindSub.textContent = dirLabel
    ? `${dirLabel} · gust ${w.windGusts != null ? Math.round(w.windGusts) + " km/h" : "—"}`
    : `gust ${w.windGusts != null ? Math.round(w.windGusts) + " km/h" : "—"}`;
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
  // Dew point sub-text, plus a word for how the air feels (dry/muggy etc.).
  if (w.dewPoint != null) {
    const dewRaw = Math.round(convertTemp(w.dewPoint));
    const comfort = dewPointComfort(w.dewPoint);
    el.metricHumiditySub.textContent = `dew ${dewRaw}°${comfort ? ` · ${comfort}` : ""}`;
  } else {
    el.metricHumiditySub.textContent = "dew —";
  }
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
    const burn = uvBurnTime(w.uv);
    const peakStr = `peak ${Math.round(w.uvPeak.value)} at ${fmtTime(w.uvPeak.time)}`;
    el.metricUVSub.textContent = burn ? `${burn} · ${peakStr}` : peakStr;
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

// One-word label for how the air at a given dew point tends to feel on skin.
// Dew point maps better than relative humidity for perceived mugginess.
function dewPointComfort(dewC) {
  if (dewC == null) return null;
  if (dewC < 5) return "dry";
  if (dewC < 10) return "crisp";
  if (dewC < 16) return "comfortable";
  if (dewC < 20) return "muggy";
  if (dewC < 24) return "oppressive";
  return "tropical";
}

// Rough "burn time" at the current UV for an unprotected Fitzpatrick type II
// skin — a widely-cited average. Formula: 200 min / UV, capped so the number
// never implies all-day safety.
function uvBurnTime(uv) {
  if (uv == null || uv < 3) return null;
  const mins = Math.max(5, Math.min(90, Math.round(200 / uv)));
  return `burn ~${mins}m`;
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
  if (el.aqAdvice) el.aqAdvice.textContent = aqAdvice(aq.aqi);
  renderAqTrend(aq);
}

// One-line AQI health prompt using US EPA breakpoints. Keep it short so the
// line fits beside the AQ ring without wrapping.
function aqAdvice(aqi) {
  if (aqi == null) return "";
  if (aqi <= 50) return "Great air — enjoy the outdoors.";
  if (aqi <= 100) return "Decent — sensitive folks go easy on long exertion.";
  if (aqi <= 150) return "Sensitive groups: cut back prolonged outdoor effort.";
  if (aqi <= 200) return "Unhealthy — limit prolonged outdoor exertion.";
  if (aqi <= 300) return "Very unhealthy — stay indoors when you can.";
  return "Hazardous — avoid outdoor exposure.";
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

// Render the 7-day moon-phase strip under the moon card. Each cell is a tiny
// disc with a dark cut-out shaped by that day's phase, plus the weekday
// initial as a label. Click a cell to scrub the clock to that day's noon.
function renderMoonStrip(series, tz) {
  const root = el.moonStrip;
  if (!root) return;
  if (!series?.length) { root.innerHTML = ""; return; }
  const r = 10;
  root.innerHTML = series.map((p, i) => {
    const dt = new Date(p.time);
    const letter = dt.toLocaleDateString(undefined, {
      weekday: "narrow",
      ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
    });
    const waxing = p.phase < 0.5;
    const outer = waxing
      ? `M 0 ${-r} A ${r} ${r} 0 0 1 0 ${r}`
      : `M 0 ${-r} A ${r} ${r} 0 0 0 0 ${r}`;
    const termX = Math.abs(Math.cos(p.phase * 2 * Math.PI)) * r;
    const large = Math.cos(p.phase * 2 * Math.PI) > 0 ? 0 : 1;
    const termSweep = waxing
      ? (Math.cos(p.phase * 2 * Math.PI) > 0 ? 0 : 1)
      : (Math.cos(p.phase * 2 * Math.PI) > 0 ? 1 : 0);
    const terminator = `A ${termX} ${r} 0 ${large} ${termSweep} 0 ${-r} Z`;
    return `
      <button type="button" class="moon-cell ${i === 0 ? "today" : ""}"
              data-ts="${p.time}" title="${p.name}, ${Math.round(p.illum * 100)}% illuminated">
        <svg viewBox="-12 -12 24 24" aria-hidden="true">
          <circle cx="0" cy="0" r="${r}" fill="rgba(255,255,255,0.08)"/>
          <path d="${outer} ${terminator}" fill="#f0e6cb"/>
        </svg>
        <span>${letter}</span>
      </button>
    `;
  }).join("");
  root.querySelectorAll(".moon-cell").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ts = parseInt(btn.dataset.ts, 10);
      // Noon for that day — pleasant for scenes.
      if (ts) state.handlers.onHourClick?.(ts + 12 * 3600_000);
    });
  });
}

// Highlight nights when the sky is likely to be clear enough for stargazing
// — only shown at night with low cloud cover. The moon illumination hints at
// how much natural light will drown out faint stars.
function renderStargazing(w) {
  const box = el.stargazing;
  if (!box) return;
  // Current conditions must be dark + clear enough.
  if (w.isDay !== false) { box.hidden = true; return; }
  const cloud = w.cloudCover;
  if (cloud != null && cloud > 40) { box.hidden = true; return; }
  if (w.condition !== "clear" && w.condition !== "clouds") { box.hidden = true; return; }
  const illum = Math.round((w.moon?.illum ?? 0) * 100);
  const quality =
    (cloud ?? 0) <= 15 && illum <= 40 ? "Excellent" :
    (cloud ?? 0) <= 25 && illum <= 70 ? "Good" :
    "Fair";
  el.stargazingText.textContent =
    `${quality} stargazing · ${cloud != null ? `${Math.round(cloud)}% cloud` : "clear"} · ${illum}% moon`;
  box.dataset.quality = quality.toLowerCase();
  box.hidden = false;
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
  if (tz && tz !== "auto") {
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(new Date(ts));
    } catch { /* fall through */ }
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
  renderDaylightDelta(w);
  if (el.sunArcRiseLabel) el.sunArcRiseLabel.textContent = w.sunrise ? fmtTime(w.sunrise) : "—";
  if (el.sunArcSetLabel) el.sunArcSetLabel.textContent = w.sunset ? fmtTime(w.sunset) : "—";
  scheduleSunCountdown(w);
  scheduleSunArc(w);
  schedulePhotoWindow(w);
}

function renderDaylightDelta(w) {
  const chip = el.sunDaylightDelta;
  if (!chip) return;
  const d = w?.daylightDeltaMs;
  if (d == null) { chip.hidden = true; return; }
  const secs = Math.round(d / 1000);
  // Below 20s the swing is noise.
  if (Math.abs(secs) < 20) { chip.hidden = true; return; }
  const absMin = Math.floor(Math.abs(secs) / 60);
  const absSec = Math.abs(secs) % 60;
  const dur = absMin > 0 ? `${absMin}m ${absSec}s` : `${absSec}s`;
  chip.dataset.dir = secs > 0 ? "up" : "down";
  chip.textContent = `${secs > 0 ? "+" : "−"}${dur} vs yesterday`;
  chip.hidden = false;
}

// Evaluate the sun arc's quadratic Bezier at parameter t ∈ [0,1].
// Control points match the SVG path "M10 74 Q100 -26 190 74".
function sunArcPoint(t) {
  const x = (1 - t) ** 2 * 10 + 2 * (1 - t) * t * 100 + t ** 2 * 190;
  const y = (1 - t) ** 2 * 74 + 2 * (1 - t) * t * -26 + t ** 2 * 74;
  return [x, y];
}

// Polyline approximation of the arc from t0 to t1 (good enough visually at 12
// segments across a 60-min slice).
function sunArcSegmentPath(t0, t1, steps = 12) {
  if (t1 <= t0) return "";
  const parts = [];
  for (let i = 0; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps;
    const [x, y] = sunArcPoint(t);
    parts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return parts.join(" ");
}

function scheduleSunArc(w) {
  if (!el.sunArcMarker || !el.sunArcPath) return;
  if (state.sunArcTimer) { clearInterval(state.sunArcTimer); state.sunArcTimer = null; }
  if (!w?.sunrise || !w?.sunset) return;

  // Shade the golden-hour slice at each horizon end. Cap at 0.4 of the arc so
  // short winter days don't let the two slices meet in the middle.
  const daylight = Math.max(1, w.sunset - w.sunrise);
  const goldFrac = Math.min(0.4, (GOLDEN_MIN * 60_000) / daylight);
  if (el.sunGoldLeft)  el.sunGoldLeft.setAttribute("d",  sunArcSegmentPath(0, goldFrac));
  if (el.sunGoldRight) el.sunGoldRight.setAttribute("d", sunArcSegmentPath(1 - goldFrac, 1));

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
    const t = clamp01(frac);
    const [x, y] = sunArcPoint(t);
    el.sunArcMarker.setAttribute("cx", x.toFixed(1));
    el.sunArcMarker.setAttribute("cy", y.toFixed(1));
    const isUp = now >= sr && now <= ss;
    el.sunArcMarker.style.opacity = isUp ? "1" : "0.45";

    // Highlight whichever photo window the sun is currently in.
    const G = GOLDEN_MIN * 60_000, B = BLUE_MIN * 60_000;
    const inGoldM = now >= sr && now <= sr + G;
    const inGoldE = now >= ss - G && now <= ss;
    const inBlueM = now >= sr - B && now <= sr;
    const inBlueE = now >= ss && now <= ss + B;
    if (el.sunGoldLeft)  el.sunGoldLeft.style.opacity  = inGoldM ? "1" : "0.5";
    if (el.sunGoldRight) el.sunGoldRight.style.opacity = inGoldE ? "1" : "0.5";
    if (el.sunBlueLeft)  el.sunBlueLeft.style.opacity  = inBlueM ? "0.95" : "0";
    if (el.sunBlueRight) el.sunBlueRight.style.opacity = inBlueE ? "0.95" : "0";
  };
  update();
  state.sunArcTimer = setInterval(update, 60_000);
}

// Build the next few days' worth of photo windows so a transition that
// crosses midnight (evening blue hour → next-morning blue hour) still has
// something ahead to count down to.
function photoWindows(w) {
  const out = [];
  for (const d of (w?.daily || [])) {
    if (!d.sunrise || !d.sunset) continue;
    const sr = d.sunrise, ss = d.sunset;
    const G = GOLDEN_MIN * 60_000;
    const B = BLUE_MIN * 60_000;
    out.push({ kind: "Blue hour",   tag: "blue",   side: "morning", start: sr - B, end: sr });
    out.push({ kind: "Golden hour", tag: "golden", side: "morning", start: sr,     end: sr + G });
    out.push({ kind: "Golden hour", tag: "golden", side: "evening", start: ss - G, end: ss });
    out.push({ kind: "Blue hour",   tag: "blue",   side: "evening", start: ss,     end: ss + B });
  }
  return out.filter(x => x.end > x.start).sort((a, b) => a.start - b.start);
}

function fmtMins(mins) {
  if (mins <= 0) return "now";
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

function schedulePhotoWindow(w) {
  if (state.photoWindowTimer) { clearInterval(state.photoWindowTimer); state.photoWindowTimer = null; }
  const box = el.photoWindow;
  if (!box) return;
  const windows = photoWindows(w);
  if (!windows.length) { box.hidden = true; return; }

  const update = () => {
    const now = Date.now();
    const cur = windows.find(x => now >= x.start && now < x.end);
    if (cur) {
      box.hidden = false;
      box.dataset.state = cur.tag;
      el.photoWindowLabel.textContent = `${cur.kind} · ${cur.side}`;
      const until = Math.max(0, Math.round((cur.end - now) / 60_000));
      el.photoWindowDetail.textContent = until > 0 ? `${until}m left` : "ending";
      return;
    }
    const next = windows.find(x => x.start > now);
    if (!next) { box.hidden = true; return; }
    box.hidden = false;
    box.dataset.state = `${next.tag}-pending`;
    el.photoWindowLabel.textContent = `${next.kind} · ${next.side}`;
    const mins = Math.max(0, Math.round((next.start - now) / 60_000));
    el.photoWindowDetail.textContent = `in ${fmtMins(mins)}`;
  };
  update();
  state.photoWindowTimer = setInterval(update, 30_000);
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
        weekday: "short", day: "numeric", month: "short", timeZoneName: "short",
      }).formatToParts(new Date());
      const day = parts.find((p) => p.type === "weekday")?.value ?? "";
      const dayNum = parts.find((p) => p.type === "day")?.value ?? "";
      const month = parts.find((p) => p.type === "month")?.value ?? "";
      const hour = parts.find((p) => p.type === "hour")?.value ?? "";
      const minute = parts.find((p) => p.type === "minute")?.value ?? "";
      const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
      el.placeLocaltime.innerHTML =
        `<span class="clock-dot" aria-hidden="true"></span>` +
        `${escapeHtml(day)} ${escapeHtml(dayNum)} ${escapeHtml(month)} · ` +
        `${escapeHtml(hour)}:${escapeHtml(minute)} <span style="color:var(--fg-dim)">${escapeHtml(tzName)}</span>`;
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
  if (el.pollenAdvice) el.pollenAdvice.textContent = pollenAdvice(pollen.level);
}

// Short pollen prompt mirroring the AQ advice line.
function pollenAdvice(level) {
  if (!level) return "";
  switch (level) {
    case "Low":       return "Allergy-friendly day — low pollen in the air.";
    case "Moderate":  return "Mild pollen — sensitive folks keep antihistamines handy.";
    case "High":      return "Pollen is up — close windows during peak hours.";
    case "Very high": return "Heavy pollen — limit outdoor exposure if sensitive.";
    default: return "";
  }
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
  el.forecastTrack.innerHTML = "";
  for (const h of (w.hourly || []).slice(0, 24)) {
    const item = document.createElement("div");
    item.className = "forecast-item";
    item.dataset.ts = h.time;
    item.innerHTML = `
      <span class="forecast-time">${fmtTime(h.time)}</span>
      <span class="forecast-icon">${iconFor(h.condition)}</span>
      <span class="forecast-temp">${Math.round(convertTemp(h.temp))}°</span>
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
  renderDailyExtremes(days);
  renderDailyRainTotal(days);
  renderDailyBest(days);
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
      ? ` · gusts ${Math.round(d.gustsMax)} km/h`
      : "";
    const popLabel = d.pop >= 30 ? ` · ${d.pop}% rain` : "";
    const extra = gustLabel || popLabel ? `<span class="daily-gust">${popLabel}${gustLabel}</span>` : "";
    const popPct = Math.max(0, Math.min(100, d.pop || 0));
    const popBar = popPct >= 10
      ? `<div class="daily-pop" title="${popPct}% chance of rain" aria-label="${popPct}% chance of rain">
           <span class="daily-pop-fill" style="width:${popPct}%"></span>
         </div>`
      : "";
    item.innerHTML = `
      <span class="daily-day">${day}</span>
      <span class="daily-icon">${iconFor(d.condition)}</span>
      <div class="daily-range-wrap">
        <div class="daily-range">
          <div class="daily-range-fill" style="left:${left}%;width:${Math.max(8, width)}%"></div>
        </div>
        ${popBar}
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

  // Precipitation bars anchored at the sparkline baseline. Height scales to
  // the wettest day across the week (floor of 2 mm so a dry week doesn't look
  // like a monsoon). Dry days get a tiny tick so the row still reads.
  if (el.dailyPrecipBars) {
    el.dailyPrecipBars.innerHTML = "";
    const precipMax = Math.max(2, ...days.map((d) => d.precip || 0));
    const barMaxH = 14;
    const barW = Math.max(4, innerW / days.length / 3);
    days.forEach((d, i) => {
      const mm = Math.max(0, d.precip || 0);
      if (mm < 0.1) return;
      const barH = Math.max(1.2, (mm / precipMax) * barMaxH);
      const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      r.setAttribute("x", (x(i) - barW / 2).toFixed(1));
      r.setAttribute("y", (H - BOT - barH).toFixed(1));
      r.setAttribute("width", barW.toFixed(1));
      r.setAttribute("height", barH.toFixed(1));
      r.setAttribute("rx", "1.5");
      const opacity = 0.35 + Math.min(0.55, mm / 10);
      r.setAttribute("opacity", opacity.toFixed(2));
      el.dailyPrecipBars.appendChild(r);
    });
  }

  // Dots at each day + per-day temp labels above/below
  el.dailySparkDots.innerHTML = "";
  days.forEach((d, i) => {
    if (d.tempMax != null) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", x(i).toFixed(1));
      c.setAttribute("cy", y(d.tempMax).toFixed(1));
      c.setAttribute("r", "2.5");
      c.setAttribute("class", "dot-hi");
      el.dailySparkDots.appendChild(c);
    }
    if (d.tempMin != null) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", x(i).toFixed(1));
      c.setAttribute("cy", y(d.tempMin).toFixed(1));
      c.setAttribute("r", "2.5");
      c.setAttribute("class", "dot-lo");
      el.dailySparkDots.appendChild(c);
    }
  });
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

// Coldest night of the week. Useful heads-up for frost risk even when the
// day is mild; the chip only shows when the minimum is below 5°C.
function coldestNightChip(days) {
  const candidates = days.filter((d) => d.tempMin != null);
  if (candidates.length < 2) return null;
  const coldest = candidates.reduce((a, b) => (b.tempMin < a.tempMin ? b : a));
  if (coldest.tempMin >= 5) return null;
  const tz = state.weather?.timezone;
  const label = new Date(coldest.time).toLocaleDateString(undefined, {
    weekday: "short",
    ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });
  const temp = Math.round(convertTemp(coldest.tempMin));
  return `❄ Coldest: ${label} ${temp}°`;
}

// Score each daily entry and surface the best outdoor day of the week as a
// chip. Score blends dryness, pop, wind, and comfort-zone temperature.
function renderDailyBest(days) {
  const chip = el.dailyBest;
  if (!chip) return;
  const candidates = days.filter((d) => d.tempMax != null && d.tempMin != null);
  if (candidates.length < 3) { chip.hidden = true; return; }
  const score = (d) => {
    // 0..1 for each term, higher is better.
    const mid = (d.tempMin + d.tempMax) / 2;
    const comfort = 1 - Math.min(1, Math.abs(mid - 21) / 15);
    const dry = 1 - Math.min(1, (d.precip || 0) / 8);
    const lowPop = 1 - Math.min(1, (d.pop || 0) / 100);
    const calm = 1 - Math.min(1, (d.windMax || 0) / 50);
    return comfort * 0.4 + dry * 0.25 + lowPop * 0.25 + calm * 0.1;
  };
  const best = candidates.reduce((a, b) => (score(b) > score(a) ? b : a));
  const bestIsNice = score(best) >= 0.5;
  const cold = coldestNightChip(candidates);
  const tz = state.weather?.timezone;
  const parts = [];
  if (bestIsNice) {
    const dayLabel = new Date(best.time).toLocaleDateString(undefined, {
      weekday: "short",
      ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
    });
    parts.push(`☀ Best: ${dayLabel} ${Math.round(convertTemp(best.tempMax))}°`);
  }
  if (cold) parts.push(cold);
  if (!parts.length) { chip.hidden = true; return; }
  chip.textContent = parts.join("  ·  ");
  chip.hidden = false;
}

// Total rain mm across the visible forecast days, surfaced as a tiny chip
// in the daily card header. Hidden on a dry week.
function renderDailyRainTotal(days) {
  const chip = el.dailyRainTotal;
  if (!chip) return;
  const total = days.reduce((s, d) => s + Math.max(0, d.precip || 0), 0);
  if (total < 0.3) { chip.hidden = true; return; }
  const n = days.length;
  chip.textContent = `☔ ${total.toFixed(1)} mm · ${n} days`;
  chip.hidden = false;
}

// Pick the hottest and coolest days of the week and surface them as two
// chips. Weekday short name + the day's high / low, so the span of the
// week reads at a glance without scanning rows.
function renderDailyExtremes(days) {
  const box = el.dailyExtremes;
  if (!box) return;
  const candidates = days.filter((d) => d.tempMax != null && d.tempMin != null);
  if (candidates.length < 3) { box.hidden = true; return; }
  const tz = state.weather?.timezone;
  const weekday = (d) => new Date(d.time).toLocaleDateString(undefined, {
    weekday: "short",
    ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });
  const warmest = candidates.reduce((a, b) => (b.tempMax > a.tempMax ? b : a));
  const coolest = candidates.reduce((a, b) => (b.tempMin < a.tempMin ? b : a));
  // When one day is both, show it once as the warmest and skip coolest.
  const sameDay = warmest.time === coolest.time;
  const warmTemp = Math.round(convertTemp(warmest.tempMax));
  const coolTemp = Math.round(convertTemp(coolest.tempMin));
  const pieces = [`<span class="daily-extreme hi">↑ ${weekday(warmest)} ${warmTemp}°</span>`];
  if (!sameDay) pieces.push(`<span class="daily-extreme lo">↓ ${weekday(coolest)} ${coolTemp}°</span>`);
  box.innerHTML = pieces.join(" ");
  box.hidden = false;
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
    summary.innerHTML = `<span style="padding:8px;color:var(--fg-dim);font-size:12px">Pop ${d.pop}% · gust up to ${Math.round(d.gustsMax ?? 0)} km/h · UV ${Math.round(d.uvMax ?? 0)}</span>`;
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

// Compact total-rain summary for the next 24h, pinned above the chart.
// Hides when the air is dry (<0.1 mm) — the chart itself already shows that.
function renderRainSummary(w) {
  const box = el.rainSummary;
  if (!box) return;
  const hours = (w.hourly || []).slice(0, 24);
  if (!hours.length) { box.hidden = true; return; }
  const totalMm = hours.reduce((s, h) => s + (h.precip || 0), 0);
  if (totalMm < 0.1) { box.hidden = true; return; }

  // Find the peak hour (max precip). Ties fall to the earliest.
  let peakIdx = 0;
  for (let i = 1; i < hours.length; i++) {
    if ((hours[i].precip || 0) > (hours[peakIdx].precip || 0)) peakIdx = i;
  }
  const peak = hours[peakIdx];
  const peakTime = fmtTime(peak.time);

  // Count rainy hours (above a light-drizzle threshold).
  const rainyHours = hours.filter((h) => (h.precip || 0) >= 0.1).length;

  el.rainSummaryTotal.textContent = `${totalMm.toFixed(1)} mm`;
  el.rainSummaryDetail.textContent =
    `· next 24h · ${rainyHours} rainy hour${rainyHours === 1 ? "" : "s"} · peak ${peakTime}`;

  // Mini intensity strip — one bar per hour, height scaled to peak.
  if (el.rainSummaryStrip) {
    const maxP = Math.max(0.3, ...hours.map((h) => h.precip || 0));
    el.rainSummaryStrip.innerHTML = hours.map((h) => {
      const pct = Math.max(6, ((h.precip || 0) / maxP) * 100);
      const dim = (h.precip || 0) < 0.1 ? "dim" : "";
      return `<span class="rain-summary-cell ${dim}" style="--h:${pct.toFixed(0)}%"></span>`;
    }).join("");
  }

  // Severity colouring: heavy rain gets a stronger accent.
  if (totalMm >= 10) box.dataset.severity = "heavy";
  else if (totalMm >= 3) box.dataset.severity = "moderate";
  else box.dataset.severity = "light";

  box.hidden = false;
}

// Update the browser tab's title, favicon, and meta theme-color so the
// browser chrome on mobile tints to match the sky and the tab reads at a
// glance. Favicons cache heavily — inline SVG data URIs so changes take
// effect immediately.
function updateDocumentChrome(w) {
  if (!w) return;
  const emoji = conditionEmoji(w.condition, w.isDay);
  const temp = w.temp == null ? "" : `${Math.round(convertTemp(w.temp))}°`;
  const place = state.place?.name;
  const bits = [temp, emoji, place].filter(Boolean);
  const prefix = bits.join(" ");
  document.title = prefix ? `${prefix} · Aether` : "Aether — Interactive Weather";

  const link = document.querySelector('link[rel="icon"]');
  if (link) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
      <rect width='64' height='64' rx='12' fill='#0b1020'/>
      <text x='50%' y='56%' text-anchor='middle' dominant-baseline='middle' font-size='40' font-family='system-ui,Apple Color Emoji,Segoe UI Emoji'>${emoji}</text>
    </svg>`;
    link.setAttribute("href", `data:image/svg+xml,${encodeURIComponent(svg)}`);
  }

}

export function themeColorFor(cond, isDay) {
  if (isDay === false) return "#060a1a"; // deep night
  switch (cond) {
    case "clear":  return "#1a3b6b"; // clear-sky blue
    case "clouds": return "#28364f"; // overcast slate
    case "rain":   return "#1a2a44"; // rain blue
    case "snow":   return "#2a3a4c"; // snowy haze
    case "storm":  return "#1a1424"; // storm plum
    case "fog":    return "#2b303a"; // foggy grey
    default:       return "#0b1020";
  }
}

function conditionEmoji(cond, isDay) {
  switch (cond) {
    case "clear": return isDay === false ? "🌙" : "☀️";
    case "clouds": return isDay === false ? "☁️" : "⛅";
    case "rain": return "🌧️";
    case "snow": return "❄️";
    case "storm": return "⛈️";
    case "fog": return "🌫️";
    default: return "🌤️";
  }
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
function renderPlaces() {
  const all = places.all();
  if (!all.length) { el.placesStrip.hidden = true; el.placesStrip.innerHTML = ""; return; }
  el.placesStrip.hidden = false;
  const activeId = state.place ? places.idFor(state.place) : null;
  el.placesStrip.innerHTML = all.map((p) => {
    const active = places.idFor(p) === activeId;
    const icon = p.condition ? `<span class="place-chip-icon">${iconFor(p.condition)}</span>` : "";
    return `
      <div class="place-chip ${active ? "active" : ""}" data-id="${p.id}">
        ${icon}
        <span>${escapeHtml(p.name)}</span>
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

// Tap/click the big temperature to copy a one-line summary (handy on mobile).
function bindTempCopy() {
  if (!el.temp) return;
  el.temp.style.cursor = "pointer";
  el.temp.setAttribute("role", "button");
  el.temp.setAttribute("tabindex", "0");
  el.temp.setAttribute("aria-label", "Copy current weather summary");
  const fire = async () => {
    const w = state.weather;
    if (!w) return;
    const unit = state.unit;
    const t = (v) => `${Math.round(unit === "F" ? v * 9 / 5 + 32 : v)}°${unit}`;
    const text = `${capitalize(w.label)} · ${t(w.temp)}` +
      (state.place?.name ? ` in ${state.place.name}` : "");
    try {
      await navigator.clipboard.writeText(text);
      ui.showToast("Copied " + text);
    } catch { /* ignore */ }
  };
  el.temp.addEventListener("click", fire);
  el.temp.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fire(); }
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

  el.settingDualUnit?.addEventListener("change", () => {
    const on = el.settingDualUnit.checked;
    if (state.dualUnit === on) return;
    state.dualUnit = on;
    try { localStorage.setItem("aether:dual-unit", on ? "1" : "0"); } catch { /* ignore */ }
    if (state.weather) ui.setWeather(state.weather);
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
  if (el.settingUnitF) el.settingUnitF.checked = state.unit === "F";
  if (el.settingDualUnit) el.settingDualUnit.checked = !!state.dualUnit;
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
    const atLabel = fmtTime(state.weather.fetchedAt);
    el.fetchedAgo.textContent = `· ${label}${atLabel && atLabel !== "—" ? ` (${atLabel})` : ""}`;
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
    const emoji = conditionEmoji(w.condition, w.isDay);
    // "vs yesterday" chip text, in share units.
    let vsYesterday = null;
    if (w.yesterdayTemp != null && w.temp != null) {
      const deltaC = w.temp - w.yesterdayTemp;
      if (Math.abs(deltaC) >= 0.3) {
        const d = unit === "F" ? deltaC * 9 / 5 : deltaC;
        vsYesterday = `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(1)}° vs yesterday`;
      }
    }
    const sunLine = (w.sunrise && w.sunset)
      ? `🌅 ${fmtTime(w.sunrise)}  🌇 ${fmtTime(w.sunset)}`
      : null;
    // Build a deep link so recipients can tap into the same view.
    let link = null;
    try {
      const p = state.place;
      if (p?.lat != null && p?.lon != null) {
        const url = new URL(window.location.href);
        url.hash = `loc=${p.lat.toFixed(4)},${p.lon.toFixed(4)}` +
          (p.name ? `,${encodeURIComponent(p.name)}` : "");
        link = url.toString();
      }
    } catch { /* ignore */ }
    const lines = [
      `${emoji} Aether · ${placeName}`,
      `${capitalize(w.label)} · ${t(w.temp)} (feels ${t(w.feelsLike ?? w.temp)})${vsYesterday ? ` · ${vsYesterday}` : ""}`,
      today ? `Today: ${t(today.tempMin)} / ${t(today.tempMax)} · ${today.pop}% precip` : null,
      sunLine,
      `Wind ${Math.round(w.windSpeed)} km/h${w.windDir != null ? ` ${cardinal(w.windDir)}` : ""}`,
      w.uv != null ? `UV ${Math.round(w.uv)}` : null,
      w.airQuality?.aqi != null ? `AQI ${Math.round(w.airQuality.aqi)} (${w.airQuality.label})` : null,
      link,
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

// Show a small FAB after the user has scrolled past the hero, so getting
// back to the top on long pages is one tap away.
function bindToTop() {
  const btn = document.getElementById("to-top");
  if (!btn) return;
  btn.hidden = false;
  let frame = 0;
  const sync = () => {
    frame = 0;
    const show = window.scrollY > 500;
    btn.classList.toggle("show", show);
  };
  window.addEventListener("scroll", () => {
    if (!frame) frame = requestAnimationFrame(sync);
  }, { passive: true });
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  sync();
}

// Click the sun card to jump the scrubber to the next golden hour.
// Mirrors the "G" keyboard shortcut without needing a visible button.
function bindSunCardJump() {
  const card = document.getElementById("sun-card");
  if (!card) return;
  card.classList.add("tappable");
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", "Jump to next golden hour");
  const fire = () => state.handlers.jumpToGolden?.();
  card.addEventListener("click", fire);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fire(); }
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
