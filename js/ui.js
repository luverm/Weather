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
import { rainOutlook } from "./rain-outlook.js";
import { sunsetScore } from "./sunset-score.js";
import { weatherTags } from "./tags.js";
import { attireItems } from "./attire.js";

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
  aqDominant: $("#aq-dominant"),
  aqDirection: $("#aq-direction"),
  moonLit: $("#moon-lit"),
  moonName: $("#moon-name"),
  moonIllum: $("#moon-illum"),
  moonFullCount: $("#moon-full-count"),
  moonNewCount: $("#moon-new-count"),
  visCard: $("#visibility-card"),
  visValue: $("#vis-value"),
  visLabel: $("#vis-label"),
  visBarFill: $("#vis-bar-fill"),
  visCloud: $("#vis-cloud"),
  visCloudSparkLine: $("#vis-cloud-line"),
  visCloudSparkFill: $("#vis-cloud-fill"),
  sunRise: $("#sun-rise"),
  sunSet: $("#sun-set"),
  sunDaylight: $("#sun-daylight"),
  sunDaylightDelta: $("#sun-daylight-delta"),
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
  tempYesterday: $("#temp-yesterday"),
  uvLevel: $("#m-uv-level"),
  humidityComfort: $("#m-humidity-comfort"),
  dewScale: $("#dew-scale"),
  dewScaleMark: $("#dew-scale-mark"),
  uvScale: $("#uv-scale"),
  uvScaleMark: $("#uv-scale-mark"),
  windScale: $("#wind-scale"),
  windScaleMark: $("#wind-scale-mark"),
  windScaleGust: $("#wind-scale-gust"),
  pressureScale: $("#pressure-scale"),
  pressureScaleMark: $("#pressure-scale-mark"),
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
  dailyPrecipStrip: $("#daily-precip-strip"),
  dailyUvStrip: $("#daily-uv-strip"),
  settingsBtn: $("#settings-btn"),
  settingsMenu: $("#settings-menu"),
  settingReduceMotion: $("#setting-reduce-motion"),
  settingUnitF: $("#setting-unit-f"),
  setting12h: $("#setting-12h"),
  settingAudioLevel: $("#setting-audio-level"),
  settingAccent: $("#setting-accent"),
  settingClearPlaces: $("#setting-clear-places"),
  chartPopover: $("#chart-popover"),
  insightsCard: $("#insights-card"),
  insightsList: $("#insights-list"),
  activityCard: $("#activity-card"),
  activityList: $("#activity-list"),
  alertsStrip: $("#alerts-strip"),
  weatherTags: $("#weather-tags"),
  attireStrip: $("#attire-strip"),
  sunArcMarker: $("#sun-arc-marker"),
  sunArcPath: $("#sun-arc-path"),
  sunArcGoldenRise: $("#sun-arc-golden-rise"),
  sunArcGoldenSet: $("#sun-arc-golden-set"),
  sunGolden: $("#sun-golden"),
  sunGoldenLabel: $("#sun-golden-label"),
  sunGoldenDetail: $("#sun-golden-detail"),
  sunsetScoreCard: $("#sun-sunset-score"),
  sunsetScoreLabel: $("#sunset-score-label"),
  sunsetScoreDetail: $("#sunset-score-detail"),
  sunsetScoreValue: $("#sunset-score-value"),
  rainOutlookBtn: $("#rain-outlook"),
  rainOutlookHeadline: $("#rain-outlook-headline"),
  rainOutlookDetail: $("#rain-outlook-detail"),
  chartRange: $("#chart-range"),
  chartRangeHi: $("#chart-range-hi"),
  chartRangeLo: $("#chart-range-lo"),
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
    if (place.lat != null && place.lon != null) {
      el.placeSub.title = `${place.lat.toFixed(4)}, ${place.lon.toFixed(4)}`;
      el.placeName.title = `${place.name || ""}${sub ? " · " + sub : ""}`;
    }
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
    renderRainOutlook(weather);
    renderChartRange(weather);
    renderVisibility(weather);
    renderWeatherTags(weather);
    setFavicon(weather.condition, weather.isDay);
    setDocTitle(weather);
    startLocaltime(weather);
    if (state.chart) state.chart.setHours(weather.hourly);
    if (state.comfortStrip) state.comfortStrip.setHours(weather.hourly, { daily: weather.daily });
    if (el.narrative) el.narrative.textContent = narrative || "";
    if (weather.offline) {
      ui.showToast("Offline — showing sample weather");
      document.documentElement.setAttribute("data-offline", "true");
    } else {
      document.documentElement.removeAttribute("data-offline");
    }
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
  if (w.windSpeed != null) animateNumber(el.metricWind, w.windSpeed, (v) => `${Math.round(v)}`);
  else el.metricWind.textContent = "—";
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
  if (el.windScale && el.windScaleMark) {
    if (w.windSpeed == null) {
      el.windScale.hidden = true;
    } else {
      el.windScale.hidden = false;
      // 0 … 100 km/h scale (covers up to strong gale).
      const ws = Math.max(0, Math.min(100, w.windSpeed));
      el.windScaleMark.style.left = `${(ws / 100 * 100).toFixed(1)}%`;
      el.windScale.title = "Wind scale (0 km/h calm → 100 km/h gale); dot is current gust";
      el.windScaleMark.title = `Wind ${Math.round(w.windSpeed)} km/h`;
      if (el.windScaleGust && w.windGusts != null && w.windGusts > w.windSpeed + 1) {
        const g = Math.max(0, Math.min(100, w.windGusts));
        el.windScaleGust.hidden = false;
        el.windScaleGust.style.left = `${(g / 100 * 100).toFixed(1)}%`;
        el.windScaleGust.title = `Gust ${Math.round(w.windGusts)} km/h`;
      } else if (el.windScaleGust) {
        el.windScaleGust.hidden = true;
      }
    }
  }
  if (w.humidity != null) animateNumber(el.metricHumidity, w.humidity, (v) => `${Math.round(v)}`);
  else el.metricHumidity.textContent = "—";
  el.metricHumiditySub.textContent = w.dewPoint != null
    ? `dew ${Math.round(convertTemp(w.dewPoint))}°`
    : "dew —";
  if (el.dewScale && el.dewScaleMark) {
    if (w.dewPoint == null) {
      el.dewScale.hidden = true;
    } else {
      el.dewScale.hidden = false;
      // Scale is 0..25 °C mapped left..right.
      const dp = Math.max(0, Math.min(25, w.dewPoint));
      el.dewScaleMark.style.left = `${(dp / 25 * 100).toFixed(1)}%`;
      // Tone the marker by comfort band.
      const tone = w.dewPoint < 10 ? "dry"
        : w.dewPoint < 15 ? "pleasant"
        : w.dewPoint < 18 ? "sticky"
        : w.dewPoint < 21 ? "humid"
        : "oppressive";
      el.dewScale.dataset.tone = tone;
      el.dewScale.title = "Dew-point comfort scale (0 °C dry → 25 °C oppressive)";
      el.dewScaleMark.title = `Dew ${Math.round(convertTemp(w.dewPoint))}° · ${tone}`;
    }
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
  if (w.pressure != null) animateNumber(el.metricPressure, w.pressure, (v) => `${Math.round(v)}`);
  else el.metricPressure.textContent = "—";
  el.metricPressureSub.textContent = w.visibility != null
    ? `visibility ${Math.round((w.visibility / 1000) * 10) / 10} km`
    : "visibility —";
  if (el.pressureScale && el.pressureScaleMark) {
    if (w.pressure == null) {
      el.pressureScale.hidden = true;
    } else {
      el.pressureScale.hidden = false;
      // Scale: 970..1040 hPa (typical sea-level range). Clamp outside.
      const p = Math.max(970, Math.min(1040, w.pressure));
      const frac = (p - 970) / 70;
      el.pressureScaleMark.style.left = `${(frac * 100).toFixed(1)}%`;
      el.pressureScale.title = "Pressure scale (970 low → 1040 high); grey tick at the 1013 standard";
      el.pressureScaleMark.title = `${Math.round(w.pressure)} hPa`;
    }
  }
  if (w.uv != null) animateNumber(el.metricUV, w.uv, (v) => `${Math.round(v)}`);
  else el.metricUV.textContent = "—";
  if (el.uvLevel) {
    const lvl = uvLevel(w.uv);
    if (lvl) {
      // Look at next ~3 hourly UV values to show rising / falling glyph.
      const fut = (w.hourly || []).slice(0, 3).map((h) => h.uv).filter((v) => v != null);
      const dirGlyph = fut.length && w.uv != null
        ? (Math.max(...fut) > w.uv + 0.5 ? " ↗"
          : Math.min(...fut) < w.uv - 0.5 ? " ↘"
          : "")
        : "";
      el.uvLevel.className = `trend ${lvl.cls}`;
      el.uvLevel.textContent = `${lvl.label}${dirGlyph}`;
    } else {
      el.uvLevel.textContent = "";
    }
  }
  const burnMin = uvBurnMinutes(w.uv);
  const peakStr = w.uvPeak?.time
    ? `peak ${Math.round(w.uvPeak.value)} at ${fmtTime(w.uvPeak.time)}`
    : "peak —";
  el.metricUVSub.textContent = burnMin ? `${peakStr} · burn ~${burnMin}m` : peakStr;
  if (el.uvScale && el.uvScaleMark) {
    if (w.uv == null) {
      el.uvScale.hidden = true;
    } else {
      el.uvScale.hidden = false;
      const u = Math.max(0, Math.min(12, w.uv));
      el.uvScaleMark.style.left = `${(u / 12 * 100).toFixed(1)}%`;
      el.uvScale.title = "UV index scale (0 low → 12 extreme)";
      el.uvScaleMark.title = `UV ${Math.round(w.uv)}`;
    }
  }
  renderPressureSparkline(w);
}

