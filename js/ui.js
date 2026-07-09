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
  sunRiseBearing: $("#sun-rise-bearing"),
  sunSetBearing: $("#sun-set-bearing"),
  sunDaylightDelta: $("#sun-daylight-delta"),
  goldenHour: $("#golden-hour"),
  goldenLabel: $("#golden-label"),
  goldenRange: $("#golden-range"),
  goldenCount: $("#golden-count"),
  sunsetQuality: $("#sunset-quality"),
  sunsetQualityLabel: $("#sunset-quality-label"),
  sunsetQualityDetail: $("#sunset-quality-detail"),
  sunsetQualityScore: $("#sunset-quality-score"),
  chartSummary: $("#chart-summary"),
  chartSummaryText: $("#chart-summary-text"),
  dayScore: $("#day-score"),
  dayScoreArc: $("#day-score-arc"),
  dayScoreNum: $("#day-score-num"),
  dayScoreLabel: $("#day-score-label"),
  dayScoreDetail: $("#day-score-detail"),
  tempAnomaly: $("#temp-anomaly"),
  tempAnomalyText: $("#temp-anomaly-text"),
  tempAnomalyArrow: $("#temp-anomaly-arrow"),
  connStatus: $("#conn-status"),
  connStatusText: $("#conn-status-text"),
  refreshProgress: $("#refresh-progress"),
  windRoseCard: $("#wind-rose-card"),
  windRoseSub: $("#wind-rose-sub"),
  windRosePetals: $("#wind-rose-petals"),
  windRoseCaption: $("#wind-rose-caption"),
  stargaze: $("#stargaze"),
  stargazeText: $("#stargaze-text"),
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
    bindConnStatus();
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
    const parts = [place.admin1, place.country].filter(Boolean);
    if (place.elevation != null && Number.isFinite(place.elevation)) {
      const e = Math.round(place.elevation);
      // Only surface elevation when it's meaningful (avoid the noise of "0 m").
      if (Math.abs(e) >= 30) parts.push(`${e >= 0 ? e + " m" : "-" + Math.abs(e) + " m"} elev.`);
    }
    el.placeSub.textContent = parts.join(" · ") || "—";
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
    renderStargaze(weather);
    renderSun(weather);
    renderWindRose(weather);
    renderHourly(weather);
    renderChartSummary(weather);
    renderDayScore(weather);
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
    if (el.narrative) el.narrative.textContent = narrative || "";
    if (weather.offline) ui.showToast("Offline — showing sample weather");
    state._updateConnStatus?.();
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
  el.conditionLabel.textContent = capitalize(w.label);
  el.feelsLike.textContent = `Feels like ${Math.round(feels)}°`;
  renderDayRange(w);
  renderTempAnomaly(w);
  updateTabIdentity(w);
}

