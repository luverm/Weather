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
  placeLabelText: $("#place-label-text"),
  placeLocaltime: $("#place-localtime"),
  conditionLabel: $("#condition-label"),
  feelsLike: $("#feels-like"),
  narrative: $("#narrative"),
  dayRange: $("#day-range"),
  tempAnomaly: $("#temp-anomaly"),
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
  uvScaleMarker: $("#uv-scale-marker"),
  aqArc: $("#aq-arc"),
  aqValue: $("#aq-value"),
  aqLabel: $("#aq-label"),
  aqDetail: $("#aq-detail"),
  aqCard: $("#aq-card"),
  aqTrendLine: $("#aq-trend-line"),
  aqTrendFill: $("#aq-trend-fill"),
  aqBreakdown: $("#aq-breakdown"),
  moonLit: $("#moon-lit"),
  moonName: $("#moon-name"),
  moonIllum: $("#moon-illum"),
  visibilityCard: $("#visibility-card"),
  visibilityValue: $("#visibility-value"),
  visibilityLabel: $("#visibility-label"),
  visibilityDetail: $("#visibility-detail"),
  visibilityMarker: $("#visibility-marker"),
  cloudCard: $("#cloud-card"),
  cloudValue: $("#cloud-value"),
  cloudLabel: $("#cloud-label"),
  cloudTrend: $("#cloud-trend"),
  cloudGlyphFill: $("#cloud-glyph-fill"),
  cloudSparkLine: $("#cloud-spark-line"),
  cloudSparkFill: $("#cloud-spark-fill"),
  sunRise: $("#sun-rise"),
  sunSet: $("#sun-set"),
  sunDaylight: $("#sun-daylight"),
  sunRiseTemp: $("#sun-rise-temp"),
  sunSetTemp: $("#sun-set-temp"),
  sunNoonTemp: $("#sun-noon-temp"),
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
  settingHideRadar: $("#setting-hide-radar"),
  settingClearPlaces: $("#setting-clear-places"),
  chartPopover: $("#chart-popover"),
  insightsCard: $("#insights-card"),
  insightsList: $("#insights-list"),
  activityCard: $("#activity-card"),
  activityList: $("#activity-list"),
  alertsStrip: $("#alerts-strip"),
  perfectChip: $("#perfect-chip"),
  sunArcMarker: $("#sun-arc-marker"),
  sunArcPath: $("#sun-arc-path"),
  sunArcGoldenRise: $("#sun-arc-golden-rise"),
  sunArcGoldenSet: $("#sun-arc-golden-set"),
  sunArcNoon: $("#sun-arc-noon"),
  sunGoldenBadge: $("#sun-golden-badge"),
  comfortStrip: $("#comfort-strip"),
  weekendChip: $("#weekend-chip"),
  weekendHeadline: $("#weekend-headline"),
  weekendDetail: $("#weekend-detail"),
  weekendIconSat: $("#weekend-icon-sat"),
  weekendIconSun: $("#weekend-icon-sun"),
  forecastTrack: $("#forecast-track"),
  precipSummary: $("#precip-summary"),
  bestDayChip: $("#best-day-chip"),
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
    bindLegendToggles();
    bindAqExpand();
    bindBrand();
    bindConditionTap();
    bindVersion();
    bindScrollTop();
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
  setLoading(text) {
    el.placeSub.textContent = text;
    document.documentElement.setAttribute("data-loading", "true");
  },
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
    document.documentElement.removeAttribute("data-loading");
    // Brief pulse on the brand mark so the user sees "fresh data landed".
    const mark = document.querySelector(".brand-mark");
    if (mark) {
      mark.classList.remove("fetched");
      // Reflow to retrigger the animation.
      void mark.offsetWidth;
      mark.classList.add("fetched");
      setTimeout(() => mark.classList.remove("fetched"), 1000);
    }
    renderLiveValues(weather);
    renderMetrics(weather);
    renderAirQuality(weather.airQuality);
    renderMoon(weather.moon);
    renderVisibility(weather);
    renderCloudCover(weather);
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
    renderPerfectChip(weather);
    renderWeekend(weather);
    startLocaltime(weather);
    if (state.chart) state.chart.setHours(weather.hourly);
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
    // Flip the "Now in" / "At HH:mm in" label so the hero always says
    // what time you're looking at.
    if (el.placeLabelText) {
      if (on && state.sampledWeather?._sampledTs) {
        el.placeLabelText.textContent = `At ${fmtTime(state.sampledWeather._sampledTs)} in`;
      } else {
        el.placeLabelText.textContent = "Now in";
      }
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
    // Mobile haptic — short tick when a toast fires. Guarded; harmless if
    // Vibration API isn't supported.
    try { navigator.vibrate?.(10); } catch { /* ignore */ }
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
}