// Rough minutes-to-sunburn for Fitzpatrick type III skin (medium): the UV
// index roughly maps to a 200 min / UV time to minimal erythema. Below UV 3
// we skip the estimate so we don't nag — the ice-cream-cone level of sun
// isn't going to burn anyone in meaningful time.
function uvBurnMinutes(uv) {
  if (uv == null || uv < 3) return null;
  const min = Math.round(200 / uv);
  // Cap display at 90 min — above that it's effectively "not soon".
  if (min > 90) return null;
  return min;
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
  // Pressure spark now spans the last 12 hours into the next 12, so the
  // trend reads as a 24-hour band around "now".
  const pastP = (w.pastHourly || []).slice(-12).map((h) => h.pressure);
  const fwdP = (w.hourly || []).slice(0, 12).map((h) => h.pressure);
  drawSparkline(
    el.pressureSparkLine, el.pressureSparkFill,
    [...pastP, ...fwdP].filter((v) => v != null),
    { minSpan: 1.5 }
  );
  const pastH = (w.pastHourly || []).slice(-12).map((h) => h.humidity);
  const fwdH = (w.hourly || []).slice(0, 12).map((h) => h.humidity);
  drawSparkline(
    el.humiditySparkLine, el.humiditySparkFill,
    [...pastH, ...fwdH].filter((v) => v != null),
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
  // Alert state when AQI crosses "Unhealthy" (>150) — ring + value pulse to
  // make the card unignorable without the user having to read the label.
  const alert = aq.aqi != null && aq.aqi > 150;
  el.aqCard.classList.toggle("aq-alert", alert);
  // Circumference of r=20 is ~125.66 — we use 126 in the SVG.
  const frac = Math.max(0, Math.min(1, (aq.aqi ?? 0) / 200));
  el.aqArc.setAttribute("stroke-dashoffset", String(126 * (1 - frac)));
  el.aqDetail.textContent =
    `PM2.5 ${aq.pm25 != null ? Math.round(aq.pm25) : "—"} · O₃ ${aq.o3 != null ? Math.round(aq.o3) : "—"}`;
  renderAqDirection(aq);
  renderAqDominant(aq);
  renderAqTrend(aq);
}

// From the hourly AQI trend, infer whether the next ~6 h are heading up
// (worsening) or down (improving). Threshold keeps noise out of the chip.
function renderAqDirection(aq) {
  if (!el.aqDirection) return;
  const trend = aq?.trend || [];
  if (trend.length < 4 || aq.aqi == null) {
    el.aqDirection.textContent = "";
    return;
  }
  const horizon = trend.slice(0, Math.min(6, trend.length));
  const future = horizon[horizon.length - 1].aqi;
  const delta = future - aq.aqi;
  if (Math.abs(delta) < 8) {
    el.aqDirection.className = "trend flat";
    el.aqDirection.textContent = "Steady";
    return;
  }
  if (delta > 0) {
    el.aqDirection.className = "trend up";
    el.aqDirection.textContent = `Worsening +${Math.round(delta)}`;
  } else {
    el.aqDirection.className = "trend down";
    el.aqDirection.textContent = `Improving ${Math.round(delta)}`;
  }
}

function renderAqDominant(aq) {
  if (!el.aqDominant) return;
  // Only highlight a dominant pollutant when air quality is Moderate+ (AQI>50).
  if (aq?.aqi == null || aq.aqi <= 50) {
    el.aqDominant.hidden = true;
    el.aqDominant.textContent = "";
    return;
  }
  const dom = dominantPollutant(aq);
  if (!dom) {
    el.aqDominant.hidden = true;
    el.aqDominant.textContent = "";
    return;
  }
  el.aqDominant.hidden = false;
  el.aqDominant.textContent = `${dom.name} driving today · ${dom.value}${dom.unit}`;
}

// Normalize each measurement to a 0..1 "pressure" against the WHO 2021 daily
// air-quality guideline, then pick the biggest. Returns null if nothing is
// above its guideline value.
function dominantPollutant(aq) {
  const candidates = [
    { key: "pm25", name: "PM2.5", value: aq.pm25, guide: 15,  unit: " µg/m³" },
    { key: "pm10", name: "PM10",  value: aq.pm10, guide: 45,  unit: " µg/m³" },
    { key: "o3",   name: "O₃",    value: aq.o3,   guide: 100, unit: " µg/m³" },
    { key: "no2",  name: "NO₂",   value: aq.no2,  guide: 25,  unit: " µg/m³" },
  ].filter((c) => c.value != null);
  if (!candidates.length) return null;
  let best = null;
  for (const c of candidates) {
    const pressure = c.value / c.guide;
    if (!best || pressure > best.pressure) {
      best = { ...c, pressure, value: Math.round(c.value) };
    }
  }
  // If even the "worst" is well under the guideline, don't highlight anything.
  if (!best || best.pressure < 0.8) return null;
  return best;
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
  if (el.moonFullCount) el.moonFullCount.textContent = `Full ${fmtDays(moon.daysToFull)}`;
  if (el.moonNewCount)  el.moonNewCount.textContent  = `New ${fmtDays(moon.daysToNew)}`;
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

function fmtDays(d) {
  if (d == null || !isFinite(d)) return "—";
  if (d < 1) {
    const hrs = Math.max(0, Math.round(d * 24));
    return hrs <= 1 ? "soon" : `in ${hrs}h`;
  }
  const days = Math.round(d);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days}d`;
}

function fmtTime(ts) {
  if (!ts) return "—";
  const tz = state.weather?.timezone;
  const h12 = state.use12h;
  if (tz && tz !== "auto") {
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: !!h12,
      }).format(new Date(ts));
    } catch { /* fall through */ }
  }
  const d = new Date(ts);
  if (h12) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true });
  }
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function renderSun(w) {
  el.sunRise.textContent = fmtTime(w.sunrise);
  el.sunSet.textContent = fmtTime(w.sunset);
  let todayMins = null;
  if (w.sunrise && w.sunset) {
    todayMins = Math.round((w.sunset - w.sunrise) / 60_000);
    const hh = Math.floor(todayMins / 60);
    const mm = todayMins % 60;
    el.sunDaylight.textContent = `${hh}h ${mm}m`;
  } else el.sunDaylight.textContent = "—";
  if (el.sunDaylightDelta) {
    const y = w.yesterday;
    if (todayMins != null && y?.sunrise && y?.sunset) {
      const ymins = Math.round((y.sunset - y.sunrise) / 60_000);
      const delta = todayMins - ymins;
      if (Math.abs(delta) >= 1) {
        el.sunDaylightDelta.className = `sun-delta ${delta > 0 ? "up" : "down"}`;
        const sign = delta > 0 ? "+" : "−";
        el.sunDaylightDelta.textContent = `${sign}${Math.abs(delta)}m`;
      } else {
        el.sunDaylightDelta.textContent = "";
      }
    } else {
      el.sunDaylightDelta.textContent = "";
    }
  }
  scheduleSunCountdown(w);
  scheduleSunArc(w);
  renderGoldenHour(w);
  renderSunsetScore(w);
}

function renderSunsetScore(w) {
  if (!el.sunsetScoreCard) return;
  // Only surface the score when sunset is still ahead (and within ~24 h).
  if (!w?.sunset || w.sunset < Date.now() || w.sunset - Date.now() > 24 * 3600_000) {
    el.sunsetScoreCard.hidden = true;
    return;
  }
  const res = sunsetScore(w);
  if (!res) {
    el.sunsetScoreCard.hidden = true;
    return;
  }
  el.sunsetScoreCard.hidden = false;
  el.sunsetScoreCard.dataset.tone =
    res.score >= 75 ? "spectacular"
    : res.score >= 55 ? "vivid"
    : res.score >= 35 ? "moderate"
    : "muted";
  el.sunsetScoreLabel.textContent = `Sunset ${fmtTime(res.sunset)} · ${res.label}`;
  const bits = [];
  const f = res.factors;
  if (f.cloudCover != null) bits.push(`${Math.round(f.cloudCover)}% cloud`);
  if (f.humidity != null)   bits.push(`${Math.round(f.humidity)}% rh`);
  if (f.pm25 != null)       bits.push(`PM2.5 ${Math.round(f.pm25)}`);
  el.sunsetScoreDetail.textContent = bits.join(" · ") || "—";
  el.sunsetScoreValue.textContent = `${res.score}`;
  el.sunsetScoreCard.onclick = () => state.handlers.onHourClick?.(res.sunset);
}

// ---------- Golden & blue hour ----------
// Golden hour: the ~60 min after sunrise and the ~60 min before sunset, when
// light is warm and low. Blue hour: the ~30 min before sunrise and after
// sunset, when the sky is deep blue. For UI purposes we approximate using
// the civil-twilight-like window of ±1h around the horizon crossings.
function renderGoldenHour(w) {
  if (!el.sunGolden) return;
  const sr = w?.sunrise, ss = w?.sunset;
  if (!sr || !ss) { el.sunGolden.hidden = true; renderGoldenArcs(null, null); return; }
  const HOUR = 60 * 60_000;
  const now = Date.now();

  // Choose which window to feature: the next one that hasn't ended.
  const windows = [
    { label: "Blue hour",   start: sr - 30 * 60_000, end: sr, kind: "blue"   },
    { label: "Golden hour", start: sr,             end: sr + HOUR, kind: "golden-rise" },
    { label: "Golden hour", start: ss - HOUR,      end: ss,        kind: "golden-set"  },
    { label: "Blue hour",   start: ss,             end: ss + 30 * 60_000, kind: "blue" },
  ];
  // Also compute tomorrow's blue hour (dawn) using the next day's sunrise, if
  // available, so the chip stays useful overnight.
  const tomorrowRise = w?.daily?.[1]?.sunrise;
  if (tomorrowRise) {
    windows.push({ label: "Blue hour", start: tomorrowRise - 30 * 60_000, end: tomorrowRise, kind: "blue" });
    windows.push({ label: "Golden hour", start: tomorrowRise, end: tomorrowRise + HOUR, kind: "golden-rise" });
  }
  const upcoming = windows.find((wn) => wn.end > now);
  if (!upcoming) {
    el.sunGolden.hidden = true;
    renderGoldenArcs(null, null);
    return;
  }
  el.sunGolden.hidden = false;
  el.sunGoldenLabel.textContent = upcoming.label;
  const tLabel = `${fmtTime(upcoming.start)} – ${fmtTime(upcoming.end)}`;
  const inMs = upcoming.start - now;
  const live = inMs <= 0 && upcoming.end > now;
  let countdown = "";
  if (inMs > 0) {
    const mins = Math.round(inMs / 60_000);
    countdown = mins >= 60 ? ` · in ${Math.floor(mins / 60)}h ${mins % 60}m`
                           : ` · in ${mins}m`;
  } else if (live) {
    const remain = Math.max(1, Math.round((upcoming.end - now) / 60_000));
    countdown = ` · now, ${remain}m left`;
  }
  el.sunGoldenDetail.textContent = `${tLabel}${countdown}`;
  el.sunGolden.classList.toggle("sun-golden-live", live);
  el.sunGolden.onclick = () => {
    const ts = live ? upcoming.start : upcoming.start;
    state.handlers.onHourClick?.(ts);
  };
  renderGoldenArcs(sr, ss);
}

// Draw two short arc segments onto the sun arc for the sunrise/sunset golden
// windows. The sun arc path is: M10 74 Q100 -26 190 74 (0..1 parametrized).
function renderGoldenArcs(sunrise, sunset) {
  if (!el.sunArcGoldenRise || !el.sunArcGoldenSet) return;
  if (!sunrise || !sunset) {
    el.sunArcGoldenRise.setAttribute("d", "");
    el.sunArcGoldenSet.setAttribute("d", "");
    return;
  }
  // 60 min of a daylight span. Golden hour is roughly the first/last hour.
  const span = sunset - sunrise;
  if (span <= 0) {
    el.sunArcGoldenRise.setAttribute("d", "");
    el.sunArcGoldenSet.setAttribute("d", "");
    return;
  }
  const windowFrac = Math.min(0.3, (60 * 60_000) / span);
  // Quadratic Bezier point: P(t) = (1-t)² P0 + 2(1-t)t P1 + t² P2
  const pt = (t) => {
    const x = (1 - t) ** 2 * 10 + 2 * (1 - t) * t * 100 + t ** 2 * 190;
    const y = (1 - t) ** 2 * 74 + 2 * (1 - t) * t * -26 + t ** 2 * 74;
    return [x, y];
  };
  // Build each sub-arc as a sequence of short line segments — simpler and
  // visually indistinguishable from a true sub-Bezier at this size.
  const arcPath = (t0, t1) => {
    const steps = 10;
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const t = t0 + (t1 - t0) * (i / steps);
      const [x, y] = pt(t);
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1) + " ";
    }
    return d.trim();
  };
  el.sunArcGoldenRise.setAttribute("d", arcPath(0, windowFrac));
  el.sunArcGoldenSet.setAttribute("d", arcPath(1 - windowFrac, 1));
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
    } else {
      const mins = Math.max(0, Math.round((nextTs - now) / 60_000));
      const label = mins >= 60
        ? `${Math.floor(mins / 60)}h ${mins % 60}m`
        : `${mins}m`;
      if (el.sunNextLabel) el.sunNextLabel.textContent = `${nextKind} in`;
      if (el.sunCountdown) el.sunCountdown.textContent = label;
    }
    // Keep golden-hour chip's countdown fresh too.
    renderGoldenHour(w);
  };
  update();
  state.sunTimer = setInterval(update, 30_000);
}

function renderAdvice(w) {
  const text = advise(w);
  if (el.advice && el.adviceText) {
    if (text) {
      el.adviceText.textContent = text;
      el.advice.hidden = false;
    } else {
      el.advice.hidden = true;
    }
  }
  renderAttire(w);
}

function renderAttire(w) {
  if (!el.attireStrip) return;
  const items = attireItems(w);
  if (!items.length) {
    el.attireStrip.hidden = true;
    el.attireStrip.innerHTML = "";
    return;
  }
  el.attireStrip.hidden = false;
  el.attireStrip.innerHTML = items.map((it) => `
    <li class="attire-item" title="${escapeHtml(it.label)}">
      ${it.svg}
      <span class="attire-label">${escapeHtml(it.label)}</span>
    </li>
  `).join("");
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

function renderChartRange(w) {
  if (!el.chartRange || !el.chartRangeHi || !el.chartRangeLo) return;
  const hours = (w.hourly || []).slice(0, 24);
  const temps = hours.map((h) => h.temp).filter((v) => v != null);
  if (temps.length < 2) {
    el.chartRange.hidden = true;
    return;
  }
  const hi = Math.max(...temps);
  const lo = Math.min(...temps);
  if (hi - lo < 1) {
    el.chartRange.hidden = true;
    return;
  }
  el.chartRange.hidden = false;
  el.chartRangeHi.textContent = `${Math.round(convertTemp(hi))}°`;
  el.chartRangeLo.textContent = `${Math.round(convertTemp(lo))}°`;
}

function renderRainOutlook(w) {
  if (!el.rainOutlookBtn) return;
  const outlook = rainOutlook(w);
  if (!outlook) {
    el.rainOutlookBtn.hidden = true;
    return;
  }
  el.rainOutlookBtn.hidden = false;
  el.rainOutlookBtn.dataset.tone = outlook.tone;
  el.rainOutlookHeadline.textContent = outlook.headline;
  el.rainOutlookDetail.textContent = outlook.detail;
  el.rainOutlookBtn.onclick = () => {
    const ts = outlook.heaviest?.time;
    if (ts) state.handlers.onHourClick?.(ts);
  };
}

function renderWeatherTags(w) {
  if (!el.weatherTags) return;
  const tags = weatherTags(w);
  if (!tags.length) {
    el.weatherTags.hidden = true;
    el.weatherTags.innerHTML = "";
    return;
  }
  el.weatherTags.hidden = false;
  el.weatherTags.innerHTML = tags.map((t) => `
    <span class="w-tag" data-tone="${t.tone}">
      <span class="w-tag-emoji" aria-hidden="true">${t.emoji}</span>
      ${escapeHtml(t.label)}
    </span>
  `).join("");
}

function renderAlerts(w) {
  if (!el.alertsStrip) return;
  const alerts = buildAlerts(w);
  // Respect per-place dismissals so the user isn't nagged.
  const dismissed = getDismissedAlerts();
  const visible = alerts.filter((a) => !dismissed.has(a.id));
  // Toast the top danger-level alert on the first render for this place, so
  // a user who's away from the strip still gets a nudge.
  const topDanger = visible.find((a) => a.severity === "danger");
  if (topDanger && state._lastDangerPlace !== state.place?.id) {
    state._lastDangerPlace = state.place?.id;
    ui.showToast(`${topDanger.title}: ${topDanger.detail}`, 5200);
  }
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

function renderVisibility(w) {
  if (!el.visCard || !el.visValue || !el.visBarFill) return;
  const meters = w?.visibility;
  if (meters == null) {
    el.visCard.hidden = true;
    return;
  }
  el.visCard.hidden = false;
  const km = meters / 1000;
  // Display: fewer decimals as it gets clearer.
  const display = km < 1 ? km.toFixed(2) : km < 10 ? km.toFixed(1) : Math.round(km);
  el.visValue.textContent = display;
  const { label, tone } = visibilityLabel(km);
  el.visLabel.textContent = label;
  el.visCard.dataset.tone = tone;
  // Bar: non-linear scale so changes under 10 km are visible. Full bar = 40+ km.
  const frac = km >= 40 ? 1 : Math.pow(km / 40, 0.55);
  el.visBarFill.style.width = `${Math.max(2, frac * 100).toFixed(1)}%`;
  if (el.visCloud) {
    const cc = w?.cloudCover;
    if (cc != null) {
      el.visCloud.className = `trend ${cc >= 70 ? "down" : cc <= 30 ? "up" : "flat"}`;
      el.visCloud.textContent = `${Math.round(cc)}% cloud`;
    } else {
      el.visCloud.textContent = "";
    }
  }
  // Cloud cover sparkline: next ~12 hourly values.
  if (el.visCloudSparkLine && el.visCloudSparkFill) {
    const series = (w.hourly || []).map((h) => h.cloudCover).filter((v) => v != null).slice(0, 12);
    drawSparkline(
      el.visCloudSparkLine, el.visCloudSparkFill, series,
      { minSpan: 10, fixedMin: 0, fixedMax: 100 }
    );
  }
}

function visibilityLabel(km) {
  if (km < 1)   return { label: "Dense fog", tone: "poor" };
  if (km < 4)   return { label: "Hazy", tone: "fair" };
  if (km < 10)  return { label: "Moderate", tone: "fair" };
  if (km < 20)  return { label: "Clear", tone: "good" };
  if (km < 40)  return { label: "Very clear", tone: "good" };
  return { label: "Crystal clear", tone: "excellent" };
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
  // Each species as a labelled mini-bar. All three scale against the
  // highest value so the dominant species visibly dominates.
  const peak = Math.max(0.5, ...pollen.items.map((p) => p.value || 0));
  el.pollenItems.innerHTML = pollen.items.map((p) => {
    const pct = Math.max(6, Math.min(100, (p.value / peak) * 100));
    return `
      <span class="pollen-species">
        <span class="pollen-species-label">${escapeHtml(p.label)}</span>
        <span class="pollen-species-bar"><span style="width:${pct.toFixed(1)}%"></span></span>
        <span class="pollen-species-value">${p.value.toFixed(1)}</span>
      </span>
    `;
  }).join("");
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
      el.pressureTrend.title =
        direction === "rising"  ? `Rising ${delta >= 0 ? "+" : ""}${delta.toFixed(1)} hPa / 3 h — skies tend to clear`
        : direction === "falling" ? `Falling ${delta.toFixed(1)} hPa / 3 h — unsettled weather may be coming`
        : `Steady ${delta >= 0 ? "+" : ""}${delta.toFixed(1)} hPa / 3 h — barometer holding`;
    } else {
      el.pressureTrend.textContent = "";
      el.pressureTrend.removeAttribute("title");
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
  // Comparison with same hour yesterday.
  if (el.tempYesterday) {
    const same = findSameHourYesterday(w);
    const cur = w.temp;
    if (same != null && cur != null) {
      const deltaC = cur - same;
      const deltaDisplay = Math.round(state.unit === "F" ? deltaC * 9 / 5 : deltaC);
      if (Math.abs(deltaDisplay) < 1) {
        el.tempYesterday.className = "temp-yesterday flat";
        el.tempYesterday.textContent = "≈ yday";
      } else {
        el.tempYesterday.className = deltaDisplay > 0 ? "temp-yesterday up" : "temp-yesterday down";
        el.tempYesterday.textContent = `${deltaDisplay > 0 ? "▲" : "▼"} ${Math.abs(deltaDisplay)}° vs yday`;
      }
    } else {
      el.tempYesterday.className = "temp-yesterday";
      el.tempYesterday.textContent = "";
    }
  }
}

function findSameHourYesterday(w) {
  const past = w.pastHourly || [];
  if (!past.length) return null;
  const target = Date.now() - 24 * 3600_000;
  let best = null, bestDiff = Infinity;
  for (const h of past) {
    const diff = Math.abs(h.time - target);
    if (diff < bestDiff) { bestDiff = diff; best = h; }
  }
  // Allow a ±90 min tolerance so we don't match across the full day.
  if (!best || bestDiff > 90 * 60_000) return null;
  return best.temp;
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
    // Wind arrow: rotation is where wind is *going to*, i.e. flip the "from"
    // direction by 180° so an arrow visually points downwind.
    const windArrow = h.windDir != null
      ? `<span class="forecast-wind" title="${cardinal(h.windDir)} · ${Math.round(h.wind ?? 0)} km/h" style="transform: rotate(${(h.windDir + 180) % 360}deg)">↑</span>`
      : "";
    const feelsPart = h.feelsLike != null && Math.abs(h.feelsLike - h.temp) >= 1
      ? ` (feels ${Math.round(convertTemp(h.feelsLike))}°)`
      : "";
    const windPart = h.wind != null ? ` · wind ${Math.round(h.wind)} km/h` : "";
    const popPart = h.pop != null ? ` · ${h.pop}% precip` : "";
    item.title = `${fmtTime(h.time)} · ${capitalize(h.label || h.condition || "")} · ${Math.round(convertTemp(h.temp))}°${feelsPart}${popPart}${windPart}`;
    item.innerHTML = `
      <span class="forecast-time">${fmtTime(h.time)}</span>
      <span class="forecast-icon">${iconFor(h.condition)}</span>
      <span class="forecast-temp">${Math.round(convertTemp(h.temp))}°</span>
      ${windArrow}
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
    const dayName = i === 0 ? "Today"
      : i === 1 ? "Tomorrow"
      : dt.toLocaleDateString(undefined, {
          weekday: "short",
          ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
        });
    const dateStr = dt.toLocaleDateString(undefined, {
      month: "short", day: "numeric",
      ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
    });
    const day = `${dayName} <small class="daily-date">${dateStr}</small>`;
    const left = ((d.tempMin - gMin) / span) * 100;
    const width = ((d.tempMax - d.tempMin) / span) * 100;
    const item = document.createElement("div");
    item.className = "daily-item";
    item.dataset.ts = d.time;
    const gustLabel = (d.gustsMax && d.gustsMax >= 25)
      ? ` · gusts ${Math.round(d.gustsMax)} km/h`
      : "";
    const popLabel = d.pop >= 30 ? ` · ${d.pop}% rain` : "";
    const snowLabel = (d.snowfall && d.snowfall >= 1)
      ? ` · ${d.snowfall.toFixed(d.snowfall >= 10 ? 0 : 1)} cm snow`
      : "";
    const extra = (gustLabel || popLabel || snowLabel)
      ? `<span class="daily-gust">${popLabel}${snowLabel}${gustLabel}</span>`
      : "";
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
  renderDailyPrecipStrip(days);
  renderDailyUvStrip(days);
}

function renderDailyUvStrip(days) {
  if (!el.dailyUvStrip) return;
  const uvs = days.map((d) => (d.uvMax != null && isFinite(d.uvMax)) ? d.uvMax : null);
  const hasAny = uvs.some((v) => v != null && v >= 1);
  if (!hasAny) {
    el.dailyUvStrip.hidden = true;
    el.dailyUvStrip.innerHTML = "";
    return;
  }
  el.dailyUvStrip.hidden = false;
  el.dailyUvStrip.innerHTML = days.map((d, i) => {
    const uv = uvs[i];
    if (uv == null) return `<span class="strip-uv dim" title="UV —">—</span>`;
    const lvl = uvLevel(uv);
    const cls = lvl?.cls || "flat";
    return `<span class="strip-uv ${cls}" title="UV ${Math.round(uv)} · ${lvl?.label ?? ""}">${Math.round(uv)}</span>`;
  }).join("");
}

function renderDailyPrecipStrip(days) {
  if (!el.dailyPrecipStrip) return;
  const totals = days.map((d) => Math.max(0, d.precip ?? 0));
  const peak = Math.max(0.5, ...totals);
  const hasAny = totals.some((v) => v > 0.1);
  if (!hasAny) {
    el.dailyPrecipStrip.hidden = true;
    el.dailyPrecipStrip.innerHTML = "";
    return;
  }
  el.dailyPrecipStrip.hidden = false;
  el.dailyPrecipStrip.innerHTML = days.map((d, i) => {
    const v = totals[i];
    const h = v > 0 ? Math.max(3, (v / peak) * 24) : 2;
    const dim = v < 0.1 ? "dim" : "";
    const title = v > 0.1 ? `${v.toFixed(1)} mm` : "trace";
    return `<span class="strip-precip ${dim}" title="${title}"><span style="height:${h.toFixed(1)}px"></span></span>`;
  }).join("");
}

function renderDailySpark(days) {
  if (!el.dailyHi || !el.dailyLo || !el.dailySparkDots) return;
  const W = 600, H = 60, PAD = 10, TOP = 6, BOT = 6;
  const yday = state.weather?.yesterday;
  const hi = days.map((d) => d.tempMax).filter((v) => v != null);
  const lo = days.map((d) => d.tempMin).filter((v) => v != null);
  if (!hi.length || !lo.length) return;
  let tMin = Math.min(...lo);
  let tMax = Math.max(...hi);
  if (yday) {
    if (yday.tempMin != null) tMin = Math.min(tMin, yday.tempMin);
    if (yday.tempMax != null) tMax = Math.max(tMax, yday.tempMax);
  }
  const span = Math.max(4, tMax - tMin);
  const innerW = W - PAD * 2;
  const innerH = H - TOP - BOT;
  const x = (i) => PAD + (i / (days.length - 1)) * innerW;
  const y = (v) => TOP + innerH - ((v - tMin) / span) * innerH;
  const linePath = (arr) => arr.map((v, i) => (i === 0 ? "M" : "L") + x(i).toFixed(1) + "," + y(v).toFixed(1)).join(" ");
  el.dailyHi.setAttribute("d", linePath(days.map((d) => d.tempMax)));
  el.dailyLo.setAttribute("d", linePath(days.map((d) => d.tempMin)));
  // Dots at each day + per-day temp labels above/below. Also annotate the
  // week-high and week-low days with a small value label.
  el.dailySparkDots.innerHTML = "";
  const weekHiIdx = days.reduce((best, d, i) =>
    (d.tempMax != null && (best < 0 || d.tempMax > days[best].tempMax)) ? i : best, -1);
  const weekLoIdx = days.reduce((best, d, i) =>
    (d.tempMin != null && (best < 0 || d.tempMin < days[best].tempMin)) ? i : best, -1);
  const makeText = (cx, cy, text, cls) => {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", cx.toFixed(1));
    t.setAttribute("y", cy.toFixed(1));
    t.setAttribute("class", `spark-label ${cls}`);
    t.setAttribute("text-anchor", "middle");
    t.textContent = text;
    return t;
  };
  days.forEach((d, i) => {
    const addDot = (cy, cls, val) => {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", x(i).toFixed(1));
      c.setAttribute("cy", cy.toFixed(1));
      c.setAttribute("r", i === 0 ? "3.5" : "2.5");
      c.setAttribute("class", `${cls}${i === 0 ? " dot-today" : ""}`);
      c.setAttribute("tabindex", "0");
      c.setAttribute("role", "button");
      const label = i === 0 ? "today" : i === 1 ? "tomorrow"
        : new Date(d.time).toLocaleDateString(undefined, { weekday: "long" });
      c.setAttribute("aria-label", `${label} ${Math.round(convertTemp(val))}°`);
      c.style.cursor = "pointer";
      c.addEventListener("click", () => jumpToDailyItem(i, d));
      el.dailySparkDots.appendChild(c);
    };
    if (d.tempMax != null) addDot(y(d.tempMax), "dot-hi", d.tempMax);
    if (d.tempMin != null) addDot(y(d.tempMin), "dot-lo", d.tempMin);
    if (i === weekHiIdx && d.tempMax != null) {
      el.dailySparkDots.appendChild(
        makeText(x(i), y(d.tempMax) - 5, `${Math.round(convertTemp(d.tempMax))}°`, "spark-label-hi")
      );
    }
    if (i === weekLoIdx && d.tempMin != null) {
      el.dailySparkDots.appendChild(
        makeText(x(i), y(d.tempMin) + 11, `${Math.round(convertTemp(d.tempMin))}°`, "spark-label-lo")
      );
    }
  });
  // Light vertical rule under today, so the chart's left edge reads clearly.
  if (days[0]) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x(0).toFixed(1));
    line.setAttribute("x2", x(0).toFixed(1));
    line.setAttribute("y1", String(TOP));
    line.setAttribute("y2", String(TOP + innerH));
    line.setAttribute("class", "spark-today-rule");
    el.dailySparkDots.appendChild(line);
  }
  // Yesterday ghost dots at a position just left of x(0), so the past
  // bookends the week visually.
  if (yday && (yday.tempMin != null || yday.tempMax != null)) {
    const xGhost = Math.max(1, x(0) - 10);
    if (yday.tempMax != null) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", xGhost.toFixed(1));
      c.setAttribute("cy", y(yday.tempMax).toFixed(1));
      c.setAttribute("r", "2");
      c.setAttribute("class", "dot-hi dot-ghost");
      c.setAttribute("title", `Yesterday ${Math.round(convertTemp(yday.tempMax))}°`);
      el.dailySparkDots.appendChild(c);
    }
    if (yday.tempMin != null) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", xGhost.toFixed(1));
      c.setAttribute("cy", y(yday.tempMin).toFixed(1));
      c.setAttribute("r", "2");
      c.setAttribute("class", "dot-lo dot-ghost");
      c.setAttribute("title", `Yesterday ${Math.round(convertTemp(yday.tempMin))}°`);
      el.dailySparkDots.appendChild(c);
    }
  }
}

