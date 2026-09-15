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

function guessDefaultClock() {
  try {
    // Sample the viewer's locale format; if it renders "AM/PM" default to 12h.
    const sample = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(new Date());
    return /am|pm/i.test(sample) ? "12h" : "24h";
  } catch {
    return "24h";
  }
}

const el = {
  temp: $("#temp-value"),
  unitBtn: $("#unit-toggle"),
  placeName: $("#place-name"),
  placeSub: $("#place-sub"),
  placeStar: $("#place-star"),
  placeNameText: $("#place-name-text"),
  placeLocaltime: $("#place-localtime"),
  conditionLabel: $("#condition-label"),
  conditionText: $("#condition-text"),
  conditionIcon: $("#condition-icon"),
  feelsLike: $("#feels-like"),
  feelsLikeText: $("#feels-like-text"),
  feelsLikeChip: $("#feels-like-chip"),
  nextHour: $("#next-hour"),
  narrative: $("#narrative"),
  dayRange: $("#day-range"),
  dayRangeMin: $("#day-range-min"),
  dayRangeMax: $("#day-range-max"),
  dayRangeMarker: $("#day-range-marker"),
  dayRangeSwing: $("#day-range-swing"),
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
  moonLit: $("#moon-lit"),
  moonName: $("#moon-name"),
  moonIllum: $("#moon-illum"),
  moonNext: $("#moon-next"),
  sunRise: $("#sun-rise"),
  sunSet: $("#sun-set"),
  sunDaylight: $("#sun-daylight"),
  sunDaylightDelta: $("#sun-daylight-delta"),
  sunCountdown: $("#sun-countdown"),
  sunNextLabel: $("#sun-next-label"),
  windNeedle: $("#wind-needle"),
  windCompassGust: $("#wind-compass-gust"),
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
  weekRain: $("#week-rain"),
  weekUv: $("#week-uv"),
  weeklyTrend: $("#weekly-trend"),
  shareBtn: $("#share-btn"),
  installBtn: $("#install-btn"),
  refreshBtn: $("#refresh-btn"),
  fetchedAgo: $("#fetched-ago"),
  dailyIconStrip: $("#daily-icon-strip"),
  settingsBtn: $("#settings-btn"),
  settingsMenu: $("#settings-menu"),
  settingReduceMotion: $("#setting-reduce-motion"),
  settingUnitF: $("#setting-unit-f"),
  setting24h: $("#setting-24h"),
  settingWindUnit: $("#setting-wind-unit"),
  settingPressureUnit: $("#setting-pressure-unit"),
  settingClearPlaces: $("#setting-clear-places"),
  chartPopover: $("#chart-popover"),
  insightsCard: $("#insights-card"),
  insightsList: $("#insights-list"),
  activityCard: $("#activity-card"),
  activityList: $("#activity-list"),
  alertsStrip: $("#alerts-strip"),
  sunArcMarker: $("#sun-arc-marker"),
  sunArcPath: $("#sun-arc-path"),
  sunArcUv: $("#sun-arc-uv"),
  sunArcUvDot: $("#sun-arc-uv-dot"),
  sunArcUvLabel: $("#sun-arc-uv-label"),
  goldenHour: $("#golden-hour"),
  goldenHourText: $("#golden-hour-text"),
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
  clock: localStorage.getItem("aether:clock") || (guessDefaultClock()),
  windUnit: localStorage.getItem("aether:windUnit") || "kmh",
  pressureUnit: localStorage.getItem("aether:pressureUnit") || "hpa",
  weather: null,
  place: null,
  sampledWeather: null, // the weather values at the current scrubber time
  handlers: {},
  chart: null,
  comfortStrip: null,
  sunTimer: null,
  sunArcTimer: null,
  localTimer: null,
  goldenTimer: null,
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
    bindPlaceStar();
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
      getClock: () => state.clock,
      getWindUnit: () => state.windUnit,
    });
    state.comfortStrip = new ComfortStrip({
      rootEl: el.comfortStrip,
      onCellClick: (ts) => state.handlers.onHourClick?.(ts),
      getUnit: () => state.unit,
      getClock: () => state.clock,
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
    // Preserve the star button when we own the wrapper markup.
    if (el.placeNameText) {
      el.placeNameText.textContent = place.name || "Unknown";
    } else {
      el.placeName.textContent = place.name || "Unknown";
    }
    const sub = [place.admin1, place.country].filter(Boolean).join(", ");
    el.placeSub.textContent = sub || "—";
    // Reset alert dismissals so a fresh location can re-surface them.
    try { sessionStorage.removeItem("aether:dismissed-alerts"); } catch { /* ignore */ }
    renderPlaces();
    renderPlaceStar();
  },
  setWeather(weather, { narrative } = {}) {
    state.weather = weather;
    state.sampledWeather = weather; // initially same as live
    // Restore the "place · country" sub after the loading placeholder.
    if (state.place && el.placeSub) {
      const sub = [state.place.admin1, state.place.country].filter(Boolean).join(", ");
      el.placeSub.textContent = sub || "";
    }
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

function convertWind(kmh) {
  if (kmh == null) return null;
  if (state.windUnit === "mph") return kmh * 0.621371;
  if (state.windUnit === "ms") return kmh / 3.6;
  return kmh;
}
function windUnitLabel() {
  if (state.windUnit === "mph") return "mph";
  if (state.windUnit === "ms") return "m/s";
  return "km/h";
}
function fmtWind(kmh, { withUnit = true } = {}) {
  if (kmh == null) return "—";
  const v = convertWind(kmh);
  return withUnit ? `${Math.round(v)} ${windUnitLabel()}` : String(Math.round(v));
}

function convertPressure(hPa) {
  if (hPa == null) return null;
  if (state.pressureUnit === "inhg") return hPa * 0.02953;
  if (state.pressureUnit === "mmhg") return hPa * 0.750062;
  return hPa;
}
function pressureUnitLabel() {
  if (state.pressureUnit === "inhg") return "inHg";
  if (state.pressureUnit === "mmhg") return "mmHg";
  return "hPa";
}
function fmtPressure(hPa) {
  if (hPa == null) return "—";
  const v = convertPressure(hPa);
  return state.pressureUnit === "inhg" ? v.toFixed(2) : String(Math.round(v));
}

function renderLiveValues(w, { animate = true } = {}) {
  const temp = convertTemp(w.temp);
  const feels = convertTemp(w.feelsLike ?? w.temp);
  if (animate) animateNumber(el.temp, temp, (v) => `${Math.round(v)}°`);
  else el.temp.textContent = `${Math.round(temp)}°`;
  if (el.conditionText) {
    el.conditionText.textContent = capitalize(w.label);
    if (el.conditionIcon) {
      el.conditionIcon.innerHTML = iconFor(w.condition);
      el.conditionIcon.dataset.condition = w.condition || "";
    }
  } else {
    el.conditionLabel.textContent = capitalize(w.label);
  }
  if (el.feelsLikeText) {
    el.feelsLikeText.textContent = `Feels like ${Math.round(feels)}°`;
  } else {
    el.feelsLike.textContent = `Feels like ${Math.round(feels)}°`;
  }
  renderFeelsLikeChip(w);
  renderNextHourChip(w);
  renderDayRange(w);
}

function renderNextHourChip(w) {
  const chip = el.nextHour;
  if (!chip) return;
  const now = Date.now();
  // Find the hour bucket ~60min in the future (skip the "current" bucket).
  const upcoming = (w.hourly || []).find((h) => h.time > now + 30 * 60_000);
  if (!upcoming || upcoming.temp == null) { chip.hidden = true; return; }
  const t = Math.round(convertTemp(upcoming.temp));
  const label = (upcoming.label || upcoming.condition || "").toLowerCase();
  const pop = upcoming.pop || 0;
  const rain = pop >= 40 ? ` · ${pop}% rain` : "";
  chip.textContent = `In an hour: ${t}° ${label}${rain}`;
  chip.hidden = false;
}

function renderFeelsLikeChip(w) {
  const chip = el.feelsLikeChip;
  if (!chip) return;
  const actual = w.temp;
  const feels = w.feelsLike;
  if (actual == null || feels == null) { chip.hidden = true; return; }
  const deltaC = feels - actual;
  // Convert to active display scale for magnitude.
  const deltaDisp = state.unit === "F" ? deltaC * 9 / 5 : deltaC;
  const absDisp = Math.round(Math.abs(deltaDisp));
  if (absDisp < 2) { chip.hidden = true; return; }
  // Choose descriptor. Wind chill if actual is cool AND feels colder; heat
  // index if actual is warm AND feels warmer. Otherwise just show delta.
  let label = null, tone = "neutral";
  if (deltaC <= -1.5 && actual <= 12) { label = "wind chill"; tone = "cold"; }
  else if (deltaC >= 1.5 && actual >= 24) { label = "heat index"; tone = "hot"; }
  else if (deltaC <= -1.5) { label = "cooler in the wind"; tone = "cold"; }
  else if (deltaC >= 1.5) { label = "hotter than the air"; tone = "hot"; }
  const sign = deltaDisp > 0 ? "+" : "−";
  chip.textContent = `${label} ${sign}${absDisp}°`;
  chip.dataset.tone = tone;
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
  // Swing label: show the size of today's temp spread on the marker tooltip
  // and expose it as a subtle visible pill when the swing is dramatic.
  const spread = hi - lo;
  const spreadDisp = Math.round(state.unit === "F" ? spread * 9 / 5 : spread);
  el.dayRangeMarker.title = `Now · today swings ${spreadDisp}°`;
  if (el.dayRangeSwing) {
    if (spread >= 10) {
      el.dayRangeSwing.textContent = `${spreadDisp}° swing`;
      el.dayRangeSwing.hidden = false;
    } else {
      el.dayRangeSwing.hidden = true;
    }
  }
}

function renderMetrics(w) {
  el.metricWind.textContent = w.windSpeed != null ? Math.round(convertWind(w.windSpeed)) : "—";
  const windUnitEl = document.querySelector('.metric-wind .metric-unit');
  if (windUnitEl) windUnitEl.textContent = windUnitLabel();
  const dir = w.windDir;
  const dirLabel = dir != null ? cardinal(dir) : null;
  const gustNow = w.windGusts;
  const peak = peakGust24h(w);
  // Only surface a "peak gust" line when peak is meaningfully above current
  // gusts (at least 20% higher and >= 5 km/h delta) and is >= 25 km/h.
  const showPeak = peak && peak.value >= 25
    && (gustNow == null || peak.value >= gustNow * 1.2 || peak.value - gustNow >= 5);
  const gustStr = fmtWind(gustNow);
  let sub;
  if (showPeak) {
    const peakStr = `${fmtWind(peak.value)} at ${fmtTime(peak.time)}`;
    sub = dirLabel
      ? `${dirLabel} · gust ${gustStr} · peak ${peakStr}`
      : `gust ${gustStr} · peak ${peakStr}`;
  } else {
    sub = dirLabel ? `${dirLabel} · gust ${gustStr}` : `gust ${gustStr}`;
  }
  el.metricWindSub.textContent = sub;
  if (el.windNeedle && dir != null) {
    // Wind direction is where wind comes FROM, so the needle points TO that direction.
    el.windNeedle.setAttribute("transform", `rotate(${dir})`);
    el.windNeedle.style.opacity = "1";
  } else if (el.windNeedle) {
    el.windNeedle.style.opacity = "0.3";
  }
  renderCompassGust(gustNow);
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
  el.metricPressure.textContent = fmtPressure(w.pressure);
  const pressureUnitEl = document.querySelector('.metric-pressure .metric-unit');
  if (pressureUnitEl) pressureUnitEl.textContent = pressureUnitLabel();
  el.metricPressureSub.textContent = pressureSubText(w);
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
  if (el.uvScaleMarker) {
    const uv = w.uv;
    if (uv == null) {
      el.uvScaleMarker.style.opacity = "0";
    } else {
      el.uvScaleMarker.style.opacity = "1";
      // Scale 0-12 across the bar; anything above clamps to right edge.
      const frac = Math.max(0, Math.min(1, uv / 12));
      el.uvScaleMarker.style.left = `${(frac * 100).toFixed(1)}%`;
    }
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
  const parts = [
    `PM2.5 ${aq.pm25 != null ? Math.round(aq.pm25) : "—"}`,
    `O₃ ${aq.o3 != null ? Math.round(aq.o3) : "—"}`,
  ];
  const trendArrow = aqTrendArrow(aq);
  if (trendArrow) parts.push(trendArrow);
  const advice = aqAdvice(aq.aqi);
  if (advice) parts.push(advice);
  el.aqDetail.textContent = parts.join(" · ");
  renderAqTrend(aq);
}

function aqTrendArrow(aq) {
  const pts = (aq?.trend || []).map((p) => p.aqi).filter((v) => v != null);
  if (pts.length < 3) return null;
  const first = pts[0];
  const last = pts[pts.length - 1];
  const delta = last - first;
  if (Math.abs(delta) < 8) return null;
  return delta > 0 ? "worsening ▲" : "improving ▼";
}

function aqAdvice(v) {
  if (v == null) return null;
  if (v <= 50) return "OK to exercise outside";
  if (v <= 100) return "sensitive groups: limit exertion";
  if (v <= 150) return "limit prolonged outdoor effort";
  if (v <= 200) return "avoid outdoor exercise";
  return "stay indoors when possible";
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
  if (el.moonNext) {
    const toFull = moon.daysToFull != null ? Math.round(moon.daysToFull) : null;
    const toNew = moon.daysToNew != null ? Math.round(moon.daysToNew) : null;
    // Prefer whichever milestone is closer — but a moon at ~full or ~new
    // gets a "tonight" style label instead of "in 0 days".
    const parts = [];
    if (toFull != null && toNew != null) {
      const nextLabel = toFull <= toNew
        ? (toFull === 0 ? "Full tonight" : `Full in ${toFull}d`)
        : (toNew === 0 ? "New tonight" : `New in ${toNew}d`);
      parts.push(nextLabel);
    }
    if (moon.ageDays != null) parts.push(`age ${Math.floor(moon.ageDays)}d`);
    el.moonNext.textContent = parts.join(" · ");
  }
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
  const h12 = state.clock === "12h";
  if (tz && tz !== "auto") {
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone: tz, hour: h12 ? "numeric" : "2-digit", minute: "2-digit", hour12: h12,
      }).format(new Date(ts));
    } catch { /* fall through */ }
  }
  const d = new Date(ts);
  if (h12) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
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
  renderDaylightDelta(w);
  renderSunArcUv(w);
  renderGoldenHour(w);
  scheduleSunCountdown(w);
  scheduleSunArc(w);
}

