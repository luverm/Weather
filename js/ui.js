// UI layer. Renders every data module and handles non-scene interactions
// (search, unit toggle, saved places, tilt, audio toggle).

import { searchCities, getCurrentSummary } from "./weather-service.js";
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
  nextChange: $("#next-change"),
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
  aqArrow: $("#aq-arrow"),
  aqDetail: $("#aq-detail"),
  aqCard: $("#aq-card"),
  aqTrendLine: $("#aq-trend-line"),
  aqTrendFill: $("#aq-trend-fill"),
  moonLit: $("#moon-lit"),
  moonName: $("#moon-name"),
  moonIllum: $("#moon-illum"),
  moonAge: $("#moon-age"),
  moonNext: $("#moon-next"),
  sunRise: $("#sun-rise"),
  sunSet: $("#sun-set"),
  sunDaylight: $("#sun-daylight"),
  sunCountdown: $("#sun-countdown"),
  sunNextLabel: $("#sun-next-label"),
  windNeedle: $("#wind-needle"),
  windRose: $("#wind-rose"),
  skyRibbon: $("#sky-ribbon"),
  skyRibbonMarker: $("#sky-ribbon-marker"),
  skyRibbonSunrise: $("#sky-ribbon-sunrise"),
  skyRibbonSunset:  $("#sky-ribbon-sunset"),
  advice: $("#advice"),
  adviceText: $("#advice-text"),
  bestMoment: $("#best-moment"),
  bestMomentText: $("#best-moment-text"),
  wardrobe: $("#wardrobe"),
  wardrobeText: $("#wardrobe-text"),
  chartSvg: $("#chart-svg"),
  chartHover: $("#chart-hover"),
  pollenCard: $("#pollen-card"),
  precipCard: $("#precip-card"),
  precip24h: $("#precip-24h"),
  precipToday: $("#precip-today"),
  precipWet: $("#precip-wet"),
  precipFirst: $("#precip-first"),
  precipStatus: $("#precip-status"),
  precipSpark: $("#precip-spark"),
  stargazeCard: $("#stargaze-card"),
  stargazeStars: $("#stargaze-stars"),
  stargazeHeadline: $("#stargaze-headline"),
  stargazeDetail: $("#stargaze-detail"),
  stargazeStatus: $("#stargaze-status"),
  pollenLevel: $("#pollen-level"),
  pollenDominant: $("#pollen-dominant"),
  pollenItems: $("#pollen-items"),
  pressureTrend: $("#m-pressure-trend"),
  tempTrend: $("#temp-trend"),
  yesterdayDelta: $("#yesterday-delta"),
  uvLevel: $("#m-uv-level"),
  uvSpark: $("#uv-spark"),
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
  sunArcGoldenAm: $("#sun-arc-golden-am"),
  sunArcGoldenPm: $("#sun-arc-golden-pm"),
  sunsetPreview: $("#sunset-preview"),
  sunsetPreviewLabel: $("#sunset-preview-label"),
  goldenHourPill: $("#golden-hour-pill"),
  goldenHourText: $("#golden-hour-text"),
  comfortStrip: $("#comfort-strip"),
  cloudStrip: $("#cloud-strip"),
  chartCard: $("#chart-card"),
  chartFullBtn: $("#chart-full"),
  weekendChip: $("#weekend-chip"),
  weekendHeadline: $("#weekend-headline"),
  weekendDetail: $("#weekend-detail"),
  weekendIconSat: $("#weekend-icon-sat"),
  weekendIconSun: $("#weekend-icon-sun"),
  forecastTrack: $("#forecast-track"),
  dailyTrack: $("#daily-track"),
  weekHighlights: $("#week-highlights"),
  weekNarrative: $("#week-narrative"),
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
  cityDeltas: $("#city-deltas"),
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
  goldenTimer: null,
  localTimer: null,
};

// Sun arc bezier: matches path d="M10 74 Q100 -26 190 74" in index.html.
const SUN_ARC = { x0: 10, y0: 74, cx: 100, cy: -26, x1: 190, y1: 74 };

function sunArcPoint(t) {
  const u = 1 - t;
  return {
    x: u * u * SUN_ARC.x0 + 2 * u * t * SUN_ARC.cx + t * t * SUN_ARC.x1,
    y: u * u * SUN_ARC.y0 + 2 * u * t * SUN_ARC.cy + t * t * SUN_ARC.y1,
  };
}