function renderTempAnomaly(w) {
  if (!el.tempAnomaly) return;
  const days = w.daily || [];
  if (days.length < 3) { el.tempAnomaly.hidden = true; return; }
  const today = days[0];
  if (today?.tempMax == null || today?.tempMin == null) { el.tempAnomaly.hidden = true; return; }
  // Compare today's mean to the mean of the remaining days we have.
  const todayMean = (today.tempMax + today.tempMin) / 2;
  const rest = days.slice(1).filter((d) => d.tempMax != null && d.tempMin != null);
  if (rest.length < 2) { el.tempAnomaly.hidden = true; return; }
  const restMean = rest.reduce((s, d) => s + (d.tempMax + d.tempMin) / 2, 0) / rest.length;
  const deltaC = todayMean - restMean;
  // Convert span to active unit (°F spans are 1.8× °C).
  const deltaDisplay = state.unit === "F" ? deltaC * 9 / 5 : deltaC;
  const absD = Math.abs(deltaDisplay);
  if (absD < 1.2) { el.tempAnomaly.hidden = true; return; }
  const dir = deltaDisplay > 0 ? "warm" : "cool";
  const arrow = deltaDisplay > 0 ? "▲" : "▼";
  const word = deltaDisplay > 0 ? "warmer" : "cooler";
  el.tempAnomaly.hidden = false;
  el.tempAnomaly.setAttribute("data-dir", dir);
  el.tempAnomaly.innerHTML = `<span class="temp-anomaly-arrow">${arrow}</span><span>${Math.round(absD)}° ${word} than the week</span>`;
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
  // Find the matching hours so we can tooltip the exact time of each extreme.
  const hours = (w.hourly || []).slice(0, 24);
  let loHour = null, hiHour = null;
  for (const h of hours) {
    if (h.temp == null) continue;
    if (!loHour || h.temp < loHour.temp) loHour = h;
    if (!hiHour || h.temp > hiHour.temp) hiHour = h;
  }
  el.dayRangeMin.textContent = `${Math.round(convertTemp(lo))}°`;
  el.dayRangeMax.textContent = `${Math.round(convertTemp(hi))}°`;
  el.dayRangeMin.title = loHour ? `Low at ${fmtTime(loHour.time)}` : "Today's low";
  el.dayRangeMax.title = hiHour ? `High at ${fmtTime(hiHour.time)}` : "Today's high";
  el.dayRangeMarker.title = w.temp != null ? `Now · ${Math.round(convertTemp(w.temp))}°` : "Now";
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
  if (el.uvScaleMarker) {
    if (w.uv != null) {
      // Cap display at 11 (anything beyond is "extreme" anyway).
      const pct = Math.min(1, Math.max(0, w.uv / 11)) * 100;
      el.uvScaleMarker.style.left = `${pct.toFixed(1)}%`;
      el.uvScaleMarker.style.display = "";
    } else {
      el.uvScaleMarker.style.display = "none";
    }
  }
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
  renderAqBreakdown(aq);
}

// Reference thresholds roughly aligned with WHO/EPA "unhealthy" levels so
// the bars convey severity, not just a raw number.
const AQ_POLLUTANTS = [
  { key: "pm25", label: "PM2.5", unit: "μg/m³", max: 55 },
  { key: "pm10", label: "PM10",  unit: "μg/m³", max: 150 },
  { key: "o3",   label: "O₃",    unit: "μg/m³", max: 180 },
  { key: "no2",  label: "NO₂",   unit: "μg/m³", max: 200 },
  { key: "co",   label: "CO",    unit: "μg/m³", max: 10000 },
];

function pollutantColor(frac) {
  if (frac < 0.3) return "#78d06a";
  if (frac < 0.6) return "#ffd36a";
  if (frac < 0.85) return "#ff9f5c";
  return "#ff6a6a";
}