function renderGoldenHour(w) {
  if (!el.goldenHour || !el.goldenHourText) return;
  if (state.goldenTimer) { clearInterval(state.goldenTimer); state.goldenTimer = null; }
  if (!w?.sunrise || !w?.sunset) { el.goldenHour.hidden = true; return; }
  const tz = w.timezone;
  const fmt = (ts) => new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit",
    ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });
  const HOUR = 60 * 60_000;
  const morningStart = w.sunrise;
  const morningEnd = w.sunrise + HOUR;
  const eveningStart = w.sunset - HOUR;
  const eveningEnd = w.sunset;
  const update = () => {
    const now = Date.now();
    let text = null, tone = "future";
    if (now >= morningStart && now < morningEnd) {
      const remain = Math.max(1, Math.round((morningEnd - now) / 60_000));
      text = `Golden hour — ends in ${remain}m`;
      tone = "active";
    } else if (now >= eveningStart && now < eveningEnd) {
      const remain = Math.max(1, Math.round((eveningEnd - now) / 60_000));
      text = `Golden hour — ${remain}m to sunset`;
      tone = "active";
    } else if (now < morningStart) {
      text = `Golden hours: ${fmt(morningStart)}–${fmt(morningEnd)} · ${fmt(eveningStart)}–${fmt(eveningEnd)}`;
    } else if (now < eveningStart) {
      text = `Evening golden hour ${fmt(eveningStart)}–${fmt(eveningEnd)}`;
    } else {
      // After sunset — show tomorrow's morning golden hour if we have it.
      const tmrw = w.daily?.[1];
      if (tmrw?.sunrise) {
        text = `Tomorrow: golden hours ${fmt(tmrw.sunrise)}–${fmt(tmrw.sunrise + HOUR)}`;
      }
    }
    if (!text) { el.goldenHour.hidden = true; return; }
    el.goldenHourText.textContent = text;
    el.goldenHour.dataset.tone = tone;
    el.goldenHour.hidden = false;
  };
  update();
  state.goldenTimer = setInterval(update, 60_000);
}