function sunArcSegmentPath(tStart, tEnd, steps = 12) {
  if (tEnd <= tStart) return "";
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = tStart + ((tEnd - tStart) * i) / steps;
    const p = sunArcPoint(t);
    d += (i === 0 ? "M" : "L") + p.x.toFixed(1) + " " + p.y.toFixed(1);
  }
  return d;
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
    bindChartFullscreen();
    bindHeroSwipe();
  },
  onCyclePlace(handler) { state.handlers.onCyclePlace = handler; },
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
    renderSkyRibbon(weather);
    // Once the weather is in, enrich the place-sub with elevation/timezone.
    if (state.place && weather.elevation != null) {
      const parts = [state.place.admin1, state.place.country].filter(Boolean);
      const meters = Math.round(weather.elevation);
      if (meters !== 0) {
        parts.push(state.unit === "F"
          ? `${Math.round(meters * 3.28084)} ft`
          : `${meters} m`);
      }
      el.placeSub.textContent = parts.join(" · ");
    }
    renderAdvice(weather);
    renderPollen(weather.pollen);
    renderPrecip(weather);
    renderStargaze(weather);
    renderCloudStrip(weather);
    renderBestMoment(weather);
    renderWardrobe(weather);
    renderTrends(weather);
    renderInsights(weather);
    renderActivity(weather);
    renderAlerts(weather);
    renderWeekend(weather);
    startLocaltime(weather);
    if (state.chart) state.chart.setHours(weather.hourly);
    if (state.comfortStrip) state.comfortStrip.setHours(weather.hourly);
    if (el.narrative) el.narrative.textContent = narrative || "";
    renderNextChange(weather);
    updateDocumentTitle(weather);
    if (weather.offline) ui.showToast("Offline — showing sample weather");
    // Save summary for the strip so chips can show current temp.
    if (state.place) {
      places.updateSummary(state.place, {
        temp: weather.temp, condition: weather.condition, label: weather.label,
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
    updateSkyRibbonMarker(sampled._sampledTs ?? Date.now());
  },
  setScrubbing(on) {
    document.documentElement.setAttribute("data-scrubbing", on ? "true" : "false");
    if (on) {
      el.hintText.textContent = "Drag to explore future weather.";
      acquireWakeLock();
    } else {
      el.hintText.innerHTML = 'Drag the slider, hover the chart, or press <kbd>?</kbd> for shortcuts.';
      releaseWakeLock();
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
  const conditionEmoji = CONDITION_EMOJI[w.condition] || "";
  el.conditionLabel.textContent = conditionEmoji ? `${conditionEmoji} ${capitalize(w.label)}` : capitalize(w.label);
  // Preserve the temp-trend span that sits inside #feels-like and rebuild
  // the rest of the line so we can append a "why" explainer.
  const trendHtml = el.tempTrend?.outerHTML || "";
  const whyText = feelsLikeWhy(w);
  const whyHtml = whyText ? ` <span class="feels-why">${escapeHtml(whyText)}</span>` : "";
  el.feelsLike.innerHTML = `${trendHtml}Feels like ${Math.round(feels)}°${whyHtml}`;
  // Re-bind the reference after innerHTML rewrite so subsequent updates keep working.
  el.tempTrend = document.getElementById("temp-trend");
  renderDayRange(w);
  renderYesterdayDelta(w);
}

// Compare today's high to yesterday's high (from w.yesterday) and show a
// small pill on the temp side of the hero.
function renderYesterdayDelta(w) {
  if (!el.yesterdayDelta) return;
  const todayHi = w.daily?.[0]?.tempMax;
  const yHi = w.yesterday?.tempMax;
  if (todayHi == null || yHi == null) { el.yesterdayDelta.hidden = true; return; }
  const delta = todayHi - yHi;
  const unitDelta = state.unit === "F" ? delta * 9 / 5 : delta;
  if (Math.abs(unitDelta) < 1) {
    el.yesterdayDelta.hidden = true;
    return;
  }
  const arrow = delta > 0 ? "▲" : "▼";
  const words = Math.abs(unitDelta) < 3 ? "similar to yesterday" :
                Math.abs(unitDelta) < 6 ? (delta > 0 ? "warmer than yesterday" : "cooler than yesterday") :
                                          (delta > 0 ? "much warmer than yesterday" : "much cooler than yesterday");
  el.yesterdayDelta.textContent = `${arrow} ${Math.abs(Math.round(unitDelta))}° ${words}`;
  el.yesterdayDelta.className = `yesterday-delta ${delta > 0 ? "up" : "down"}`;
  el.yesterdayDelta.hidden = false;
}

// Pick a short natural-language reason for why the current "feels like" temp
// diverges from the actual temperature. Returns "" when the two are close.
function feelsLikeWhy(w) {
  if (w.temp == null || w.feelsLike == null) return "";
  const delta = w.feelsLike - w.temp;
  if (Math.abs(delta) < 1.2) return "";
  const dispDelta = state.unit === "F" ? delta * 9 / 5 : delta;
  const magnitude = `${dispDelta >= 0 ? "+" : "−"}${Math.abs(Math.round(dispDelta))}°`;
  const wind = w.windSpeed || 0;
  const gusts = w.windGusts || 0;
  const humidity = w.humidity || 0;
  const uv = w.uv || 0;
  const cloud = w.cloudCover ?? 100;
  if (delta <= -1.2) {
    if (wind >= 20 || gusts >= 30) return `· wind chill ${magnitude}`;
    if (wind >= 10) return `· breeze trims ${magnitude}`;
    if (humidity < 30) return `· dry air ${magnitude}`;
    return `· ${magnitude}`;
  }
  // delta > 0
  if (humidity >= 70) return `· humid air adds ${magnitude}`;
  if (uv >= 6 && cloud < 40) return `· direct sun adds ${magnitude}`;
  if (wind < 5 && humidity >= 55) return `· sultry air adds ${magnitude}`;
  return `· ${magnitude}`;
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
  const speedUnit = state.unit === "F" ? "mph" : "km/h";
  const toSpeed = (kmh) => state.unit === "F" ? kmh * 0.621371 : kmh;
  el.metricWind.textContent = Math.round(toSpeed(w.windSpeed ?? 0));
  // Update the sibling unit label if the DOM has one right after the value.
  const windUnitEl = el.metricWind?.parentElement?.querySelector(".metric-unit");
  if (windUnitEl) windUnitEl.textContent = speedUnit;
  const dir = w.windDir;
  const dirLabel = dir != null ? cardinal(dir) : null;
  const gustDisplay = w.windGusts != null
    ? `${Math.round(toSpeed(w.windGusts))} ${speedUnit}`
    : "—";
  el.metricWindSub.textContent = dirLabel
    ? `${dirLabel} · gust ${gustDisplay}`
    : `gust ${gustDisplay}`;
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
  renderWindRose(w);
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
  // Combine visibility with a short pressure-driven verdict.
  let vis;
  if (w.visibility != null) {
    if (state.unit === "F") {
      const miles = Math.round((w.visibility / 1609.344) * 10) / 10;
      vis = `visibility ${miles} mi`;
    } else {
      vis = `visibility ${Math.round((w.visibility / 1000) * 10) / 10} km`;
    }
  } else vis = "visibility —";
  const verdict = pressureVerdict(w.pressure, w.pressureTrend);
  el.metricPressureSub.textContent = verdict ? `${verdict} · ${vis}` : vis;
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
  renderUvSparkline(w);
}

function renderUvSparkline(w) {
  const svg = el.uvSpark;
  if (!svg) return;
  const hours = (w.hourly || []).slice(0, 12).filter((h) => h.uv != null);
  if (hours.length < 4) { svg.innerHTML = ""; return; }
  const width = 100, height = 24;
  const max = Math.max(1, ...hours.map((h) => h.uv));
  const barW = width / hours.length;
  const bars = hours.map((h, i) => {
    const bh = Math.max(1.5, (h.uv / max) * (height - 3));
    const x = i * barW + 0.4;
    const y = height - bh;
    const uvColor =
      h.uv < 3  ? "#78d06a" :
      h.uv < 6  ? "#ffd35a" :
      h.uv < 8  ? "#ff9f5c" :
      h.uv < 11 ? "#ff6a6a" :
                  "#c77bff";
    return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(barW - 0.8).toFixed(2)}" height="${bh.toFixed(2)}" fill="${uvColor}" opacity="0.85" rx="0.6"/>`;
  }).join("");
  svg.innerHTML = bars;
}

// Short natural-language interpretation of pressure + trend. Follows the
// classic barometer rules of thumb.
function pressureVerdict(p, trend) {
  if (p == null) return "";
  const d = trend?.direction;
  const delta = trend?.delta ?? 0;
  const rapid = Math.abs(delta) >= 2.5;
  if (p >= 1023 && d !== "falling") return "Fair weather";
  if (p >= 1020 && d === "rising") return "Improving";
  if (p <= 1000 && d === "falling") return rapid ? "Storm coming" : "Unsettled";
  if (d === "falling" && rapid) return "Change coming";
  if (d === "rising" && rapid)  return "Clearing soon";
  if (p <= 1005) return "Unsettled";
  return "";
}

function humidityComfort(rh, dew, temp) {
  if (rh == null) return null;
  // Fog risk: dew point within 2° of air temp and humidity very high — likely
  // saturation, mist rolling in. Overrides normal comfort labels.
  if (temp != null && dew != null && rh >= 92 && (temp - dew) <= 2) {
    return { label: "Fog risk", cls: "down" };
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
  renderAqArrow(aq);
}

// Show a short trend arrow (improving / steady / worsening) based on how AQI
// changes over the next 6 hourly samples. Lower AQI = better air.
function renderAqArrow(aq) {
  if (!el.aqArrow) return;
  const pts = (aq?.trend || []).slice(0, 6).map((p) => p.aqi).filter((v) => v != null);
  if (pts.length < 2 || aq?.aqi == null) { el.aqArrow.textContent = ""; return; }
  const later = pts[pts.length - 1];
  const delta = later - aq.aqi;
  let cls, arrow, word;
  if (Math.abs(delta) < 5) { cls = "flat"; arrow = "→"; word = "steady"; }
  else if (delta > 0)      { cls = "up";   arrow = "▲"; word = "worsening"; }
  else                     { cls = "down"; arrow = "▼"; word = "improving"; }
  el.aqArrow.className = `trend ${cls}`;
  el.aqArrow.textContent = `${arrow} ${word}`;
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
  if (el.moonAge && moon.ageDays != null) {
    el.moonAge.textContent = moon.ageDays.toFixed(1);
  }
  if (el.moonNext && moon.daysToFull != null && moon.daysToNew != null) {
    const nextFull = moon.daysToFull;
    const nextNew  = moon.daysToNew;
    const pick = nextFull < nextNew
      ? { label: "full moon", days: nextFull }
      : { label: "new moon",  days: nextNew };
    const rounded = Math.max(1, Math.round(pick.days));
    el.moonNext.textContent = `Next ${pick.label} in ${rounded}d`;
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
  if (w.sunrise && w.sunset) {
    const mins = Math.round((w.sunset - w.sunrise) / 60_000);
    const hh = Math.floor(mins / 60);
    const mm = mins % 60;
    // Add a subtle delta vs yesterday when available.
    let deltaStr = "";
    if (w.yesterday?.sunrise && w.yesterday?.sunset) {
      const y = Math.round((w.yesterday.sunset - w.yesterday.sunrise) / 60_000);
      const diff = mins - y; // + means today is longer
      if (Math.abs(diff) >= 1) {
        const sign = diff > 0 ? "+" : "−";
        const secs = Math.abs(diff * 60);
        const dh = Math.floor(secs / 3600);
        const dm = Math.floor((secs % 3600) / 60);
        const ds = secs % 60;
        const parts = [];
        if (dh) parts.push(`${dh}h`);
        if (dm) parts.push(`${dm}m`);
        if (!dh && !dm) parts.push(`${ds}s`);
        else if (ds && !dh) parts.push(`${ds}s`);
        deltaStr = ` <small class="daylight-delta ${diff > 0 ? "up" : "down"}">${sign}${parts.join(" ")}</small>`;
      } else {
        deltaStr = ` <small class="daylight-delta flat">±0s</small>`;
      }
    }
    el.sunDaylight.innerHTML = `${hh}h ${mm}m${deltaStr}`;
  } else el.sunDaylight.textContent = "—";
  scheduleSunCountdown(w);
  scheduleSunArc(w);
  scheduleGoldenHour(w);
  renderSunsetPreview(w);
  const title = document.getElementById("sun-noon-title");
  if (title && w?.sunrise && w?.sunset) {
    const noonTs = w.sunrise + (w.sunset - w.sunrise) / 2;
    title.textContent = `Solar noon · ${fmtTime(noonTs)}`;
  }
}

// Predict tonight's sunset palette from cloud cover during the sunset hour.
// Clear skies read as a saturated pink→orange→purple gradient; overcast reads
// as muted grey/blue. The label doubles as the caption ("Vivid", "Muted"…).
function renderSunsetPreview(w) {
  if (!el.sunsetPreview) return;
  const sunset = w?.sunset;
  if (!sunset) { el.sunsetPreview.hidden = true; return; }
  // Find the hourly entry closest to sunset (± 60 min).
  const hours = w.hourly || [];
  let nearest = null, bestDelta = 90 * 60_000;
  for (const h of hours) {
    const d = Math.abs(h.time - sunset);
    if (d < bestDelta && h.cloudCover != null) { nearest = h; bestDelta = d; }
  }
  const cloud = nearest?.cloudCover ?? w.cloudCover ?? 40;
  const humid = nearest?.humidity ?? w.humidity ?? 60;
  // Cloud sweet spot for vivid sunsets is 30-60%. Very clear or very cloudy
  // both dull the colour. Humidity below 60% tends to sharpen the palette.
  const cloudFit = 1 - Math.abs(cloud - 45) / 45;
  const humidPenalty = Math.max(0, humid - 70) / 30;
  const vividness = clamp01(cloudFit - humidPenalty);
  const [lo, hi] = vividness > 0.6
    ? [["#ff9c7a", "#ff5b8a", "#5b3ea0"], "Vivid"]
    : vividness > 0.35
      ? [["#ffbb92", "#ff8a5c", "#7b4b9a"], "Warm"]
      : cloud > 80
        ? [["#889cb0", "#6b7a95", "#3d4864"], "Muted"]
        : [["#ffd6b0", "#c88b8f", "#5b6a94"], "Soft"];
  const grad = `linear-gradient(90deg, ${lo[0]} 0%, ${lo[1]} 55%, ${lo[2]} 100%)`;
  el.sunsetPreview.style.background = grad;
  const desc = hi;
  const timeStr = new Date(sunset).toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit", hour12: false,
    ...(w.timezone && w.timezone !== "auto" ? { timeZone: w.timezone } : {}),
  });
  if (el.sunsetPreviewLabel) el.sunsetPreviewLabel.textContent = `Tonight's sunset · ${desc} · ${timeStr}`;
  el.sunsetPreview.hidden = false;
}

// Draw the two golden-hour bands on the sun arc and keep a live countdown
// under it. Golden hour ~= first 60 min after sunrise and last 60 min before
// sunset (compressed when the day is short).
function scheduleGoldenHour(w) {
  if (state.goldenTimer) { clearInterval(state.goldenTimer); state.goldenTimer = null; }
  const pill = el.goldenHourPill, txt = el.goldenHourText;
  const amPath = el.sunArcGoldenAm, pmPath = el.sunArcGoldenPm;
  if (!pill || !txt || !amPath || !pmPath) return;
  const sr = w?.sunrise, ss = w?.sunset;
  if (!sr || !ss || ss <= sr) {
    pill.hidden = true;
    amPath.setAttribute("d", "");
    pmPath.setAttribute("d", "");
    return;
  }
  const daylight = ss - sr;
  // Golden hour = min(60 min, 1/6 of daylight). Short days get a shorter band.
  const bandMs = Math.max(15 * 60_000, Math.min(60 * 60_000, daylight / 6));
  const amStart = sr, amEnd = sr + bandMs;
  const pmStart = ss - bandMs, pmEnd = ss;
  // Draw the two bands on the arc (t=0 at sunrise, t=1 at sunset).
  const amT0 = 0, amT1 = bandMs / daylight;
  const pmT0 = 1 - bandMs / daylight, pmT1 = 1;
  amPath.setAttribute("d", sunArcSegmentPath(amT0, amT1));
  pmPath.setAttribute("d", sunArcSegmentPath(pmT0, pmT1));

  const fmt = (ms) => {
    const m = Math.max(0, Math.round(ms / 60_000));
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
  };
  const update = () => {
    const now = Date.now();
    let text = "", tone = "am";
    if (now < amStart) {
      // Before dawn — countdown to morning golden.
      text = `Golden hour in ${fmt(amStart - now)} · lasts ${fmt(bandMs)}`;
    } else if (now < amEnd) {
      // In morning golden — show remaining.
      text = `Morning golden · ${fmt(amEnd - now)} left`;
      pill.classList.add("live");
    } else if (now < pmStart) {
      // Between goldens — count down to evening.
      text = `Evening golden in ${fmt(pmStart - now)} · lasts ${fmt(bandMs)}`;
      tone = "pm";
    } else if (now < pmEnd) {
      // In evening golden — show remaining.
      text = `Evening golden · ${fmt(pmEnd - now)} left`;
      pill.classList.add("live");
      tone = "pm";
    } else {
      // Past both — hide.
      pill.hidden = true;
      return;
    }
    // Reset live class if not in a golden window.
    if (!(now >= amStart && now < amEnd) && !(now >= pmStart && now < pmEnd)) {
      pill.classList.remove("live");
    }
    pill.dataset.tone = tone;
    txt.textContent = text;
    pill.hidden = false;
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

// Sky-color ribbon that runs under the scrubber head — a horizontal preview
// of what the sky will look like across the next 24 h, blending sunrise
// warmth into midday blue, evening amber, and night deep-blue. Uses per-day
// sunrise/sunset from the daily forecast so multi-day previews stay accurate.
function renderSkyRibbon(w) {
  if (!el.skyRibbon) return;
  const hours = (w.hourly || []).slice(0, 24);
  if (!hours.length) { el.skyRibbon.style.background = ""; return; }

  const stops = hours.map((h) => skyColorAt(h.time, w));
  const step = 100 / (stops.length - 1);
  const gradient = stops
    .map((c, i) => `${c} ${(i * step).toFixed(2)}%`)
    .join(", ");
  el.skyRibbon.style.background = `linear-gradient(90deg, ${gradient})`;
  el.skyRibbon.title = `Tap to jump to that hour`;
  updateSkyRibbonMarker(Date.now());
  placeSkyRibbonTick(el.skyRibbonSunrise, w?.sunrise, hours);
  placeSkyRibbonTick(el.skyRibbonSunset,  w?.sunset,  hours);
  // If tomorrow's sunrise/sunset fall inside the ribbon window (long enough
  // past 24h), skip — we don't want double markers. The 24-hour hourly window
  // is short enough that at most one sunrise + one sunset appear inside it.

  // Interactive: click a spot to scrub to that hour. Bound once, ref stored
  // on the element so setWeather re-renders don't accumulate listeners.
  if (!el.skyRibbon._boundSeek) {
    const seek = (ev) => {
      const hours = (state.weather?.hourly || []).slice(0, 24);
      if (!hours.length) return;
      const rect = el.skyRibbon.getBoundingClientRect();
      const x = clamp01(((ev.clientX ?? (ev.touches?.[0]?.clientX)) - rect.left) / rect.width);
      const idx = Math.round(x * (hours.length - 1));
      const ts = hours[idx]?.time;
      if (ts != null) state.handlers.onHourClick?.(ts);
    };
    el.skyRibbon.addEventListener("click", seek);
    el.skyRibbon._boundSeek = true;
  }
}

// Position a tick element at the point in the ribbon corresponding to `ts`.
// Hidden if the timestamp falls outside the ribbon window; when there's a
// tomorrow sun-time inside the window and today's has already passed, prefer
// tomorrow so the tick still shows.
function placeSkyRibbonTick(el, ts, hours) {
  if (!el) return;
  if (!hours?.length) { el.hidden = true; return; }
  const first = hours[0].time;
  const last = hours[hours.length - 1].time;
  // If today's ts already passed the window, try +24h (tomorrow's equivalent).
  let use = ts;
  if (use != null && use < first - 30 * 60_000) use = ts + 24 * 3600_000;
  if (use == null || use < first - 30 * 60_000 || use > last + 30 * 60_000) {
    el.hidden = true; return;
  }
  const t = clamp01((use - first) / Math.max(1, last - first));
  el.style.left = `${(t * 100).toFixed(2)}%`;
  el.hidden = false;
}

// Slide the marker to the right position for the given timestamp along the
// 24-hour hourly window. Hidden if the timestamp falls outside the window.
function updateSkyRibbonMarker(ts) {
  if (!el.skyRibbonMarker) return;
  const hours = (state.weather?.hourly || []).slice(0, 24);
  if (!hours.length || ts == null) { el.skyRibbonMarker.style.opacity = "0"; return; }
  const first = hours[0].time;
  const last = hours[hours.length - 1].time;
  if (ts < first - 30 * 60_000 || ts > last + 30 * 60_000) {
    el.skyRibbonMarker.style.opacity = "0";
    return;
  }
  const t = clamp01((ts - first) / Math.max(1, last - first));
  el.skyRibbonMarker.style.left = `${(t * 100).toFixed(2)}%`;
  el.skyRibbonMarker.style.opacity = "1";
}

// Given a timestamp and the weather (with daily sun times), return an rgba()
// color representing the dominant sky tone at that instant.
function skyColorAt(ts, w) {
  const day = pickClosestDay(w, ts);
  const sr = day?.sunrise, ss = day?.sunset;
  const dawnMs = 60 * 60_000;
  if (!sr || !ss) return "#26314a";
  if (ts < sr - dawnMs || ts > ss + dawnMs) return "#0b1224";  // deep night
  if (ts < sr) {
    const t = (dawnMs - (sr - ts)) / dawnMs; // 0 -> 1
    return blendHex("#0b1224", "#ff9c7a", t);  // night -> dawn warm
  }
  if (ts < sr + dawnMs) {
    const t = (ts - sr) / dawnMs;
    return blendHex("#ff9c7a", "#7cc0ff", t);  // dawn warm -> day blue
  }
  if (ts <= ss - dawnMs) {
    return "#7cc0ff";  // full day
  }
  if (ts <= ss) {
    const t = (ts - (ss - dawnMs)) / dawnMs;
    return blendHex("#7cc0ff", "#ff8a5c", t);  // day -> sunset orange
  }
  const t = (ts - ss) / dawnMs;
  return blendHex("#ff8a5c", "#0b1224", t);   // sunset -> night
}

function pickClosestDay(w, ts) {
  const days = w.daily || [];
  if (!days.length) return null;
  let best = days[0], bd = Infinity;
  for (const d of days) {
    if (!d.sunrise) continue;
    const centre = d.sunrise + 12 * 3600_000;
    const dist = Math.abs(ts - centre);
    if (dist < bd) { bd = dist; best = d; }
  }
  return best;
}

function blendHex(a, b, t) {
  const pa = parseHex(a), pb = parseHex(b);
  const c = (i) => Math.round(pa[i] + (pb[i] - pa[i]) * clamp01(t));
  return `rgb(${c(0)}, ${c(1)}, ${c(2)})`;
}
function parseHex(h) {
  const s = h.replace("#", "");
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

// Wind rose (next 12 h of wind direction, weighted by wind speed). Renders
// 16 radial petals inside the wind compass, scaled to fit around the needle.
function renderWindRose(w) {
  if (!el.windRose) return;
  const hours = (w.hourly || []).slice(0, 12).filter((h) => h.windDir != null);
  if (!hours.length) { el.windRose.innerHTML = ""; return; }
  const BINS = 16;
  const bins = new Array(BINS).fill(0);
  let maxWeight = 0;
  for (const h of hours) {
    const b = Math.floor(((h.windDir % 360) / 360) * BINS + 0.5) % BINS;
    const weight = Math.max(1, h.wind || 1);
    bins[b] += weight;
    if (bins[b] > maxWeight) maxWeight = bins[b];
  }
  if (maxWeight === 0) { el.windRose.innerHTML = ""; return; }
  // Compass viewBox is -24 -24 48 48 with radius 22. Petals grow inward from
  // the ring toward the centre, capped at ~14 units so the needle stays visible.
  const R_OUTER = 21;
  const MAX_PETAL = 12;
  const halfSectorDeg = 360 / BINS / 2;
  const parts = [];
  for (let i = 0; i < BINS; i++) {
    if (!bins[i]) continue;
    const t = bins[i] / maxWeight;
    const len = 3 + t * MAX_PETAL;
    const rInner = R_OUTER - len;
    const angleMid = (i * 360) / BINS;
    const a0 = (angleMid - halfSectorDeg) * Math.PI / 180 - Math.PI / 2;
    const a1 = (angleMid + halfSectorDeg) * Math.PI / 180 - Math.PI / 2;
    const p0 = { x: Math.cos(a0) * R_OUTER, y: Math.sin(a0) * R_OUTER };
    const p1 = { x: Math.cos(a1) * R_OUTER, y: Math.sin(a1) * R_OUTER };
    const p2 = { x: Math.cos(a1) * rInner, y: Math.sin(a1) * rInner };
    const p3 = { x: Math.cos(a0) * rInner, y: Math.sin(a0) * rInner };
    const d = `M${p0.x.toFixed(1)} ${p0.y.toFixed(1)} A${R_OUTER} ${R_OUTER} 0 0 1 ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L${p2.x.toFixed(1)} ${p2.y.toFixed(1)} A${rInner} ${rInner} 0 0 0 ${p3.x.toFixed(1)} ${p3.y.toFixed(1)} Z`;
    parts.push(`<path d="${d}" fill="currentColor" opacity="${(0.20 + t * 0.55).toFixed(2)}"/>`);
  }
  el.windRose.innerHTML = parts.join("");
}

// "Next change" narrator: scans the upcoming 12 h of hourly data and picks
// the first significant transition — rain onset/stop, big cloud swing,
// temperature dropping past a comfort threshold, or a big wind pickup.
function renderNextChange(w) {
  if (!el.nextChange) return;
  const hours = (w.hourly || []).filter((h) => h.time > Date.now()).slice(0, 12);
  if (hours.length < 3) { el.nextChange.hidden = true; return; }
  const tz = w.timezone;
  const clock = (ts) => new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit", hour12: false,
    ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });
  const inHours = (ts) => {
    const mins = Math.max(0, Math.round((ts - Date.now()) / 60_000));
    return mins < 60 ? `${mins}m` : `${Math.floor(mins/60)}h ${mins%60}m`;
  };

  // 1. Rain onset (dry -> wet).
  const currentlyDry = (w.hourly?.[0]?.precip ?? 0) < 0.1;
  if (currentlyDry) {
    const wet = hours.find((h) => (h.precip || 0) >= 0.4);
    if (wet) {
      return show(`Rain arrives in ${inHours(wet.time)} (${clock(wet.time)})`);
    }
  } else {
    // Rain stopping (wet -> dry).
    const dry = hours.find((h) => (h.precip || 0) < 0.1);
    if (dry) return show(`Rain eases around ${clock(dry.time)}`);
  }

  // 2. Big cloud swing (>=40% delta).
  const curCloud = w.cloudCover ?? hours[0]?.cloudCover;
  if (curCloud != null) {
    const clearing = hours.find((h) => h.cloudCover != null && curCloud - h.cloudCover >= 40);
    if (clearing) return show(`Clouds clearing around ${clock(clearing.time)}`);
    const clouding = hours.find((h) => h.cloudCover != null && h.cloudCover - curCloud >= 40);
    if (clouding) return show(`Clouds move in around ${clock(clouding.time)}`);
  }

  // 3. Wind picks up (>=15 km/h delta or gusts crossing 30).
  const curWind = w.windSpeed ?? hours[0]?.wind ?? 0;
  const windy = hours.find((h) => (h.wind ?? 0) - curWind >= 15 || (h.gusts ?? 0) >= 40);
  if (windy) return show(`Winds pick up around ${clock(windy.time)}`);

  // 4. Big temp swing (>=6°).
  const curT = w.temp ?? hours[0]?.temp;
  if (curT != null) {
    const cooler = hours.find((h) => curT - (h.temp ?? curT) >= 6);
    if (cooler) return show(`Cooling to ${Math.round(convertTemp(cooler.temp))}° by ${clock(cooler.time)}`);
    const warmer = hours.find((h) => (h.temp ?? curT) - curT >= 6);
    if (warmer) return show(`Warming to ${Math.round(convertTemp(warmer.temp))}° by ${clock(warmer.time)}`);
  }

  // Nothing significant.
  return show(`Steady conditions for the next ${hours.length} h`);

  function show(text) {
    el.nextChange.textContent = "· " + text;
    el.nextChange.hidden = false;
  }
}

// Wardrobe suggestion: one-line outfit tip driven by feels-like temperature,
// short-term rain risk, sun exposure, and wind. Doesn't repeat what the hazard
// advice pill already says; sticks to clothes.
function renderWardrobe(w) {
  if (!el.wardrobe) return;
  const feels = w.feelsLike ?? w.temp;
  if (feels == null) { el.wardrobe.hidden = true; return; }
  // Look ahead 6 h for rain / high UV so we can suggest an umbrella or hat.
  const soon = (w.hourly || []).filter((h) => h.time <= Date.now() + 6 * 3600_000);
  const rainSoon = soon.some((h) => (h.precip || 0) >= 0.5 || (h.pop || 0) >= 60);
  const uvHigh = soon.some((h) => (h.uv || 0) >= 6);
  const cloudy = (w.cloudCover ?? 100) >= 60;
  const wind = w.windSpeed ?? 0;
  const gusts = w.windGusts ?? 0;
  const heavyWind = wind >= 30 || gusts >= 45;
  const parts = [];
  // Base layer by feels-like °C (unit-aware display kept simple by using °C).
  if (feels <= -5) parts.push("Winter parka, hat and gloves");
  else if (feels <= 5) parts.push("Heavy coat and scarf");
  else if (feels <= 12) parts.push("Warm jacket and jeans");
  else if (feels <= 18) parts.push("Light sweater or long sleeve");
  else if (feels <= 24) parts.push("T-shirt weather");
  else if (feels <= 30) parts.push("Shorts and a t-shirt");
  else parts.push("Loose, breathable clothes and shade");
  if (rainSoon) parts.push("bring an umbrella");
  if (uvHigh && !cloudy && feels >= 12) parts.push("sunscreen + shades");
  if (heavyWind) parts.push("windbreaker");
  el.wardrobeText.textContent = parts.join(" · ");
  el.wardrobe.hidden = false;
}

// "Best moment today" pill: iterates today's remaining hourly entries,
// scores each on temp comfort + wind + precip probability + UV, and shows
// the peak as a tappable hero pill. Clicking scrubs to that hour.
function renderBestMoment(w) {
  if (!el.bestMoment) return;
  const now = Date.now();
  // Restrict to remaining daytime hours today.
  const tz = w.timezone;
  const today = w.daily?.[0];
  const cutoff = today?.sunset ?? (now + 12 * 3600_000);
  const daylightStart = today?.sunrise ?? now;
  const candidates = (w.hourly || []).filter(
    (h) => h.time > now && h.time < cutoff && h.time > daylightStart
  );
  if (!candidates.length) { el.bestMoment.hidden = true; return; }
  let best = null, bestScore = -Infinity;
  for (const h of candidates) {
    const score = comfortScore(h);
    if (score > bestScore) { bestScore = score; best = h; }
  }
  if (!best || bestScore < 45) { el.bestMoment.hidden = true; return; }
  const hh = new Date(best.time).toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit", hour12: false,
    ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });
  const t = Math.round(convertTemp(best.temp));
  const words =
    bestScore >= 85 ? "Prime moment" :
    bestScore >= 70 ? "Great window" :
    bestScore >= 55 ? "Best window" : "Best chance";
  const label = (best.label || best.condition || "").toLowerCase();
  el.bestMomentText.textContent = `${words} today · ${hh} · ${t}°${label ? " · " + label : ""}`;
  el.bestMoment.hidden = false;
  // Rebind fresh handler on each render so we always target the latest ts.
  el.bestMoment.onclick = () => state.handlers.onHourClick?.(best.time);
}

// Simple 0-100 comfort score used only by the best-moment pill.
function comfortScore(h) {
  const t = h.temp ?? 15;
  const wind = h.wind ?? 0;
  const gusts = h.gusts ?? 0;
  const pop = h.pop ?? 0;
  const uv = h.uv ?? 0;
  // Sweet spot 21°C, gaussian-ish falloff (±14° -> 0).
  const tempScore = Math.max(0, 100 - Math.pow((t - 21) / 1.4, 2) * 4);
  const windPenalty = Math.max(0, wind - 15) * 2 + Math.max(0, gusts - 25) * 1.5;
  const popPenalty = pop * 0.6;
  const uvPenalty = Math.max(0, uv - 7) * 6;
  return Math.max(0, Math.min(100, tempScore - windPenalty - popPenalty - uvPenalty));
}

// Cloud-cover ribbon: 24 cells tinted from clear (transparent blue) to
// overcast (dim grey). Tooltip on each cell reveals the hour + %.
function renderCloudStrip(w) {
  if (!el.cloudStrip) return;
  const hours = (w.hourly || []).slice(0, 24).filter((h) => h.cloudCover != null);
  if (!hours.length) { el.cloudStrip.hidden = true; el.cloudStrip.innerHTML = ""; return; }
  el.cloudStrip.hidden = false;
  const tz = w.timezone;
  el.cloudStrip.innerHTML = hours.map((h) => {
    const c = Math.max(0, Math.min(100, h.cloudCover));
    // Clear hours read as a saturated blue; overcast reads as heavier grey.
    // Alpha grows with cloudiness so the cover band stays legible.
    const r = Math.round(120 + (c / 100) * 90);
    const g = Math.round(190 - (c / 100) * 60);
    const b = Math.round(255 - (c / 100) * 80);
    const alpha = 0.35 + (c / 100) * 0.5;
    const hh = new Date(h.time).toLocaleTimeString(undefined, {
      hour: "2-digit", minute: "2-digit", hour12: false,
      ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
    });
    const label = c <= 15 ? "clear" : c <= 40 ? "few clouds" : c <= 75 ? "cloudy" : "overcast";
    return `<span class="cloud-cell" style="background: rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})" title="${hh} · ${Math.round(c)}% · ${label}"></span>`;
  }).join("");
}

// Stargazing tonight: combines cloud cover forecast over the night hours,
// moon illumination (bright moon washes out stars), and humidity (haze) into
// a 0-5 star rating with a headline verdict.
function renderStargaze(w) {
  if (!el.stargazeCard) return;
  // Determine "tonight" window: from the next sunset until tomorrow's sunrise.
  const today = w.daily?.[0];
  const tomorrow = w.daily?.[1];
  const now = Date.now();
  let ns, nr;
  if (today?.sunset && now < today.sunset && tomorrow?.sunrise) {
    // Still before sunset — tonight is today's sunset through tomorrow's rise.
    ns = today.sunset; nr = tomorrow.sunrise;
  } else if (today?.sunset && tomorrow?.sunrise) {
    // After sunset — use tonight (today.sunset -> tomorrow.sunrise).
    ns = today.sunset; nr = tomorrow.sunrise;
  } else {
    el.stargazeCard.hidden = true; return;
  }
  const nightHours = (w.hourly || []).filter((h) => h.time >= ns && h.time <= nr && h.cloudCover != null);
  if (!nightHours.length) {
    // Fallback: hide if we have no cloud data for tonight (e.g. next 24h window doesn't cover it).
    el.stargazeCard.hidden = true;
    return;
  }
  const avgCloud = nightHours.reduce((s, h) => s + h.cloudCover, 0) / nightHours.length;
  const avgHum = nightHours.reduce((s, h) => s + (h.humidity ?? 60), 0) / nightHours.length;
  const moonIllum = (w.moon?.illum ?? 0.5);
  // Score in 0..5. Weights: cloud 60%, moon 25%, humidity 15%.
  const cloudScore = Math.max(0, 1 - avgCloud / 100);            // 1 = clear
  const moonScore  = Math.max(0, 1 - moonIllum);                  // 1 = new moon
  const humScore   = Math.max(0, 1 - Math.max(0, avgHum - 60) / 40); // hazy above 60
  const raw = cloudScore * 0.6 + moonScore * 0.25 + humScore * 0.15;
  const stars = Math.max(0, Math.min(5, Math.round(raw * 5)));

  const headline =
    stars >= 5 ? "Prime skies" :
    stars >= 4 ? "Excellent" :
    stars >= 3 ? "Decent" :
    stars >= 2 ? "Some hope" :
    stars >= 1 ? "Poor" : "Washed out";
  const cloudDesc =
    avgCloud <= 15 ? "clear skies" :
    avgCloud <= 40 ? "some clouds" :
    avgCloud <= 70 ? "mostly cloudy" : "overcast";
  const moonDesc = `${Math.round(moonIllum * 100)}% moon`;
  // Find the calmest tonight-hour by wind (with cloud cover under 50% preferred).
  let calm = null;
  for (const h of nightHours) {
    if (h.wind == null) continue;
    if (!calm || h.wind < calm.wind) calm = h;
  }
  const tz = w.timezone;
  const calmChip = calm ? ` · calmest ${new Date(calm.time).toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit", hour12: false,
    ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  })}` : "";
  el.stargazeCard.hidden = false;
  el.stargazeHeadline.textContent = headline;
  el.stargazeDetail.textContent = `${cloudDesc} · ${moonDesc}${calmChip}`;
  // Render 5 star SVGs, filled up to `stars`.
  el.stargazeStars.innerHTML = Array.from({ length: 5 }, (_, i) =>
    `<svg class="star ${i < stars ? "on" : "off"}" viewBox="0 0 16 16" width="14" height="14"><path d="M8 1.5l1.9 4.3 4.6.5-3.5 3.2 1 4.6L8 11.8 3.9 14.1l1-4.6-3.5-3.2 4.6-.5z" fill="currentColor"/></svg>`
  ).join("");
  if (el.stargazeStatus) {
    const cls = stars >= 4 ? "up" : stars >= 2 ? "flat" : "down";
    el.stargazeStatus.className = `trend ${cls}`;
    el.stargazeStatus.textContent = `${stars}/5`;
  }
}

// Precipitation totals card: 24h total, today's remainder, wet-hour count,
// time-to-first-rain, and a tiny bar sparkline of hourly precipitation.
function renderPrecip(w) {
  if (!el.precipCard) return;
  const hours = (w.hourly || []).slice(0, 24);
  if (!hours.length) { el.precipCard.hidden = true; return; }
  const now = Date.now();
  // Sum next 24h of precipitation (mm).
  const total24 = hours.reduce((s, h) => s + (h.precip || 0), 0);
  // Sum precipitation left today (in the location's local timezone if we can).
  const tz = w.timezone;
  const endOfLocalDay = (() => {
    try {
      const d = tz && tz !== "auto"
        ? new Date(new Date().toLocaleString("en-US", { timeZone: tz }))
        : new Date();
      d.setHours(23, 59, 59, 999);
      const delta = d.getTime() - (tz && tz !== "auto"
        ? new Date(new Date().toLocaleString("en-US", { timeZone: tz })).getTime()
        : new Date().getTime());
      return Date.now() + delta;
    } catch { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); }
  })();
  const totalToday = hours
    .filter((h) => h.time <= endOfLocalDay)
    .reduce((s, h) => s + (h.precip || 0), 0);
  const wetHours = hours.filter((h) => (h.precip || 0) >= 0.1).length;
  const firstWet = hours.find((h) => (h.precip || 0) >= 0.1);
  const heaviest = hours.reduce((best, h) =>
    (h.precip || 0) > (best?.precip || 0) ? h : best, null);

  el.precipCard.hidden = false;
  el.precip24h.textContent = total24.toFixed(1);
  el.precipToday.textContent = totalToday > 0
    ? `Rest of today: ${totalToday.toFixed(1)} mm`
    : "Rest of today: dry";
  el.precipWet.textContent = wetHours === 0
    ? "No wet hours ahead"
    : `${wetHours} wet ${wetHours === 1 ? "hour" : "hours"} · peak ${(heaviest?.precip || 0).toFixed(1)} mm`;
  if (firstWet) {
    const mins = Math.max(0, Math.round((firstWet.time - now) / 60_000));
    const when = mins < 60 ? `${mins} min` : `${Math.floor(mins/60)}h ${mins%60}m`;
    el.precipFirst.textContent = `First rain in ${when}`;
  } else {
    el.precipFirst.textContent = "Dry stretch continues";
  }
  // Status pill: dry / passing / soggy.
  if (el.precipStatus) {
    let label = "Dry", cls = "flat";
    if (total24 >= 8) { label = "Wet"; cls = "down"; }
    else if (total24 >= 1) { label = "Passing"; cls = "up"; }
    el.precipStatus.className = `trend ${cls}`;
    el.precipStatus.textContent = label;
  }
  // Draw hourly sparkline.
  drawPrecipSpark(hours);
}

