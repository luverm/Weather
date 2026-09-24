// UI layer. Renders every data module and handles non-scene interactions
// (search, unit toggle, saved places, tilt, audio toggle).

import { searchCities, clearCached } from "./weather-service.js";
import { places } from "./places.js";
import { HourlyChart } from "./hourly-chart.js";
import { ComfortStrip } from "./comfort-strip.js";
import { advise } from "./advice.js";
import { buildInsights } from "./insights.js";
import { findActivityWindows } from "./activity.js";
import { buildAlerts } from "./alerts.js";
import { weekendSnapshot } from "./weekend.js";
import { extractArrivals } from "./arrivals.js";

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
  dayRangeTimes: $("#day-range-times"),
  dayRangeMinAt: $("#day-range-min-at"),
  dayRangeMaxAt: $("#day-range-max-at"),
  metricWind: $("#m-wind"),
  metricWindSub: $("#m-wind-sub"),
  windBft: $("#m-wind-bft"),
  windGustBar: $("#m-wind-gust-bar"),
  windSustainedBar: $("#m-wind-sustained"),
  windGustBarSeg: $("#m-wind-gust"),
  windGustiness: $("#m-wind-gustiness"),
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
  sunArcPhoto: $("#sun-arc-photo"),
  photoHourChip: $("#photo-hour-chip"),
  photoHourDot: $("#photo-hour-dot"),
  photoHourHeadline: $("#photo-hour-headline"),
  photoHourDetail: $("#photo-hour-detail"),
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
  yesterdayChip: $("#yesterday-chip"),
  yesterdayArrow: $("#yesterday-arrow"),
  yesterdayHeadline: $("#yesterday-headline"),
  yesterdayDetail: $("#yesterday-detail"),
  rainWindowChip: $("#rain-window-chip"),
  rainWindowHeadline: $("#rain-window-headline"),
  rainWindowDetail: $("#rain-window-detail"),
  shareBtn: $("#share-btn"),
  installBtn: $("#install-btn"),
  refreshBtn: $("#refresh-btn"),
  savePlaceBtn: $("#save-place-btn"),
  fetchedAgo: $("#fetched-ago"),
  dailyIconStrip: $("#daily-icon-strip"),
  dayArrivals: $("#day-arrivals"),
  settingsBtn: $("#settings-btn"),
  settingsMenu: $("#settings-menu"),
  settingReduceMotion: $("#setting-reduce-motion"),
  settingUnitF: $("#setting-unit-f"),
  settingClearPlaces: $("#setting-clear-places"),
  settingClearCache: $("#setting-clear-cache"),
  chartPopover: $("#chart-popover"),
  insightsCard: $("#insights-card"),
  insightsList: $("#insights-list"),
  activityCard: $("#activity-card"),
  activityList: $("#activity-list"),
  alertsStrip: $("#alerts-strip"),
  sunArcMarker: $("#sun-arc-marker"),
  sunArcPath: $("#sun-arc-path"),
  skyPaletteTrack: $("#sky-palette-track"),
  skyPaletteNow: $("#sky-palette-now"),
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
  photoHourTimer: null,
  skyPaletteTimer: null,
  daylightTimer: null,
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
    bindPhotoHourChip();
    bindRainWindowChip();
    bindSavePlace();
    bindDayRangeJumps();
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
    refreshSavePlaceBtn();
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
    updateTabTitle(weather);
    if (state.chart) state.chart.setHours(weather.hourly);
    if (state.comfortStrip) state.comfortStrip.setHours(weather.hourly);
    if (el.narrative) el.narrative.textContent = narrative || "";
    if (weather.offline) ui.showToast("Offline — showing sample weather", { tone: "warn" });
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
  showToast(msg, opts = {}) {
    // Backwards compatible: a number in the second arg was the previous
    // "duration" contract before this became an options bag.
    const options = typeof opts === "number" ? { dur: opts } : opts;
    const { dur = 2600, tone = "" } = options;
    el.toast.textContent = msg;
    el.toast.dataset.tone = tone;
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
  const attrib = feelsLikeAttribution(w);
  // Re-flow feels-like line without destroying the tempTrend/attribution spans.
  el.feelsLike.innerHTML = "";
  if (el.tempTrend) el.feelsLike.appendChild(el.tempTrend);
  el.feelsLike.appendChild(document.createTextNode(`Feels like ${Math.round(feels)}°`));
  if (attrib) {
    const span = document.createElement("span");
    span.className = "feels-attrib";
    span.dataset.kind = attrib.kind;
    span.textContent = attrib.text;
    el.feelsLike.appendChild(document.createTextNode(" "));
    el.feelsLike.appendChild(span);
  }
  renderDayRange(w);
}

