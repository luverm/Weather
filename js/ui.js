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
  placeName: $("#place-name"),
  placeSub: $("#place-sub"),
  placeLocaltime: $("#place-localtime"),
  conditionLabel: $("#condition-label"),
  feelsLike: $("#feels-like"),
  feelsLikeText: $("#feels-like-text"),
  feelsBadge: $("#feels-badge"),
  narrative: $("#narrative"),
  dayRange: $("#day-range"),
  dayRangeMin: $("#day-range-min"),
  dayRangeMax: $("#day-range-max"),
  dayRangeMarker: $("#day-range-marker"),
  tomorrowRange: $("#tomorrow-range"),
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
  aqDominant: $("#aq-dominant"),
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
  comfortScore: $("#comfort-score"),
  comfortScoreNum: $("#comfort-score-num"),
  comfortScoreLabel: $("#comfort-score-label"),
  comfortScoreDetail: $("#comfort-score-detail"),
  comfortScoreArc: $("#comfort-score-arc"),
  dressChip: $("#dress-chip"),
  chartSvg: $("#chart-svg"),
  chartHover: $("#chart-hover"),
  chartPrecipTotal: $("#chart-precip-total"),
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
  dailyRainTotal: $("#daily-rain-total"),
  shareBtn: $("#share-btn"),
  installBtn: $("#install-btn"),
  refreshBtn: $("#refresh-btn"),
  fetchedAgo: $("#fetched-ago"),
  dailyIconStrip: $("#daily-icon-strip"),
  settingsBtn: $("#settings-btn"),
  settingsMenu: $("#settings-menu"),
  settingReduceMotion: $("#setting-reduce-motion"),
  settingUnitF: $("#setting-unit-f"),
  settingClearPlaces: $("#setting-clear-places"),
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
  sunsetColor: $("#sunset-color"),
  sunsetColorLabel: $("#sunset-color-label"),
  sunsetColorDetail: $("#sunset-color-detail"),
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

const state = {
  unit: localStorage.getItem("aether:unit") || "C",
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
    renderComfortScore(weather);
    renderPollen(weather.pollen);
    renderTrends(weather);
    renderInsights(weather);
    renderActivity(weather);
    renderAlerts(weather);
    renderWeekend(weather);
    startLocaltime(weather);
    if (state.chart) {
      state.chart.setDaily(weather.daily);
      state.chart.setHours(weather.hourly);
    }
    renderChartPrecipTotal(weather);
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
    renderComfortScore(sampled);
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
  el.conditionLabel.textContent = capitalize(w.label);
  if (el.feelsLikeText) el.feelsLikeText.textContent = `Feels like ${Math.round(feels)}°`;
  else el.feelsLike.textContent = `Feels like ${Math.round(feels)}°`;
  renderFeelsBadge(w);
  renderDayRange(w);
  renderTomorrowRange(w);
}

// Small badge next to "Feels like X°" that names the mechanism when it
// meaningfully diverges from air temperature — wind chill on cold days,
// heat index on warm humid days. Silent when the two are within 3°.
function renderFeelsBadge(w) {
  if (!el.feelsBadge) return;
  const t = w.temp;
  const f = w.feelsLike;
  if (t == null || f == null) { el.feelsBadge.hidden = true; return; }
  const delta = f - t;
  if (Math.abs(delta) < 3) { el.feelsBadge.hidden = true; return; }
  let label = null, tone = null;
  if (delta <= -3 && t <= 12) { label = "wind chill"; tone = "cold"; }
  else if (delta >= 3 && t >= 22) { label = "heat index"; tone = "hot"; }
  else if (delta <= -3) { label = "feels cooler"; tone = "cold"; }
  else if (delta >= 3) { label = "feels warmer"; tone = "hot"; }
  if (!label) { el.feelsBadge.hidden = true; return; }
  el.feelsBadge.hidden = false;
  el.feelsBadge.textContent = label;
  el.feelsBadge.dataset.tone = tone;
}