function drawPrecipSpark(hours) {
  const svg = el.precipSpark;
  if (!svg) return;
  const w = 240, h = 32;
  const max = Math.max(0.5, ...hours.map((x) => x.precip || 0));
  const barW = w / hours.length;
  const bars = hours.map((x, i) => {
    const bh = Math.max(1, ((x.precip || 0) / max) * (h - 2));
    const bx = i * barW + 0.6;
    const by = h - bh;
    const t = Math.min(1, (x.precip || 0) / (max || 1));
    const opacity = 0.25 + t * 0.7;
    return `<rect x="${bx.toFixed(2)}" y="${by.toFixed(2)}" width="${(barW-1.2).toFixed(2)}" height="${bh.toFixed(2)}" fill="currentColor" opacity="${opacity.toFixed(2)}" rx="0.8"/>`;
  }).join("");
  // Cumulative curve overlaid on the bars — a running total from left to right
  // scaled to the total 24 h precipitation. Helps visualise when rain adds up.
  const total = hours.reduce((s, x) => s + (x.precip || 0), 0);
  let cumulativePath = "";
  if (total > 0.05) {
    let running = 0;
    const pts = hours.map((x, i) => {
      running += x.precip || 0;
      const px = i * barW + barW / 2;
      const py = h - 2 - (running / total) * (h - 4);
      return `${px.toFixed(2)},${py.toFixed(2)}`;
    });
    cumulativePath = `<polyline points="${pts.join(" ")}" fill="none" stroke="#ffd680" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>` +
      `<circle cx="${((hours.length - 1) * barW + barW / 2).toFixed(2)}" cy="${(h - 2 - (h - 4)).toFixed(2)}" r="2" fill="#ffd680"/>`;
  }
  svg.innerHTML = bars + cumulativePath;
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
  renderWeekHighlights(days, w);
  renderWeekNarrative(days, w);
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
    // Day-to-day high delta (skipped for the first entry).
    let dayDeltaHtml = "";
    if (i > 0) {
      const prev = days[i - 1].tempMax;
      if (prev != null && d.tempMax != null) {
        const diff = d.tempMax - prev;
        const shown = state.unit === "F" ? diff * 9 / 5 : diff;
        if (Math.abs(shown) >= 2) {
          const arrow = shown > 0 ? "▲" : "▼";
          const cls = shown > 0 ? "up" : "down";
          dayDeltaHtml = `<span class="daily-delta-arrow ${cls}" aria-hidden="true">${arrow}${Math.abs(Math.round(shown))}°</span>`;
        }
      }
    }
    const left = ((d.tempMin - gMin) / span) * 100;
    const width = ((d.tempMax - d.tempMin) / span) * 100;
    const item = document.createElement("div");
    item.className = "daily-item";
    item.dataset.ts = d.time;
    const gustLabel = (d.gustsMax && d.gustsMax >= 25)
      ? ` · gusts ${Math.round(state.unit === "F" ? d.gustsMax * 0.621371 : d.gustsMax)} ${state.unit === "F" ? "mph" : "km/h"}`
      : "";
    const popLabel = d.pop >= 30 ? ` · ${d.pop}% rain` : "";
    // Peak time — the local hour of the day's high (only when we have hourly
    // coverage for that day, i.e. today and often tomorrow morning).
    const peakLabel = dailyPeakLabel(d, w);
    const extraBits = [popLabel, gustLabel, peakLabel].filter(Boolean).join("");
    const extra = extraBits ? `<span class="daily-gust">${extraBits}</span>` : "";
    item.innerHTML = `
      <span class="daily-day">${day}</span>
      <span class="daily-icon">${iconFor(d.condition)}</span>
      <div class="daily-range">
        <div class="daily-range-fill" style="left:${left}%;width:${Math.max(8, width)}%"></div>
      </div>
      <span class="daily-temp-min">${Math.round(convertTemp(d.tempMin))}°</span>
      <span class="daily-temp-max">${Math.round(convertTemp(d.tempMax))}°${dayDeltaHtml}</span>
      ${extra}
    `;
    item.addEventListener("click", () => toggleDailyExpand(item, d, w));
    el.dailyTrack.appendChild(item);
  });
}