// Explain *why* apparent temp differs from actual. Falls back to null when
// the gap is < 1.5°C — not worth cluttering the hero.
function feelsLikeAttribution(w) {
  const actual = w.temp, apparent = w.feelsLike;
  if (actual == null || apparent == null) return null;
  const delta = apparent - actual;
  if (Math.abs(delta) < 1.5) return null;
  const wind = w.windSpeed ?? 0;
  const humidity = w.humidity ?? 50;
  // Cold + colder-feel = wind chill.
  if (delta < 0 && actual <= 10) {
    if (wind >= 8) return { kind: "chill", text: `· wind chill · ${Math.round(wind)} km/h wind` };
    return { kind: "chill", text: "· wind chill" };
  }
  // Hot + hotter-feel = humidity heat index.
  if (delta > 0 && actual >= 22) {
    if (humidity >= 60) return { kind: "muggy", text: `· humidity · ${Math.round(humidity)}% RH` };
    return { kind: "muggy", text: "· heat index" };
  }
  // Hot + cooler-feel = breeze relief.
  if (delta < 0 && actual >= 22 && wind >= 12) {
    return { kind: "breeze", text: `· breeze relief · ${Math.round(wind)} km/h wind` };
  }
  // Cool + warmer-feel = calm & humid.
  if (delta > 0) return { kind: "muggy", text: "· humidity" };
  return { kind: "chill", text: "· wind" };
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
  renderDayRangeTimes(w, lo, hi);
}

// Show the times at which today's high and low arrive, scanning the
// hourly forecast for the closest match in the next 24h.
function renderDayRangeTimes(w, lo, hi) {
  if (!el.dayRangeTimes || !el.dayRangeMinAt || !el.dayRangeMaxAt) return;
  const hours = (w.hourly || []).slice(0, 24);
  if (hours.length < 2) { el.dayRangeTimes.hidden = true; return; }
  let hiHr = null, loHr = null;
  for (const h of hours) {
    if (h.temp == null) continue;
    if (!hiHr || h.temp > hiHr.temp) hiHr = h;
    if (!loHr || h.temp < loHr.temp) loHr = h;
  }
  if (!hiHr || !loHr) { el.dayRangeTimes.hidden = true; return; }
  el.dayRangeTimes.hidden = false;
  el.dayRangeMinAt.textContent = `low ${fmtTime(loHr.time)}`;
  el.dayRangeMaxAt.textContent = `high ${fmtTime(hiHr.time)}`;
  // Cache timestamps so the click handler (bound once) can scrub.
  el.dayRangeMinAt.dataset.ts = String(loHr.time);
  el.dayRangeMaxAt.dataset.ts = String(hiHr.time);
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
  // Highlight the cardinal letter closest to the wind's origin direction.
  if (dir != null) {
    const nearest = ["N", "E", "S", "W"][Math.round(((dir % 360) + 360) % 360 / 90) % 4];
    document.querySelectorAll(".wind-compass [data-card]").forEach((t) => {
      t.classList.toggle("active", t.dataset.card === nearest);
    });
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
  renderWindGustBar(w);
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
    const qualifier =
      w.visibility < 1000 ? " · fog" :
      w.visibility < 5000 ? " · mist" :
      w.visibility < 10000 ? " · haze" : "";
    el.metricPressureSub.textContent = `visibility ${km} km${qualifier}`;
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
    // At high UV, add the burn-time window (the stretch of consecutive
    // hours where UV stays >= 6) so the "peak at 12:00" line answers
    // "when is it safe to be outside?" too.
    const burnWindow = uvBurnWindow(w.hourly);
    const suffix = burnWindow ? ` · ≥6 ${fmtTime(burnWindow.start)}–${fmtTime(burnWindow.end)}` : "";
    el.metricUVSub.textContent = `peak ${Math.round(w.uvPeak.value)} at ${fmtTime(w.uvPeak.time)}${suffix}`;
  } else {
    el.metricUVSub.textContent = "peak —";
  }
  renderPressureSparkline(w);
}

// Compact bar showing sustained vs. gust wind. Emits a "gusty" pill when
// the gust-to-sustained ratio is elevated — a common piloting/photography
// signal that things are turbulent rather than steady.
function renderWindGustBar(w) {
  if (!el.windGustBar) return;
  const sustained = w.windSpeed;
  const gusts = w.windGusts;
  if (sustained == null || gusts == null || gusts <= 0) {
    el.windGustBar.hidden = true;
    return;
  }
  el.windGustBar.hidden = false;
  // Scale bar against a soft cap of 80 km/h (hurricanes overflow — that's fine).
  const CAP = 80;
  const sPct = Math.min(100, (sustained / CAP) * 100);
  const gPct = Math.min(100, (gusts / CAP) * 100);
  if (el.windSustainedBar) el.windSustainedBar.style.width = `${sPct.toFixed(1)}%`;
  if (el.windGustBarSeg) el.windGustBarSeg.style.width = `${Math.max(0, gPct - sPct).toFixed(1)}%`;
  const ratio = sustained > 1 ? gusts / sustained : 1;
  const gustinessText =
    ratio >= 1.7 ? "turbulent" :
    ratio >= 1.4 ? "gusty" :
    ratio >= 1.15 ? "steady" : "";
  if (el.windGustiness) {
    el.windGustiness.textContent = gustinessText;
    el.windGustiness.dataset.kind = gustinessText;
  }
}