function renderAqBreakdown(aq) {
  if (!el.aqBreakdown) return;
  el.aqBreakdown.innerHTML = AQ_POLLUTANTS.map((p) => {
    const v = aq?.[p.key];
    const frac = v == null ? 0 : Math.max(0, Math.min(1, v / p.max));
    const color = pollutantColor(frac);
    const valueText = v == null ? "—" : `${v >= 100 ? Math.round(v) : v.toFixed(1)}`;
    return `
      <li>
        <span class="aq-pollutant-label">${p.label}</span>
        <div class="aq-bar-track" style="color:${color}">
          <div class="aq-bar-fill" style="width:${(frac * 100).toFixed(1)}%"></div>
        </div>
        <span class="aq-pollutant-value">${valueText} <span style="opacity:0.6">${p.unit}</span></span>
      </li>
    `;
  }).join("");
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

function visibilityLevel(km) {
  if (km == null) return { label: "—", cls: "flat", pct: 0 };
  if (km < 1)  return { label: "Very low", cls: "down", pct: Math.max(1, km / 10 * 100) };
  if (km < 4)  return { label: "Poor", cls: "down", pct: km / 10 * 100 };
  if (km < 10) return { label: "Moderate", cls: "flat", pct: km / 10 * 100 };
  return { label: "Excellent", cls: "up", pct: 100 };
}

function renderVisibility(w) {
  if (!el.visibilityCard) return;
  // Open-Meteo reports visibility in meters; clamp absurd values to 20 km.
  const km = w.visibility != null ? Math.min(20, w.visibility / 1000) : null;
  const lvl = visibilityLevel(km);
  if (km == null) {
    el.visibilityCard.style.opacity = 0.5;
    if (el.visibilityValue) el.visibilityValue.textContent = "—";
    if (el.visibilityDetail) el.visibilityDetail.textContent = "—";
    if (el.visibilityMarker) el.visibilityMarker.style.display = "none";
    return;
  }
  el.visibilityCard.style.opacity = 1;
  if (el.visibilityValue) {
    el.visibilityValue.textContent = km < 10 ? km.toFixed(1) : Math.round(km);
  }
  if (el.visibilityLabel) {
    el.visibilityLabel.className = `trend ${lvl.cls}`;
    el.visibilityLabel.textContent = lvl.label;
  }
  if (el.visibilityDetail) {
    const miles = km / 1.609344;
    el.visibilityDetail.textContent = km >= 10
      ? `Clear view to the horizon · ${miles.toFixed(1)} mi`
      : `${miles.toFixed(1)} mi · haze or precipitation reducing range`;
  }
  if (el.visibilityMarker) {
    el.visibilityMarker.style.display = "";
    // Gauge is 0-10 km mapped left to right; cap display at 10 km.
    const pct = Math.max(0, Math.min(100, (km / 10) * 100));
    el.visibilityMarker.style.left = `${pct.toFixed(1)}%`;
  }
}

function cloudLevel(pct) {
  if (pct == null) return { key: "partly", label: "—" };
  if (pct < 10)  return { key: "clear",  label: "Clear" };
  if (pct < 30)  return { key: "few",    label: "Mostly clear" };
  if (pct < 60)  return { key: "partly", label: "Partly cloudy" };
  if (pct < 85)  return { key: "mostly", label: "Mostly cloudy" };
  return { key: "over", label: "Overcast" };
}

function renderCloudCover(w) {
  if (!el.cloudCard) return;
  // Prefer the current field, fall back to the first hourly entry.
  let current = w.cloudCover;
  if (current == null) current = w.hourly?.[0]?.cloudCover;
  const lvl = cloudLevel(current);
  if (current == null) {
    el.cloudCard.style.opacity = 0.5;
    el.cloudValue.textContent = "—";
    el.cloudLabel.textContent = "—";
    el.cloudCard.setAttribute("data-level", lvl.key);
    if (el.cloudGlyphFill) el.cloudGlyphFill.setAttribute("d", "");
    if (el.cloudTrend) el.cloudTrend.textContent = "";
    drawSparkline(el.cloudSparkLine, el.cloudSparkFill, [], {});
    return;
  }
  el.cloudCard.style.opacity = 1;
  el.cloudCard.setAttribute("data-level", lvl.key);
  el.cloudValue.textContent = Math.round(current);
  el.cloudLabel.textContent = lvl.label;

  // Lens glyph: a tiny cloud/sun fused shape whose cloud area grows with %.
  // Build a cloud polygon by stacking three circles whose radii scale.
  const pct = Math.max(0, Math.min(100, current)) / 100;
  // Full cloud outline for pct=1; shrunk to a wisp for pct=0.
  const r = 10 + pct * 4;
  const d = pct < 0.1
    ? "" // let the sun shine through — glyph is empty
    : `M ${-r} 2
       a ${r * 0.55} ${r * 0.55} 0 0 1 ${r * 0.7} ${-r * 0.6}
       a ${r * 0.7} ${r * 0.7} 0 0 1 ${r * 1.2} 0.3
       a ${r * 0.5} ${r * 0.5} 0 0 1 ${r * 0.5} ${r * 0.4}
       a ${r * 0.5} ${r * 0.5} 0 0 1 ${-r * 0.1} ${r * 0.6}
       L ${-r + r * 0.1} ${r * 0.6 + 2}
       a ${r * 0.5} ${r * 0.5} 0 0 1 ${-r * 0.3} ${-r * 0.5}
       Z`.replace(/\s+/g, " ");
  if (el.cloudGlyphFill) el.cloudGlyphFill.setAttribute("d", d);

  // Hourly trend sparkline (next 12 hours).
  const hourly = (w.hourly || []).slice(0, 12).map((h) => h.cloudCover).filter((v) => v != null);
  drawSparkline(el.cloudSparkLine, el.cloudSparkFill, hourly, { minSpan: 10, fixedMin: 0, fixedMax: 100 });

  // Trend badge: delta between now and ~3h ahead.
  if (el.cloudTrend) {
    const later = w.hourly?.[3]?.cloudCover;
    if (later != null) {
      const delta = later - current;
      if (Math.abs(delta) < 10) {
        el.cloudTrend.className = "trend flat";
        el.cloudTrend.textContent = "steady";
      } else if (delta < 0) {
        el.cloudTrend.className = "trend down";
        el.cloudTrend.textContent = "clearing";
      } else {
        el.cloudTrend.className = "trend up";
        el.cloudTrend.textContent = "clouding";
      }
    } else {
      el.cloudTrend.textContent = "";
    }
  }
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
  renderSunTemps(w);
  scheduleSunCountdown(w);
  scheduleSunArc(w);
}

function tempAtTime(w, ts) {
  if (!ts || !w.hourly?.length) return null;
  let best = null, bestDiff = Infinity;
  for (const h of w.hourly) {
    const d = Math.abs(h.time - ts);
    if (d < bestDiff) { bestDiff = d; best = h; }
  }
  // Only report when the sample is within 90 minutes of the target.
  if (bestDiff > 90 * 60_000) return null;
  return best?.temp ?? null;
}

function renderSunTemps(w) {
  const setTemp = (node, c) => {
    if (!node) return;
    node.textContent = c == null ? "" : `${Math.round(convertTemp(c))}°`;
  };
  if (!w?.hourly?.length) {
    setTemp(el.sunRiseTemp, null);
    setTemp(el.sunSetTemp, null);
    setTemp(el.sunNoonTemp, null);
    return;
  }
  setTemp(el.sunRiseTemp, tempAtTime(w, w.sunrise));
  setTemp(el.sunSetTemp, tempAtTime(w, w.sunset));
  // "Daylight" column shows the daytime temperature span today.
  const today = w.daily?.[0];
  if (el.sunNoonTemp) {
    el.sunNoonTemp.textContent = (today?.tempMin != null && today?.tempMax != null)
      ? `${Math.round(convertTemp(today.tempMin))}°–${Math.round(convertTemp(today.tempMax))}°`
      : "";
  }
}

// Golden-hour: 60 min after sunrise, 60 min before sunset — clipped if the
// day is too short to fit the full window.
const GOLDEN_HOUR_MS = 60 * 60_000;

function goldenWindows(sunrise, sunset) {
  if (!sunrise || !sunset || sunset <= sunrise) return null;
  const day = sunset - sunrise;
  const span = Math.min(GOLDEN_HOUR_MS, Math.floor(day / 3));
  return {
    morning: { start: sunrise, end: sunrise + span },
    evening: { start: sunset - span, end: sunset },
    span,
  };
}

function arcPoint(frac) {
  const t = clamp01(frac);
  const x = (1 - t) ** 2 * 10 + 2 * (1 - t) * t * 100 + t ** 2 * 190;
  const y = (1 - t) ** 2 * 74 + 2 * (1 - t) * t * -26 + t ** 2 * 74;
  return { x, y };
}

function scheduleSunArc(w) {
  if (!el.sunArcMarker || !el.sunArcPath) return;
  if (state.sunArcTimer) { clearInterval(state.sunArcTimer); state.sunArcTimer = null; }
  if (!w?.sunrise || !w?.sunset) return;

  const sr = w.sunrise, ss = w.sunset;
  const win = goldenWindows(sr, ss);

  // Place the two golden-hour markers once per load — they don't move.
  if (win && el.sunArcGoldenRise && el.sunArcGoldenSet) {
    const morningFrac = (win.morning.end - sr) / (ss - sr);
    const eveningFrac = (win.evening.start - sr) / (ss - sr);
    const mp = arcPoint(morningFrac);
    const ep = arcPoint(eveningFrac);
    el.sunArcGoldenRise.setAttribute("cx", mp.x.toFixed(1));
    el.sunArcGoldenRise.setAttribute("cy", mp.y.toFixed(1));
    el.sunArcGoldenSet.setAttribute("cx", ep.x.toFixed(1));
    el.sunArcGoldenSet.setAttribute("cy", ep.y.toFixed(1));
  } else {
    if (el.sunArcGoldenRise) el.sunArcGoldenRise.setAttribute("cx", "-10");
    if (el.sunArcGoldenSet) el.sunArcGoldenSet.setAttribute("cx", "-10");
  }
  // Solar-noon tick — midpoint of the arc, labeled by its tooltip.
  if (el.sunArcNoon) {
    const noon = arcPoint(0.5);
    el.sunArcNoon.setAttribute("cx", noon.x.toFixed(1));
    el.sunArcNoon.setAttribute("cy", noon.y.toFixed(1));
    const noonTs = (sr + ss) / 2;
    try { el.sunArcNoon.innerHTML = `<title>Solar noon · ${fmtTime(noonTs)}</title>`; } catch { /* ignore */ }
  }

  const update = () => {
    const now = Date.now();
    let frac;
    if (now < sr) frac = 0;
    else if (now > ss) frac = 1;
    else frac = (now - sr) / (ss - sr);
    const p = arcPoint(frac);
    el.sunArcMarker.setAttribute("cx", p.x.toFixed(1));
    el.sunArcMarker.setAttribute("cy", p.y.toFixed(1));
    const isUp = now >= sr && now <= ss;
    el.sunArcMarker.style.opacity = isUp ? "1" : "0.45";

    // Light up the active golden-hour marker.
    if (win) {
      const inMorning = now >= win.morning.start && now <= win.morning.end;
      const inEvening = now >= win.evening.start && now <= win.evening.end;
      el.sunArcGoldenRise?.setAttribute("data-active", inMorning ? "true" : "false");
      el.sunArcGoldenSet?.setAttribute("data-active", inEvening ? "true" : "false");
    }
  };
  update();
  state.sunArcTimer = setInterval(update, 60_000);
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

function scheduleSunCountdown(w) {
  if (state.sunTimer) { clearInterval(state.sunTimer); state.sunTimer = null; }
  if (!w?.daily?.length) return;

  // Pre-compute golden-hour windows for every day in the daily forecast so
  // the countdown can reach into tomorrow once today's windows are spent.
  const goldens = w.daily
    .map((d) => ({ day: d, win: goldenWindows(d.sunrise, d.sunset) }))
    .filter((x) => x.win);

  const fmtDur = (mins) => mins >= 60
    ? `${Math.floor(mins / 60)}h ${mins % 60}m`
    : `${mins}m`;

  const update = () => {
    const now = Date.now();

    // If we are inside a golden-hour window right now, show it ending.
    let activeGolden = null;
    for (const { win } of goldens) {
      if (now >= win.morning.start && now <= win.morning.end) { activeGolden = win.morning; break; }
      if (now >= win.evening.start && now <= win.evening.end) { activeGolden = win.evening; break; }
    }
    if (activeGolden) {
      const mins = Math.max(0, Math.round((activeGolden.end - now) / 60_000));
      if (el.sunNextLabel) el.sunNextLabel.textContent = "Golden hour ends in";
      if (el.sunCountdown) el.sunCountdown.textContent = fmtDur(mins);
      if (el.sunGoldenBadge) { el.sunGoldenBadge.hidden = false; el.sunGoldenBadge.textContent = "Now"; }
      return;
    }

    // Otherwise find the next event: sunrise / sunset / upcoming golden.
    let nextTs = null, nextKind = null;
    for (const d of w.daily) {
      for (const [ts, kind] of [[d.sunrise, "Sunrise"], [d.sunset, "Sunset"]]) {
        if (ts && ts > now && (!nextTs || ts < nextTs)) { nextTs = ts; nextKind = kind; }
      }
    }
    // Nearest upcoming golden-hour start (either morning or evening).
    let nextGoldenStart = null;
    for (const { win } of goldens) {
      for (const g of [win.morning, win.evening]) {
        if (g.start > now && (!nextGoldenStart || g.start < nextGoldenStart)) {
          nextGoldenStart = g.start;
        }
      }
    }
    // If golden hour starts within 90 min AND before the next sunrise/sunset,
    // promote it to the headline (otherwise sunrise/sunset is more useful).
    const goldenSoon = nextGoldenStart != null
      && nextGoldenStart - now <= 90 * 60_000
      && (nextTs == null || nextGoldenStart <= nextTs);
    if (goldenSoon) {
      const mins = Math.max(0, Math.round((nextGoldenStart - now) / 60_000));
      if (el.sunNextLabel) el.sunNextLabel.textContent = "Golden hour in";
      if (el.sunCountdown) el.sunCountdown.textContent = fmtDur(mins);
      if (el.sunGoldenBadge) { el.sunGoldenBadge.hidden = false; el.sunGoldenBadge.textContent = "Soon"; }
      return;
    }

    if (el.sunGoldenBadge) el.sunGoldenBadge.hidden = true;
    if (!nextTs) {
      if (el.sunCountdown) el.sunCountdown.textContent = "";
      if (el.sunNextLabel) el.sunNextLabel.textContent = "Sun";
      return;
    }
    const mins = Math.max(0, Math.round((nextTs - now) / 60_000));
    if (el.sunNextLabel) el.sunNextLabel.textContent = `${nextKind} in`;
    if (el.sunCountdown) el.sunCountdown.textContent = fmtDur(mins);
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

function renderPerfectChip(w) {
  if (!el.perfectChip) return;
  const t = w?.temp;
  const cloud = w?.cloudCover;
  const wind = w?.windSpeed ?? 0;
  const pop = w?.hourly?.[0]?.pop ?? 0;
  // "Perfect" window: comfortable, mostly clear, calm, dry — and daytime.
  const perfect = t != null && t >= 18 && t <= 24
    && (cloud == null || cloud < 35)
    && wind < 15
    && pop < 15
    && w?.isDay;
  if (!perfect) { el.perfectChip.hidden = true; el.perfectChip.textContent = ""; return; }
  el.perfectChip.hidden = false;
  el.perfectChip.innerHTML = `<span class="perfect-spark" aria-hidden="true"></span><span>Picture-perfect weather right now</span>`;
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
    item.setAttribute("role", "listitem");
    item.setAttribute("aria-label",
      `${fmtTime(h.time)} ${Math.round(convertTemp(h.temp))}°${state.unit}, ${h.pop}% chance of precipitation, ${capitalize(h.label || h.condition || "")}`);
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
  renderPrecipSummary(w);
}

function renderPrecipSummary(w) {
  if (!el.precipSummary) return;
  const hours = (w.hourly || []).slice(0, 24);
  if (hours.length < 3) { el.precipSummary.hidden = true; return; }

  let total = 0, peakHour = null, maxPop = 0;
  for (const h of hours) {
    const p = h.precip ?? 0;
    total += p;
    if (h.pop > maxPop) maxPop = h.pop;
    if (!peakHour || p > (peakHour.precip ?? 0)) peakHour = h;
  }

  let level, text;
  if (total < 0.1 && maxPop < 25) {
    level = "dry";
    text = `Dry · ${maxPop}% max chance`;
  } else if (total < 0.3) {
    level = "chance";
    text = `${maxPop}% chance · stays dry`;
  } else {
    level = total >= 10 ? "heavy" : "wet";
    const totalLabel = total >= 10 ? `${Math.round(total)}` : `${total.toFixed(1)}`;
    const peakLabel = peakHour && (peakHour.precip ?? 0) > 0.1
      ? ` · peak ${fmtTime(peakHour.time)}`
      : "";
    text = `${totalLabel} mm · ${maxPop}%${peakLabel}`;
  }
  el.precipSummary.hidden = false;
  el.precipSummary.setAttribute("data-level", level);
  el.precipSummary.innerHTML = `<span class="precip-dot"></span><span>${text}</span>`;
  // Jump to the wettest hour on click, when there is one worth jumping to.
  el.precipSummary.onclick = (peakHour && (peakHour.precip ?? 0) > 0.1)
    ? () => state.handlers.onHourClick?.(peakHour.time)
    : null;
  el.precipSummary.style.cursor = el.precipSummary.onclick ? "pointer" : "default";
  el.precipSummary.setAttribute("title", el.precipSummary.onclick
    ? `Jump to ${fmtTime(peakHour.time)} — the wettest hour`
    : "");
}

function highlightHour(index) {
  const items = el.forecastTrack.querySelectorAll(".forecast-item");
  items.forEach((it, i) => {
    const on = i === index;
    it.classList.toggle("active", on);
    if (on) it.setAttribute("aria-current", "time");
    else it.removeAttribute("aria-current");
  });
}

function dayScore(d) {
  // Mild temp (ideal ~20°C), dry, low gusts, decent UV — tuned for a
  // "pleasant outdoor day" score 0..100. Prefers the warmer side slightly.
  if (d.tempMax == null) return -Infinity;
  const temp = d.tempMax;
  const tempDist = Math.min(14, Math.abs(temp - 22));
  const tempScore = 100 - tempDist * 5; // 100 at 22°, 30 at 36°, 30 at 8°
  const popPenalty = (d.pop ?? 0) * 0.5;
  const precipPenalty = Math.min(40, (d.precip ?? 0) * 8);
  const gustPenalty = Math.max(0, ((d.gustsMax ?? 0) - 25) * 1.0);
  return tempScore - popPenalty - precipPenalty - gustPenalty;
}

function pickBestDay(days) {
  // Prefer the earliest day that is clearly best; ignore today when the
  // week has a visibly better future day (keeps "best" forward-looking).
  if (!days?.length) return null;
  const scored = days.map((d, i) => ({ d, i, score: dayScore(d) }));
  // Sort descending by score, tie-break on earlier day.
  scored.sort((a, b) => (b.score - a.score) || (a.i - b.i));
  const best = scored[0];
  if (!best || best.score < 40) return null;
  // Only call it out if the best day is noticeably better than today.
  const todayScore = scored.find((s) => s.i === 0)?.score ?? -Infinity;
  if (best.i === 0 || best.score - todayScore >= 10) return best;
  return null;
}

function renderBestDayChip(days, best) {
  if (!el.bestDayChip) return;
  if (!best) { el.bestDayChip.hidden = true; return; }
  const d = best.d;
  const tz = state.weather?.timezone;
  const dt = new Date(d.time);
  const dayName = best.i === 0 ? "Today" : dt.toLocaleDateString(undefined, {
    weekday: "short", ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });
  const bits = [];
  if (d.pop != null) bits.push(d.pop < 20 ? "dry" : d.pop < 50 ? "mostly dry" : `${d.pop}% rain`);
  if (d.tempMax != null) bits.push(`${Math.round(convertTemp(d.tempMax))}°`);
  if (d.gustsMax != null && d.gustsMax < 25) bits.push("light wind");
  el.bestDayChip.hidden = false;
  el.bestDayChip.innerHTML = `<span class="best-day-star" aria-hidden="true"></span><span>Best: ${dayName} · ${bits.join(", ")}</span>`;
  el.bestDayChip.setAttribute("title", `Best outdoor conditions this week — ${dayName}`);
  el.bestDayChip.onclick = () => {
    const row = el.dailyTrack.querySelector(`.daily-item[data-ts="${d.time}"]`);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
    row?.classList.add("flash");
    setTimeout(() => row?.classList.remove("flash"), 900);
  };
}

function renderDaily(w) {
  el.dailyTrack.innerHTML = "";
  const days = (w.daily || []).slice(0, 7);
  if (!days.length) return;
  renderDailyIconStrip(days);
  renderDailySpark(days);
  renderDailyDelta(days);
  const best = pickBestDay(days);
  renderBestDayChip(days, best);
  // Global min/max for the range bar.
  let gMin = Infinity, gMax = -Infinity;
  for (const d of days) {
    if (d.tempMin < gMin) gMin = d.tempMin;
    if (d.tempMax > gMax) gMax = d.tempMax;
  }
  const span = Math.max(1, gMax - gMin);
  const maxPrecip = Math.max(1, ...days.map((d) => d.precip ?? 0));
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
    if (best && best.i === i) item.classList.add("best-day");
    item.dataset.ts = d.time;
    const gustLabel = (d.gustsMax && d.gustsMax >= 25)
      ? ` · gusts ${Math.round(d.gustsMax)} km/h`
      : "";
    const popLabel = d.pop >= 30 ? ` · ${d.pop}% rain` : "";
    const windLabel = (d.windMax != null && d.windDir != null)
      ? ` · ${cardinal(d.windDir)} ${Math.round(d.windMax)} km/h`
      : "";
    const snowLabel = (d.snow && d.snow >= 0.5)
      ? ` · ❄ ${d.snow >= 10 ? Math.round(d.snow) : d.snow.toFixed(1)} cm`
      : "";
    const extra = (gustLabel || popLabel || windLabel || snowLabel)
      ? `<span class="daily-gust">${popLabel}${snowLabel}${windLabel}${gustLabel}</span>`
      : "";
    const windArrow = d.windDir != null
      ? `<span class="daily-wind" title="Wind from ${cardinal(d.windDir)}" style="transform:rotate(${d.windDir}deg)" aria-hidden="true">
           <svg viewBox="0 0 16 16"><path d="M8 2 L5 10 L8 8 L11 10 Z" fill="currentColor"/></svg>
         </span>`
      : `<span class="daily-wind daily-wind-blank" aria-hidden="true"></span>`;
    // Rain intensity accent — a thin bar under the temp range sized to
    // the day's precip proportion against the week's max.
    const rainFrac = (d.precip ?? 0) / maxPrecip;
    const rainBar = rainFrac > 0.02
      ? `<div class="daily-rain" style="width:${(rainFrac * 100).toFixed(1)}%" title="${d.precip?.toFixed(1) ?? 0} mm"></div>`
      : "";
    item.innerHTML = `
      <span class="daily-day">${day}</span>
      <span class="daily-icon">${iconFor(d.condition)}</span>
      <div class="daily-range">
        <div class="daily-range-fill" style="left:${left}%;width:${Math.max(8, width)}%"></div>
        ${rainBar}
      </div>
      <span class="daily-temp-min">${Math.round(convertTemp(d.tempMin))}°</span>
      <span class="daily-temp-max">${Math.round(convertTemp(d.tempMax))}°</span>
      ${windArrow}
      ${extra}
    `;
    item.addEventListener("click", (ev) => {
      // Shift-click (or ⌘/Ctrl-click) jumps the scrubber to the start of
      // that day instead of expanding — useful once you know the row's
      // detail is already visible further down.
      if (ev.shiftKey || ev.metaKey || ev.ctrlKey) {
        const dayStart = new Date(d.time);
        dayStart.setHours(9, 0, 0, 0); // mid-morning so sampling lands on a day entry
        state.handlers.onHourClick?.(dayStart.getTime());
        return;
      }
      toggleDailyExpand(item, d, w);
    });
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
  // Weekly rainfall accumulation — only mentioned when meaningful (≥ 1 mm).
  const weekRain = days.reduce((s, d) => s + (d.precip ?? 0), 0);
  if (weekRain >= 1) {
    parts.push(`week ${weekRain >= 10 ? Math.round(weekRain) : weekRain.toFixed(1)} mm`);
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
    const sunBits = [];
    if (d.sunrise) sunBits.push(`☀ ${fmtTime(d.sunrise)}`);
    if (d.sunset) sunBits.push(`☾ ${fmtTime(d.sunset)}`);
    if (d.sunrise && d.sunset) {
      const h = Math.round((d.sunset - d.sunrise) / 60_000);
      sunBits.push(`${Math.floor(h / 60)}h ${h % 60}m daylight`);
    }
    const sunLine = sunBits.length ? `<br>${sunBits.join(" · ")}` : "";
    summary.innerHTML = `<span style="padding:8px;color:var(--fg-dim);font-size:12px">Pop ${d.pop}% · gust up to ${Math.round(d.gustsMax ?? 0)} km/h · UV ${Math.round(d.uvMax ?? 0)}${sunLine}</span>`;
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
  // The small "updated Xm ago" indicator in the footer doubles as a refresh
  // link once the data is at least a minute old.
  if (el.fetchedAgo) {
    el.fetchedAgo.setAttribute("role", "button");
    el.fetchedAgo.setAttribute("tabindex", "0");
    el.fetchedAgo.setAttribute("title", "Click to refresh");
    el.fetchedAgo.addEventListener("click", () => state.handlers.onRefresh?.());
    el.fetchedAgo.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        state.handlers.onRefresh?.();
      }
    });
  }
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

  el.settingHideRadar?.addEventListener("change", () => {
    const hide = el.settingHideRadar.checked;
    document.documentElement.setAttribute("data-hide-radar", hide ? "true" : "false");
    localStorage.setItem("aether:hideRadar", hide ? "1" : "0");
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
  const hideRadar = localStorage.getItem("aether:hideRadar") === "1";
  if (hideRadar) {
    document.documentElement.setAttribute("data-hide-radar", "true");
    if (el.settingHideRadar) el.settingHideRadar.checked = true;
  }
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

function buildShareUrl() {
  if (!state.place) return location.href;
  const url = new URL(location.href);
  url.search = ""; // drop any prior params so we don't stack
  const lat = state.place.lat?.toFixed?.(3);
  const lon = state.place.lon?.toFixed?.(3);
  if (lat != null) url.searchParams.set("lat", lat);
  if (lon != null) url.searchParams.set("lon", lon);
  if (state.place.name) url.searchParams.set("name", state.place.name);
  if (state.place.country) url.searchParams.set("c", state.place.country);
  return url.toString();
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
    const shareUrl = buildShareUrl();
    const lines = [
      `Aether · ${placeName}`,
      `${capitalize(w.label)} · ${t(w.temp)} (feels ${t(w.feelsLike ?? w.temp)})`,
      today ? `Today: ${t(today.tempMin)} / ${t(today.tempMax)} · ${today.pop}% precip` : null,
      `Wind ${Math.round(w.windSpeed)} km/h${w.windDir != null ? ` ${cardinal(w.windDir)}` : ""}`,
      w.uv != null ? `UV ${Math.round(w.uv)}` : null,
      w.airQuality?.aqi != null ? `AQI ${Math.round(w.airQuality.aqi)} (${w.airQuality.label})` : null,
      "",
      shareUrl,
    ].filter((l) => l != null);
    const text = lines.join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: `Aether — ${placeName}`, text, url: shareUrl });
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

function bindConditionTap() {
  if (!el.conditionLabel) return;
  el.conditionLabel.classList.add("tappable");
  el.conditionLabel.setAttribute("role", "button");
  el.conditionLabel.setAttribute("tabindex", "0");
  el.conditionLabel.setAttribute("title", "More detail");
  const announce = () => {
    const w = state.sampledWeather || state.weather;
    if (!w) return;
    const bits = [];
    if (w.cloudCover != null) bits.push(`Clouds ${Math.round(w.cloudCover)}%`);
    if (w.visibility != null) bits.push(`Visibility ${(w.visibility / 1000).toFixed(1)} km`);
    if (w.dewPoint != null) bits.push(`Dew ${Math.round(convertTemp(w.dewPoint))}°`);
    if (w.pressure != null) bits.push(`${Math.round(w.pressure)} hPa`);
    if (!bits.length) return;
    ui.showToast(bits.join(" · "));
  };
  el.conditionLabel.addEventListener("click", announce);
  el.conditionLabel.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); announce(); }
  });
}