function renderSunArcUv(w) {
  const g = el.sunArcUv;
  if (!g || !el.sunArcUvDot || !el.sunArcUvLabel) return;
  const peak = w?.uvPeak;
  if (!peak || peak.value == null || peak.value < 3 || !w.sunrise || !w.sunset) {
    g.setAttribute("hidden", "true");
    return;
  }
  const frac = Math.max(0, Math.min(1, (peak.time - w.sunrise) / (w.sunset - w.sunrise)));
  const t = frac;
  const x = (1 - t) ** 2 * 10 + 2 * (1 - t) * t * 100 + t ** 2 * 190;
  const y = (1 - t) ** 2 * 74 + 2 * (1 - t) * t * -26 + t ** 2 * 74;
  el.sunArcUvDot.setAttribute("cx", x.toFixed(1));
  el.sunArcUvDot.setAttribute("cy", y.toFixed(1));
  el.sunArcUvLabel.setAttribute("x", x.toFixed(1));
  el.sunArcUvLabel.setAttribute("y", (y - 6).toFixed(1));
  el.sunArcUvLabel.textContent = `UV ${Math.round(peak.value)}`;
  // Color by intensity tier.
  const level = peak.value >= 11 ? "extreme" : peak.value >= 8 ? "very-high" : peak.value >= 6 ? "high" : "moderate";
  g.setAttribute("data-level", level);
  g.removeAttribute("hidden");
}

function renderDaylightDelta(w) {
  const el2 = el.sunDaylightDelta;
  if (!el2) return;
  const daily = w?.daily || [];
  const today = daily[0], tmrw = daily[1];
  if (!today?.sunrise || !today?.sunset || !tmrw?.sunrise || !tmrw?.sunset) {
    el2.hidden = true;
    return;
  }
  const todayMs = today.sunset - today.sunrise;
  const tmrwMs = tmrw.sunset - tmrw.sunrise;
  const deltaSec = Math.round((tmrwMs - todayMs) / 1000);
  const absSec = Math.abs(deltaSec);
  const absMin = Math.floor(absSec / 60);
  const remSec = absSec % 60;
  const magnitude = absMin > 0
    ? `${absMin}m ${remSec.toString().padStart(2, "0")}s`
    : `${absSec}s`;
  if (absSec < 15) {
    el2.textContent = "≈ same tomorrow";
    el2.dataset.dir = "flat";
  } else if (deltaSec > 0) {
    el2.textContent = `+${magnitude} tomorrow`;
    el2.dataset.dir = "longer";
  } else {
    el2.textContent = `−${magnitude} tomorrow`;
    el2.dataset.dir = "shorter";
  }
  el2.hidden = false;
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
  const tzShift = timezoneShiftHours(tz);
  const shiftLabel = formatTimezoneShift(tzShift);
  const update = () => {
    try {
      const h12 = state.clock === "12h";
      const parts = new Intl.DateTimeFormat([], {
        timeZone: tz,
        hour: h12 ? "numeric" : "2-digit",
        minute: "2-digit",
        hour12: h12,
        weekday: "short", timeZoneName: "short",
      }).formatToParts(new Date());
      const day = parts.find((p) => p.type === "weekday")?.value ?? "";
      const hour = parts.find((p) => p.type === "hour")?.value ?? "";
      const minute = parts.find((p) => p.type === "minute")?.value ?? "";
      const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value ?? "";
      const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
      const shiftHtml = shiftLabel
        ? ` <span class="tz-shift" title="Local offset from your device">${escapeHtml(shiftLabel)}</span>`
        : "";
      const timeStr = `${escapeHtml(hour)}:${escapeHtml(minute)}${dayPeriod ? " " + escapeHtml(dayPeriod) : ""}`;
      el.placeLocaltime.innerHTML =
        `<span class="clock-dot" aria-hidden="true"></span>` +
        `${escapeHtml(day)} ${timeStr} <span style="color:var(--fg-dim)">${escapeHtml(tzName)}</span>${shiftHtml}`;
    } catch {
      el.placeLocaltime.textContent = "";
    }
  };
  update();
  state.localTimer = setInterval(update, 10_000);
}