// Return " · peak 14:00" when the day has enough hourly coverage to pinpoint
// its high; empty string otherwise.
function dailyPeakLabel(d, w) {
  const tz = w?.timezone;
  const dayStart = new Date(d.time); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = dayStart.getTime() + 24 * 3600_000;
  const hrs = (w?.hourly || []).filter((h) => h.time >= dayStart.getTime() && h.time < dayEnd);
  if (hrs.length < 6) return "";
  let peak = hrs[0];
  for (const h of hrs) if ((h.temp ?? -Infinity) > (peak.temp ?? -Infinity)) peak = h;
  const hh = new Date(peak.time).toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit", hour12: false,
    ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });
  return ` · peak ${hh}`;
}

// One-line narrator for the week — reads the trend of highs and the wet/dry
// pattern across the coming days and produces a short sentence like
// "Cool and cloudy until Thursday, then warming and clearing".
function renderWeekNarrative(days, w) {
  if (!el.weekNarrative) return;
  if (!days || days.length < 3) { el.weekNarrative.hidden = true; return; }
  const tz = w?.timezone;
  const dayName = (ts) => new Date(ts).toLocaleDateString(undefined, {
    weekday: "long", ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });
  // Overall temperature trend: linear slope over the week's highs.
  const highs = days.map((d) => d.tempMax).filter((v) => v != null);
  const slope = highs.length >= 3
    ? (highs[highs.length - 1] - highs[0]) / (highs.length - 1)
    : 0;
  // Wet days by index.
  const wetIdx = days.map((d, i) => (d.precip ?? 0) >= 2 ? i : -1).filter((i) => i >= 0);
  // Find the first day of a distinctly different regime (transition day).
  let transitionIdx = -1;
  for (let i = 1; i < days.length; i++) {
    const priorWet = (days[i - 1].precip ?? 0) >= 2;
    const nowWet = (days[i].precip ?? 0) >= 2;
    const priorHot = (days[i - 1].tempMax ?? 0) >= (highs[0] + 4);
    const nowHot   = (days[i].tempMax ?? 0)     >= (highs[0] + 4);
    if (priorWet !== nowWet || priorHot !== nowHot) { transitionIdx = i; break; }
  }
  const trendWord =
    slope > 0.8 ? "warming" :
    slope < -0.8 ? "cooling" : "steady";
  const wetPattern =
    wetIdx.length >= 4 ? "wet stretches most days" :
    wetIdx.length >= 2 ? "showers on and off" :
    wetIdx.length === 1 ? `some rain on ${dayName(days[wetIdx[0]].time)}` :
                          "mostly dry";
  let sentence;
  if (transitionIdx >= 2) {
    const beforeHot = (days[0].tempMax ?? 0) >= (days[transitionIdx].tempMax ?? 0);
    const before = beforeHot ? "warm early" : "cool early";
    const after = beforeHot ? "cooling later" : "warming later";
    sentence = `${before}, ${after} — ${wetPattern}.`;
  } else {
    sentence = `A ${trendWord} week — ${wetPattern}.`;
  }
  el.weekNarrative.textContent = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  el.weekNarrative.hidden = false;
}