// Live-updating browser tab identity: emoji picked from condition/day-night
// plus the temperature shown in the tab title so tab switchers can see it.
const CONDITION_EMOJI = {
  clear: { day: "☀️", night: "🌙" },
  clouds: { day: "⛅", night: "☁️" },
  rain: { day: "🌧️", night: "🌧️" },
  snow: { day: "❄️", night: "❄️" },
  storm: { day: "⛈️", night: "⛈️" },
  fog: { day: "🌫️", night: "🌫️" },
};
function updateTabIdentity(w) {
  if (!w) return;
  const cond = CONDITION_EMOJI[w.condition] || CONDITION_EMOJI.clouds;
  const emoji = w.isDay === false ? cond.night : cond.day;
  const t = Math.round(convertTemp(w.temp ?? 0));
  const name = state.place?.name || "Aether";
  document.title = `${emoji} ${t}° · ${name}`;
  // Rebuild the favicon as an SVG data URI so the tab icon reflects the
  // current condition + rough temperature colour.
  const bg = w.isDay === false ? "#0b1020" : "#7cc0ff";
  const tempColor = t >= 25 ? "#ff9c7a" : t <= 5 ? "#9ad1ff" : "#fff1c9";
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>` +
    `<rect width='64' height='64' rx='14' fill='${bg}'/>` +
    `<text x='50%' y='55%' text-anchor='middle' dominant-baseline='middle' font-size='40' font-family='sans-serif'>${emoji}</text>` +
    `<circle cx='50' cy='14' r='9' fill='${tempColor}'/>` +
    `</svg>`;
  const href = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  const link = document.querySelector("link[rel='icon']");
  if (link) link.setAttribute("href", href);
}

function renderTempAnomaly(w) {
  if (!el.tempAnomaly || !el.tempAnomalyText || !el.tempAnomalyArrow) return;
  const days = (w?.daily || []).filter((d) => d.tempMax != null && d.tempMin != null);
  const today = days[0];
  if (!today || days.length < 3) { el.tempAnomaly.hidden = true; return; }
  const others = days.slice(1);
  const avgMid = others.reduce((a, d) => a + (d.tempMax + d.tempMin) / 2, 0) / others.length;
  const todayMid = (today.tempMax + today.tempMin) / 2;
  const rawDeltaC = todayMid - avgMid;
  const displayed = state.unit === "F" ? rawDeltaC * 9 / 5 : rawDeltaC;
  const rounded = Math.round(displayed);
  const unit = state.unit === "F" ? "°F" : "°";
  if (Math.abs(rounded) < 1) {
    el.tempAnomaly.dataset.dir = "flat";
    el.tempAnomaly.hidden = false;
    el.tempAnomalyArrow.textContent = "→";
    el.tempAnomalyText.textContent = `Typical for this week`;
    return;
  }
  const dir = rounded > 0 ? "up" : "down";
  const arrow = rounded > 0 ? "▲" : "▼";
  const word = rounded > 0 ? "warmer" : "cooler";
  el.tempAnomaly.dataset.dir = dir;
  el.tempAnomaly.hidden = false;
  el.tempAnomalyArrow.textContent = arrow;
  el.tempAnomalyText.textContent = `${Math.abs(rounded)}${unit} ${word} than the week`;
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

// Stargazing chip — reads cloud cover across the coming night hours and the
// moon illumination to hint at whether tonight is worth stepping outside for.
function renderStargaze(w) {
  if (!el.stargaze || !el.stargazeText) return;
  const hours = w?.hourly || [];
  if (!hours.length) { el.stargaze.hidden = true; return; }
  // "Night hours" = next 12 h that mark isDay=false.
  const night = hours.slice(0, 12).filter((h) => h.isDay === false && h.cloud != null);
  if (night.length < 2) { el.stargaze.hidden = true; return; }
  const avgCloud = night.reduce((a, h) => a + h.cloud, 0) / night.length;
  const clearHours = night.filter((h) => h.cloud <= 30).length;
  const moonIllum = w?.moon?.illum ?? 0.5;
  const dark = moonIllum < 0.35;

  let tier = "meh", label = "";
  if (avgCloud <= 25 && clearHours >= 2) {
    tier = "great";
    label = dark
      ? `Stargazing tonight · ${Math.round(avgCloud)}% cloud, dark moon`
      : `Clear night · ${Math.round(avgCloud)}% cloud`;
  } else if (avgCloud <= 55) {
    tier = "okay";
    label = clearHours >= 1
      ? `Partly clear night · ${clearHours} clear h`
      : `Mostly cloudy night · ${Math.round(avgCloud)}% cloud`;
  } else {
    tier = "okay";
    label = `Overcast night · ${Math.round(avgCloud)}% cloud`;
  }
  el.stargaze.hidden = false;
  el.stargaze.dataset.tier = tier;
  el.stargazeText.textContent = label;
}

// Draw a small wind rose showing the distribution of hourly wind directions
// over the next 24 h. Each of 16 petals is a wedge sized to average speed
// coming from that sector; hue tracks speed (soft blue -> punchy accent).
function renderWindRose(w) {
  if (!el.windRoseCard || !el.windRosePetals) return;
  const hours = (w?.hourly || []).slice(0, 24);
  const withDir = hours.filter((h) => h.windDir != null && h.wind != null);
  if (withDir.length < 6) { el.windRoseCard.hidden = true; return; }

  const SECTORS = 16;
  const bins = Array.from({ length: SECTORS }, () => ({ sum: 0, count: 0, peak: 0 }));
  for (const h of withDir) {
    const s = Math.round((((h.windDir % 360) + 360) % 360) / (360 / SECTORS)) % SECTORS;
    bins[s].sum += h.wind;
    bins[s].count += 1;
    bins[s].peak = Math.max(bins[s].peak, h.gusts ?? h.wind);
  }
  const filled = bins.filter((b) => b.count > 0);
  if (!filled.length) { el.windRoseCard.hidden = true; return; }
  const maxAvg = Math.max(...filled.map((b) => b.sum / b.count));
  const maxPeak = Math.max(...filled.map((b) => b.peak));

  el.windRosePetals.innerHTML = "";
  const rMax = 42;
  const sectorArc = 360 / SECTORS;
  for (let s = 0; s < SECTORS; s++) {
    const b = bins[s];
    if (!b.count) continue;
    const avg = b.sum / b.count;
    const rInner = 3;
    const rOuter = rInner + (avg / maxAvg) * (rMax - rInner);
    // Angle 0 = pointing from north (wind coming from north drawn upward).
    const a0 = (s - 0.5) * sectorArc - 90;
    const a1 = (s + 0.5) * sectorArc - 90;
    const rad = (deg) => deg * Math.PI / 180;
    const [x0i, y0i] = [rInner * Math.cos(rad(a0)), rInner * Math.sin(rad(a0))];
    const [x1i, y1i] = [rInner * Math.cos(rad(a1)), rInner * Math.sin(rad(a1))];
    const [x0o, y0o] = [rOuter * Math.cos(rad(a0)), rOuter * Math.sin(rad(a0))];
    const [x1o, y1o] = [rOuter * Math.cos(rad(a1)), rOuter * Math.sin(rad(a1))];
    const d = `M ${x0i.toFixed(1)} ${y0i.toFixed(1)}
               L ${x0o.toFixed(1)} ${y0o.toFixed(1)}
               A ${rOuter.toFixed(1)} ${rOuter.toFixed(1)} 0 0 1 ${x1o.toFixed(1)} ${y1o.toFixed(1)}
               L ${x1i.toFixed(1)} ${y1i.toFixed(1)}
               A ${rInner.toFixed(1)} ${rInner.toFixed(1)} 0 0 0 ${x0i.toFixed(1)} ${y0i.toFixed(1)} Z`;
    const hue = 210 + (avg / maxAvg) * -60; // 210 (cool blue) -> 150 (green)
    const strength = Math.min(1, avg / Math.max(20, maxAvg));
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", `hsla(${hue.toFixed(0)}, 70%, ${(55 - strength * 8).toFixed(0)}%, ${(0.35 + strength * 0.5).toFixed(2)})`);
    path.setAttribute("stroke", `hsla(${hue.toFixed(0)}, 80%, 75%, 0.4)`);
    path.setAttribute("stroke-width", "0.5");
    path.setAttribute("data-avg", avg.toFixed(1));
    path.setAttribute("data-peak", b.peak.toFixed(1));
    path.setAttribute("data-count", String(b.count));
    // Cardinal at this sector — used for tooltip and click-to-emphasise.
    const sectorDeg = s * sectorArc;
    path.setAttribute("data-dir", cardinal(sectorDeg));
    path.setAttribute("data-deg", sectorDeg.toFixed(0));
    // <title> gives native tooltips on hover.
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent =
      `From ${cardinal(sectorDeg)} (${sectorDeg.toFixed(0)}°) · avg ${avg.toFixed(1)} km/h · peak ${b.peak.toFixed(1)} km/h · ${b.count}h`;
    path.appendChild(title);
    el.windRosePetals.appendChild(path);
  }

  el.windRoseCard.hidden = false;
  const dominantIdx = bins.reduce((best, b, i) =>
    (b.count > (bins[best]?.count ?? 0) ? i : best), 0);
  const dominantDeg = dominantIdx * sectorArc;
  const dirName = cardinal(dominantDeg);
  const avgMax = Math.round(maxAvg);
  const peakMax = Math.round(maxPeak);
  if (el.windRoseSub) el.windRoseSub.textContent = "· next 24 h";
  state.windRoseSummary = `Dominant from ${dirName} · peak ${peakMax} km/h · avg ${avgMax} km/h`;
  if (el.windRoseCaption) el.windRoseCaption.textContent = state.windRoseSummary;
  bindWindRoseHover();
}

function bindWindRoseHover() {
  if (!el.windRosePetals || state._windRoseBound) return;
  state._windRoseBound = true;
  const petalsHost = el.windRosePetals;
  petalsHost.addEventListener("pointermove", (e) => {
    const p = e.target.closest("path");
    if (!p || !el.windRoseCaption) return;
    const dir = p.getAttribute("data-dir");
    const deg = p.getAttribute("data-deg");
    const avg = parseFloat(p.getAttribute("data-avg") || "0");
    const peak = parseFloat(p.getAttribute("data-peak") || "0");
    const count = p.getAttribute("data-count");
    el.windRoseCaption.textContent =
      `From ${dir} (${deg}°) · ${avg.toFixed(1)} km/h avg · peak ${peak.toFixed(0)} km/h · ${count}h`;
    p.style.filter = "brightness(1.25) saturate(1.3)";
    // Fade the others so the hovered petal reads clearly.
    for (const other of petalsHost.querySelectorAll("path")) {
      if (other !== p) other.style.opacity = "0.4";
    }
  });
  petalsHost.addEventListener("pointerleave", () => {
    for (const p of petalsHost.querySelectorAll("path")) {
      p.style.opacity = "";
      p.style.filter = "";
    }
    if (el.windRoseCaption && state.windRoseSummary) {
      el.windRoseCaption.textContent = state.windRoseSummary;
    }
  });
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
  renderSunBearings(w);
  scheduleSunCountdown(w);
  scheduleSunArc(w);
  scheduleGoldenHour(w);
  renderSunsetQuality(w);
}

// Predict how photogenic tonight's sunset will be. Rule of thumb from sky
// photographers: mid-level clouds catch fire when the low horizon is clearer.
// So we look at cloud cover in the hour before sunset (mid-high is ideal at
// 30-70 %), penalise haze (humidity / low air quality), and reward dry air.
function renderSunsetQuality(w) {
  if (!el.sunsetQuality) return;
  const hours = w?.hourly || [];
  const days = w?.daily || [];
  const now = Date.now();
  // Find the next upcoming sunset (today's, else tomorrow's).
  const sunset = days.find((d) => d.sunset && d.sunset > now - 60 * 60_000)?.sunset;
  if (!sunset) { el.sunsetQuality.hidden = true; return; }
  // Hourly bucket closest to (sunset - 45 min).
  const target = sunset - 45 * 60_000;
  const near = hours.find((h) => Math.abs(h.time - target) <= 60 * 60_000)
            || hours.find((h) => h.time >= target)
            || hours[hours.length - 1];
  if (!near) { el.sunsetQuality.hidden = true; return; }
  const cloud = near.cloud ?? w.cloudCover ?? 40;
  const humidity = near.humidity ?? w.humidity ?? 60;
  const aqi = w.airQuality?.aqi ?? 50;

  // Cloud score: peaks at ~50 %, drops toward 0/100.
  const cloudScore = Math.max(0, 1 - Math.abs(cloud - 50) / 40);
  // Humidity score: dry air = better colours.
  const humidityScore = Math.max(0, 1 - Math.max(0, humidity - 45) / 55);
  // Air quality score: cleaner = punchier saturation.
  const aqScore = Math.max(0, 1 - Math.max(0, aqi - 30) / 120);
  // Weighted mix.
  const raw = cloudScore * 0.55 + humidityScore * 0.25 + aqScore * 0.20;
  const score10 = Math.max(0, Math.min(10, Math.round(raw * 10)));

  let tier = "poor";
  if (score10 >= 7) tier = "great";
  else if (score10 >= 5) tier = "okay";

  const detail = score10 >= 8
    ? "Fiery colours expected"
    : score10 >= 6
      ? "Nice colours likely"
      : score10 >= 4
        ? "Mellow tones tonight"
        : cloud >= 85
          ? "Too overcast for colour"
          : cloud <= 8
            ? "Clear — muted colours"
            : "Muted colours likely";

  el.sunsetQuality.hidden = false;
  el.sunsetQuality.dataset.tier = tier;
  if (el.sunsetQualityLabel) el.sunsetQualityLabel.textContent = "Sunset outlook";
  if (el.sunsetQualityDetail) el.sunsetQualityDetail.textContent = detail;
  if (el.sunsetQualityScore) el.sunsetQualityScore.textContent = `${score10}/10 · ${fmtTime(sunset)}`;
}

// Approximate solar declination + sunrise azimuth at the given date/latitude.
// Uses NOAA's low-precision formulae — good to ±1° for a horizon-flat model.
function sunriseAzimuth(latDeg, date) {
  if (latDeg == null) return null;
  const N = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400_000);
  // Declination δ in radians.
  const decl = 23.44 * Math.PI / 180 * Math.sin(2 * Math.PI * (284 + N) / 365);
  const lat = latDeg * Math.PI / 180;
  const c = Math.sin(decl) / Math.cos(lat);
  if (c < -1 || c > 1) return null; // polar day/night
  const az = Math.acos(c) * 180 / Math.PI;
  return az; // measured from north, sunrise side
}

function bearingCardinal(az) {
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE",
                "S","SSW","SW","WSW","W","WNW","NW","NNW"];
  const i = Math.round(((az % 360) + 360) % 360 / 22.5) % 16;
  return dirs[i];
}

function renderSunBearings(w) {
  const lat = state.place?.lat;
  if (!el.sunRiseBearing || !el.sunSetBearing) return;
  const day = w?.sunrise ? new Date(w.sunrise) : new Date();
  const az = sunriseAzimuth(lat, day);
  if (az == null) {
    el.sunRiseBearing.hidden = true;
    el.sunSetBearing.hidden = true;
  } else {
    // Sunset azimuth mirrors sunrise around north–south (360 - az).
    const setAz = (360 - az + 360) % 360;
    el.sunRiseBearing.hidden = false;
    el.sunRiseBearing.textContent = `${Math.round(az)}° ${bearingCardinal(az)}`;
    el.sunSetBearing.hidden = false;
    el.sunSetBearing.textContent = `${Math.round(setAz)}° ${bearingCardinal(setAz)}`;
  }

  // Daylight trend heading into tomorrow (Open-Meteo returns today first).
  if (!el.sunDaylightDelta) return;
  const days = (w?.daily || []).filter((d) => d.sunrise && d.sunset);
  if (days.length < 2) { el.sunDaylightDelta.hidden = true; return; }
  const todayLen = days[0].sunset - days[0].sunrise;
  const tmrLen = days[1].sunset - days[1].sunrise;
  const deltaMin = Math.round((tmrLen - todayLen) / 60_000);
  if (Math.abs(deltaMin) < 1) { el.sunDaylightDelta.hidden = true; return; }
  const dir = deltaMin > 0 ? "up" : "down";
  const sign = deltaMin > 0 ? "+" : "−";
  el.sunDaylightDelta.hidden = false;
  el.sunDaylightDelta.dataset.dir = dir;
  el.sunDaylightDelta.textContent = `${sign}${Math.abs(deltaMin)}m tmr`;
}

// Approximate golden hour (soft warm light shortly after sunrise / before
// sunset) and blue hour (the ~30-minute dawn/dusk twilight window). Uses the
// classic photography rule-of-thumb bands, since we don't have solar altitude:
//   Golden hour AM: sunrise → sunrise + 60m
//   Golden hour PM: sunset - 60m → sunset
//   Blue hour AM:   sunrise - 30m → sunrise
//   Blue hour PM:   sunset → sunset + 30m
function computeGoldenWindows(daily) {
  const out = [];
  const GH = 60 * 60_000, BH = 30 * 60_000;
  for (const d of daily || []) {
    if (d.sunrise) {
      out.push({ kind: "blue",   phase: "dawn", start: d.sunrise - BH, end: d.sunrise });
      out.push({ kind: "golden", phase: "morn", start: d.sunrise,      end: d.sunrise + GH });
    }
    if (d.sunset) {
      out.push({ kind: "golden", phase: "eve",  start: d.sunset - GH,  end: d.sunset });
      out.push({ kind: "blue",   phase: "dusk", start: d.sunset,       end: d.sunset + BH });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

function scheduleGoldenHour(w) {
  if (state.goldenTimer) { clearInterval(state.goldenTimer); state.goldenTimer = null; }
  if (!el.goldenHour) return;
  const windows = computeGoldenWindows(w?.daily);
  if (!windows.length) { el.goldenHour.hidden = true; return; }
  const update = () => {
    const now = Date.now();
    let target = windows.find((wd) => now >= wd.start && now <= wd.end);
    let active = !!target;
    if (!target) target = windows.find((wd) => wd.start > now);
    if (!target) { el.goldenHour.hidden = true; return; }
    el.goldenHour.hidden = false;
    el.goldenHour.dataset.kind = target.kind;
    el.goldenHour.dataset.active = String(active);
    const phaseName = target.kind === "blue" ? "Blue hour" : "Golden hour";
    const phaseWhen = { dawn: "· dawn", morn: "· morning", eve: "· evening", dusk: "· dusk" }[target.phase] || "";
    el.goldenLabel.textContent = `${phaseName} ${phaseWhen}`.trim();
    el.goldenRange.textContent = `${fmtTime(target.start)} – ${fmtTime(target.end)}`;
    if (active) {
      const mins = Math.max(0, Math.round((target.end - now) / 60_000));
      el.goldenCount.textContent = mins > 0 ? `${mins}m left` : "ending";
    } else {
      const mins = Math.max(0, Math.round((target.start - now) / 60_000));
      el.goldenCount.textContent = mins >= 60
        ? `in ${Math.floor(mins / 60)}h ${mins % 60}m`
        : `in ${mins}m`;
    }
  };
  update();
  state.goldenTimer = setInterval(update, 30_000);
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

// Small 0–10 "outdoor comfort" score. Weighted mix of temperature, wetness,
// wind, humidity, and UV — with the biggest driver named in the caption.
function renderDayScore(w) {
  if (!el.dayScore || !el.dayScoreArc || !el.dayScoreNum) return;
  if (!w) { el.dayScore.hidden = true; return; }
  const factors = [];
  const push = (name, value, weight) => factors.push({ name, value, weight });

  // Temperature comfort — peak at ~20 °C, drops off both sides.
  const t = w.feelsLike ?? w.temp;
  if (t != null) {
    const dev = Math.abs(t - 20);
    const s = Math.max(0, 1 - dev / 22);
    push(dev >= 12 ? (t < 20 ? "chilly" : "hot") : "temperature", s, 0.28);
  }

  // Wetness — combine current hourly precip + next-6h POP so it reflects imminent rain.
  const soon = (w.hourly || []).slice(0, 6);
  const popNext = soon.length ? Math.max(...soon.map((h) => h.pop ?? 0)) : 0;
  const precipNow = soon[0]?.precip ?? 0;
  const wetness = Math.max(precipNow, popNext / 100 * 4);
  const rainScore = Math.max(0, 1 - wetness / 6);
  push(rainScore < 0.55 ? "rain risk" : "dry", rainScore, 0.28);

  // Wind — calm to breezy is fine, gusty drops the score.
  const gusts = w.windGusts ?? w.windSpeed ?? 0;
  const windScore = Math.max(0, 1 - Math.max(0, gusts - 12) / 40);
  push(gusts >= 30 ? "gusty" : "wind", windScore, 0.18);

  // Humidity — sweet spot 35–65 %.
  if (w.humidity != null) {
    const dev = Math.max(0, Math.abs(w.humidity - 50) - 15);
    const s = Math.max(0, 1 - dev / 35);
    push(w.humidity > 75 ? "humid" : (w.humidity < 25 ? "dry air" : "humidity"), s, 0.14);
  }

  // UV — 3–5 ideal; above 7 penalises.
  if (w.uv != null) {
    const uv = w.uv;
    const s = uv <= 6 ? 1 - Math.abs(uv - 4) / 8 : Math.max(0, 1 - (uv - 6) / 6);
    push(uv >= 8 ? "high UV" : "UV", Math.max(0, s), 0.12);
  }

  if (!factors.length) { el.dayScore.hidden = true; return; }
  const weightSum = factors.reduce((a, f) => a + f.weight, 0);
  const raw = factors.reduce((a, f) => a + f.value * f.weight, 0) / weightSum;
  const score10 = Math.max(0, Math.min(10, Math.round(raw * 10)));

  const tier = score10 >= 8 ? "great" : score10 >= 6 ? "good" : score10 >= 4 ? "okay" : "rough";
  const label = { great: "Great day", good: "Nice out", okay: "So-so", rough: "Rough" }[tier];

  // Worst-scoring factor drives the caption when it drags the score down.
  const worst = factors.reduce((a, f) => (a && a.value < f.value ? a : f), null);
  const detail = worst && worst.value < 0.55
    ? `${label} · ${worst.name} concerns`
    : `${label} · ${tier === "great" ? "hard to complain" : tier === "good" ? "pleasant overall" : tier === "okay" ? "manageable" : "consider indoors"}`;

  el.dayScore.hidden = false;
  el.dayScore.dataset.tier = tier;
  el.dayScoreNum.textContent = String(score10);
  el.dayScoreLabel.textContent = "Comfort";
  el.dayScoreDetail.textContent = detail;
  // Arc: full circle at 10/10.
  const c = 2 * Math.PI * 18;
  const dash = c * (score10 / 10);
  el.dayScoreArc.setAttribute("stroke-dasharray", c.toFixed(2));
  el.dayScoreArc.setAttribute("stroke-dashoffset", (c - dash).toFixed(2));
  // Persist factor breakdown for the click-to-expand popup.
  state.dayScoreFactors = factors.map((f) => ({
    name: f.name,
    pct: Math.round(f.value * 100),
    weight: Math.round(f.weight * 100),
  }));
  state.dayScoreTitle = `${label} — ${score10}/10`;
  bindDayScorePopup();
}

function bindDayScorePopup() {
  if (!el.dayScore || state._dayScoreBound) return;
  state._dayScoreBound = true;
  el.dayScore.setAttribute("role", "button");
  el.dayScore.setAttribute("tabindex", "0");
  const toggle = () => {
    let pop = document.getElementById("day-score-popup");
    if (pop) { pop.remove(); return; }
    pop = document.createElement("div");
    pop.id = "day-score-popup";
    pop.className = "day-score-popup glass";
    const rows = (state.dayScoreFactors || []).map((f) => `
      <div class="dsp-row">
        <span class="dsp-name">${escapeHtml(f.name)}</span>
        <div class="dsp-bar"><div class="dsp-bar-fill" style="width:${f.pct}%"></div></div>
        <span class="dsp-val">${f.pct}%</span>
      </div>
    `).join("");
    pop.innerHTML = `
      <div class="dsp-head">${escapeHtml(state.dayScoreTitle || "Comfort factors")}</div>
      ${rows}
      <div class="dsp-foot">Weighted: temp 28% · rain 28% · wind 18% · humidity 14% · UV 12%</div>
    `;
    el.dayScore.appendChild(pop);
    // Dismiss on outside click.
    const off = (e) => {
      if (!pop.contains(e.target) && e.target !== el.dayScore) {
        pop.remove();
        document.removeEventListener("click", off, true);
      }
    };
    setTimeout(() => document.addEventListener("click", off, true), 0);
  };
  el.dayScore.addEventListener("click", (e) => {
    e.stopPropagation();
    toggle();
  });
  el.dayScore.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
  });
}

function renderChartSummary(w) {
  if (!el.chartSummary || !el.chartSummaryText) return;
  const hours = (w?.hourly || []).slice(0, 24);
  if (!hours.length) { el.chartSummary.hidden = true; return; }
  let totalMm = 0;
  let wetHours = 0;
  let peakHour = null;
  for (const h of hours) {
    const p = h.precip ?? 0;
    if (p > 0) totalMm += p;
    if (p >= 0.2 || (h.pop ?? 0) >= 50) wetHours++;
    if (!peakHour || p > peakHour.p) peakHour = { p, ts: h.time };
  }
  el.chartSummary.hidden = false;
  if (totalMm < 0.1 && wetHours === 0) {
    el.chartSummary.dataset.wet = "dry";
    el.chartSummaryText.textContent = "Dry next 24 h";
    return;
  }
  const isImperial = state.unit === "F";
  const val = isImperial
    ? `${(totalMm / 25.4).toFixed(totalMm >= 25 ? 1 : 2)}″`
    : `${totalMm >= 10 ? totalMm.toFixed(0) : totalMm.toFixed(1)} mm`;
  const label = wetHours > 0
    ? `${val} · ${wetHours} wet h`
    : `${val} expected`;
  el.chartSummary.dataset.wet = totalMm >= 1 ? "true" : "false";
  el.chartSummary.title = peakHour && peakHour.p > 0
    ? `24 h precipitation total · peak ${fmtTime(peakHour.ts)}`
    : "24 h precipitation total";
  el.chartSummaryText.textContent = label;
}

function renderHourly(w) {
  el.forecastTrack.innerHTML = "";
  // Mark the hour that best matches "right now" — stays highlighted even when
  // the user scrubs to a different point on the timeline.
  const now = Date.now();
  let nowIdx = -1, nowDiff = Infinity;
  const hours = (w.hourly || []).slice(0, 24);
  hours.forEach((h, i) => {
    const diff = Math.abs(h.time - now);
    if (diff < nowDiff) { nowDiff = diff; nowIdx = i; }
  });
  // Only mark the "now" hour if it's within 90 minutes of the actual clock —
  // otherwise the badge would attach to something that isn't really "now".
  if (nowDiff > 90 * 60_000) nowIdx = -1;
  for (const [i, h] of hours.entries()) {
    const item = document.createElement("div");
    item.className = "forecast-item";
    item.dataset.ts = h.time;
    if (i === nowIdx) item.dataset.now = "true";
    const windKmh = Math.round(h.wind ?? 0);
    const strong = windKmh >= 25;
    // Meteorological convention: wind_direction_10m is where wind is *coming
    // from*, so an arrow that points where it's *going* rotates by dir + 180°.
    const dirNum = h.windDir;
    const rot = dirNum == null ? null : ((dirNum + 180) % 360);
    const windHTML = dirNum == null
      ? `<span class="forecast-wind" data-strong="${strong}">${windKmh}</span>`
      : `<span class="forecast-wind" data-strong="${strong}" title="Wind from ${cardinal(dirNum)} · ${windKmh} km/h">
           <svg viewBox="0 0 12 12" aria-hidden="true" style="transform:rotate(${rot}deg)">
             <path d="M6 1 L6 10 M6 1 L3.5 4 M6 1 L8.5 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
           </svg>
           <span>${windKmh}</span>
         </span>`;
    item.innerHTML = `
      <span class="forecast-time">${fmtTime(h.time)}</span>
      <span class="forecast-icon">${iconFor(h.condition)}</span>
      <span class="forecast-temp">${Math.round(convertTemp(h.temp))}°</span>
      ${windHTML}
      <span class="forecast-pop ${h.pop < 20 ? "dim" : ""}">${h.pop}%</span>
    `;
    item.addEventListener("click", () => state.handlers.onHourClick?.(h.time));
    el.forecastTrack.appendChild(item);
  }
}

function highlightHour(index) {
  const items = el.forecastTrack.querySelectorAll(".forecast-item");
  items.forEach((it, i) => it.classList.toggle("active", i === index));
  // Auto-scroll the hourly track so the active hour stays visible when the
  // user scrubs. Only when the track is horizontally scrollable and off-screen.
  const active = items[index];
  const track = el.forecastTrack;
  if (!active || !track) return;
  const trackRect = track.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  const margin = 24;
  const outLeft = activeRect.left < trackRect.left + margin;
  const outRight = activeRect.right > trackRect.right - margin;
  if (outLeft || outRight) {
    const targetLeft = active.offsetLeft - track.clientWidth / 2 + active.clientWidth / 2;
    track.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
  }
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
    const sunLine = (d.sunrise && d.sunset)
      ? `<span class="daily-sun-line">☀︎ ${fmtTime(d.sunrise)}–${fmtTime(d.sunset)}</span>`
      : "";
    item.innerHTML = `
      <span class="daily-day-cell">
        <span class="daily-day">${day}</span>
        ${sunLine}
      </span>
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
  setSearchHover(0);
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
  setSearchHover(0);
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
  el.searchInput.addEventListener("keydown", (e) => {
    if (el.searchResults.hidden) return;
    const items = el.searchResults._items;
    if (!items?.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const cur = state.searchHoverIdx ?? -1;
      const next = (cur + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      setSearchHover(next);
    } else if (e.key === "Enter") {
      const idx = state.searchHoverIdx ?? 0;
      const item = items[idx];
      if (item) {
        e.preventDefault();
        pickSearchItem(item);
      }
    } else if (e.key === "Escape") {
      el.searchResults.hidden = true;
    }
  });
  el.searchResults.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    const i = parseInt(li.dataset.index, 10);
    const item = el.searchResults._items?.[i];
    if (!item) return;
    pickSearchItem(item);
  });
  el.searchResults.addEventListener("pointermove", (e) => {
    const li = e.target.closest("li");
    if (!li || !li.dataset.index) return;
    const i = parseInt(li.dataset.index, 10);
    if (!Number.isNaN(i)) setSearchHover(i);
  });
}