function bindScrollTop() {
  const btn = document.getElementById("scroll-top");
  if (!btn) return;
  const THRESHOLD = 480; // show only after some meaningful scrolling
  const onScroll = () => {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    if (y > THRESHOLD) {
      if (btn.hidden) { btn.hidden = false; requestAnimationFrame(() => btn.classList.add("visible")); }
    } else {
      btn.classList.remove("visible");
      // Hide after transition so it doesn't catch pointer events.
      setTimeout(() => { if (!btn.classList.contains("visible")) btn.hidden = true; }, 220);
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

function bindVersion() {
  const node = document.getElementById("settings-version");
  if (!node || !navigator.serviceWorker) return;
  // Peek at the active controller via its scriptURL — the version is
  // encoded in CACHE_VERSION in sw.js and bumped per round.
  const render = (ver) => { node.textContent = ver || "offline"; };
  navigator.serviceWorker.ready.then((reg) => {
    // Ask the sw for its cache name by sending a message, if supported.
    const sw = reg.active;
    if (!sw) { render("installing…"); return; }
    const channel = new MessageChannel();
    channel.port1.onmessage = (e) => render(e.data?.version);
    try { sw.postMessage({ type: "version" }, [channel.port2]); } catch { /* ignore */ }
    // Fallback: show a short-form "live".
    setTimeout(() => { if (node.textContent === "v—") render("live"); }, 1000);
  }).catch(() => render("offline"));
}

function bindBrand() {
  const btn = document.getElementById("brand-home");
  if (!btn) return;
  btn.addEventListener("click", () => state.handlers.onHome?.());
}

function bindAqExpand() {
  if (!el.aqCard) return;
  const toggle = () => {
    const open = el.aqCard.getAttribute("data-expanded") === "true";
    const next = !open;
    el.aqCard.setAttribute("data-expanded", next ? "true" : "false");
    el.aqCard.setAttribute("aria-expanded", next ? "true" : "false");
    el.aqBreakdown?.setAttribute("aria-hidden", next ? "false" : "true");
  };
  el.aqCard.addEventListener("click", toggle);
  el.aqCard.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
  });
}

function bindLegendToggles() {
  const card = document.getElementById("chart-card");
  if (!card) return;
  // Restore prior preference.
  for (const key of ["feels", "gust", "precip"]) {
    const off = localStorage.getItem(`aether:legend:${key}`) === "0";
    if (off) card.setAttribute(`data-hide-${key}`, "true");
  }
  const buttons = card.querySelectorAll(".legend-item[data-series]");
  buttons.forEach((btn) => {
    const key = btn.dataset.series;
    const off = card.getAttribute(`data-hide-${key}`) === "true";
    btn.setAttribute("aria-pressed", off ? "false" : "true");
    btn.addEventListener("click", () => {
      const isPressed = btn.getAttribute("aria-pressed") === "true";
      const nextPressed = !isPressed;
      btn.setAttribute("aria-pressed", nextPressed ? "true" : "false");
      if (nextPressed) card.removeAttribute(`data-hide-${key}`);
      else card.setAttribute(`data-hide-${key}`, "true");
      localStorage.setItem(`aether:legend:${key}`, nextPressed ? "1" : "0");
    });
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