function jumpToDailyItem(i, d) {
  // For the first two days we can scrub; beyond that, open the expand card.
  const ts = d.sunrise && d.sunset
    ? Math.round((d.sunrise + d.sunset) / 2)
    : new Date(d.time).setHours(12, 0, 0, 0);
  if (i < 2 && Math.abs(ts - Date.now()) <= 23 * 3600_000) {
    state.handlers.onHourClick?.(ts);
    return;
  }
  const row = document.querySelector(`.daily-item[data-ts="${d.time}"]`);
  if (row) {
    if (row.dataset.expanded !== "true") row.click();
    row.scrollIntoView({ behavior: "smooth", block: "center" });
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
  const isSnow = first.code >= 71 && first.code <= 86;
  const kind = isSnow ? "Snow" : "Rain";
  el.nowcast.dataset.kind = isSnow ? "snow" : "rain";
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
    // Intensity tier: light → heavy, drives the bar's color.
    const tier = n.precip >= 3   ? "heavy"
               : n.precip >= 1   ? "moderate"
               : n.precip >= 0.3 ? "light"
               : "trace";
    bar.dataset.tier = tier;
    const mins = Math.round((n.time - Date.now()) / 60_000);
    bar.title = `+${Math.max(0, mins)} min · ${n.precip.toFixed(1)} mm (${tier})`;
    bar.setAttribute("aria-label", bar.title);
    bar.addEventListener("click", () => state.handlers.onHourClick?.(n.time));
    el.nowcastBars.appendChild(bar);
  });
  el.nowcast.hidden = false;
}