// Compact "week highlights" strip: pill chips for warmest / coldest /
// wettest days across the 7-day forecast. Skipped for uninteresting weeks
// (all similar temps, all dry).
function renderWeekHighlights(days, w) {
  if (!el.weekHighlights) return;
  if (!days || days.length < 3) { el.weekHighlights.hidden = true; return; }
  const tz = w?.timezone;
  const dayName = (ts) => new Date(ts).toLocaleDateString(undefined, {
    weekday: "short", ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });
  let hottest = days[0], coldest = days[0], wettest = days[0];
  for (const d of days) {
    if ((d.tempMax ?? -Infinity) > (hottest.tempMax ?? -Infinity)) hottest = d;
    if ((d.tempMin ?? Infinity) < (coldest.tempMin ?? Infinity)) coldest = d;
    if ((d.precip ?? 0) > (wettest.precip ?? 0)) wettest = d;
  }
  const chips = [];
  // Only surface hottest/coldest if the range is meaningful (>4°).
  const range = (hottest.tempMax ?? 0) - (coldest.tempMin ?? 0);
  if (range >= 4) {
    chips.push(`<span class="wh-chip hot"><span>Warmest</span><strong>${dayName(hottest.time)} ${Math.round(convertTemp(hottest.tempMax))}°</strong></span>`);
    chips.push(`<span class="wh-chip cold"><span>Coolest</span><strong>${dayName(coldest.time)} ${Math.round(convertTemp(coldest.tempMin))}°</strong></span>`);
  }
  if ((wettest.precip ?? 0) >= 1) {
    chips.push(`<span class="wh-chip wet"><span>Wettest</span><strong>${dayName(wettest.time)} ${wettest.precip.toFixed(1)} mm</strong></span>`);
  }
  if (!chips.length) { el.weekHighlights.hidden = true; return; }
  el.weekHighlights.hidden = false;
  el.weekHighlights.innerHTML = chips.join("");
}