function setSearchHover(idx) {
  state.searchHoverIdx = idx;
  const items = el.searchResults.querySelectorAll("li[data-index]");
  items.forEach((li) => {
    const i = parseInt(li.dataset.index, 10);
    if (i === idx) {
      li.classList.add("hover");
      if (li.scrollIntoView) li.scrollIntoView({ block: "nearest" });
    } else {
      li.classList.remove("hover");
    }
  });
}

function pickSearchItem(item) {
  el.searchInput.value = item.name;
  el.searchResults.hidden = true;
  state.searchHoverIdx = -1;
  places.add(item);
  state.handlers.onSearchSelect?.(item);
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
  const REFRESH_MS = 15 * 60_000; // matches the auto-refresh cadence in app.js
  const CIRC = 65.97; // 2πr for r=10.5
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
    // Refresh-ring: full circle just after fetch, drains toward empty as
    // the auto-refresh cadence approaches.
    if (el.refreshProgress) {
      const frac = Math.max(0, Math.min(1, 1 - ms / REFRESH_MS));
      el.refreshProgress.setAttribute("stroke-dashoffset", (CIRC * (1 - frac)).toFixed(2));
    }
  };
  update();
  setInterval(update, 15_000);
}

function bindConnStatus() {
  if (!el.connStatus) return;
  const update = () => {
    const online = navigator.onLine !== false;
    const mock = state.weather?.offline === true;
    let stateName, text, title;
    if (!online) {
      stateName = "offline";
      text = "Offline";
      title = "No network — showing whatever was cached";
    } else if (mock) {
      stateName = "mock";
      text = "Sample data";
      title = "Open-Meteo unreachable — showing a mock forecast";
    } else {
      stateName = "online";
      text = "Open-Meteo · live";
      title = "Connected to Open-Meteo";
    }
    el.connStatus.dataset.state = stateName;
    el.connStatus.title = title;
    if (el.connStatusText) el.connStatusText.textContent = text;
  };
  update();
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  state._updateConnStatus = update;
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
    // Include a shareable URL so recipients land on the same place.
    const shareUrl = state.place
      ? `${location.origin}${location.pathname}${location.search}#p=${encodeURIComponent(state.place.name || "")}|${encodeURIComponent(state.place.country || state.place.admin1 || "")}|${state.place.lat.toFixed(4)}|${state.place.lon.toFixed(4)}`
      : location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Aether — ${placeName}`, text, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
        ui.showToast("Summary + link copied to clipboard");
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