function timezoneShiftHours(tz) {
  try {
    const now = new Date();
    // UTC offset of the target tz, in minutes east of UTC.
    const targetOffset = utcOffsetMinutes(now, tz);
    // UTC offset of the viewer's local tz.
    const localOffset = -now.getTimezoneOffset();
    const deltaMin = targetOffset - localOffset;
    // Snap to nearest quarter hour.
    return Math.round(deltaMin / 15) * 0.25;
  } catch {
    return 0;
  }
}

function utcOffsetMinutes(date, tz) {
  // Ask Intl for the wall clock in `tz`, treat those numbers as if they were
  // UTC, then diff against the true instant.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(date);
  const pick = (t) => parts.find((p) => p.type === t)?.value;
  const y = Number(pick("year"));
  const mo = Number(pick("month"));
  const d = Number(pick("day"));
  const h = Number(pick("hour")) % 24;
  const mi = Number(pick("minute"));
  const s = Number(pick("second"));
  const asUtcMs = Date.UTC(y, mo - 1, d, h, mi, s);
  return Math.round((asUtcMs - date.getTime()) / 60_000);
}

function formatTimezoneShift(hours) {
  if (Math.abs(hours) < 0.4) return null;
  const abs = Math.abs(hours);
  const whole = Math.floor(abs);
  const frac = Math.round((abs - whole) * 60);
  const label = frac ? `${whole}h ${frac}m` : `${whole}h`;
  return hours > 0 ? `${label} ahead` : `${label} behind`;
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

function renderCompassGust(gust) {
  const arc = el.windCompassGust;
  if (!arc) return;
  // Circumference of r=22 is ~138. Fill arc proportional to gust up to 80 km/h.
  const CIRC = 138;
  if (gust == null || gust <= 5) {
    arc.setAttribute("stroke-dasharray", `0 ${CIRC}`);
    arc.removeAttribute("data-level");
    return;
  }
  const frac = Math.min(1, gust / 80);
  const filled = frac * CIRC;
  arc.setAttribute("stroke-dasharray", `${filled} ${CIRC}`);
  const level = gust >= 60 ? "extreme"
    : gust >= 40 ? "high"
    : gust >= 25 ? "moderate"
    : "low";
  arc.setAttribute("data-level", level);
}

function peakGust24h(w) {
  const hrs = (w?.hourly || []).slice(0, 24);
  let best = null;
  for (const h of hrs) {
    const g = h.gusts ?? h.wind;
    if (g == null) continue;
    if (!best || g > best.value) best = { value: g, time: h.time };
  }
  return best;
}

function pressureSubText(w) {
  const visPart = w.visibility != null
    ? `vis ${Math.round((w.visibility / 1000) * 10) / 10} km`
    : null;
  const trend = w.pressureTrend;
  let interp = null;
  if (trend) {
    const { delta, direction } = trend;
    const absD = Math.abs(delta);
    if (direction === "rising" && absD >= 2) interp = "clearing";
    else if (direction === "rising") interp = "improving";
    else if (direction === "falling" && absD >= 3) interp = "storm risk";
    else if (direction === "falling" && absD >= 1.5) interp = "wetter later";
    else if (direction === "falling") interp = "unsettled";
    else interp = "settled";
  }
  return [visPart, interp].filter(Boolean).join(" · ") || "—";
}

function cardinal(deg) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const i = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return dirs[i];
}

function renderHourly(w) {
  el.forecastTrack.innerHTML = "";
  const hours = (w.hourly || []).slice(0, 24);
  const now = Date.now();
  // Find the hour bucket closest to now.
  let nowIdx = -1, bestDiff = Infinity;
  for (let i = 0; i < hours.length; i++) {
    const d = Math.abs(hours[i].time - now);
    if (d < bestDiff && d < 60 * 60_000) { bestDiff = d; nowIdx = i; }
  }
  // Look for isDay transitions to mark sunrise / sunset boundaries.
  const daynightBoundary = (i) => {
    if (i === 0) return null;
    const prev = hours[i - 1].isDay;
    const curr = hours[i].isDay;
    if (prev === curr) return null;
    return curr ? "sunrise" : "sunset";
  };
  hours.forEach((h, i) => {
    const item = document.createElement("div");
    item.className = "forecast-item";
    item.dataset.ts = h.time;
    if (i === nowIdx) item.dataset.now = "true";
    if (!h.isDay) item.dataset.night = "true";
    const boundary = daynightBoundary(i);
    if (boundary) item.dataset.boundary = boundary;
    const label = i === nowIdx ? "Now" : fmtTime(h.time);
    const boundaryGlyph = boundary === "sunrise" ? "☀" : boundary === "sunset" ? "☾" : "";
    const popLevel = h.precip >= 4 ? "heavy" : h.precip >= 1 ? "moderate" : "light";
    const popPct = Math.max(0, Math.min(100, h.pop || 0));
    const showBar = popPct >= 5;
    item.innerHTML = `
      ${boundary ? `<span class="forecast-boundary" title="${boundary}">${boundaryGlyph}</span>` : ""}
      <span class="forecast-time">${escapeHtml(label)}</span>
      <span class="forecast-icon" data-condition="${escapeHtml(h.condition || "")}">${iconFor(h.condition)}</span>
      <span class="forecast-temp">${Math.round(convertTemp(h.temp))}°</span>
      <span class="forecast-pop ${h.pop < 20 ? "dim" : ""}">${h.pop}%</span>
      <span class="forecast-pop-bar" aria-hidden="true">
        ${showBar ? `<span class="forecast-pop-fill" data-precip="${popLevel}" style="height:${popPct}%"></span>` : ""}
      </span>
    `;
    item.addEventListener("click", () => state.handlers.onHourClick?.(h.time));
    el.forecastTrack.appendChild(item);
  });
}