function renderDailyIconStrip(days) {
  if (!el.dailyIconStrip) return;
  const tz = state.weather?.timezone;
  el.dailyIconStrip.innerHTML = days.map((d) => {
    const dayName = new Date(d.time).toLocaleDateString(undefined, {
      weekday: "short", ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
    });
    const hi = d.tempMax != null ? `${Math.round(convertTemp(d.tempMax))}°` : "—";
    const lo = d.tempMin != null ? `${Math.round(convertTemp(d.tempMin))}°` : "—";
    const rain = (d.precip ?? 0) >= 0.1 ? ` · ${d.precip.toFixed(1)} mm` : "";
    const title = `${dayName} · ${d.label || d.condition || ""} · ${hi} / ${lo}${rain}`;
    return `<span class="strip-day" title="${escapeHtml(title)}">${iconFor(d.condition)}</span>`;
  }).join("");
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
    const gu = Math.round((state.unit === "F" ? (d.gustsMax ?? 0) * 0.621371 : (d.gustsMax ?? 0)));
    const gunit = state.unit === "F" ? "mph" : "km/h";
    summary.innerHTML = `<span style="padding:8px;color:var(--fg-dim);font-size:12px">Pop ${d.pop}% · gust up to ${gu} ${gunit} · UV ${Math.round(d.uvMax ?? 0)}</span>`;
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
function tempTone(c) {
  // Return a css class that tints the chip warm/cool based on temperature.
  if (c == null) return "";
  if (c <= 0) return "tone-icy";
  if (c <= 10) return "tone-cool";
  if (c <= 20) return "tone-mild";
  if (c <= 28) return "tone-warm";
  return "tone-hot";
}

function renderPlaces() {
  const all = places.all();
  if (!all.length) { el.placesStrip.hidden = true; el.placesStrip.innerHTML = ""; return; }
  el.placesStrip.hidden = false;
  const activeId = state.place ? places.idFor(state.place) : null;
  el.placesStrip.innerHTML = all.map((p) => {
    const active = places.idFor(p) === activeId;
    const tone = tempTone(p.temp);
    const hasTemp = p.temp != null;
    const iconMarkup = p.condition
      ? `<span class="place-glyph" aria-hidden="true">${iconFor(p.condition)}</span>`
      : `<span class="place-glyph placeholder" aria-hidden="true"></span>`;
    const tempMarkup = hasTemp
      ? `<span class="temp">${Math.round(convertTemp(p.temp))}°</span>`
      : `<span class="temp placeholder" aria-hidden="true">–</span>`;
    const titleAttr = p.label
      ? ` title="${escapeHtml(p.name)} · ${escapeHtml(p.label)}"`
      : ` title="${escapeHtml(p.name)}"`;
    return `
      <div class="place-chip ${active ? "active" : ""} ${tone}" data-id="${p.id}"${titleAttr} draggable="true">
        ${iconMarkup}
        <span class="place-name-text">${escapeHtml(p.name)}</span>
        ${tempMarkup}
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
      // Don't fire a switch click when the drag lifted a chip; browsers still
      // emit click after dragend. Skip if we just released a drop.
      if (state._justDropped && Date.now() - state._justDropped < 250) return;
      state.handlers.onPlaceClick?.(item);
    });
    chip.addEventListener("dragstart", (e) => {
      state._dragId = id;
      chip.classList.add("dragging");
      try { e.dataTransfer.setData("text/plain", id); e.dataTransfer.effectAllowed = "move"; } catch {}
    });
    chip.addEventListener("dragend", () => {
      chip.classList.remove("dragging");
      state._dragId = null;
      el.placesStrip.querySelectorAll(".drop-before").forEach((c) => c.classList.remove("drop-before"));
    });
    chip.addEventListener("dragover", (e) => {
      if (!state._dragId || state._dragId === id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      el.placesStrip.querySelectorAll(".drop-before").forEach((c) => c.classList.remove("drop-before"));
      chip.classList.add("drop-before");
    });
    chip.addEventListener("drop", (e) => {
      e.preventDefault();
      const fromId = state._dragId;
      if (!fromId || fromId === id) return;
      places.reorder(fromId, id);
      state._justDropped = Date.now();
      renderPlaces();
    });
  });
  // Also allow dropping at the very end of the strip.
  el.placesStrip.addEventListener("dragover", (e) => {
    if (!state._dragId) return;
    e.preventDefault();
  });
  el.placesStrip.addEventListener("drop", (e) => {
    if (!state._dragId) return;
    // Only handle drops that missed a chip (i.e. beyond the last one).
    if (e.target.closest(".place-chip")) return;
    e.preventDefault();
    places.reorder(state._dragId, null);
    state._justDropped = Date.now();
    renderPlaces();
  });
  // Kick off background refresh of stale/missing chip summaries.
  refreshPlaceSummaries();
  renderCityDeltas();
}

// Render a compact row of "London −3° · Tokyo +8°" chips comparing saved
// cities' current temperature against the active city's. Hidden when only
// the active city is saved or no summaries have arrived yet.
function renderCityDeltas() {
  if (!el.cityDeltas) return;
  const all = places.all();
  const activeId = state.place ? places.idFor(state.place) : null;
  const anchorTemp = state.weather?.temp;
  if (anchorTemp == null) { el.cityDeltas.hidden = true; return; }
  const others = all.filter((p) => places.idFor(p) !== activeId && p.temp != null);
  if (!others.length) { el.cityDeltas.hidden = true; return; }
  const parts = others.slice(0, 4).map((p) => {
    const delta = p.temp - anchorTemp;
    const unitDelta = state.unit === "F" ? delta * 9 / 5 : delta;
    const rounded = Math.round(unitDelta);
    if (rounded === 0) {
      return `<span class="city-delta flat" data-id="${p.id}"><strong>${escapeHtml(p.name)}</strong><span>same</span></span>`;
    }
    const sign = rounded > 0 ? "+" : "−";
    const cls = rounded > 0 ? "warmer" : "cooler";
    return `<span class="city-delta ${cls}" data-id="${p.id}"><strong>${escapeHtml(p.name)}</strong><span>${sign}${Math.abs(rounded)}°</span></span>`;
  });
  el.cityDeltas.hidden = false;
  el.cityDeltas.innerHTML = parts.join("");
  el.cityDeltas.querySelectorAll(".city-delta").forEach((chip) => {
    chip.addEventListener("click", () => {
      const p = all.find((x) => x.id === chip.dataset.id);
      if (p) state.handlers.onPlaceClick?.(p);
    });
  });
}

// Fetch a lightweight "current conditions" summary for every saved place that
// doesn't have a fresh one, and patch the chip in place as each resolves.
// Skips the currently-loaded place — that one is refreshed by the main load.
let _summaryInFlight = new Set();
async function refreshPlaceSummaries() {
  const all = places.all();
  const activeId = state.place ? places.idFor(state.place) : null;
  const stale = all.filter((p) =>
    places.idFor(p) !== activeId &&
    places.isStale(p) &&
    !_summaryInFlight.has(p.id)
  );
  if (!stale.length) return;
  // Limit parallelism to be gentle with the API.
  const CONCURRENCY = 3;
  let idx = 0;
  async function worker() {
    while (idx < stale.length) {
      const p = stale[idx++];
      _summaryInFlight.add(p.id);
      try {
        const s = await getCurrentSummary(p.lat, p.lon);
        if (s) {
          places.updateSummary(p, {
            temp: s.temp,
            condition: s.condition,
            label: s.label,
          });
          patchChip(p.id, s);
        }
      } finally {
        _summaryInFlight.delete(p.id);
      }
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, stale.length) }, worker);
  await Promise.all(workers);
}

function patchChip(id, s) {
  // Also refresh the deltas row so newly-arrived summaries show up there.
  renderCityDeltas();
  const chip = el.placesStrip?.querySelector(`.place-chip[data-id="${CSS.escape(id)}"]`);
  if (!chip) return;
  // Update tone class in place.
  const tone = tempTone(s.temp);
  chip.classList.remove("tone-icy", "tone-cool", "tone-mild", "tone-warm", "tone-hot");
  if (tone) chip.classList.add(tone);
  // Swap glyph.
  const glyph = chip.querySelector(".place-glyph");
  if (glyph) {
    glyph.classList.remove("placeholder");
    glyph.innerHTML = iconFor(s.condition);
  }
  // Swap temperature.
  const temp = chip.querySelector(".temp");
  if (temp) {
    temp.classList.remove("placeholder");
    temp.textContent = `${Math.round(convertTemp(s.temp))}°`;
    temp.classList.remove("chip-fade-in"); void temp.offsetWidth;
    temp.classList.add("chip-fade-in");
  }
  // Update title.
  const name = chip.querySelector(".place-name-text")?.textContent || "";
  chip.setAttribute("title", `${name} · ${s.label}`);
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
    updateDocumentTitle(state.weather);
  });
}

function bindLocate() {
  el.locateBtn.addEventListener("click", () => state.handlers.onLocate?.());
}

function bindAudio() {
  el.audioBtn.addEventListener("click", () => state.handlers.onAudioToggle?.());
}

let deferredInstallPrompt = null;
// Set the browser tab title to show current temp + a condition emoji so it's
// legible in a background tab. Only touches document.title when the values
// are ready; falls back to the static app name.
const CONDITION_EMOJI = {
  clear: "☀️", clouds: "☁️", rain: "🌧️", snow: "❄️",
  storm: "⛈️", fog: "🌫️",
};
function updateDocumentTitle(w) {
  if (w?.temp == null) { document.title = "Aether — Interactive Weather"; return; }
  const emoji = CONDITION_EMOJI[w.condition] || "🌤️";
  const t = Math.round(state.unit === "F" ? w.temp * 9 / 5 + 32 : w.temp);
  const place = state.place?.name ? ` · ${state.place.name}` : "";
  document.title = `${emoji} ${t}°${state.unit}${place} — Aether`;
  updateFavicon(w);
}

// Swap the tab favicon SVG based on current condition + day/night so a
// glance at the tab shows the weather even before the title fits.
function updateFavicon(w) {
  const link = document.querySelector('link[rel="icon"]');
  if (!link) return;
  const svg = buildFaviconSvg(w.condition, !!w.isDay);
  link.setAttribute("href", `data:image/svg+xml,${encodeURIComponent(svg)}`);
}

function buildFaviconSvg(condition, isDay) {
  const body = isDay ? "#fff1c9" : "#c7d3ff";
  const bg = "#0b1020";
  const cloud = "#c9d7e6";
  const rain = "#7cc0ff";
  const snow = "#ffffff";
  const bolt = "#ffd35a";
  // 64x64 SVG. Everything sits inside a rounded square for a proper favicon.
  const wrap = (inner) => `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='12' fill='${bg}'/>${inner}</svg>`;
  switch (condition) {
    case "clear":
      return wrap(`<circle cx='32' cy='32' r='16' fill='${body}'/>`);
    case "clouds":
      return wrap(`<circle cx='42' cy='24' r='10' fill='${body}' opacity='0.8'/><path d='M18 42a8 8 0 010-16 10 10 0 0119-2 8 8 0 011 16H18z' fill='${cloud}'/>`);
    case "rain":
      return wrap(`<path d='M18 34a8 8 0 010-16 10 10 0 0119-2 8 8 0 011 16H18z' fill='${cloud}'/><path d='M22 46l-2 6M32 46l-2 6M42 46l-2 6' stroke='${rain}' stroke-width='3' stroke-linecap='round'/>`);
    case "snow":
      return wrap(`<path d='M18 34a8 8 0 010-16 10 10 0 0119-2 8 8 0 011 16H18z' fill='${cloud}'/><circle cx='22' cy='50' r='3' fill='${snow}'/><circle cx='32' cy='50' r='3' fill='${snow}'/><circle cx='42' cy='50' r='3' fill='${snow}'/>`);
    case "storm":
      return wrap(`<path d='M18 30a8 8 0 010-16 10 10 0 0119-2 8 8 0 011 16H18z' fill='${cloud}'/><path d='M30 32l-6 12h6l-4 12 12-16h-6l6-8z' fill='${bolt}'/>`);
    case "fog":
      return wrap(`<path d='M12 24h40M8 34h48M14 44h36M18 54h28' stroke='${cloud}' stroke-width='4' stroke-linecap='round'/>`);
    default:
      return wrap(`<circle cx='32' cy='32' r='16' fill='${body}'/>`);
  }
}

// Screen wake lock — best-effort. Held while the user is actively scrubbing
// so the phone doesn't dim mid-exploration. Silently no-ops on browsers
// without the Wake Lock API, or if a prior release rejected.
let _wakeLock = null;
async function acquireWakeLock() {
  if (_wakeLock || !("wakeLock" in navigator)) return;
  try {
    _wakeLock = await navigator.wakeLock.request("screen");
    _wakeLock.addEventListener?.("release", () => { _wakeLock = null; });
  } catch { _wakeLock = null; }
}
function releaseWakeLock() {
  if (!_wakeLock) return;
  try { _wakeLock.release(); } catch {}
  _wakeLock = null;
}
// If the tab is hidden, drop the lock cleanly.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) releaseWakeLock();
});

// Swipe left/right on the hero to cycle to the next/previous saved city.
// Only fires when there are 2+ saved places; the tilt binding on the same
// element is unaffected.
function bindHeroSwipe() {
  if (!el.heroInner) return;
  let startX = null, startY = null, active = false;
  el.heroInner.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX; startY = e.touches[0].clientY; active = true;
  }, { passive: true });
  el.heroInner.addEventListener("touchmove", (e) => {
    if (!active || startX == null) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    // If motion is clearly vertical, cancel the swipe intent.
    if (Math.abs(dy) > Math.abs(dx) + 6) active = false;
  }, { passive: true });
  el.heroInner.addEventListener("touchend", (e) => {
    if (!active || startX == null) { startX = null; return; }
    const dx = (e.changedTouches[0]?.clientX ?? startX) - startX;
    const dy = (e.changedTouches[0]?.clientY ?? startY) - startY;
    startX = startY = null; active = false;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) - 20) return;
    const dir = dx < 0 ? 1 : -1;   // swipe left -> next
    state.handlers.onCyclePlace?.(dir);
  }, { passive: true });
}

function bindChartFullscreen() {
  if (!el.chartFullBtn || !el.chartCard) return;
  const toggle = () => {
    const on = el.chartCard.getAttribute("data-fullscreen") !== "true";
    el.chartCard.setAttribute("data-fullscreen", on ? "true" : "false");
    el.chartFullBtn.setAttribute("aria-label", on ? "Collapse chart" : "Expand chart");
    el.chartFullBtn.setAttribute("title", on ? "Collapse chart" : "Expand chart");
    document.documentElement.setAttribute("data-chart-fullscreen", on ? "true" : "false");
  };
  el.chartFullBtn.addEventListener("click", toggle);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && el.chartCard.getAttribute("data-fullscreen") === "true") toggle();
  });
}

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
  const dot = document.getElementById("place-live-dot");
  const update = () => {
    const at = state.weather?.fetchedAt;
    if (!at) {
      if (el.fetchedAgo) el.fetchedAgo.textContent = "";
      if (dot) dot.dataset.freshness = "unknown";
      return;
    }
    const ms = Date.now() - at;
    const minutes = Math.max(0, Math.floor(ms / 60_000));
    if (el.fetchedAgo) {
      const label =
        minutes < 1 ? "Just now" :
        minutes < 60 ? `Updated ${minutes}m ago` :
        `Updated ${Math.floor(minutes / 60)}h ago`;
      el.fetchedAgo.textContent = "· " + label;
      el.fetchedAgo.classList.toggle("stale", minutes >= 20);
    }
    if (dot) {
      // Map data age to a semantic freshness bucket picked up by CSS.
      const bucket =
        minutes < 5   ? "fresh" :
        minutes < 20  ? "aging" :
        minutes < 60  ? "stale" :
                        "old";
      dot.dataset.freshness = bucket;
    }
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
      `Wind ${Math.round(unit === "F" ? w.windSpeed * 0.621371 : w.windSpeed)} ${unit === "F" ? "mph" : "km/h"}${w.windDir != null ? ` ${cardinal(w.windDir)}` : ""}`,
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