function renderTomorrowRange(w) {
  if (!el.tomorrowRange) return;
  const tomorrow = w.daily?.[1];
  const today = w.daily?.[0];
  if (!tomorrow || tomorrow.tempMin == null || tomorrow.tempMax == null) {
    el.tomorrowRange.hidden = true;
    return;
  }
  el.tomorrowRange.hidden = false;
  const lo = Math.round(convertTemp(tomorrow.tempMin));
  const hi = Math.round(convertTemp(tomorrow.tempMax));
  // Trend arrow keyed on the day-high move — the most memorable number.
  let trend = "";
  let tone = "flat";
  if (today?.tempMax != null) {
    const deltaC = tomorrow.tempMax - today.tempMax;
    if (deltaC >= 2) { trend = "▲ "; tone = "up"; }
    else if (deltaC <= -2) { trend = "▼ "; tone = "down"; }
  }
  el.tomorrowRange.dataset.trend = tone;
  el.tomorrowRange.textContent = `${trend}Tomorrow ${lo}° → ${hi}°`;
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
  // Gusts noticeably above sustained wind ("gusty") is a distinct
  // physical condition — plane turbulence, sailboat trim, hand-held
  // umbrella survivability — so flag it even when neither wind nor
  // gusts are individually alarming.
  const gustyTag = (w.windGusts != null && w.windSpeed != null
      && w.windSpeed >= 8 && w.windGusts >= w.windSpeed * 1.7)
    ? " · gusty" : "";
  const gustPart = w.windGusts != null
    ? `gust ${Math.round(w.windGusts)} km/h${gustyTag}`
    : "gust —";
  el.metricWindSub.textContent = dirLabel
    ? `${dirLabel} · ${gustPart}`
    : gustPart;
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
  if (w.visibility != null) {
    const km = Math.round((w.visibility / 1000) * 10) / 10;
    // Meteorological convention: <1 km = fog, 1-5 km = mist/haze, 5-10 km = light haze.
    let visTag = "";
    if (w.visibility < 1000) visTag = " · fog";
    else if (w.visibility < 5000) visTag = " · haze";
    el.metricPressureSub.textContent = `visibility ${km} km${visTag}`;
  } else {
    el.metricPressureSub.textContent = "visibility —";
  }
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
    // For skin protection, we cite burn-time at either the current UV
    // (if the sun is high enough that "now" matters) or at the day's
    // peak so users can plan around the strongest hour.
    const currentUv = Number.isFinite(w.uv) ? w.uv : null;
    const peakVal = Math.round(w.uvPeak.value);
    const burnRef = (currentUv != null && currentUv >= 3) ? currentUv : w.uvPeak.value;
    const burnLabel = burnLabelFor(burnRef);
    const suffix = burnLabel ? ` · burn ${burnLabel}` : "";
    el.metricUVSub.textContent = `peak ${peakVal} at ${fmtTime(w.uvPeak.time)}${suffix}`;
  } else {
    el.metricUVSub.textContent = "peak —";
  }
  renderPressureSparkline(w);
}

// Rough burn time in minutes for unprotected Type II (fair) skin, from the
// standard MED-derived formula ~200/UV. Tightened at high UV so headline
// stays honest ("burn <10m" is more useful than "burn 15m" at UV 12+).
function burnLabelFor(uv) {
  // Below UV 3, sunburn risk for unprotected fair skin is low enough that
  // a "burn ~Nm" number reads as false precision — skip the chip entirely.
  if (uv == null || !Number.isFinite(uv) || uv < 3) return null;
  const mins = Math.round(200 / uv);
  if (mins <= 10) return "<10m";
  if (mins >= 90) return `~${Math.round(mins / 15) * 15}m`;
  return `~${mins}m`;
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
  renderAqDominant(aq);
  renderAqTrend(aq);
}