function highlightHour(index) {
  const items = el.forecastTrack.querySelectorAll(".forecast-item");
  items.forEach((it, i) => it.classList.toggle("active", i === index));
  // Keep the active hour scrolled into view when scrubbing beyond what's
  // currently visible. Guard against index out of range.
  const target = items[index];
  if (!target) return;
  const track = el.forecastTrack;
  const trackRect = track.getBoundingClientRect();
  const itemRect = target.getBoundingClientRect();
  const margin = 24;
  if (itemRect.right > trackRect.right - margin) {
    track.scrollBy({ left: itemRect.right - trackRect.right + margin + 20, behavior: "smooth" });
  } else if (itemRect.left < trackRect.left + margin) {
    track.scrollBy({ left: itemRect.left - trackRect.left - margin - 20, behavior: "smooth" });
  }
}

function renderDaily(w) {
  el.dailyTrack.innerHTML = "";
  const days = (w.daily || []).slice(0, 7);
  if (!days.length) return;
  renderDailySpark(days);
  renderDailyDelta(days);
  renderWeekRain(days);
  renderWeekUv(days);
  renderWeeklyTrend(days);
  // Global min/max for the range bar.
  let gMin = Infinity, gMax = -Infinity;
  let hottestI = 0, coldestI = 0;
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    if (d.tempMin < gMin) gMin = d.tempMin;
    if (d.tempMax > gMax) gMax = d.tempMax;
    if (d.tempMax != null && d.tempMax > (days[hottestI].tempMax ?? -Infinity)) hottestI = i;
    if (d.tempMin != null && d.tempMin < (days[coldestI].tempMin ?? Infinity)) coldestI = i;
  }
  const span = Math.max(1, gMax - gMin);
  // Only mark extremes when they're meaningfully different from siblings.
  const meaningfulExtreme = span >= 4;
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
      ? ` · gusts ${fmtWind(d.gustsMax)}`
      : "";
    const popLabel = d.pop >= 30 ? ` · ${d.pop}% rain` : "";
    const extra = gustLabel || popLabel ? `<span class="daily-gust">${popLabel}${gustLabel}</span>` : "";
    const uvBadge = uvBadgeHtml(d.uvMax);
    const dowTrend = dodTrendHtml(days, i);
    const extremeBadge = meaningfulExtreme && i === hottestI && hottestI !== coldestI
      ? `<span class="daily-extreme" data-kind="hot">warmest</span>`
      : meaningfulExtreme && i === coldestI && hottestI !== coldestI
        ? `<span class="daily-extreme" data-kind="cold">coldest</span>`
        : "";
    const rainDot = precipDotHtml(d.precip);
    item.innerHTML = `
      <span class="daily-day">${day}${extremeBadge}</span>
      <span class="daily-icon" data-condition="${escapeHtml(d.condition || "")}">${iconFor(d.condition)}${rainDot}</span>
      <div class="daily-range">
        <div class="daily-range-fill" style="left:${left}%;width:${Math.max(8, width)}%"></div>
      </div>
      <span class="daily-temp-min">${Math.round(convertTemp(d.tempMin))}°</span>
      <span class="daily-temp-max">${Math.round(convertTemp(d.tempMax))}°${dowTrend}</span>
      ${uvBadge}
      ${extra}
    `;
    item.addEventListener("click", () => toggleDailyExpand(item, d, w));
    el.dailyTrack.appendChild(item);
  });
  // Wire the icon strip AFTER the daily items exist so cross-highlight
  // handlers can find their targets.
  renderDailyIconStrip(days);
}

function dodTrendHtml(days, i) {
  if (i === 0) return "";
  const cur = days[i]?.tempMax;
  const prev = days[i - 1]?.tempMax;
  if (cur == null || prev == null) return "";
  const deltaC = cur - prev;
  const deltaDisp = state.unit === "F" ? deltaC * 9 / 5 : deltaC;
  const abs = Math.round(Math.abs(deltaDisp));
  if (abs < 1) return "";
  const dir = deltaC > 0 ? "up" : "down";
  const arrow = deltaC > 0 ? "▲" : "▼";
  return `<span class="daily-dod" data-dir="${dir}" title="vs prior day">${arrow}${abs}°</span>`;
}

function precipDotHtml(precip) {
  if (precip == null || precip < 0.5) return "";
  const level = precip >= 15 ? "wet" : precip >= 5 ? "moderate" : "light";
  const label = `${precip.toFixed(1)} mm expected`;
  return `<span class="daily-rain-dot" data-level="${level}" title="${label}"></span>`;
}

function uvBadgeHtml(uvMax) {
  if (uvMax == null || uvMax < 6) return "";
  let level = "high", label = "UV high";
  if (uvMax >= 11) { level = "extreme"; label = "UV extreme"; }
  else if (uvMax >= 8) { level = "very-high"; label = "UV very high"; }
  const uv = Math.round(uvMax);
  return `<span class="daily-uv" data-level="${level}" title="${label} — index ${uv}">UV ${uv}</span>`;
}