function conditionEmoji(condition, isDay = true) {
  switch (condition) {
    case "clear":  return isDay ? "☀" : "🌙";
    case "clouds": return "☁";
    case "rain":   return "🌧";
    case "snow":   return "🌨";
    case "storm":  return "⛈";
    case "fog":    return "🌫";
    default:       return "🌤";
  }
}

// ---------- Dynamic document title ----------
function setDocTitle(w) {
  if (!w) return;
  const placeName = state.place?.name || "Aether";
  const t = Math.round(convertTemp(w.temp));
  const label = capitalize(w.label || "");
  document.title = `${t}° ${label} · ${placeName}`;
}

// ---------- Dynamic favicon ----------
function setFavicon(condition, isDay = true) {
  const link = document.getElementById("favicon");
  if (!link) return;
  const bg = "#0b1020"; // keep the dark badge background
  let fg;
  switch (condition) {
    case "clear":
      fg = isDay
        ? `<circle cx="32" cy="32" r="14" fill="#fff1c9"/><g stroke="#fff1c9" stroke-width="3" stroke-linecap="round"><path d="M32 8v6M32 50v6M8 32h6M50 32h6M14 14l4 4M46 46l4 4M14 50l4-4M46 18l4-4"/></g>`
        : `<circle cx="36" cy="28" r="14" fill="#fff1c9"/><circle cx="28" cy="28" r="14" fill="#0b1020"/>`;
      break;
    case "clouds":
      fg = `<path d="M20 42a9 9 0 010-18 11 11 0 0122-2 9 9 0 010 20H20z" fill="#c7d0e0"/>`;
      break;
    case "rain":
      fg = `<path d="M20 32a9 9 0 010-18 11 11 0 0122-2 9 9 0 010 20H20z" fill="#c7d0e0"/><g stroke="#9ad1ff" stroke-width="3" stroke-linecap="round"><path d="M22 42l-2 8M32 42l-2 8M42 42l-2 8"/></g>`;
      break;
    case "snow":
      fg = `<path d="M20 32a9 9 0 010-18 11 11 0 0122-2 9 9 0 010 20H20z" fill="#e5edff"/><g stroke="#ffffff" stroke-width="3" stroke-linecap="round"><path d="M24 44v6M32 42v8M40 44v6"/></g>`;
      break;
    case "storm":
      fg = `<path d="M20 30a9 9 0 010-18 11 11 0 0122-2 9 9 0 010 20H20z" fill="#8a8aa0"/><path d="M30 30l-6 12h8l-4 10" fill="none" stroke="#ffd36a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
      break;
    case "fog":
      fg = `<g stroke="#c7d0e0" stroke-width="4" stroke-linecap="round"><path d="M12 24h40M8 36h40M16 48h40"/></g>`;
      break;
    default:
      fg = `<circle cx="32" cy="32" r="14" fill="#fff1c9"/>`;
  }
  const raw =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="${bg}"/>${fg}</svg>`;
  link.href = `data:image/svg+xml,${encodeURIComponent(raw)}`;
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
    const icon = p.condition ? `<span class="chip-icon">${iconFor(p.condition)}</span>` : "";
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
  const flip = () => {
    state.unit = state.unit === "C" ? "F" : "C";
    localStorage.setItem("aether:unit", state.unit);
    el.unitBtn.textContent = `°${state.unit}`;
    if (state.weather) ui.setWeather(state.weather);
    if (el.settingUnitF) el.settingUnitF.checked = state.unit === "F";
    ui.showToast(`Showing °${state.unit}`, 1600);
  };
  el.unitBtn.addEventListener("click", flip);
  // Clicking the big number also flips units; it's the most tempting target.
  if (el.temp) {
    el.temp.style.cursor = "pointer";
    el.temp.setAttribute("role", "button");
    el.temp.setAttribute("tabindex", "0");
    el.temp.setAttribute("aria-label", "Toggle temperature units");
    el.temp.addEventListener("click", flip);
    el.temp.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); }
    });
  }
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
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
  // Safari/iOS doesn't fire beforeinstallprompt but can still "Add to Home
  // Screen" via the share sheet. Expose the button with a help toast.
  if (isIos && !standalone) {
    el.installBtn.hidden = false;
  }
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
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === "accepted") el.installBtn.hidden = true;
      deferredInstallPrompt = null;
      return;
    }
    if (isIos) {
      ui.showToast("Tap the share icon → Add to Home Screen", 5000);
    }
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

  el.setting12h?.addEventListener("change", () => {
    state.use12h = el.setting12h.checked;
    localStorage.setItem("aether:12h", state.use12h ? "1" : "0");
    if (state.weather) ui.setWeather(state.weather);
  });

  el.settingClearPlaces?.addEventListener("click", () => {
    if (!confirm("Clear all saved places?")) return;
    for (const p of places.all()) places.remove(p);
    renderPlaces();
    ui.showToast("Saved places cleared");
    close();
  });

  el.settingAudioLevel?.addEventListener("input", () => {
    const pct = parseInt(el.settingAudioLevel.value, 10);
    el.settingAudioLevel.style.setProperty("--range", `${pct}%`);
    state.handlers.onAudioLevel?.(pct / 100);
  });

  el.settingAccent?.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-accent]");
    if (!btn) return;
    applyAccent(btn.dataset.accent, { persist: true });
  });
}