// Which pollutant is most stressing the score right now? Compares each
// measured value to a common "moderate" threshold and picks the highest
// ratio; only shows the chip when the leader has actually crossed
// a level worth pointing out.
function renderAqDominant(aq) {
  if (!el.aqDominant) return;
  const items = [
    { key: "pm25", label: "PM2.5", value: aq.pm25, limit: 12 },    // μg/m³ 24h WHO 2021
    { key: "pm10", label: "PM10",  value: aq.pm10, limit: 45 },    // μg/m³ 24h WHO 2021
    { key: "o3",   label: "Ozone", value: aq.o3,   limit: 100 },   // μg/m³ 8h  WHO 2021
    { key: "no2",  label: "NO₂",   value: aq.no2,  limit: 25 },    // μg/m³ 24h WHO 2021
    { key: "co",   label: "CO",    value: aq.co,   limit: 4 },     // mg/m³ 24h WHO 2021
  ].filter((x) => x.value != null && Number.isFinite(x.value) && x.value > 0);
  if (!items.length) { el.aqDominant.hidden = true; return; }
  const scored = items.map((x) => ({ ...x, ratio: x.value / x.limit }));
  scored.sort((a, b) => b.ratio - a.ratio);
  const top = scored[0];
  // Only surface the chip once the leader is at half its guideline or
  // more — anything below that is "clean and it doesn't matter which".
  if (top.ratio < 0.5) { el.aqDominant.hidden = true; return; }
  el.aqDominant.hidden = false;
  el.aqDominant.textContent = `${top.label} leading`;
  el.aqDominant.dataset.severity =
    top.ratio >= 2 ? "high" : top.ratio >= 1 ? "elevated" : "low";
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
  // Phase < 0.5 waxes toward full; > 0.5 wanes toward new. Suffix the
  // heading with the direction and how many days out that landmark is
  // (moon cycle is 29.53 days). Skip the arrow on the landmark days
  // themselves — the name already carries the story.
  const cycleDays = 29.5305882;
  const p = moon.phase;
  let arrow = "";
  if (p >= 0.03 && p < 0.47) {
    const days = Math.round((0.5 - p) * cycleDays);
    if (days >= 1) arrow = ` · → full in ${days}d`;
  } else if (p >= 0.53 && p <= 0.97) {
    const days = Math.round((1 - p) * cycleDays);
    if (days >= 1) arrow = ` · → new in ${days}d`;
  }
  el.moonName.textContent = moon.name + arrow;
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
  renderGoldenHour(w);
  renderSunsetColor(w);
  scheduleSunCountdown(w);
  scheduleSunArc(w);
}

function renderSunsetColor(w) {
  if (!el.sunsetColor) return;
  const sc = w?.sunsetColor;
  if (!sc || !sc.time) {
    el.sunsetColor.hidden = true;
    return;
  }
  el.sunsetColor.hidden = false;
  el.sunsetColor.dataset.tone = sc.tone;
  const kind = sc.kind === "sunrise" ? "Sunrise" : "Sunset";
  if (el.sunsetColorLabel) el.sunsetColorLabel.textContent = `${kind}: ${sc.label}`;
  if (el.sunsetColorDetail) {
    el.sunsetColorDetail.textContent = `${fmtTime(sc.time)} · ${sc.score}/100`;
  }
}

// Golden hour: ~60 min after sunrise and ~60 min before sunset.
// Clamped so a very short polar day still leaves a middle-of-the-day segment.
function goldenWindows(w) {
  if (!w?.sunrise || !w?.sunset) return null;
  const dayMs = w.sunset - w.sunrise;
  if (dayMs < 20 * 60_000) return null; // barely any daylight — skip
  const window = Math.min(60 * 60_000, dayMs / 4);
  return {
    dayMs,
    window,
    amStart: w.sunrise,
    amEnd: w.sunrise + window,
    pmStart: w.sunset - window,
    pmEnd: w.sunset,
    fracStart: window / dayMs,
    fracEnd: 1 - window / dayMs,
  };
}

function renderGoldenHour(w) {
  if (!el.sunGolden) return;
  const g = goldenWindows(w);
  if (!g) {
    el.sunGolden.hidden = true;
    if (el.sunArcGoldenAm) el.sunArcGoldenAm.style.opacity = "0";
    if (el.sunArcGoldenPm) el.sunArcGoldenPm.style.opacity = "0";
    return;
  }
  el.sunGolden.hidden = false;
  if (el.sunGoldenAm) el.sunGoldenAm.textContent = `${fmtTime(g.amStart)}–${fmtTime(g.amEnd)}`;
  if (el.sunGoldenPm) el.sunGoldenPm.textContent = `${fmtTime(g.pmStart)}–${fmtTime(g.pmEnd)}`;
}

// Quadratic Bezier P0=(10,74), P1=(100,-26), P2=(190,74).
function sunArcPoint(t) {
  const u = 1 - t;
  return {
    x: u * u * 10 + 2 * u * t * 100 + t * t * 190,
    y: u * u * 74 + 2 * u * t * -26 + t * t * 74,
  };
}