function humidityComfort(rh, dew, temp) {
  if (rh == null) return null;
  // Highest-priority weather-hazard signals first — they matter more than
  // whether the air feels "comfy" in the abstract.
  if (temp != null && dew != null) {
    const spread = temp - dew;
    if (spread < 2 && rh >= 90) return { label: "Fog risk", cls: "down" };
    if (temp <= 2 && rh >= 80) return { label: "Frost risk", cls: "down" };
  }
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

// Find the contiguous window of hours in the next 24h where UV stays
// >= 6 ("high"). Null if nothing crosses that line — so the label only
// appears when it's actionable.
function uvBurnWindow(hours) {
  const upcoming = (hours || []).filter((h) => h.time >= Date.now() - 30 * 60_000 && h.uv != null).slice(0, 24);
  if (!upcoming.length) return null;
  let start = null, end = null;
  for (const h of upcoming) {
    if (h.uv >= 6) {
      if (start == null) start = h.time;
      end = h.time + 3600_000;
    } else if (start != null) {
      break; // stop at the first drop so a morning peak doesn't merge with a late one
    }
  }
  if (start == null || end == null) return null;
  return { start, end };
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
  const age = Math.round(moon.phase * 29.53);
  el.moonName.textContent = moon.name;
  el.moonIllum.textContent = Math.round(moon.illum * 100);
  // Append the moon age (in days into the ~29.5 day cycle) as a subtle
  // extra so the phase name has a numeric anchor.
  const detail = el.moonIllum.parentElement;
  if (detail) {
    // Wipe any prior age chip so subsequent renders don't stack them.
    detail.querySelector(".moon-age")?.remove();
    const ageEl = document.createElement("span");
    ageEl.className = "moon-age";
    ageEl.textContent = ` · day ${age}/29`;
    detail.appendChild(ageEl);
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
  annotateSunDelta(el.sunRise, w.sunrise, w.yesterday?.sunrise);
  annotateSunDelta(el.sunSet, w.sunset, w.yesterday?.sunset);
  scheduleDaylightRemaining(w);
  scheduleSunCountdown(w);
  scheduleSunArc(w);
  renderSunArcPhotoBands(w);
  schedulePhotoHourChip(w);
  scheduleSkyPalette(w);
}

// Sky palette strip: a horizontal gradient showing the sky's likely tones
// through the day (night → blue → dawn → day → dusk → night) with a "now"
// marker sliding across as the clock ticks.
function scheduleSkyPalette(w) {
  if (!el.skyPaletteTrack) return;
  if (state.skyPaletteTimer) { clearInterval(state.skyPaletteTimer); state.skyPaletteTimer = null; }
  if (!w?.sunrise || !w?.sunset) return;
  // Build gradient once per fetch — anchors are wall-clock fractions of the
  // 24h from local midnight, so it doesn't need to update as time passes.
  const dayStart = new Date(w.sunrise);
  dayStart.setHours(0, 0, 0, 0);
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayStartMs + 24 * 3600_000;
  const pct = (ts) => Math.max(0, Math.min(100, ((ts - dayStartMs) / 24 / 3600_000) * 100));
  const sr = w.sunrise, ss = w.sunset;
  const M = 60_000;
  const stops = [
    { p: 0,                             c: "#08111f" },
    { p: pct(sr - 60 * M),              c: "#0e1c3a" },
    { p: pct(sr - 25 * M),              c: "#3a3167" },
    { p: pct(sr - 10 * M),              c: "#e07a5f" },
    { p: pct(sr + 20 * M),              c: "#ffcc88" },
    { p: pct(sr + 60 * M),              c: "#9ad1ff" },
    { p: pct((sr + ss) / 2),            c: "#5aa8ff" },
    { p: pct(ss - 60 * M),              c: "#8fbcff" },
    { p: pct(ss - 20 * M),              c: "#ffcc88" },
    { p: pct(ss + 10 * M),              c: "#e07a5f" },
    { p: pct(ss + 25 * M),              c: "#3a3167" },
    { p: pct(ss + 60 * M),              c: "#0e1c3a" },
    { p: 100,                           c: "#08111f" },
  ].sort((a, b) => a.p - b.p);
  const gradient = `linear-gradient(90deg, ${stops.map((s) => `${s.c} ${s.p.toFixed(1)}%`).join(", ")})`;
  el.skyPaletteTrack.style.background = gradient;

  const update = () => {
    const now = Date.now();
    if (now < dayStartMs || now > dayEndMs) { el.skyPaletteNow.style.left = "0%"; return; }
    const p = ((now - dayStartMs) / (dayEndMs - dayStartMs)) * 100;
    el.skyPaletteNow.style.left = `${p.toFixed(2)}%`;
  };
  update();
  state.skyPaletteTimer = setInterval(update, 60_000);
}

// Paint dashed golden/blue segments onto the sun arc so the photo windows
// are visible at a glance. Each segment is a small stroke-dasharray-limited
// slice of the same quadratic-bezier path used by the marker.
function renderSunArcPhotoBands(w) {
  if (!el.sunArcPhoto) return;
  const ph = w?.photoHours;
  if (!ph || !w.sunrise || !w.sunset) { el.sunArcPhoto.innerHTML = ""; return; }
  const arcLen = 220;  // approx path length of the quadratic bezier
  const sr = w.sunrise, ss = w.sunset;
  // Fraction along the arc for a timestamp:
  // sunrise = 0, sunset = 1; before/after clamp to 0/1.
  const frac = (ts) => Math.max(0, Math.min(1, (ts - sr) / (ss - sr)));
  const segments = [
    { win: ph.blueAM, color: "rgba(120,170,255,0.75)" },
    { win: ph.goldenAM, color: "rgba(255,195,120,0.9)" },
    { win: ph.goldenPM, color: "rgba(255,175,110,0.9)" },
    { win: ph.bluePM, color: "rgba(140,150,230,0.75)" },
  ].filter((s) => s.win && s.win.end > sr - 60 * 60_000 && s.win.start < ss + 60 * 60_000);

  const svgns = "http://www.w3.org/2000/svg";
  el.sunArcPhoto.innerHTML = "";
  for (const seg of segments) {
    const a = frac(seg.win.start);
    const b = frac(seg.win.end);
    if (b <= a) continue;
    const p = document.createElementNS(svgns, "path");
    p.setAttribute("d", "M10 74 Q100 -26 190 74");
    p.setAttribute("fill", "none");
    p.setAttribute("stroke", seg.color);
    p.setAttribute("stroke-width", "2.4");
    p.setAttribute("stroke-linecap", "round");
    // Only reveal the slice [a,b] of the arc with a big dashoffset.
    const start = a * arcLen;
    const len = (b - a) * arcLen;
    p.setAttribute("stroke-dasharray", `${len} ${arcLen}`);
    p.setAttribute("stroke-dashoffset", `-${start}`);
    el.sunArcPhoto.appendChild(p);
  }
}

// The pill under the sun-row: shows the next photo window as a countdown,
// or "Right now" while inside a window. Ticks every 30 s.
function schedulePhotoHourChip(w) {
  if (state.photoHourTimer) { clearInterval(state.photoHourTimer); state.photoHourTimer = null; }
  const chip = el.photoHourChip;
  if (!chip) return;
  const update = () => {
    const info = nextPhotoWindow(w, Date.now());
    if (!info) { chip.hidden = true; return; }
    chip.hidden = false;
    chip.dataset.kind = info.kind;
    if (el.photoHourDot) el.photoHourDot.dataset.kind = info.kind;
    if (el.photoHourHeadline) {
      el.photoHourHeadline.textContent = info.active
        ? `${info.label} — right now`
        : `${info.label} in ${humanCountdown(info.startsIn)}`;
    }
    if (el.photoHourDetail) {
      el.photoHourDetail.textContent = info.active
        ? `Ends ${fmtTime(info.win.end)} · ${humanCountdown(info.endsIn)} left`
        : `${fmtTime(info.win.start)} → ${fmtTime(info.win.end)}`;
    }
  };
  update();
  state.photoHourTimer = setInterval(update, 30_000);
}

function nextPhotoWindow(w, now) {
  if (!w?.daily?.length) return null;
  const kinds = [
    { key: "blueAM", label: "Blue hour" },
    { key: "goldenAM", label: "Golden hour" },
    { key: "goldenPM", label: "Golden hour" },
    { key: "bluePM", label: "Blue hour" },
  ];
  const pool = [];
  for (const d of w.daily) {
    for (const k of kinds) {
      const win = d[k.key];
      if (!win) continue;
      pool.push({ kind: k.key, label: k.label, win });
    }
  }
  pool.sort((a, b) => a.win.start - b.win.start);
  // Current window if any, else next upcoming.
  const current = pool.find((p) => now >= p.win.start && now <= p.win.end);
  if (current) {
    return {
      ...current,
      active: true,
      startsIn: 0,
      endsIn: current.win.end - now,
    };
  }
  const upcoming = pool.find((p) => p.win.start > now);
  if (!upcoming) return null;
  return {
    ...upcoming,
    active: false,
    startsIn: upcoming.win.start - now,
    endsIn: upcoming.win.end - now,
  };
}

function formatHM(mins) {
  if (mins == null || mins <= 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function humanCountdown(ms) {
  const mins = Math.max(0, Math.round(ms / 60_000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// Compare a today ts to a yesterday ts (both anchored to local midnight
// by Open-Meteo) — if they differ by a meaningful number of minutes,
// append "N min earlier/later" as a subtle secondary line. Skipped when
// yesterday isn't available or the delta is < 1 min.
function annotateSunDelta(node, today, yesterday) {
  if (!node) return;
  // Strip any previous annotation so a refresh doesn't stack.
  node.querySelector(".sun-delta")?.remove();
  if (!today || !yesterday) return;
  // Compare only the wall-clock minute-of-day so a date offset doesn't
  // introduce a full-day skew.
  const todayMin = new Date(today).getHours() * 60 + new Date(today).getMinutes();
  const yestMin = new Date(yesterday).getHours() * 60 + new Date(yesterday).getMinutes();
  const delta = todayMin - yestMin;
  if (Math.abs(delta) < 1) return;
  const label = delta > 0 ? "later" : "earlier";
  const span = document.createElement("span");
  span.className = "sun-delta";
  span.textContent = `${Math.abs(delta)} min ${label}`;
  node.appendChild(document.createElement("br"));
  node.appendChild(span);
}

function scheduleDaylightRemaining(w) {
  if (state.daylightTimer) { clearInterval(state.daylightTimer); state.daylightTimer = null; }
  if (!el.sunDaylight) return;
  if (!w?.sunrise || !w?.sunset) { el.sunDaylight.textContent = "—"; return; }
  const update = () => {
    const mins = Math.round((w.sunset - w.sunrise) / 60_000);
    const hh = Math.floor(mins / 60);
    const mm = mins % 60;
    const now = Date.now();
    let annot = "";
    if (now >= w.sunrise && now <= w.sunset) {
      const leftMin = Math.max(0, Math.round((w.sunset - now) / 60_000));
      annot = ` · ${formatHM(leftMin)} left`;
    } else if (now < w.sunrise) {
      annot = " · not risen yet";
    } else {
      annot = " · set";
    }
    el.sunDaylight.textContent = `${hh}h ${mm}m${annot}`;
  };
  update();
  state.daylightTimer = setInterval(update, 60_000);
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
  renderYesterdayChip(w);
  renderRainWindow(w);
  renderDayArrivals(w);
  const highlights = dailyHighlights(days);
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
    const badges = [];
    if (highlights.hottestIdx === i) badges.push(`<span class="daily-badge hot" title="Warmest day">★ hottest</span>`);
    if (highlights.coldestIdx === i && i !== highlights.hottestIdx) badges.push(`<span class="daily-badge cold" title="Coolest day">❄ coolest</span>`);
    if (highlights.wettestIdx === i) badges.push(`<span class="daily-badge wet" title="Wettest day">☔ wettest</span>`);
    const badgeHtml = badges.length ? `<span class="daily-badges">${badges.join("")}</span>` : "";
    item.innerHTML = `
      <span class="daily-day">${day}${badgeHtml}</span>
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

// Pick the hottest / coldest / wettest days across the 7-day forecast.
// Only crown days when the extreme is actually notable — otherwise return
// -1 so the badges stay off (e.g. no "wettest" ribbon on a bone-dry week).
function dailyHighlights(days) {
  let hottestIdx = -1, coldestIdx = -1, wettestIdx = -1;
  let hi = -Infinity, lo = Infinity, wet = 0;
  days.forEach((d, i) => {
    if (d.tempMax != null && d.tempMax > hi) { hi = d.tempMax; hottestIdx = i; }
    if (d.tempMin != null && d.tempMin < lo) { lo = d.tempMin; coldestIdx = i; }
    if ((d.precip ?? 0) > wet) { wet = d.precip; wettestIdx = i; }
  });
  // Suppress the wettest badge if the leader is < 1 mm — barely rain.
  if (wet < 1) wettestIdx = -1;
  // Suppress hot/cold if the spread across the week is tiny.
  const maxes = days.map((d) => d.tempMax).filter((v) => v != null);
  const mins = days.map((d) => d.tempMin).filter((v) => v != null);
  if (maxes.length >= 2 && Math.max(...maxes) - Math.min(...maxes) < 2) hottestIdx = -1;
  if (mins.length >= 2 && Math.max(...mins) - Math.min(...mins) < 2) coldestIdx = -1;
  return { hottestIdx, coldestIdx, wettestIdx };
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

// Compact horizontal timeline of the day's key inflection points.
function renderDayArrivals(w) {
  if (!el.dayArrivals) return;
  const arrivals = extractArrivals(w);
  if (!arrivals.length) { el.dayArrivals.hidden = true; return; }
  el.dayArrivals.hidden = false;
  const now = Date.now();
  const spanMs = 24 * 3600_000;
  el.dayArrivals.innerHTML = "";
  // Timeline rail + labels.
  const rail = document.createElement("div");
  rail.className = "arrivals-rail";
  el.dayArrivals.appendChild(rail);
  const rowTop = document.createElement("div");
  rowTop.className = "arrivals-row arrivals-top";
  el.dayArrivals.appendChild(rowTop);
  const rowBot = document.createElement("div");
  rowBot.className = "arrivals-row arrivals-bot";
  el.dayArrivals.appendChild(rowBot);
  const ICONS = {
    warm: "🌡", cold: "❄", uv: "☀", rain: "☔", gust: "🌬",
    sunrise: "◐", sunset: "◑",
  };
  const nowMarker = document.createElement("span");
  nowMarker.className = "arrivals-now";
  nowMarker.style.left = "0%";
  nowMarker.title = "Now";
  rail.appendChild(nowMarker);
  arrivals.forEach((ev, i) => {
    const rel = Math.max(0, Math.min(1, (ev.time - now) / spanMs));
    const pct = rel * 100;
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "arrivals-dot";
    dot.dataset.kind = ev.key;
    dot.style.left = `${pct.toFixed(1)}%`;
    dot.title = `${ev.label} · ${fmtTime(ev.time)} · ${ev.sub}`;
    dot.textContent = ICONS[ev.key] || "•";
    dot.addEventListener("click", () => state.handlers.onHourClick?.(ev.time));
    rail.appendChild(dot);
    // Alternating label rows: top / bottom so they don't collide.
    const label = document.createElement("span");
    label.className = "arrivals-label";
    label.style.left = `${pct.toFixed(1)}%`;
    label.innerHTML = `<strong>${escapeHtml(ev.label)}</strong><span>${escapeHtml(fmtTime(ev.time))} · ${escapeHtml(ev.sub)}</span>`;
    (i % 2 === 0 ? rowTop : rowBot).appendChild(label);
  });
}

// Scans the next 24 hourly buckets to describe the next meaningful rain
// window — "Rain 4–7 PM · 6 mm" or "Dry through Wed evening".
function renderRainWindow(w) {
  const chip = el.rainWindowChip;
  if (!chip) return;
  const hours = (w.hourly || []).filter((h) => h.time > Date.now() - 15 * 60_000).slice(0, 24);
  if (!hours.length) { chip.hidden = true; return; }
  const wetIdx = hours.findIndex((h) => (h.pop ?? 0) >= 40 || (h.precip ?? 0) >= 0.3);
  if (wetIdx < 0) {
    // Dry — look further out via the 7-day forecast to find the next rain day.
    const dryChip = describeDryStretch(w);
    if (!dryChip) { chip.hidden = true; return; }
    chip.hidden = false;
    chip.dataset.state = "dry";
    el.rainWindowHeadline.textContent = dryChip.headline;
    el.rainWindowDetail.textContent = dryChip.detail;
    chip.dataset.ts = dryChip.ts ?? "";
    return;
  }
  // Grow the wet window until it dries out.
  let endIdx = wetIdx;
  let totalPrecip = hours[wetIdx].precip ?? 0;
  let peak = { pop: hours[wetIdx].pop ?? 0, precip: hours[wetIdx].precip ?? 0, ts: hours[wetIdx].time };
  for (let i = wetIdx + 1; i < hours.length; i++) {
    const h = hours[i];
    const wet = (h.pop ?? 0) >= 30 || (h.precip ?? 0) >= 0.2;
    if (!wet) break;
    endIdx = i;
    totalPrecip += h.precip ?? 0;
    if ((h.precip ?? 0) > peak.precip || ((h.precip ?? 0) === peak.precip && (h.pop ?? 0) > peak.pop)) {
      peak = { pop: h.pop ?? 0, precip: h.precip ?? 0, ts: h.time };
    }
  }
  const startTs = hours[wetIdx].time;
  const endTs = hours[endIdx].time + 3600_000; // rain window rounded up to hour end
  const startMin = Math.max(0, Math.round((startTs - Date.now()) / 60_000));
  chip.hidden = false;
  chip.dataset.state = "wet";
  chip.dataset.ts = String(startTs);
  const startLabel = startMin < 45 ? "Rain soon" :
    startMin < 60 ? "Rain in ~1h" :
    `Rain ${fmtTime(startTs)}`;
  const spanHours = Math.max(1, Math.round((endTs - startTs) / 3600_000));
  const headline = `${startLabel}${startMin >= 60 ? `–${fmtTime(endTs)}` : ""}`;
  const detailParts = [];
  if (spanHours >= 2) detailParts.push(`~${spanHours}h`);
  if (totalPrecip >= 0.5) detailParts.push(`${totalPrecip.toFixed(totalPrecip < 5 ? 1 : 0)} mm`);
  if (peak.precip >= 2) detailParts.push(`peak ${fmtTime(peak.ts)}`);
  el.rainWindowHeadline.textContent = headline;
  el.rainWindowDetail.textContent = detailParts.length ? detailParts.join(" · ") : `${peak.pop}% chance`;
}

function describeDryStretch(w) {
  const days = w.daily || [];
  if (!days.length) return null;
  const nextWet = days.find((d, i) => i > 0 && ((d.pop ?? 0) >= 40 || (d.precip ?? 0) >= 1));
  if (!nextWet) return { headline: "Dry through the week", detail: "No rain in the 7-day outlook" };
  const dt = new Date(nextWet.time);
  const tz = w.timezone;
  const dayName = dt.toLocaleDateString(undefined, {
    weekday: "long",
    ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });
  const mm = nextWet.precip >= 0.5 ? `${nextWet.precip.toFixed(nextWet.precip < 5 ? 1 : 0)} mm` : "";
  const parts = [`${nextWet.pop}% chance`, mm].filter(Boolean);
  return {
    headline: `Dry until ${dayName}`,
    detail: parts.join(" · "),
    ts: nextWet.time,
  };
}

function renderYesterdayChip(w) {
  if (!el.yesterdayChip) return;
  const vy = w?.vsYesterday;
  if (!vy || vy.highDelta == null) { el.yesterdayChip.hidden = true; return; }
  const scale = state.unit === "F" ? (v) => v * 9 / 5 : (v) => v;
  const highDelta = Math.round(scale(vy.highDelta));
  const lowDelta = Math.round(scale(vy.lowDelta ?? 0));
  const nowDelta = vy.nowDelta != null ? Math.round(scale(vy.nowDelta)) : null;

  // Prefer "at this hour" delta as the headline when we have it; it's the
  // most viscerally correct answer to "is it warmer than yesterday?".
  let headline;
  if (nowDelta != null) {
    headline = nowDelta === 0 ? "Same as this hour yesterday"
      : `${Math.abs(nowDelta)}° ${nowDelta > 0 ? "warmer" : "cooler"} than yesterday`;
  } else {
    headline = highDelta === 0 ? "Same high as yesterday"
      : `${Math.abs(highDelta)}° ${highDelta > 0 ? "warmer" : "cooler"} high`;
  }

  const dominant = nowDelta ?? highDelta;
  el.yesterdayChip.hidden = false;
  el.yesterdayChip.dataset.direction =
    dominant > 0 ? "up" : dominant < 0 ? "down" : "flat";
  if (el.yesterdayArrow) {
    el.yesterdayArrow.textContent =
      dominant > 0 ? "↑" : dominant < 0 ? "↓" : "→";
  }
  el.yesterdayHeadline.textContent = headline;
  const detailParts = [];
  if (nowDelta != null) {
    detailParts.push(highDelta === 0
      ? "same daytime high"
      : `${Math.abs(highDelta)}° ${highDelta > 0 ? "warmer" : "cooler"} high`);
  }
  detailParts.push(lowDelta === 0
    ? "same overnight low"
    : `${Math.abs(lowDelta)}° ${lowDelta > 0 ? "milder" : "chillier"} low`);
  el.yesterdayDetail.textContent = detailParts.join(" · ");
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
  const deltaDisplay = Math.round(state.unit === "F" ? deltaC * 9 / 5 : deltaC);
  const dPop = (tmrw.pop ?? 0) - (today.pop ?? 0);
  const parts = [];
  if (deltaDisplay > 0) parts.push(`${deltaDisplay}° warmer`);
  else if (deltaDisplay < 0) parts.push(`${Math.abs(deltaDisplay)}° cooler`);
  else parts.push("similar temp");
  if (Math.abs(dPop) >= 20) {
    parts.push(dPop > 0 ? `+${dPop}% rain` : `${dPop}% rain`);
  }
  // Append a compact week-outlook when the 7-day view is populated.
  const week = summariseWeek(days);
  const weekLabel = week ? ` · Week: ${week}` : "";
  el.dailyDelta.textContent = `Tomorrow: ${parts.join(" · ")}${weekLabel}`;
}

function summariseWeek(days) {
  if (!days.length) return null;
  let totalPrecip = 0;
  let wet = 0;
  for (const d of days) {
    const p = d.precip ?? 0;
    totalPrecip += p;
    if (p >= 1 || (d.pop ?? 0) >= 50) wet++;
  }
  const dry = days.length - wet;
  if (totalPrecip < 0.5) return `${days.length} dry days`;
  const mmLabel = totalPrecip >= 20 ? `${Math.round(totalPrecip)} mm` : `${totalPrecip.toFixed(1)} mm`;
  return `${dry}/${wet} dry/wet · ${mmLabel}`;
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
// Update the browser tab title with the current temp + a condition emoji.
// A tiny "at-a-glance" affordance for people who juggle many tabs.
function updateTabTitle(w) {
  if (!w || w.temp == null) return;
  const emoji = conditionEmoji(w.condition, w.isDay);
  const t = Math.round(convertTemp(w.temp));
  const place = state.place?.name;
  const parts = [`${t}°${state.unit} ${emoji}`];
  if (place) parts.push(place);
  parts.push("Aether");
  document.title = parts.join(" · ");
}

function conditionEmoji(condition, isDay = true) {
  switch (condition) {
    case "clear": return isDay ? "☀️" : "🌙";
    case "clouds": return isDay ? "⛅" : "☁️";
    case "rain": return "🌧";
    case "snow": return "❄️";
    case "storm": return "⛈";
    case "fog": return "🌫";
    default: return "🌤";
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

// ---------- Saved places strip ----------
function renderPlaces() {
  const all = places.all();
  if (!all.length) { el.placesStrip.hidden = true; el.placesStrip.innerHTML = ""; return; }
  const prevActiveId = state.prevActivePlaceId;
  el.placesStrip.hidden = false;
  const activeId = state.place ? places.idFor(state.place) : null;
  state.prevActivePlaceId = activeId;
  el.placesStrip.innerHTML = all.map((p) => {
    const active = places.idFor(p) === activeId;
    const emoji = p.condition ? conditionEmoji(p.condition) : "";
    return `
      <div class="place-chip ${active ? "active" : ""}" data-id="${p.id}">
        ${emoji ? `<span class="place-chip-emoji" aria-hidden="true">${emoji}</span>` : ""}
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
    // Pulse the freshly-activated chip so keyboard cycling (or a fresh
    // click) has a subtle visual echo.
    if (id === activeId && activeId && prevActiveId && activeId !== prevActiveId) {
      chip.classList.add("pulse");
      chip.addEventListener("animationend", () => chip.classList.remove("pulse"), { once: true });
      chip.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
    }
  });
}

// ---------- Bindings ----------
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

const runSearch = debounce(async (q) => {
  const results = await searchCities(q);
  renderSearchResults(results, q);
}, 200);

function renderSearchResults(results, query = "") {
  if (!results.length) {
    // Empty-state row so people know the search ran and turned up nothing.
    el.searchResults.innerHTML = `<li class="empty" role="option" aria-disabled="true">
      No matches${query ? ` for "${escapeHtml(query)}"` : ""}
    </li>`;
    el.searchResults.hidden = false;
    el.searchResults._items = [];
    return;
  }
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

function refreshSavePlaceBtn() {
  if (!el.savePlaceBtn) return;
  const p = state.place;
  // Hide for "Current location" (there's already the geolocate button) and
  // whenever we don't have a real place, or when it's already saved.
  const canSave = p && p.lat != null && p.lon != null
    && p.name !== "Current location"
    && !places.isSaved(p);
  el.savePlaceBtn.hidden = !canSave;
}

function bindDayRangeJumps() {
  const jump = (node) => {
    const ts = Number(node?.dataset?.ts);
    if (!ts) return;
    state.handlers.onHourClick?.(ts);
  };
  el.dayRangeMinAt?.addEventListener("click", () => jump(el.dayRangeMinAt));
  el.dayRangeMaxAt?.addEventListener("click", () => jump(el.dayRangeMaxAt));
}

function bindSavePlace() {
  if (!el.savePlaceBtn) return;
  el.savePlaceBtn.addEventListener("click", () => {
    const p = state.place;
    if (!p) return;
    places.add(p);
    if (state.weather) {
      places.updateSummary(p, {
        temp: state.weather.temp, condition: state.weather.condition,
      });
    }
    renderPlaces();
    refreshSavePlaceBtn();
    ui.showToast(`Saved ${p.name}`, { tone: "good" });
  });
}

function bindRainWindowChip() {
  if (!el.rainWindowChip) return;
  el.rainWindowChip.addEventListener("click", () => {
    const ts = Number(el.rainWindowChip.dataset.ts);
    if (!ts) return;
    state.handlers.onHourClick?.(ts);
  });
}

function bindPhotoHourChip() {
  if (!el.photoHourChip) return;
  el.photoHourChip.addEventListener("click", () => {
    const info = nextPhotoWindow(state.weather, Date.now());
    if (!info) return;
    // Scrub to the middle of the window so the sky reflects that light.
    const mid = info.active
      ? Date.now()
      : Math.round((info.win.start + info.win.end) / 2);
    state.handlers.onHourClick?.(mid);
  });
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
    ui.showToast("Aether installed", { tone: "good" });
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

  el.settingClearCache?.addEventListener("click", () => {
    const n = clearCached();
    ui.showToast(n ? `Cleared ${n} cached place${n === 1 ? "" : "s"}` : "No cache to clear");
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
    const suffix = state.weather.stale ? " · cached" : state.weather.offline ? " · offline" : "";
    el.fetchedAgo.textContent = "· " + label + suffix;
    el.fetchedAgo.classList.toggle("stale", minutes >= 20 || !!state.weather.stale);
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
    const link = deepLinkFor(state.place);
    const lines = [
      `Aether · ${placeName}`,
      `${capitalize(w.label)} · ${t(w.temp)} (feels ${t(w.feelsLike ?? w.temp)})`,
      today ? `Today: ${t(today.tempMin)} / ${t(today.tempMax)} · ${today.pop}% precip` : null,
      `Wind ${Math.round(w.windSpeed)} km/h${w.windDir != null ? ` ${cardinal(w.windDir)}` : ""}`,
      w.uv != null ? `UV ${Math.round(w.uv)}` : null,
      w.airQuality?.aqi != null ? `AQI ${Math.round(w.airQuality.aqi)} (${w.airQuality.label})` : null,
      link,
    ].filter(Boolean);
    const text = lines.join("\n");
    try {
      if (navigator.share) {
        const shareData = { title: `Aether — ${placeName}`, text };
        if (link) shareData.url = link;
        await navigator.share(shareData);
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

// Build a deep link that re-opens the app at this location.
function deepLinkFor(place) {
  if (!place || place.lat == null || place.lon == null) return null;
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("lat", place.lat.toFixed(4));
  url.searchParams.set("lon", place.lon.toFixed(4));
  if (place.name && place.name !== "Current location") url.searchParams.set("name", place.name);
  if (place.country) url.searchParams.set("country", place.country);
  if (place.admin1) url.searchParams.set("admin1", place.admin1);
  return url.toString();
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