const ACCENTS = {
  sky:   "#9ad1ff",
  teal:  "#78d0b2",
  amber: "#ffd36a",
  coral: "#ff9c7a",
  lilac: "#c7b4ff",
};
function applyAccent(name, { persist = false } = {}) {
  const color = ACCENTS[name];
  if (!color) return;
  document.documentElement.style.setProperty("--accent", color);
  document.documentElement.setAttribute("data-accent", name);
  if (persist) {
    try { localStorage.setItem("aether:accent", name); } catch { /* ignore */ }
  }
  if (el.settingAccent) {
    el.settingAccent.querySelectorAll("[data-accent]").forEach((b) =>
      b.classList.toggle("active", b.dataset.accent === name)
    );
  }
}

function applyStoredPreferences() {
  // Honor the OS-level reduce-motion preference unless the user has
  // explicitly opted into motion (stored value of "0").
  const stored = localStorage.getItem("aether:reduceMotion");
  const osPrefers = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const reduce = stored === "1" || (stored == null && osPrefers);
  if (reduce) {
    document.documentElement.setAttribute("data-reduce-motion", "true");
    if (el.settingReduceMotion) el.settingReduceMotion.checked = true;
    // Defer so app.js has time to install the handler.
    queueMicrotask(() => state.handlers.onReduceMotion?.(true));
  }
  if (el.settingUnitF) el.settingUnitF.checked = state.unit === "F";
  state.use12h = localStorage.getItem("aether:12h") === "1";
  if (el.setting12h) el.setting12h.checked = !!state.use12h;
  if (el.settingAudioLevel) {
    const level = parseFloat(localStorage.getItem("aether:audio-level"));
    const pct = Math.round((isFinite(level) ? level : 0.5) * 100);
    el.settingAudioLevel.value = String(pct);
    el.settingAudioLevel.style.setProperty("--range", `${pct}%`);
  }
  const accent = localStorage.getItem("aether:accent");
  if (accent && ACCENTS[accent]) applyAccent(accent);
  else applyAccent("sky");
}