function scheduleSunArc(w) {
  if (!el.sunArcMarker || !el.sunArcPath) return;
  if (state.sunArcTimer) { clearInterval(state.sunArcTimer); state.sunArcTimer = null; }
  if (!w?.sunrise || !w?.sunset) return;

  const g = goldenWindows(w);
  if (g && el.sunArcGoldenAm) {
    const p = sunArcPoint(g.fracStart);
    el.sunArcGoldenAm.setAttribute("cx", p.x.toFixed(1));
    el.sunArcGoldenAm.setAttribute("cy", p.y.toFixed(1));
    el.sunArcGoldenAm.style.opacity = "0.9";
  }
  if (g && el.sunArcGoldenPm) {
    const p = sunArcPoint(g.fracEnd);
    el.sunArcGoldenPm.setAttribute("cx", p.x.toFixed(1));
    el.sunArcGoldenPm.setAttribute("cy", p.y.toFixed(1));
    el.sunArcGoldenPm.style.opacity = "0.9";
  }

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
    const p = sunArcPoint(t);
    el.sunArcMarker.setAttribute("cx", p.x.toFixed(1));
    el.sunArcMarker.setAttribute("cy", p.y.toFixed(1));
    // After sunset, dim the marker so it visually settles.
    const isUp = now >= sr && now <= ss;
    el.sunArcMarker.style.opacity = isUp ? "1" : "0.45";

    // Highlight the golden-hour chips and pips based on "now".
    if (g) {
      const inAm = now >= g.amStart && now <= g.amEnd;
      const inPm = now >= g.pmStart && now <= g.pmEnd;
      if (el.sunGoldenAm) {
        el.sunGoldenAm.classList.toggle("now", inAm);
        el.sunGoldenAm.classList.toggle("past", !inAm && now > g.amEnd);
      }
      if (el.sunGoldenPm) {
        el.sunGoldenPm.classList.toggle("now", inPm);
        el.sunGoldenPm.classList.toggle("past", !inPm && now > g.pmEnd);
      }
      if (el.sunArcGoldenAm) el.sunArcGoldenAm.classList.toggle("now", inAm);
      if (el.sunArcGoldenPm) el.sunArcGoldenPm.classList.toggle("now", inPm);
    }
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

// Score outdoor comfort right now on a 0..100 scale from the sampled
// temp/humidity/wind/precip/UV. Deductions sum, then clamp. This is a
// rule of thumb for "how pleasant is it to be outside" — not a
// scientific index.
function computeComfortScore(w) {
  if (!w || w.temp == null) return null;
  const factors = [];
  let score = 100;

  // Temperature: sweet spot 15-25°C, sharper penalty as we drift.
  const t = w.temp;
  const tPen = 2.5 * Math.max(0, 15 - t) + 2.5 * Math.max(0, t - 25);
  if (tPen >= 4) factors.push(t < 15 ? "cold" : "hot");
  score -= Math.min(35, tPen);

  // Humidity: comfort 35-65%.
  const rh = w.humidity;
  if (rh != null) {
    const hPen = 0.8 * Math.max(0, 35 - rh) + 0.8 * Math.max(0, rh - 65);
    if (hPen >= 5) factors.push(rh < 35 ? "dry" : "humid");
    score -= Math.min(20, hPen);
  }

  // Wind: penalty above 20 km/h.
  const wind = w.windSpeed;
  if (wind != null) {
    const wPen = Math.max(0, wind - 20) * 1.2;
    if (wPen >= 4) factors.push("windy");
    score -= Math.min(25, wPen);
  }

  // Precipitation right now — read from the sampled hour so the score
  // moves with the scrubber, not the earliest bucket.
  const idx = Number.isInteger(w._sampledIndex) ? w._sampledIndex : 0;
  const precipHere = w.hourly?.[idx]?.precip ?? w.hourly?.[0]?.precip ?? 0;
  // Precipitation category is mutually exclusive: a snowy hour shouldn't
  // also count as "wet" (that would double-penalise).
  if (w.condition === "storm") {
    factors.push("stormy");
    score -= 28;
  } else if (w.condition === "snow") {
    factors.push("snowy");
    score -= 14;
  } else if (precipHere > 0.1 || w.condition === "rain") {
    factors.push("wet");
    score -= 22;
  }

  // Extreme UV.
  if ((w.uv ?? 0) >= 8) {
    factors.push("sunburn risk");
    score -= 12;
  }
  // Fog / low visibility.
  if (w.visibility != null && w.visibility < 500) {
    factors.push("foggy");
    score -= 10;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  let label;
  if (score >= 85) label = "Excellent outside";
  else if (score >= 70) label = "Great outside";
  else if (score >= 55) label = "Comfortable";
  else if (score >= 40) label = "OK outside";
  else if (score >= 25) label = "Uncomfortable";
  else label = "Harsh";
  return { score, label, factors };
}

function renderComfortScore(w) {
  if (!el.comfortScore) return;
  const s = computeComfortScore(w);
  if (!s) { el.comfortScore.hidden = true; return; }
  el.comfortScore.hidden = false;
  el.comfortScore.dataset.tone =
    s.score >= 70 ? "good" : s.score >= 40 ? "mid" : "poor";
  el.comfortScoreNum.textContent = String(s.score);
  el.comfortScoreLabel.textContent = s.label;
  el.comfortScoreDetail.textContent = s.factors.length
    ? s.factors.slice(0, 3).join(" · ")
    : "no major issues";
  // Ring: circumference of r=13 is 2π·13 ≈ 81.68.
  const C = 81.68;
  el.comfortScoreArc.setAttribute("stroke-dashoffset", (C * (1 - s.score / 100)).toFixed(2));
  renderDressChip(w);
}

// Practical dressing suggestion from the sampled conditions. Compresses
// into 1-3 emoji-prefixed tags ("🧥 Jacket · ☂ umbrella · 🌬 windbreak")
// so it reads as a checklist rather than prose.
function renderDressChip(w) {
  if (!el.dressChip) return;
  if (!w || w.temp == null) { el.dressChip.hidden = true; return; }
  const tags = [];
  const t = w.temp;
  // Base layer keyed on air temp (not feels-like — that's what the ribbon
  // is for). Wind chill and rain add extras below.
  if (t < 0)          tags.push("🧥 Heavy coat");
  else if (t < 8)     tags.push("🧥 Warm coat");
  else if (t < 14)    tags.push("🧥 Light jacket");
  else if (t < 19)    tags.push("👕 Long sleeves");
  else if (t < 26)    tags.push("👕 T-shirt");
  else if (t < 32)    tags.push("🩳 Shorts + tee");
  else                tags.push("🩳 Stay cool");
  if (w.condition === "rain" || w.condition === "storm"
      || (w.hourly?.[0]?.precip ?? 0) > 0.1) tags.push("☂ umbrella");
  if (w.condition === "snow") tags.push("🧣 warm layers");
  if ((w.windSpeed ?? 0) >= 25) tags.push("🌬 windbreak");
  if ((w.uv ?? 0) >= 6) tags.push("🧴 sunscreen");
  el.dressChip.hidden = false;
  el.dressChip.textContent = tags.slice(0, 3).join(" · ");
}

function renderChartPrecipTotal(w) {
  if (!el.chartPrecipTotal) return;
  const total = (w.hourly || []).reduce((s, h) => s + (h.precip || 0), 0);
  // Show the total only when it's actually meaningful; otherwise a "0 mm"
  // label is just visual clutter on a dry day.
  if (total < 0.2) {
    el.chartPrecipTotal.hidden = true;
    return;
  }
  el.chartPrecipTotal.hidden = false;
  const rounded = total >= 10 ? Math.round(total) : total.toFixed(1);
  el.chartPrecipTotal.textContent = `24h · ${rounded} mm`;
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
    // Wind arrow — meteorological convention is "wind FROM", so rotate the
    // arrow to point in the direction the air is going (dir + 180). Skip
    // when the hour has no direction or the breeze is essentially still.
    const windMag = h.wind ?? 0;
    let arrow = "";
    if (h.windDir != null && windMag >= 3) {
      const rot = ((h.windDir + 180) % 360).toFixed(0);
      const dim = windMag < 8 ? " dim" : "";
      arrow = `
        <span class="forecast-wind${dim}" title="${Math.round(windMag)} km/h ${cardinal(h.windDir)}" aria-label="wind ${cardinal(h.windDir)} ${Math.round(windMag)} km/h">
          <svg viewBox="0 0 16 16" style="transform:rotate(${rot}deg)">
            <path d="M8 2 L11 9 L8 7 L5 9 Z" fill="currentColor"/>
          </svg>
        </span>
      `;
    } else {
      arrow = `<span class="forecast-wind blank" aria-hidden="true"></span>`;
    }
    item.innerHTML = `
      <span class="forecast-time">${fmtTime(h.time)}</span>
      <span class="forecast-icon">${iconFor(h.condition)}</span>
      <span class="forecast-temp">${Math.round(convertTemp(h.temp))}°</span>
      ${arrow}
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
  renderDailyRainTotal(days);
  // Global min/max for the range bar.
  let gMin = Infinity, gMax = -Infinity;
  for (const d of days) {
    if (d.tempMin < gMin) gMin = d.tempMin;
    if (d.tempMax > gMax) gMax = d.tempMax;
  }
  const span = Math.max(1, gMax - gMin);
  // Weekly precipitation ceiling for scaling the per-day micro-bars. A
  // trace-only week (<= 0.6 mm total) hides the bars entirely.
  const precips = days.map((d) => d.precip || 0);
  const precipMax = Math.max(...precips, 0);
  const showPrecip = precipMax >= 0.6;
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
    // Snowfall gets its own dedicated tag so a "6 cm snow" line stands
    // out — a lot of people plan around snow but not rain-in-mm.
    const snowLabel = (d.snow && d.snow >= 0.5)
      ? ` · <span class="daily-snow">❄ ${d.snow >= 5 ? Math.round(d.snow) : d.snow.toFixed(1)} cm snow</span>`
      : "";
    const extra = gustLabel || popLabel || snowLabel
      ? `<span class="daily-gust">${popLabel}${snowLabel}${gustLabel}</span>`
      : "";
    let precipRow = "";
    if (showPrecip) {
      const mm = d.precip || 0;
      const pct = Math.max(0, Math.min(100, (mm / precipMax) * 100));
      const label = mm >= 0.1 ? `${mm.toFixed(mm >= 10 ? 0 : 1)} mm` : "";
      precipRow = `
        <div class="daily-precip" title="${label || "trace"}">
          <div class="daily-precip-bar">
            <div class="daily-precip-fill" style="width:${pct.toFixed(1)}%"></div>
          </div>
          <span class="daily-precip-label">${label}</span>
        </div>
      `;
    }
    // Frost / heat marker on the min or max value when they cross a
    // widely-recognised threshold. Frost priority over heat if both fire.
    const frost = (d.tempMin != null && d.tempMin <= 2);
    const hot = (d.tempMax != null && d.tempMax >= 30);
    const minCls = frost ? "daily-temp-min extreme-cold" : "daily-temp-min";
    const maxCls = hot ? "daily-temp-max extreme-hot" : "daily-temp-max";
    item.innerHTML = `
      <span class="daily-day">${day}</span>
      <span class="daily-icon">${iconFor(d.condition)}</span>
      <div class="daily-range">
        <div class="daily-range-fill" style="left:${left}%;width:${Math.max(8, width)}%"></div>
      </div>
      <span class="${minCls}" title="${frost ? "frost risk overnight" : ""}">${frost ? "❄ " : ""}${Math.round(convertTemp(d.tempMin))}°</span>
      <span class="${maxCls}" title="${hot ? "hot day" : ""}">${hot ? "☀ " : ""}${Math.round(convertTemp(d.tempMax))}°</span>
      ${precipRow}
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
  // Warmest and coldest day of the week get a highlighted marker + label.
  // Only when the week's swing is meaningful (≥4°) so a flat week stays clean.
  if (days.length >= 2 && tMax - tMin >= 4) {
    let hiIdx = 0, loIdx = 0;
    for (let i = 1; i < days.length; i++) {
      if ((days[i].tempMax ?? -Infinity) > (days[hiIdx].tempMax ?? -Infinity)) hiIdx = i;
      if ((days[i].tempMin ??  Infinity) < (days[loIdx].tempMin ??  Infinity)) loIdx = i;
    }
    const tz = state.weather?.timezone;
    const dayName = (ts) => new Date(ts).toLocaleDateString(undefined, {
      weekday: "short",
      ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
    });
    const drawPin = (i, val, kind) => {
      const cx = x(i);
      const cy = y(val);
      const pin = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      pin.setAttribute("cx", cx.toFixed(1));
      pin.setAttribute("cy", cy.toFixed(1));
      pin.setAttribute("r", "4");
      pin.setAttribute("class", `daily-spark-pin daily-spark-pin-${kind}`);
      el.dailySparkDots.appendChild(pin);
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      const labelText = `${kind === "hi" ? "warmest" : "coolest"} ${dayName(days[i].time)}`;
      // Nudge labels away from horizontal edges so long weekdays don't clip.
      const nudgedX = Math.max(PAD + 32, Math.min(W - PAD - 32, cx));
      // Flip label to the opposite side when the dot is pinned to the top
      // or bottom edge of the sparkline, so the text always stays inside.
      let labelY;
      if (kind === "hi") {
        labelY = cy < 10 ? cy + 12 : cy - 8;
      } else {
        labelY = cy > H - 10 ? cy - 6 : cy + 12;
      }
      label.setAttribute("x", nudgedX.toFixed(1));
      label.setAttribute("y", labelY.toFixed(1));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", `daily-spark-pin-label daily-spark-pin-label-${kind}`);
      label.textContent = labelText;
      el.dailySparkDots.appendChild(label);
    };
    drawPin(hiIdx, days[hiIdx].tempMax, "hi");
    if (loIdx !== hiIdx) drawPin(loIdx, days[loIdx].tempMin, "lo");
  }
}

function renderDailyRainTotal(days) {
  if (!el.dailyRainTotal) return;
  const total = days.reduce((s, d) => s + (d.precip || 0), 0);
  // Rainiest day of the week.
  let wettest = null;
  for (const d of days) {
    if ((d.precip || 0) > (wettest?.precip || 0)) wettest = d;
  }
  if (total < 0.5) {
    el.dailyRainTotal.dataset.tone = "dry";
    el.dailyRainTotal.textContent = "Dry week";
    return;
  }
  delete el.dailyRainTotal.dataset.tone;
  const tz = state.weather?.timezone;
  let label = `${total.toFixed(total >= 10 ? 0 : 1)} mm this week`;
  if (wettest && (wettest.precip || 0) >= 3) {
    const wd = new Date(wettest.time).toLocaleDateString(undefined, {
      weekday: "short",
      ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
    });
    label += ` · wettest ${wd}`;
  }
  el.dailyRainTotal.textContent = label;
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
  const scale = (c) => Math.round(state.unit === "F" ? c * 9 / 5 : c);
  const deltaDisplay = scale(deltaC);
  const dPop = (tmrw.pop ?? 0) - (today.pop ?? 0);
  const parts = [];
  if (deltaDisplay > 0) parts.push(`${deltaDisplay}° warmer`);
  else if (deltaDisplay < 0) parts.push(`${Math.abs(deltaDisplay)}° cooler`);
  else parts.push("similar temp");
  if (Math.abs(dPop) >= 20) {
    parts.push(dPop > 0 ? `+${dPop}% rain` : `${dPop}% rain`);
  }
  // Where does today sit against the week? Uses the week's mean tempMax
  // (excluding today itself so today can't drag its own baseline). Skip
  // silently when the deviation is trivial.
  const others = days.slice(1).filter((d) => d.tempMax != null).map((d) => d.tempMax);
  if (others.length >= 3) {
    const avg = others.reduce((s, v) => s + v, 0) / others.length;
    const dev = scale(today.tempMax - avg);
    if (Math.abs(dev) >= 2) {
      parts.push(dev > 0 ? `today ${dev}° above avg` : `today ${Math.abs(dev)}° below avg`);
    }
  }
  el.dailyDelta.textContent = `Tomorrow: ${parts.join(" · ")}`;
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
    return `
      <div class="place-chip ${active ? "active" : ""}" data-id="${p.id}">
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
      `Wind ${Math.round(w.windSpeed)} km/h${w.windDir != null ? ` ${cardinal(w.windDir)}` : ""}`,
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
