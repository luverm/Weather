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
import { findBestDay } from "./best-day.js";
import { tellStory } from "./story.js";

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
  story: $("#story"),
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
  aqHealthTip: $("#aq-health-tip"),
  moonLit: $("#moon-lit"),
  moonName: $("#moon-name"),
  moonIllum: $("#moon-illum"),
  moonNext: $("#moon-next"),
  sunRise: $("#sun-rise"),
  sunSet: $("#sun-set"),
  sunDaylight: $("#sun-daylight"),
  sunCountdown: $("#sun-countdown"),
  sunNextLabel: $("#sun-next-label"),
  sunPhaseBadge: $("#sun-phase-badge"),
  sunPhaseIcon: $("#sun-phase-icon"),
  sunPhaseText: $("#sun-phase-text"),
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
  pressureNeedle: $("#pressure-needle"),
  pressureTrendArc: $("#pressure-trend-arc"),
  humiditySparkLine: $("#humidity-spark-line"),
  humiditySparkFill: $("#humidity-spark-fill"),
  dewScaleMarker: $("#dew-scale-marker"),
  uvScaleMarker: $("#uv-scale-marker"),
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
  settingGeolocate: $("#setting-geolocate"),
  settingClearPlaces: $("#setting-clear-places"),
  chartPopover: $("#chart-popover"),
  insightsCard: $("#insights-card"),
  insightsList: $("#insights-list"),
  activityCard: $("#activity-card"),
  activityList: $("#activity-list"),
  visibilityCard: $("#visibility-card"),
  visibilityValue: $("#visibility-value"),
  visibilityDesc: $("#visibility-desc"),
  visibilityArc: $("#visibility-arc"),
  visibilityMarker: $("#visibility-marker"),
  visibilityLevel: $("#visibility-level"),
  alertsStrip: $("#alerts-strip"),
  sunArcMarker: $("#sun-arc-marker"),
  sunArcPath: $("#sun-arc-path"),
  comfortStrip: $("#comfort-strip"),
  precipStrip: $("#precip-strip"),
  precipStripBars: $("#precip-strip-bars"),
  precipStripTotal: $("#precip-strip-total"),
  windStrip: $("#wind-strip"),
  windStripArrows: $("#wind-strip-arrows"),
  windStripNote: $("#wind-strip-note"),
  yesterdayDelta: $("#yesterday-delta"),
  ydArrow: $("#yd-arrow"),
  ydText: $("#yd-text"),
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
  brandBtn: $("#brand-btn"),
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
  sunPhaseTimer: null,
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
    bindBrand();
    applyStoredPreferences();
    renderPlaces();
    startFetchedTicker();
    maybeShowFirstVisitTip();
    state.chart = new HourlyChart({
      svgEl: el.chartSvg,
      hoverEl: el.chartHover,
      popoverEl: el.chartPopover,
      legendEl: document.querySelector(".chart-legend"),
      onHoverHour: (ts) => state.handlers.onHourClick?.(ts),
      getUnit: () => state.unit,
      getTimezone: () => state.weather?.timezone,
      getDaily: () => state.weather?.daily,
      getYesterday: () => state.weather?.yesterday?.series,
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
    updatePageTitle(weather);
    renderLiveValues(weather);
    document.documentElement.removeAttribute("data-loading");
    // Momentary "pulse once" cue on the brand mark that fresh data landed.
    if (el.brandBtn) {
      el.brandBtn.classList.add("just-tapped");
      setTimeout(() => el.brandBtn.classList.remove("just-tapped"), 500);
    }
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
    renderVisibility(weather);
    renderAlerts(weather);
    renderWeekend(weather);
    startLocaltime(weather);
    if (state.chart) state.chart.setHours(weather.hourly);
    if (state.comfortStrip) state.comfortStrip.setHours(weather.hourly);
    renderPrecipStrip(weather);
    renderWindStrip(weather);
    renderYesterdayDelta(weather);
    if (el.narrative) el.narrative.textContent = narrative || "";
    if (el.story) {
      const line = tellStory(weather);
      el.story.textContent = line;
      el.story.hidden = !line;
    }
    if (weather.offline) ui.showToast("Offline — showing sample weather");
    // Save summary for the strip so chips can show current temp.
    if (state.place) {
      places.updateSummary(state.place, {
        temp: weather.temp,
        condition: weather.condition,
        label: weather.label,
        isDay: weather.isDay,
        tempMin: weather.daily?.[0]?.tempMin,
        tempMax: weather.daily?.[0]?.tempMax,
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
      el.hintText.innerHTML = 'Press <kbd>N</kbd> to return to live.';
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
  haptic(pattern = 20) {
    try { navigator.vibrate?.(pattern); } catch { /* best-effort */ }
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
  // Append a cloud-cover hint to the condition label when it adds info
  // beyond what the label already says.
  let condition = capitalize(w.label);
  if (w.cloudCover != null && w.condition === "clear" && w.cloudCover >= 20) {
    condition = `${condition} · ${Math.round(w.cloudCover)}% cloud`;
  } else if (w.cloudCover != null && w.condition === "clouds") {
    condition = `${condition} · ${Math.round(w.cloudCover)}%`;
  }
  // Prepend a tiny glyph when it fits — matches the glyph in the page title.
  const glyph = (w.isDay === false && w.condition === "clear") ? "🌙" : CONDITION_GLYPHS[w.condition];
  el.conditionLabel.textContent = glyph ? `${glyph} ${condition}` : condition;
  const diff = (w.feelsLike ?? w.temp) - w.temp;
  const absDiff = Math.abs(Math.round(state.unit === "F" ? diff * 9 / 5 : diff));
  let feelsSuffix = "";
  if (absDiff >= 3) {
    feelsSuffix = diff > 0 ? ` — ${absDiff}° warmer` : ` — ${absDiff}° colder`;
  }
  el.feelsLike.textContent = `Feels like ${Math.round(feels)}°${feelsSuffix}`;
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
    const parent = el.windNeedle.closest(".wind-compass");
    if (parent) parent.setAttribute("title", `From ${dirLabel} (${Math.round(dir)}°)`);
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
    ? `dew ${Math.round(convertTemp(w.dewPoint))}°${describeDew(w.dewPoint)}`
    : "dew —";
  if (el.dewScaleMarker) {
    if (w.dewPoint == null) {
      el.dewScaleMarker.style.opacity = "0";
    } else {
      // Dew-point scale 0..26 °C (dry → oppressive).
      const frac = Math.max(0, Math.min(1, w.dewPoint / 26));
      el.dewScaleMarker.style.left = `${(frac * 100).toFixed(1)}%`;
      el.dewScaleMarker.style.opacity = "1";
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
  el.metricPressure.textContent = Math.round(w.pressure ?? 0);
  el.metricPressureSub.textContent = w.cloudCover != null
    ? `clouds ${Math.round(w.cloudCover)}%`
    : "clouds —";
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
    if (w.uv == null) {
      el.uvScaleMarker.style.opacity = "0";
    } else {
      // UV scale 0..12 maps across the bar.
      const frac = Math.max(0, Math.min(1, w.uv / 12));
      el.uvScaleMarker.style.left = `${(frac * 100).toFixed(1)}%`;
      el.uvScaleMarker.style.opacity = "1";
    }
  }
  renderHumiditySparkline(w);
  renderPressureDial(w);
}

function renderPressureDial(w) {
  if (!el.pressureNeedle) return;
  // Map 980..1040 hPa to -90°..+90° (half circle).
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const toDeg = (hPa) => {
    const t = (clamp(hPa, 980, 1040) - 980) / 60;
    return -90 + t * 180;
  };
  const p = w.pressure;
  if (p == null) {
    el.pressureNeedle.setAttribute("transform", "rotate(0)");
    if (el.pressureTrendArc) el.pressureTrendArc.setAttribute("d", "");
    return;
  }
  const curDeg = toDeg(p);
  el.pressureNeedle.setAttribute("transform", `rotate(${curDeg.toFixed(1)})`);

  // Trend arc: from pressure-3h-ago to current.
  if (el.pressureTrendArc && w.pressureTrend) {
    const past = p - w.pressureTrend.delta;
    const pastDeg = toDeg(past);
    const r = 40;
    const a1 = (Math.min(pastDeg, curDeg) - 90) * Math.PI / 180;
    const a2 = (Math.max(pastDeg, curDeg) - 90) * Math.PI / 180;
    const x1 = (r * Math.cos(a1)).toFixed(2);
    const y1 = (r * Math.sin(a1)).toFixed(2);
    const x2 = (r * Math.cos(a2)).toFixed(2);
    const y2 = (r * Math.sin(a2)).toFixed(2);
    if (Math.abs(pastDeg - curDeg) < 0.5) {
      el.pressureTrendArc.setAttribute("d", "");
    } else {
      el.pressureTrendArc.setAttribute("d", `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`);
    }
  } else if (el.pressureTrendArc) {
    el.pressureTrendArc.setAttribute("d", "");
  }
}

function describeDew(dew) {
  // Returns a parenthetical tag matched to dew-point comfort (°C).
  if (dew < 10) return " · crisp";
  if (dew < 13) return " · pleasant";
  if (dew < 16) return " · comfy";
  if (dew < 19) return " · sticky";
  if (dew < 22) return " · humid";
  return " · oppressive";
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

const CONDITION_GLYPHS = {
  clear: "☀",
  clouds: "⛅",
  rain: "🌧",
  snow: "🌨",
  storm: "⛈",
  fog: "🌫",
};

function updatePageTitle(w) {
  if (!w || w.temp == null) {
    document.title = "Aether — Interactive Weather";
    return;
  }
  const g = (w.isDay === false && w.condition === "clear") ? "🌙" : CONDITION_GLYPHS[w.condition] || "•";
  const temp = Math.round(convertTemp(w.temp));
  const name = state.place?.name || "Here";
  document.title = `${g} ${temp}° ${name} · Aether`;
  updateFavicon(w, temp);
}

function updateFavicon(w, temp) {
  const tempColor = (() => {
    const t = w.temp ?? 15;
    if (t <= 0) return "#9ad1ff";
    if (t <= 10) return "#b5e0ff";
    if (t <= 18) return "#cfe8b7";
    if (t <= 26) return "#ffd680";
    if (t <= 32) return "#ff9c6a";
    return "#ff6666";
  })();
  const bg = (w.isDay === false && w.condition === "clear") ? "#0b1020" : (w.condition === "storm" ? "#1a1830" : "#0b1020");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
    <rect width='64' height='64' rx='14' fill='${bg}'/>
    <text x='32' y='40' text-anchor='middle' font-family='-apple-system,Segoe UI,sans-serif' font-weight='700' font-size='30' fill='${tempColor}'>${temp}°</text>
  </svg>`.replace(/\s+/g, " ");
  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

function renderHumiditySparkline(w) {
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
  if (aq.aqi != null) {
    el.aqCard.setAttribute("aria-label", `Air quality index ${Math.round(aq.aqi)}, ${aq.label || ""}`);
  }
  el.aqValue.textContent = aq.aqi != null ? Math.round(aq.aqi) : "—";
  el.aqLabel.textContent = aq.label || "—";
  // Circumference of r=20 is ~125.66 — we use 126 in the SVG.
  const frac = Math.max(0, Math.min(1, (aq.aqi ?? 0) / 200));
  el.aqArc.setAttribute("stroke-dashoffset", String(126 * (1 - frac)));
  el.aqDetail.textContent =
    `PM2.5 ${aq.pm25 != null ? Math.round(aq.pm25) : "—"} · O₃ ${aq.o3 != null ? Math.round(aq.o3) : "—"}`;
  renderAqTrend(aq);
  renderAqHealthTip(aq);
}

function renderAqHealthTip(aq) {
  if (!el.aqHealthTip) return;
  const tip = aqHealthTip(aq);
  if (!tip) {
    el.aqHealthTip.hidden = true;
    el.aqHealthTip.textContent = "";
    return;
  }
  el.aqHealthTip.hidden = false;
  el.aqHealthTip.textContent = tip;
}

function aqHealthTip(aq) {
  const v = aq?.aqi;
  if (v == null) return "";
  if (v > 300) return "Hazardous — stay indoors, run a HEPA purifier if possible.";
  if (v > 200) return "Very unhealthy — avoid strenuous outdoor activity.";
  if (v > 150) return "Unhealthy — sensitive groups should limit prolonged outdoor exertion.";
  if (v > 100) return "Moderate — unusually sensitive people may feel symptoms.";
  return "";
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
    // Show whichever upcoming event (full or new) is nearer.
    const full = moon.daysToFull, nnew = moon.daysToNew;
    let next = null;
    if (full != null && (nnew == null || full <= nnew)) {
      next = { kind: "Full moon", days: full };
    } else if (nnew != null) {
      next = { kind: "New moon", days: nnew };
    }
    if (!next || next.days > 30) {
      el.moonNext.hidden = true;
    } else {
      el.moonNext.hidden = false;
      el.moonNext.textContent = next.days === 1
        ? `${next.kind} tomorrow`
        : `${next.kind} in ${next.days} days`;
    }
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
    el.sunDaylight.textContent = `${hh}h ${mm}m`;
  } else el.sunDaylight.textContent = "—";
  scheduleSunCountdown(w);
  scheduleSunArc(w);
  scheduleSunPhaseBadge(w);
}

function scheduleSunPhaseBadge(w) {
  if (!el.sunPhaseBadge || !el.sunPhaseIcon || !el.sunPhaseText) return;
  if (state.sunPhaseTimer) { clearInterval(state.sunPhaseTimer); state.sunPhaseTimer = null; }
  const update = () => {
    const phase = currentSunPhase(w);
    if (!phase) { el.sunPhaseBadge.hidden = true; return; }
    el.sunPhaseBadge.hidden = false;
    el.sunPhaseBadge.dataset.kind = phase.kind;
    el.sunPhaseIcon.textContent = phase.icon;
    el.sunPhaseText.textContent = phase.text;
  };
  update();
  state.sunPhaseTimer = setInterval(update, 60_000);
}

function currentSunPhase(w) {
  const now = Date.now();
  const WIN = 45 * 60_000;
  // Scan daily for a sunrise/sunset within ±45 min of now.
  for (const d of (w.daily || [])) {
    if (d.sunrise) {
      const delta = now - d.sunrise;
      if (Math.abs(delta) < WIN) {
        // Pre-sunrise = blue hour; post-sunrise = golden hour.
        if (delta < 0) {
          return { kind: "blue", icon: "✦", text: `Blue hour — sunrise in ${Math.round(-delta / 60_000)}m` };
        }
        return { kind: "golden", icon: "☀", text: `Golden hour — ${Math.round(delta / 60_000)}m since sunrise` };
      }
    }
    if (d.sunset) {
      const delta = now - d.sunset;
      if (Math.abs(delta) < WIN) {
        if (delta < 0) {
          return { kind: "golden", icon: "☀", text: `Golden hour — sunset in ${Math.round(-delta / 60_000)}m` };
        }
        return { kind: "blue", icon: "✦", text: `Blue hour — ${Math.round(delta / 60_000)}m after sunset` };
      }
    }
  }
  return null;
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
    <li data-i="${i}" ${it.ts ? `data-ts="${it.ts}" style="cursor:pointer"` : ""} ${it.tone ? `data-tone="${escapeHtml(it.tone)}"` : ""}>
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
  const topSeverity = visible.reduce((max, a) => {
    const rank = { info: 1, warn: 2, danger: 3 };
    return Math.max(max, rank[a.severity] || 0);
  }, 0);
  // Expose on <html> so the hero/background can respond.
  document.documentElement.setAttribute(
    "data-alert-severity",
    topSeverity ? String(topSeverity) : ""
  );
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

function renderPrecipStrip(w) {
  if (!el.precipStrip || !el.precipStripBars) return;
  const hours = (w.hourly || []).slice(0, 24);
  if (!hours.length) {
    el.precipStrip.hidden = true;
    return;
  }
  const totalMm = hours.reduce((s, h) => s + (h.precip ?? 0), 0);
  // Hide the strip entirely on bone-dry days — otherwise we show a row of flat
  // 0-mm bars that adds no information.
  if (totalMm < 0.1 && !hours.some((h) => (h.pop ?? 0) >= 30)) {
    el.precipStrip.hidden = true;
    return;
  }
  el.precipStrip.hidden = false;
  const peakMm = Math.max(0.3, ...hours.map((h) => h.precip ?? 0));
  const peakHour = hours.reduce((best, h) => (h.precip > (best?.precip ?? -1) ? h : best), null);
  const peakStr = peakHour && peakHour.precip > 0.05
    ? ` · peak ${peakHour.precip.toFixed(1)} mm at ${fmtTime(peakHour.time)}`
    : "";
  el.precipStripTotal.textContent = `${totalMm.toFixed(1)} mm in 24 h${peakStr}`;
  if (peakHour && peakHour.precip > 0.05) {
    el.precipStripTotal.style.cursor = "pointer";
    el.precipStripTotal.setAttribute("role", "button");
    el.precipStripTotal.setAttribute("tabindex", "0");
    el.precipStripTotal.setAttribute("title", "Click to scrub to peak rain hour");
    el.precipStripTotal.onclick = () => state.handlers.onHourClick?.(peakHour.time);
    el.precipStripTotal.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        state.handlers.onHourClick?.(peakHour.time);
      }
    };
  } else {
    el.precipStripTotal.style.cursor = "default";
    el.precipStripTotal.removeAttribute("role");
    el.precipStripTotal.removeAttribute("tabindex");
    el.precipStripTotal.removeAttribute("title");
    el.precipStripTotal.onclick = null;
    el.precipStripTotal.onkeydown = null;
  }

  const kindColor = (h) => {
    // Snow conditions get a cooler hue; rain stays blue.
    if (h.condition === "snow") return "#dfe9ff";
    if ((h.pop ?? 0) >= 70) return "#4aa0ff";
    if ((h.pop ?? 0) >= 40) return "#6cb7ff";
    return "#88c6ff";
  };

  el.precipStripBars.innerHTML = hours.map((h, i) => {
    const popPct = Math.round(h.pop ?? 0);
    const mm = h.precip ?? 0;
    const hgt = mm > 0 ? Math.max(3, Math.min(32, (mm / peakMm) * 32)) : 0;
    const popHgt = mm === 0 ? Math.round(popPct * 0.22) : 0; // ghost bar when 0mm but chance exists
    const totalH = Math.max(hgt, popHgt);
    const bg = kindColor(h);
    const alpha = mm > 0 ? 0.95 : 0.3;
    const hh = new Date(h.time).getHours();
    const tick = (hh % 6 === 0) ? `<span class="precip-strip-tick">${hh.toString().padStart(2,"0")}:00</span>` : "";
    const title = `${hh.toString().padStart(2,"0")}:00 · ${mm.toFixed(1)} mm · ${popPct}%`;
    return `<button class="precip-strip-cell" data-i="${i}" data-ts="${h.time}" title="${title}">
      <span class="precip-strip-bar" style="height:${totalH}px;background:${bg};opacity:${alpha}"></span>
      ${tick}
    </button>`;
  }).join("");

  el.precipStripBars.querySelectorAll(".precip-strip-cell").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ts = parseInt(btn.dataset.ts, 10);
      if (ts) state.handlers.onHourClick?.(ts);
    });
  });
}

function renderYesterdayDelta(w) {
  if (!el.yesterdayDelta || !el.ydText || !el.ydArrow) return;
  const y = w.yesterday;
  if (!y || y.temp == null || w.temp == null) {
    el.yesterdayDelta.hidden = true;
    return;
  }
  const deltaC = w.temp - y.temp;
  // Convert to display unit so copy matches the toggle.
  const displayDelta = state.unit === "F" ? deltaC * 9 / 5 : deltaC;
  const absRounded = Math.round(Math.abs(displayDelta));
  if (absRounded < 1) {
    el.yesterdayDelta.hidden = false;
    el.yesterdayDelta.dataset.dir = "flat";
    el.ydArrow.textContent = "→";
    el.ydText.textContent = "Same as yesterday";
    return;
  }
  const dir = displayDelta > 0 ? "up" : "down";
  el.yesterdayDelta.hidden = false;
  el.yesterdayDelta.dataset.dir = dir;
  el.ydArrow.textContent = dir === "up" ? "▲" : "▼";
  el.ydText.textContent = `${absRounded}° ${dir === "up" ? "warmer" : "cooler"} than yesterday`;
}

function renderWindStrip(w) {
  if (!el.windStrip || !el.windStripArrows) return;
  const hours = (w.hourly || []).slice(0, 24);
  const haveDir = hours.some((h) => h.windDir != null);
  if (!hours.length || !haveDir) {
    el.windStrip.hidden = true;
    return;
  }
  const speeds = hours.map((h) => h.wind ?? 0);
  const peak = Math.max(...speeds);
  const peakIdx = speeds.indexOf(peak);
  const peakHour = hours[peakIdx];
  const avg = speeds.reduce((s, v) => s + v, 0) / speeds.length;
  // Prevailing direction: average of unit vectors.
  let sx = 0, sy = 0, n = 0;
  for (const h of hours) {
    if (h.windDir == null) continue;
    const r = (h.windDir * Math.PI) / 180;
    sx += Math.cos(r); sy += Math.sin(r); n++;
  }
  const prevailDeg = n ? ((Math.atan2(sy, sx) * 180) / Math.PI + 360) % 360 : null;

  if (peak < 5 && avg < 3) {
    // Dead-calm — hide to keep the surface quiet.
    el.windStrip.hidden = true;
    return;
  }
  el.windStrip.hidden = false;
  const prevailLabel = prevailDeg != null ? cardinal(prevailDeg) : "—";
  const peakStr = peakHour ? `peak ${Math.round(peak)} km/h at ${fmtTime(peakHour.time)}` : "";
  el.windStripNote.textContent = `prevailing ${prevailLabel} · ${peakStr}`;

  // Scale arrow length by wind speed (clamped) for a visual sense of strength.
  const maxLen = 16;
  const minLen = 7;
  const maxSpeed = Math.max(10, peak);
  el.windStripArrows.innerHTML = hours.map((h, i) => {
    const dir = h.windDir;
    const spd = h.wind ?? 0;
    const len = minLen + (Math.min(spd, maxSpeed) / maxSpeed) * (maxLen - minLen);
    const hh = new Date(h.time).getHours();
    const tick = (hh % 6 === 0) ? `<span class="wind-strip-tick">${hh.toString().padStart(2,"0")}</span>` : "";
    if (dir == null) {
      return `<div class="wind-strip-cell"><span class="wind-strip-dot"></span>${tick}</div>`;
    }
    // SVG arrow base points down (tip at +y, i.e. compass 180° at θ=0). A
    // clockwise rotation θ puts the tip at compass bearing (180 + θ). Wind
    // direction is where the wind comes FROM, so to point TO its destination
    // we need bearing (dir + 180), giving θ = dir.
    const theta = dir;
    const hot = spd >= 40 ? "hot" : spd >= 25 ? "warm" : "";
    const title = `${hh.toString().padStart(2, "0")}:00 · ${Math.round(spd)} km/h ${cardinal(dir)}`;
    return `<button class="wind-strip-cell ${hot}" data-ts="${h.time}" title="${title}">
      <svg viewBox="-12 -12 24 24" style="transform:rotate(${theta}deg)">
        <path d="M 0 ${-len/2} L 0 ${len/2} M 0 ${len/2} L -3 ${len/2 - 4} M 0 ${len/2} L 3 ${len/2 - 4}"
              fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      ${tick}
    </button>`;
  }).join("");

  el.windStripArrows.querySelectorAll(".wind-strip-cell[data-ts]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ts = parseInt(btn.dataset.ts, 10);
      if (ts) state.handlers.onHourClick?.(ts);
    });
  });
}

function renderVisibility(w) {
  if (!el.visibilityCard) return;
  const meters = w.visibility;
  if (meters == null) {
    el.visibilityCard.hidden = true;
    return;
  }
  el.visibilityCard.hidden = false;
  const km = meters / 1000;
  el.visibilityValue.textContent = km >= 10
    ? `${Math.round(km)} km`
    : `${km.toFixed(1)} km`;
  // Cap meaningful visibility at 20 km for the dial.
  const frac = Math.max(0, Math.min(1, km / 20));
  // Half-circle arc length is π·r = π·24 ≈ 75.4 — matches dasharray 76 in HTML.
  if (el.visibilityArc) {
    el.visibilityArc.setAttribute("stroke-dashoffset", String(76 * (1 - frac)));
  }
  // Place the marker along the half-circle from -24,10 to 24,10 via 0,-14.
  if (el.visibilityMarker) {
    const theta = Math.PI * (1 - frac); // π down to 0
    const x = (24 * Math.cos(theta)).toFixed(2);
    const y = (10 - 24 * Math.sin(theta)).toFixed(2);
    el.visibilityMarker.setAttribute("transform", `translate(${x} ${y})`);
  }
  const d = describeVisibility(km, w.condition);
  el.visibilityDesc.textContent = d.text;
  if (el.visibilityLevel) {
    el.visibilityLevel.className = `trend ${d.cls}`;
    el.visibilityLevel.textContent = d.pill;
  }
}

function describeVisibility(km, condition) {
  if (km < 0.2) return { pill: "Dense fog", cls: "down", text: "Can barely see — drive very slowly" };
  if (km < 1)   return { pill: "Fog", cls: "down", text: "Headlights on, keep extra distance" };
  if (km < 4)   return { pill: "Mist", cls: "flat", text: "Hazy — distant features washed out" };
  if (km < 10)  return { pill: "Moderate", cls: "flat", text: "Light haze — otherwise fine" };
  if (km < 20)  return { pill: "Clear", cls: "up", text: "Sharp views for miles" };
  return { pill: "Crystal", cls: "up", text: condition === "snow" ? "Crystal clear — bitterly bright" : "You can see the horizon" };
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
  el.pollenCard.setAttribute(
    "title",
    `Pollen level: ${pollen.level}. Dominant allergen: ${pollen.dominant.label}.`
  );
  el.pollenDominant.textContent = `${pollen.dominant.label} dominant`;
  // Scale each item's bar to the max in the set (minimum 1 for visibility).
  const peak = Math.max(1, ...pollen.items.map((p) => p.value));
  el.pollenItems.innerHTML = pollen.items.map((p) => {
    const w = Math.round((p.value / peak) * 100);
    return `<span class="pollen-item" data-level="${pollen.level}">
      <span class="pollen-item-label">${escapeHtml(p.label)}</span>
      <span class="pollen-item-bar" aria-hidden="true"><span style="width:${w}%"></span></span>
      <span class="pollen-item-value">${p.value.toFixed(1)}</span>
    </span>`;
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
  const now = Date.now();
  for (const h of (w.hourly || []).slice(0, 24)) {
    const item = document.createElement("div");
    item.className = "forecast-item";
    // Mark the hour whose window contains "now" so it stands out.
    if (Math.abs(h.time - now) < 30 * 60_000) item.classList.add("is-now");
    item.dataset.ts = h.time;
    const windArrow = h.windDir != null && (h.wind ?? 0) >= 12
      ? `<svg class="forecast-wind" viewBox="-6 -6 12 12" style="transform:rotate(${h.windDir}deg)"><path d="M 0 -4 L 0 4 M 0 4 L -2 2 M 0 4 L 2 2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`
      : "";
    item.innerHTML = `
      <span class="forecast-time">${fmtTime(h.time)}</span>
      <span class="forecast-icon">${iconFor(h.condition)}</span>
      <span class="forecast-temp">${Math.round(convertTemp(h.temp))}°</span>
      <span class="forecast-wind-wrap">${windArrow}</span>
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
  const best = findBestDay(days);
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
    const dateOpts = tz && tz !== "auto" ? { timeZone: tz } : {};
    const weekday = dt.toLocaleDateString(undefined, { weekday: "short", ...dateOpts });
    const dayNum = dt.toLocaleDateString(undefined, { day: "numeric", ...dateOpts });
    const day = i === 0
      ? "Today"
      : `${weekday} <span class="daily-date">${dayNum}</span>`;
    const left = ((d.tempMin - gMin) / span) * 100;
    const width = ((d.tempMax - d.tempMin) / span) * 100;
    const item = document.createElement("div");
    item.className = "daily-item";
    item.dataset.ts = d.time;
    const gustLabel = (d.gustsMax && d.gustsMax >= 25)
      ? ` · gusts ${Math.round(d.gustsMax)} km/h`
      : "";
    let popLabel = "";
    const pop = d.pop ?? 0;
    if (d.snowfall >= 0.5) {
      popLabel = ` · ${d.snowfall.toFixed(1)} cm snow`;
    } else if (d.precip >= 0.5) {
      popLabel = ` · ${d.precip.toFixed(1)} mm (${pop}%)`;
    } else if (pop >= 30) {
      popLabel = ` · ${pop}% rain`;
    }
    const extra = gustLabel || popLabel ? `<span class="daily-gust">${popLabel}${gustLabel}</span>` : "";
    const bestBadge = (best && best.index === i)
      ? `<span class="daily-best" title="Looks like the pick of the week">${escapeHtml(best.tag)}</span>` : "";
    const drops = rainDrops(d);
    const srTitle = `${new Date(d.time).toLocaleDateString()}: ${Math.round(convertTemp(d.tempMin))}° to ${Math.round(convertTemp(d.tempMax))}°, ${d.label || d.condition}`;
    item.setAttribute("title", srTitle);
    item.innerHTML = `
      <span class="daily-day">${day}${bestBadge}</span>
      <span class="daily-icon">${iconFor(d.condition)}${drops}</span>
      <div class="daily-range">
        <div class="daily-range-fill" style="left:${left}%;width:${Math.max(8, width)}%"></div>
      </div>
      <span class="daily-temp-min">${Math.round(convertTemp(d.tempMin))}°</span>
      <span class="daily-temp-max">${Math.round(convertTemp(d.tempMax))}°</span>
      ${extra}
    `;
    if (best && best.index === i) item.classList.add("is-best");
    item.addEventListener("click", () => toggleDailyExpand(item, d, w));
    el.dailyTrack.appendChild(item);
  });
}

function rainDrops(d) {
  const snow = d?.snowfall ?? 0;
  if (snow >= 0.5) {
    // 1 flake = 0.5-3cm, 2 = 3-10cm, 3 = 10-25cm, 4 = >25cm
    const n = snow < 3 ? 1 : snow < 10 ? 2 : snow < 25 ? 3 : 4;
    const level = n >= 4 ? "deluge" : n >= 3 ? "heavy" : n >= 2 ? "mod" : "light";
    return `<span class="daily-drops snow" data-level="${level}" aria-hidden="true">${"❄".repeat(n)}</span>`;
  }
  const precip = d?.precip ?? 0;
  // 1 drop = 1-3mm, 2 = 3-8mm, 3 = 8-20mm, 4 = >20mm.
  if (precip < 0.5) return "";
  const n = precip < 3 ? 1 : precip < 8 ? 2 : precip < 20 ? 3 : 4;
  const level = n >= 4 ? "deluge" : n >= 3 ? "heavy" : n >= 2 ? "mod" : "light";
  return `<span class="daily-drops" data-level="${level}" aria-hidden="true">${"•".repeat(n)}</span>`;
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
  // Expose min/max for a11y / tooltip over the whole svg.
  el.dailySpark?.setAttribute(
    "aria-label",
    `7-day temperature range: ${Math.round(convertTemp(tMin))}° to ${Math.round(convertTemp(tMax))}°`
  );
  el.dailySpark?.setAttribute(
    "title",
    `${Math.round(convertTemp(tMin))}° low · ${Math.round(convertTemp(tMax))}° high across the week`
  );
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
  const dowFmt = (ts) => new Date(ts).toLocaleDateString(undefined, {
    weekday: "short", ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });
  days.forEach((d, i) => {
    if (d.tempMax != null) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", x(i).toFixed(1));
      c.setAttribute("cy", y(d.tempMax).toFixed(1));
      c.setAttribute("r", "2.5");
      c.setAttribute("class", "dot-hi");
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `${dowFmt(d.time)} · ${Math.round(convertTemp(d.tempMax))}° high`;
      c.appendChild(title);
      el.dailySparkDots.appendChild(c);
    }
    if (d.tempMin != null) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", x(i).toFixed(1));
      c.setAttribute("cy", y(d.tempMin).toFixed(1));
      c.setAttribute("r", "2.5");
      c.setAttribute("class", "dot-lo");
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `${dowFmt(d.time)} · ${Math.round(convertTemp(d.tempMin))}° low`;
      c.appendChild(title);
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
    const sunStr = d.sunshine != null
      ? ` · ${Math.round(d.sunshine / 3600)}h sun`
      : "";
    summary.innerHTML = `<span style="padding:8px;color:var(--fg-dim);font-size:12px">Pop ${d.pop}% · gust up to ${Math.round(d.gustsMax ?? 0)} km/h · UV ${Math.round(d.uvMax ?? 0)}${sunStr}</span>`;
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
    const dayCls = p.isDay === false ? "night" : "";
    const icon = p.condition ? iconFor(p.condition) : "";
    const range = (p.tempMin != null && p.tempMax != null)
      ? `<span class="chip-range" title="Today's range">${Math.round(convertTemp(p.tempMin))}°/${Math.round(convertTemp(p.tempMax))}°</span>`
      : "";
    const titleBits = [p.admin1, p.country, p.label].filter(Boolean).join(" · ");
    return `
      <div class="place-chip ${active ? "active" : ""} ${dayCls}" data-id="${p.id}" title="${escapeHtml(titleBits)}">
        ${icon ? `<span class="chip-icon" aria-hidden="true">${icon}</span>` : ""}
        <span class="chip-name">${escapeHtml(p.name)}</span>
        ${p.temp != null ? `<span class="temp">${Math.round(convertTemp(p.temp))}°</span>` : ""}
        ${range}
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
  const toggle = () => {
    state.unit = state.unit === "C" ? "F" : "C";
    localStorage.setItem("aether:unit", state.unit);
    el.unitBtn.textContent = `°${state.unit}`;
    if (state.weather) {
      ui.setWeather(state.weather);
      updatePageTitle(state.weather);
    }
  };
  el.unitBtn.addEventListener("click", toggle);
  // Clicking the big temperature number also flips units — the degree sits
  // next to a toggle anyway, so this just extends the hit target.
  el.temp?.addEventListener("click", toggle);
  if (el.temp) el.temp.style.cursor = "pointer";
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

  el.settingGeolocate?.addEventListener("change", () => {
    const on = el.settingGeolocate.checked;
    localStorage.setItem("aether:startLocate", on ? "1" : "0");
    ui.showToast(on ? "Will use your location on next launch" : "Will use last saved place on next launch");
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
  if (el.settingGeolocate) {
    el.settingGeolocate.checked = localStorage.getItem("aether:startLocate") === "1";
  }
}

// Exposed so app.js can query the current preference on boot.
ui.isReduceMotion = () => localStorage.getItem("aether:reduceMotion") === "1";

function maybeShowFirstVisitTip() {
  try {
    if (localStorage.getItem("aether:seen-tip")) return;
    // Show on second render after a short delay, so it doesn't fight the
    // staggered hero entrance.
    setTimeout(() => {
      ui.showToast("Tip: press ? to see all keyboard shortcuts.", 4600);
      localStorage.setItem("aether:seen-tip", "1");
    }, 1800);
  } catch { /* ignore */ }
}

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
    const exact = new Date(state.weather.fetchedAt).toLocaleTimeString(undefined, {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    el.fetchedAgo.title = `Last fetched at ${exact}. Press R to refresh.`;
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
    // "Yesterday delta" line if we have data and the delta is interesting.
    let yLine = null;
    if (w.yesterday?.temp != null && w.temp != null) {
      const dc = w.temp - w.yesterday.temp;
      const dAbs = Math.abs(Math.round(unit === "F" ? dc * 9 / 5 : dc));
      if (dAbs >= 2) yLine = `${dAbs}° ${dc > 0 ? "warmer" : "cooler"} than yesterday`;
    }
    const weekend = weekendSnapshot(w);
    const weekendLine = weekend ? `This weekend: ${weekend.headline}` : null;
    const lines = [
      `Aether · ${placeName}`,
      `${capitalize(w.label)} · ${t(w.temp)} (feels ${t(w.feelsLike ?? w.temp)})`,
      yLine,
      today ? `Today: ${t(today.tempMin)} / ${t(today.tempMax)} · ${today.pop}% precip` : null,
      `Wind ${Math.round(w.windSpeed)} km/h${w.windDir != null ? ` ${cardinal(w.windDir)}` : ""}`,
      w.uv != null ? `UV ${Math.round(w.uv)}` : null,
      w.airQuality?.aqi != null ? `AQI ${Math.round(w.airQuality.aqi)} (${w.airQuality.label})` : null,
      weekendLine,
    ].filter(Boolean);
    const text = lines.join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: `Aether — ${placeName}`, text });
      } else {
        await navigator.clipboard.writeText(text);
        const glyph = CONDITION_GLYPHS[w.condition] || "✓";
        ui.showToast(`${glyph} Summary copied to clipboard`);
      }
      el.shareBtn.classList.add("just-copied");
      setTimeout(() => el.shareBtn.classList.remove("just-copied"), 600);
      ui.haptic(15);
    } catch (err) {
      if (err?.name !== "AbortError") ui.showToast("Share failed");
    }
  });
}

function bindBrand() {
  if (!el.brandBtn) return;
  el.brandBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    el.brandBtn.classList.add("just-tapped");
    setTimeout(() => el.brandBtn.classList.remove("just-tapped"), 500);
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
ui.refreshChart = () => state.chart?.refresh?.();

// Sync unit + reduce-motion prefs across tabs via the storage event — makes
// opening Aether in two tabs behave consistently without a reload.
window.addEventListener("storage", (e) => {
  if (e.key === "aether:unit" && e.newValue && e.newValue !== state.unit) {
    state.unit = e.newValue;
    if (el.unitBtn) el.unitBtn.textContent = `°${state.unit}`;
    if (el.settingUnitF) el.settingUnitF.checked = state.unit === "F";
    if (state.weather) ui.setWeather(state.weather);
  }
  if (e.key === "aether:reduceMotion") {
    const on = e.newValue === "1";
    document.documentElement.setAttribute("data-reduce-motion", on ? "true" : "false");
    if (el.settingReduceMotion) el.settingReduceMotion.checked = on;
    state.handlers.onReduceMotion?.(on);
  }
});