// Exposed so app.js can query the current preference on boot.
ui.isReduceMotion = () => {
  const v = localStorage.getItem("aether:reduceMotion");
  if (v === "1") return true;
  if (v === "0") return false;
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
};

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
    try {
      const exact = new Date(state.weather.fetchedAt).toLocaleTimeString(undefined, {
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      });
      el.fetchedAgo.title = `Fetched at ${exact}`;
    } catch { /* ignore */ }
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
    const narrativeText = (el.narrative?.textContent || "").trim();
    const lines = [
      `Aether · ${placeName}`,
      `${emoji} ${capitalize(w.label)} · ${t(w.temp)} (feels ${t(w.feelsLike ?? w.temp)})`,
      narrativeText ? narrativeText : null,
      today ? `📅 ${t(today.tempMin)} / ${t(today.tempMax)} · ${today.pop}% precip` : null,
      `💨 ${Math.round(w.windSpeed)} km/h${w.windDir != null ? ` ${cardinal(w.windDir)}` : ""}`,
      w.uv != null ? `☀ UV ${Math.round(w.uv)}` : null,
      w.airQuality?.aqi != null ? `🌬 AQI ${Math.round(w.airQuality.aqi)} (${w.airQuality.label})` : null,
      // The URL hash now encodes the place (Round 77) so the link opens
      // this exact spot — include it in whatever we share.
      location.hash ? `🔗 ${location.origin}${location.pathname}${location.hash}` : null,
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