function renderDailyIconStrip(days) {
  if (!el.dailyIconStrip) return;
  const tz = state.weather?.timezone;
  const titleFor = (d, i) => {
    const dt = new Date(d.time);
    const dayName = i === 0 ? "Today" : dt.toLocaleDateString(undefined, {
      weekday: "long",
      ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
    });
    const label = d.label || d.condition || "";
    const range = (d.tempMin != null && d.tempMax != null)
      ? `${Math.round(convertTemp(d.tempMin))}° / ${Math.round(convertTemp(d.tempMax))}°`
      : null;
    return [dayName, label, range].filter(Boolean).join(" · ");
  };
  el.dailyIconStrip.innerHTML = days.map((d, i) =>
    `<span class="strip-day" data-day-index="${i}" data-condition="${escapeHtml(d.condition || "")}" title="${escapeHtml(titleFor(d, i))}">${iconFor(d.condition)}</span>`
  ).join("");
  // Cross-highlight the matching row in the day-by-day list on hover / focus.
  const items = el.dailyTrack?.querySelectorAll(".daily-item") || [];
  el.dailyIconStrip.querySelectorAll(".strip-day").forEach((chip) => {
    chip.tabIndex = 0;
    const idx = Number(chip.dataset.dayIndex);
    const target = items[idx];
    if (!target) return;
    const enter = () => {
      target.classList.add("cross-hover");
      chip.classList.add("cross-hover");
    };
    const leave = () => {
      target.classList.remove("cross-hover");
      chip.classList.remove("cross-hover");
    };
    chip.addEventListener("mouseenter", enter);
    chip.addEventListener("mouseleave", leave);
    chip.addEventListener("focus", enter);
    chip.addEventListener("blur", leave);
    chip.addEventListener("click", () => {
      target.scrollIntoView({ behavior: "smooth", block: "nearest" });
      target.click();
    });
  });
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

function renderWeeklyTrend(days) {
  const el2 = el.weeklyTrend;
  if (!el2) return;
  if (days.length < 3) { el2.textContent = ""; el2.hidden = true; return; }
  const highs = days.map((d) => d.tempMax).filter((v) => v != null);
  if (highs.length < 3) { el2.hidden = true; return; }
  // Peak day + coldest day inside the 7-day window.
  let peakI = 0, coldI = 0;
  for (let i = 1; i < highs.length; i++) {
    if (highs[i] > highs[peakI]) peakI = i;
    if (highs[i] < highs[coldI]) coldI = i;
  }
  const range = highs[peakI] - highs[coldI];
  const first = highs[0];
  const last = highs[highs.length - 1];
  const overall = last - first;
  const tz = state.weather?.timezone;
  const dayLabel = (i) => {
    const dt = new Date(days[i].time);
    return i === 0 ? "today" : dt.toLocaleDateString(undefined, {
      weekday: "short",
      ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
    });
  };
  let phrase = null;
  if (range < 3) {
    phrase = "Steady week — very little swing";
  } else if (peakI > 0 && peakI < highs.length - 1 && highs[peakI] - Math.min(first, last) >= 3) {
    phrase = `Peaks ${dayLabel(peakI)}, cooler ${overall <= 0 ? "again" : "into"} ${dayLabel(highs.length - 1)}`;
  } else if (overall >= 3) {
    phrase = `Warming trend toward ${dayLabel(highs.length - 1)}`;
  } else if (overall <= -3) {
    phrase = `Cooling into ${dayLabel(highs.length - 1)}`;
  } else if (coldI > 0 && coldI < highs.length - 1) {
    phrase = `Coolest ${dayLabel(coldI)}, recovering after`;
  }
  if (!phrase) { el2.hidden = true; return; }
  el2.textContent = phrase;
  el2.hidden = false;
}

function renderWeekUv(days) {
  const chip = el.weekUv;
  if (!chip) return;
  // Find the day (idx > 0 preferred to look "ahead") with the highest uvMax.
  let peakI = -1;
  for (let i = 0; i < days.length; i++) {
    if (days[i].uvMax == null) continue;
    if (peakI < 0 || days[i].uvMax > days[peakI].uvMax) peakI = i;
  }
  if (peakI < 0 || days[peakI].uvMax < 6) { chip.hidden = true; return; }
  const d = days[peakI];
  const tz = state.weather?.timezone;
  const dayLabel = peakI === 0 ? "today" : new Date(d.time).toLocaleDateString(undefined, {
    weekday: "short",
    ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });
  const level = d.uvMax >= 11 ? "extreme" : d.uvMax >= 8 ? "very-high" : "high";
  chip.textContent = `UV ${Math.round(d.uvMax)} ${dayLabel}`;
  chip.dataset.level = level;
  chip.hidden = false;
}

function renderWeekRain(days) {
  const wr = el.weekRain;
  if (!wr) return;
  const rainy = days.filter((d) => (d.precip ?? 0) >= 0.5);
  const total = days.reduce((s, d) => s + (d.precip ?? 0), 0);
  if (!rainy.length || total < 0.5) {
    wr.textContent = "Dry week ahead";
    wr.dataset.level = "dry";
    wr.hidden = false;
    return;
  }
  const noun = rainy.length === 1 ? "day" : "days";
  const totalTxt = total >= 10 ? `${Math.round(total)}mm` : `${total.toFixed(1)}mm`;
  wr.textContent = `${totalTxt} across ${rainy.length} ${noun}`;
  wr.dataset.level = total >= 20 ? "wet" : total >= 8 ? "moderate" : "light";
  wr.hidden = false;
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
  const existing = item.querySelector(".daily-expand-wrap");
  if (existing) {
    existing.remove();
    item.dataset.expanded = "false";
    return;
  }
  const wrap = document.createElement("div");
  wrap.className = "daily-expand-wrap";
  const dayStart = new Date(d.time);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = dayStart.getTime() + 24 * 3600_000;
  const hrs = (w.hourly || []).filter((h) => h.time >= dayStart.getTime() && h.time < dayEnd);
  wrap.appendChild(buildDailyExpandMeta(d, hrs, w));
  if (hrs.length) {
    const tMin = Math.min(...hrs.map((h) => h.temp));
    const tMax = Math.max(...hrs.map((h) => h.temp));
    const tSpan = Math.max(1, tMax - tMin);
    const box = document.createElement("div");
    box.className = "daily-expand";
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
    wrap.appendChild(box);
  }
  item.appendChild(wrap);
  item.dataset.expanded = "true";
}

function buildDailyExpandMeta(d, hrs, w) {
  const meta = document.createElement("div");
  meta.className = "daily-expand-meta";
  const tz = w?.timezone;
  const fmt = (ts) => ts
    ? new Date(ts).toLocaleTimeString(undefined, {
        hour: "2-digit", minute: "2-digit",
        ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
      })
    : "—";
  // Peak UV: use hourly UV within this day if we have it, otherwise fall back
  // to daily max value with no time.
  let peakUv = null;
  if (hrs?.length) {
    for (const h of hrs) {
      if (h.uv != null && (!peakUv || h.uv > peakUv.uv)) peakUv = { time: h.time, uv: h.uv };
    }
  }
  const uvNote = peakUv
    ? `UV peak ${Math.round(peakUv.uv)} · ${fmt(peakUv.time)}`
    : d.uvMax != null
      ? `UV max ${Math.round(d.uvMax)}`
      : null;
  const gustNote = d.gustsMax != null && d.gustsMax >= 15
    ? `Gusts up to ${fmtWind(d.gustsMax)}`
    : null;
  const parts = [
    d.sunrise ? `Rises ${fmt(d.sunrise)}` : null,
    d.sunset ? `Sets ${fmt(d.sunset)}` : null,
    uvNote,
    gustNote,
    d.precip != null ? `${d.precip.toFixed(1)} mm total` : null,
  ].filter(Boolean);
  meta.innerHTML = parts.map((p) => `<span>${escapeHtml(p)}</span>`).join("");
  return meta;
}

function renderNowcast(w) {
  const now = Date.now();
  const nowcast = (w.nowcast || []).filter((n) => n.time > now);
  // Path A — imminent precipitation within the 2-hour minutely nowcast.
  const first = nowcast.find((n) => n.precip > 0.1);
  if (first) {
    renderNowcastImminent(w, nowcast, first);
    return;
  }
  // Path B — look ahead through 24h hourly, then 7-day daily.
  renderNowcastOutlook(w);
}

function renderNowcastImminent(w, nowcast, first) {
  const now = Date.now();
  const inMin = Math.max(0, Math.round((first.time - now) / 60_000));
  const kind = first.code >= 71 && first.code <= 86 ? "Snow" : "Rain";
  el.nowcast.dataset.mode = "imminent";
  el.nowcastHeadline.textContent = inMin <= 5
    ? `${kind} now`
    : `${kind} in ${inMin} minute${inMin === 1 ? "" : "s"}`;
  const totalMm = nowcast.reduce((s, n) => s + (n.precip || 0), 0);
  // When it's already raining, look ahead through the 15-min buckets +
  // hourly forecast for the first dry stretch and surface that instead of
  // the plain 2-hour total.
  if (inMin <= 5) {
    const endSuffix = predictClearingSuffix(w, nowcast);
    el.nowcastSub.textContent = endSuffix
      ? `${totalMm.toFixed(1)} mm ahead · ${endSuffix}`
      : `${totalMm.toFixed(1)} mm expected in the next 2 hours`;
  } else {
    el.nowcastSub.textContent = `${totalMm.toFixed(1)} mm expected in the next 2 hours`;
  }
  el.nowcastBars.hidden = false;
  el.nowcastBars.innerHTML = "";
  const slice = nowcast.slice(0, 8);
  const maxP = Math.max(0.5, ...slice.map((n) => n.precip || 0));
  slice.forEach((n) => {
    const bar = document.createElement("button");
    bar.type = "button";
    bar.className = "nowcast-bar";
    bar.style.height = `${Math.max(2, (n.precip / maxP) * 28)}px`;
    const mins = Math.round((n.time - now) / 60_000);
    bar.title = `+${Math.max(0, mins)} min · ${n.precip.toFixed(1)} mm`;
    bar.setAttribute("aria-label", bar.title);
    bar.addEventListener("click", () => state.handlers.onHourClick?.(n.time));
    el.nowcastBars.appendChild(bar);
  });
  el.nowcast.hidden = false;
}

function predictClearingSuffix(w, nowcast) {
  const now = Date.now();
  // First 15-min bucket after the current one with essentially no precip.
  const firstDryNowcast = nowcast.find((n) => n.time > now && (n.precip || 0) < 0.1);
  if (firstDryNowcast) {
    const mins = Math.max(1, Math.round((firstDryNowcast.time - now) / 60_000));
    if (mins <= 90) return `clears in ~${mins} min`;
  }
  // If the 2-hour nowcast is fully wet, fall back to the hourly forecast.
  const hourly = (w.hourly || []).filter((h) => h.time > now);
  const firstDryHour = hourly.find((h) => (h.precip ?? 0) < 0.2 && (h.pop ?? 0) < 30);
  if (firstDryHour) {
    const mins = Math.max(1, Math.round((firstDryHour.time - now) / 60_000));
    if (mins < 60) return `easing in ~${mins} min`;
    return `easing around ${fmtTime(firstDryHour.time)}`;
  }
  return "no clear break in the next 24h";
}

function renderNowcastOutlook(w) {
  const now = Date.now();
  const hourly = (w.hourly || []).filter((h) => h.time > now);
  // Threshold: >=0.2mm precipitation OR >=45% pop counts as "expected rain".
  const nextHour = hourly.find((h) => (h.precip ?? 0) >= 0.2 || (h.pop ?? 0) >= 45);
  const tz = w.timezone;
  const kind = (h) => {
    const c = h.condition || h.code;
    return c === "snow" ? "Snow" : "Rain";
  };
  if (nextHour) {
    const hoursOut = Math.round((nextHour.time - now) / 3600_000);
    const whenLabel = formatWhenHour(nextHour.time, tz, hoursOut);
    el.nowcast.dataset.mode = "outlook";
    el.nowcastHeadline.textContent = `Next ${kind(nextHour).toLowerCase()}: ${whenLabel}`;
    // Sum precip through the next 6 hours after the event as a magnitude cue.
    const window = hourly.filter((h) => h.time >= nextHour.time && h.time <= nextHour.time + 6 * 3600_000);
    const totalMm = window.reduce((s, h) => s + (h.precip || 0), 0);
    const peakPop = Math.max(...window.map((h) => h.pop || 0), 0);
    el.nowcastSub.textContent = totalMm > 0.1
      ? `${totalMm.toFixed(1)} mm · peak ${peakPop}% chance`
      : `${peakPop}% chance in that window`;
    // Bars: precip chance across next 12 hours starting now.
    el.nowcastBars.hidden = false;
    el.nowcastBars.innerHTML = "";
    const slice = hourly.slice(0, 12);
    const maxP = Math.max(20, ...slice.map((h) => h.pop || 0));
    slice.forEach((h) => {
      const bar = document.createElement("button");
      bar.type = "button";
      bar.className = "nowcast-bar";
      bar.style.height = `${Math.max(2, ((h.pop || 0) / maxP) * 28)}px`;
      const hh = Math.round((h.time - now) / 3600_000);
      bar.title = `+${Math.max(0, hh)}h · ${h.pop || 0}%`;
      bar.setAttribute("aria-label", bar.title);
      bar.addEventListener("click", () => state.handlers.onHourClick?.(h.time));
      el.nowcastBars.appendChild(bar);
    });
    el.nowcast.hidden = false;
    return;
  }
  // Path C — 7-day daily lookahead.
  const daily = (w.daily || []).slice(0, 7);
  const nextDay = daily.find((d, i) => i > 0 && ((d.precip ?? 0) >= 0.5 || (d.pop ?? 0) >= 50));
  if (nextDay) {
    const label = formatWhenDay(nextDay.time, tz);
    el.nowcast.dataset.mode = "outlook-week";
    el.nowcastHeadline.textContent = `Next rain: ${label}`;
    el.nowcastSub.textContent = `${(nextDay.precip || 0).toFixed(1)} mm · ${nextDay.pop || 0}% chance`;
    el.nowcastBars.hidden = true;
    el.nowcastBars.innerHTML = "";
    el.nowcast.hidden = false;
    return;
  }
  // Path D — dry through the forecast window.
  if (daily.length) {
    const last = daily[daily.length - 1];
    const label = formatWhenDay(last.time, tz);
    el.nowcast.dataset.mode = "dry";
    el.nowcastHeadline.textContent = `Dry through ${label}`;
    el.nowcastSub.textContent = "No meaningful precipitation in the 7-day outlook";
    el.nowcastBars.hidden = true;
    el.nowcastBars.innerHTML = "";
    el.nowcast.hidden = false;
    return;
  }
  el.nowcast.hidden = true;
}

function formatWhenHour(ts, tz, hoursOut) {
  const opts = { hour: "numeric", ...(tz && tz !== "auto" ? { timeZone: tz } : {}) };
  const timeStr = new Date(ts).toLocaleTimeString(undefined, opts);
  if (hoursOut < 1) return "within the hour";
  if (hoursOut === 1) return "in about an hour";
  if (hoursOut < 12) return `${timeStr} · in ${hoursOut}h`;
  const dayOpts = { weekday: "short", ...(tz && tz !== "auto" ? { timeZone: tz } : {}) };
  const day = new Date(ts).toLocaleDateString(undefined, dayOpts);
  return `${day} ${timeStr}`;
}

function formatWhenDay(ts, tz) {
  const target = new Date(ts);
  const midnightToday = new Date();
  midnightToday.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((ts - midnightToday.getTime()) / 86400_000);
  if (dayDiff === 0) return "today";
  if (dayDiff === 1) return "tomorrow";
  const opts = { weekday: "long", ...(tz && tz !== "auto" ? { timeZone: tz } : {}) };
  return target.toLocaleDateString(undefined, opts);
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
    const icon = p.condition
      ? `<span class="chip-icon" data-condition="${escapeHtml(p.condition)}">${iconFor(p.condition)}</span>`
      : "";
    return `
      <div class="place-chip ${active ? "active" : ""}" data-id="${p.id}">
        ${icon}
        <span class="chip-name">${escapeHtml(p.name)}</span>
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

const POPULAR_CITIES = [
  { name: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278, timezone: "Europe/London" },
  { name: "New York", country: "United States", lat: 40.7128, lon: -74.0060, timezone: "America/New_York" },
  { name: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503, timezone: "Asia/Tokyo" },
  { name: "Paris", country: "France", lat: 48.8566, lon: 2.3522, timezone: "Europe/Paris" },
  { name: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093, timezone: "Australia/Sydney" },
  { name: "Reykjavík", country: "Iceland", lat: 64.1466, lon: -21.9426, timezone: "Atlantic/Reykjavik" },
];

function showRecentsIfAny() {
  const recents = places.all().slice(0, 5);
  if (recents.length) {
    const itemsHtml = recents.map((r, i) => `
      <li role="option" data-index="${i}">
        <span>${escapeHtml(r.name)}${r.admin1 ? `, ${escapeHtml(r.admin1)}` : ""}</span>
        <span class="sub">${escapeHtml(r.country || "")}</span>
      </li>
    `).join("");
    el.searchResults.innerHTML = `<li class="recent-heading">Recent places</li>${itemsHtml}`;
    el.searchResults._items = recents;
    el.searchResults.hidden = false;
    return;
  }
  // First-run: offer a few popular cities to try.
  const itemsHtml = POPULAR_CITIES.map((r, i) => `
    <li role="option" data-index="${i}">
      <span>${escapeHtml(r.name)}</span>
      <span class="sub">${escapeHtml(r.country || "")}</span>
    </li>
  `).join("");
  el.searchResults.innerHTML = `<li class="recent-heading">Try a city</li>${itemsHtml}`;
  el.searchResults._items = POPULAR_CITIES;
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

  el.setting24h?.addEventListener("change", () => {
    state.clock = el.setting24h.checked ? "24h" : "12h";
    localStorage.setItem("aether:clock", state.clock);
    if (state.weather) ui.setWeather(state.weather);
  });

  el.settingWindUnit?.addEventListener("change", () => {
    const v = el.settingWindUnit.value;
    if (["kmh", "mph", "ms"].includes(v)) {
      state.windUnit = v;
      localStorage.setItem("aether:windUnit", v);
      if (state.weather) ui.setWeather(state.weather);
    }
  });

  el.settingPressureUnit?.addEventListener("change", () => {
    const v = el.settingPressureUnit.value;
    if (["hpa", "inhg", "mmhg"].includes(v)) {
      state.pressureUnit = v;
      localStorage.setItem("aether:pressureUnit", v);
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
  if (el.setting24h) el.setting24h.checked = state.clock === "24h";
  if (el.settingWindUnit) el.settingWindUnit.value = state.windUnit;
  if (el.settingPressureUnit) el.settingPressureUnit.value = state.pressureUnit;
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
      `Wind ${fmtWind(w.windSpeed)}${w.windDir != null ? ` ${cardinal(w.windDir)}` : ""}`,
      w.uv != null ? `UV ${Math.round(w.uv)}` : null,
      w.airQuality?.aqi != null ? `AQI ${Math.round(w.airQuality.aqi)} (${w.airQuality.label})` : null,
    ].filter(Boolean);
    // Build a shareable deep-link so the recipient opens the same place.
    let url = null;
    if (state.place?.lat != null && state.place?.lon != null) {
      const u = new URL(window.location.href);
      u.search = "";
      u.searchParams.set("lat", state.place.lat.toFixed(4));
      u.searchParams.set("lon", state.place.lon.toFixed(4));
      if (state.place.name) u.searchParams.set("name", state.place.name);
      if (state.place.country) u.searchParams.set("country", state.place.country);
      url = u.toString();
    }
    const text = lines.join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: `Aether — ${placeName}`, text, ...(url ? { url } : {}) });
      } else {
        const clipboard = url ? `${text}\n${url}` : text;
        await navigator.clipboard.writeText(clipboard);
        ui.showToast(url ? "Summary + link copied" : "Summary copied to clipboard");
      }
      el.shareBtn.classList.add("just-copied");
      setTimeout(() => el.shareBtn.classList.remove("just-copied"), 600);
    } catch (err) {
      if (err?.name !== "AbortError") ui.showToast("Share failed");
    }
  });
}

function renderPlaceStar() {
  const btn = el.placeStar;
  if (!btn || !state.place) { if (btn) btn.hidden = true; return; }
  const saved = places.isSaved(state.place);
  btn.hidden = false;
  btn.classList.toggle("is-saved", saved);
  btn.setAttribute("aria-pressed", saved ? "true" : "false");
  btn.title = saved ? "Remove from saved places" : "Save this location";
  btn.setAttribute("aria-label", btn.title);
}

function bindPlaceStar() {
  const btn = el.placeStar;
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (!state.place) return;
    if (places.isSaved(state.place)) {
      places.remove(state.place);
      ui.showToast(`Removed ${state.place.name}`);
    } else {
      places.add(state.place);
      ui.showToast(`Saved ${state.place.name}`);
    }
    renderPlaceStar();
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
