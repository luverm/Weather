// UI layer. Renders every data module and handles non-scene interactions
// (search, unit toggle, saved places, tilt, audio toggle).

import { searchCities } from "./weather-service.js";
import { formatWind, windUnit, windUnitLabel, convertWind, formatPressure, pressureUnit, pressureUnitLabel, formatDistance, distanceUnit, useTwelveHour, defaultTempUnit } from "./units.js";
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
  feelsText: $("#feels-text"),
  feelsDelta: $("#feels-delta"),
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
  metricPressureUnit: $("#m-pressure-unit"),
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
  metricWindUnit: $("#m-wind-unit"),
  uvSparkLine: $("#uv-spark-line"),
  uvSparkFill: $("#uv-spark-fill"),
  uvSparkPeak: $("#uv-spark-peak"),
  uvSparkNow: $("#uv-spark-now"),
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
  settingClearPrefs: $("#setting-clear-prefs"),
  settingWindUnit: $("#setting-wind-unit"),
  settingPressureUnit: $("#setting-pressure-unit"),
  settingDistanceUnit: $("#setting-distance-unit"),
  settingClock12: $("#setting-clock-12"),
  settingRefreshInterval: $("#setting-refresh-interval"),
  chartPopover: $("#chart-popover"),
  insightsCard: $("#insights-card"),
  insightsList: $("#insights-list"),
  activityCard: $("#activity-card"),
  activityList: $("#activity-list"),
  alertsStrip: $("#alerts-strip"),
  sunArcMarker: $("#sun-arc-marker"),
  sunArcPath: $("#sun-arc-path"),
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
  searchClear: $("#search-clear"),
  searchSpinner: $("#search-spinner"),
  locateBtn: $("#locate-btn"),
  audioBtn: $("#audio-btn"),
  hintText: $("#hint-text"),
  heroInner: document.querySelector(".hero-inner"),
  toast: $("#toast"),
  placesStrip: $("#places-strip"),
};

const state = {
  unit: localStorage.getItem("aether:unit") || defaultTempUnit(),
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
    renderSkyStrip(weather);
    renderRainWindow(weather);
    if (el.narrative) el.narrative.textContent = narrative || "";
    const banner = document.getElementById("offline-banner");
    if (banner) banner.hidden = !weather.offline;
    // Save summary for the strip so chips can show current temp.
    if (state.place) {
      places.updateSummary(state.place, {
        temp: weather.temp,
        condition: weather.condition,
        isDay: weather.isDay,
      });
    }
    renderPlaces();
    updateDocumentIdentity(weather);
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
  if (el.feelsText) el.feelsText.textContent = `Feels like ${Math.round(feels)}°`;
  renderFeelsDelta(w);
  renderDayRange(w);
  renderYesterdayChip(w);
  renderDayRating(w);
}

function renderDayRating(w) {
  const chip = document.getElementById("day-rating");
  const badge = document.getElementById("day-rating-badge");
  const text = document.getElementById("day-rating-text");
  if (!chip || !badge || !text) return;
  const temp = w.temp;
  if (temp == null) { chip.hidden = true; return; }
  // Comfort peaks at 22°C, penalise cold/heat quadratically.
  const comfort = Math.max(0, 100 - Math.pow(Math.abs(temp - 22), 1.6) * 3);
  const wind = w.windSpeed || 0;
  const windPenalty = Math.max(0, wind - 20) * 1.5;
  const gusts = w.windGusts || 0;
  const gustPenalty = Math.max(0, gusts - 40) * 1.2;
  const pop = w.hourly?.[0]?.pop ?? 0;
  const rainPenalty = pop > 40 ? (pop - 40) * 0.6 : 0;
  const aqi = w.airQuality?.aqi;
  const aqPenalty = aqi != null ? Math.max(0, aqi - 60) * 0.4 : 0;
  const cond = w.condition;
  const condBonus = cond === "clear" ? 5 : cond === "storm" ? -15 : cond === "fog" ? -5 : 0;
  const score = Math.max(0, Math.min(100,
    Math.round(comfort - windPenalty - gustPenalty - rainPenalty - aqPenalty + condBonus)
  ));
  let tone, label, phrase;
  if (score >= 82) { tone = "excellent"; label = "Excellent"; phrase = "postcard day"; }
  else if (score >= 65) { tone = "good"; label = "Good"; phrase = "comfortable outdoors"; }
  else if (score >= 45) { tone = "mixed"; label = "Mixed"; phrase = "pack a plan B"; }
  else if (score >= 25) { tone = "tough"; label = "Tough"; phrase = "layer up or stay in"; }
  else { tone = "harsh"; label = "Harsh"; phrase = "cozy indoors"; }
  chip.hidden = false;
  chip.setAttribute("data-tone", tone);
  badge.textContent = label;
  text.textContent = phrase;
  chip.title = `Day rating: ${score}/100`;
}

function renderSkyStrip(w) {
  const strip = document.getElementById("sky-strip");
  if (!strip) return;
  const hours = (w.hourly || []).slice(0, 24);
  const usable = hours.filter((h) => h.cloudCover != null);
  if (usable.length < 6) {
    strip.setAttribute("data-empty", "true");
    strip.innerHTML = "";
    renderSunHours(w, hours);
    return;
  }
  strip.removeAttribute("data-empty");
  renderSunHours(w, hours);
  const cells = hours.map((h) => {
    const cc = Math.max(0, Math.min(100, h.cloudCover ?? 0));
    const rainish = (h.pop ?? 0) / 100;
    // Day vs night: light-blue -> pale grey for day; deep-blue -> slate for night.
    const day = h.isDay;
    const c1 = day ? [166, 214, 240] : [46, 62, 90];   // clear
    const c2 = day ? [200, 210, 220] : [110, 118, 132]; // overcast
    const t = cc / 100;
    let r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
    let g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
    let b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
    // Tint toward blue when rain is likely (light blue overlay).
    if (rainish > 0.3) {
      r = Math.round(r * (1 - rainish * 0.4) + 88 * rainish * 0.4);
      g = Math.round(g * (1 - rainish * 0.4) + 130 * rainish * 0.4);
      b = Math.round(b * (1 - rainish * 0.4) + 200 * rainish * 0.4);
    }
    const opacity = day ? 1 : 0.75;
    return `<span class="sky-cell" style="background:rgb(${r},${g},${b});opacity:${opacity}"></span>`;
  }).join("");
  strip.innerHTML = cells;
  const first = strip.firstElementChild;
  if (first) first.classList.add("sky-cell-now");
  renderSkyTicks(hours);
}

function renderSkyTicks(hours) {
  const el2 = document.getElementById("sky-strip-ticks");
  if (!el2) return;
  if (!hours.length) { el2.setAttribute("data-empty", "true"); el2.innerHTML = ""; return; }
  el2.removeAttribute("data-empty");
  const marks = hours.map((h) => {
    const hh = new Date(h.time).getHours();
    if (hh % 6 !== 0) return `<span></span>`;
    return `<span data-tick="true">${hh.toString().padStart(2, "0")}</span>`;
  });
  el2.innerHTML = marks.join("");
}

function renderRainWindow(w) {
  const chip = document.getElementById("rain-window");
  if (!chip) return;
  const hours = (w.hourly || []).slice(0, 24);
  if (hours.length < 4) { chip.hidden = true; return; }
  // Longest run of consecutive hours with pop>=50 OR precip>=0.3mm.
  let best = { len: 0, start: null }, cur = { len: 0, start: null };
  for (const h of hours) {
    const wet = (h.pop != null && h.pop >= 50) || (h.precip != null && h.precip >= 0.3);
    if (wet) {
      if (!cur.len) cur.start = h.time;
      cur.len++;
      if (cur.len > best.len) best = { ...cur };
    } else {
      cur = { len: 0, start: null };
    }
  }
  if (best.len === 0) { chip.hidden = true; return; }
  chip.hidden = false;
  const label = best.len === 1 ? "1h of rain" : `${best.len}h of rain`;
  const from = fmtTime(best.start);
  chip.textContent = `${label} from ${from}`;
}

function renderSunHours(w, hours) {
  const chip = document.getElementById("sun-hours");
  if (!chip) return;
  chip.hidden = true;
  // Only look at hours that are today, during daylight.
  const dayStart = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); })();
  const dayEnd = dayStart + 24 * 3600_000;
  const daylight = hours.filter((h) => h.isDay && h.time >= dayStart && h.time < dayEnd);
  if (daylight.length < 3) return;
  const sunny = daylight.filter((h) => h.cloudCover != null && h.cloudCover < 30).length;
  const mostlySunny = daylight.filter((h) => h.cloudCover != null && h.cloudCover < 60).length;
  chip.hidden = false;
  if (sunny === 0 && mostlySunny <= 1) {
    chip.setAttribute("data-tone", "cloudy");
    chip.textContent = "Overcast most of the day";
    return;
  }
  chip.removeAttribute("data-tone");
  if (sunny >= 4) {
    chip.textContent = `${sunny}h of sun today`;
  } else {
    chip.textContent = `${mostlySunny}h of mostly sunny sky`;
  }
}

function renderYesterdayChip(w) {
  const chip = document.getElementById("yesterday-chip");
  const text = document.getElementById("yesterday-chip-text");
  if (!chip || !text) return;
  const y = w.yesterday;
  const today = w.daily?.[0];
  if (!y || !today || today.tempMax == null || y.tempMax == null) {
    chip.hidden = true;
    return;
  }
  const deltaC = today.tempMax - y.tempMax;
  const deltaDisplay = Math.round(state.unit === "F" ? deltaC * 9 / 5 : deltaC);
  let dir, phrase;
  if (Math.abs(deltaC) < 0.5) {
    dir = "flat";
    phrase = "About the same high as yesterday";
  } else if (deltaC > 0) {
    dir = "up";
    phrase = `${deltaDisplay}° warmer high than yesterday`;
  } else {
    dir = "down";
    phrase = `${Math.abs(deltaDisplay)}° cooler high than yesterday`;
  }
  // Add a rainfall descriptor if it meaningfully changed.
  const dPrecip = (today.precip || 0) - (y.precip || 0);
  const extras = [];
  if ((y.precip || 0) > 1 && (today.precip || 0) < 0.5) extras.push("drier");
  else if ((today.precip || 0) > 1 && (y.precip || 0) < 0.5) extras.push("wetter");
  else if (Math.abs(dPrecip) > 3) extras.push(dPrecip > 0 ? "wetter" : "drier");
  const suffix = extras.length ? ` · ${extras.join(", ")}` : "";
  chip.hidden = false;
  chip.setAttribute("data-dir", dir);
  text.textContent = phrase + suffix;
}

function renderFeelsDelta(w) {
  const chip = el.feelsDelta;
  if (!chip) return;
  if (w.temp == null || w.feelsLike == null) {
    chip.hidden = true;
    return;
  }
  const deltaC = w.feelsLike - w.temp;
  const deltaDisplay = state.unit === "F" ? deltaC * 9 / 5 : deltaC;
  const rounded = Math.round(deltaDisplay);
  // Only show the pill when the gap is meaningful.
  if (Math.abs(deltaC) < 1.5) {
    chip.hidden = true;
    return;
  }
  chip.hidden = false;
  let word;
  if (deltaC <= -6) word = "biting cold";
  else if (deltaC <= -2) word = "wind chill";
  else if (deltaC >= 6) word = "sweltering";
  else if (deltaC >= 2) word = "humid heat";
  else word = deltaC < 0 ? "cools" : "warms";
  const dir = deltaC < 0 ? "down" : "up";
  chip.setAttribute("data-dir", dir);
  chip.textContent = `${word} ${rounded > 0 ? "+" : ""}${rounded}°`;
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
    renderDaySwing(null);
    return;
  }
  el.dayRange.hidden = false;
  el.dayRangeMin.textContent = `${Math.round(convertTemp(lo))}°`;
  el.dayRangeMax.textContent = `${Math.round(convertTemp(hi))}°`;
  // Marker position: clamp current temp to [lo,hi] so marker stays on track.
  const t = w.temp ?? (lo + hi) / 2;
  const frac = Math.max(0, Math.min(1, (t - lo) / (hi - lo)));
  el.dayRangeMarker.style.left = `${(frac * 100).toFixed(1)}%`;
  renderDaySwing(hi - lo);
}

function renderDaySwing(rangeC) {
  const chip = document.getElementById("day-swing");
  if (!chip) return;
  if (rangeC == null) { chip.hidden = true; return; }
  const rangeDisplay = Math.round(state.unit === "F" ? rangeC * 9 / 5 : rangeC);
  chip.hidden = false;
  if (rangeC < 4) {
    chip.setAttribute("data-tone", "steady");
    chip.textContent = `Steady day · ${rangeDisplay}° swing`;
  } else if (rangeC >= 12) {
    chip.setAttribute("data-tone", "big");
    chip.textContent = `Big swing today · ${rangeDisplay}° range`;
  } else {
    chip.removeAttribute("data-tone");
    chip.textContent = `${rangeDisplay}° swing today`;
  }
}

function renderMetrics(w) {
  el.metricWind.textContent = formatWind(w.windSpeed ?? 0, { withUnit: false });
  el.metricWindUnit && (el.metricWindUnit.textContent = windUnitLabel());
  const dir = w.windDir;
  const dirLabel = dir != null ? cardinal(dir) : null;
  const gustTxt = w.windGusts != null ? formatWind(w.windGusts) : "—";
  const burst = gustBurst(w.windSpeed, w.windGusts);
  const burstTag = burst ? ` <span class="gust-burst" data-severity="${burst.severity}">${burst.label}</span>` : "";
  el.metricWindSub.innerHTML = dirLabel
    ? `${escapeHtml(dirLabel)} · gust ${escapeHtml(gustTxt)}${burstTag}`
    : `gust ${escapeHtml(gustTxt)}${burstTag}`;
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
  renderWindArrows(w);
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
  el.metricPressure.textContent = formatPressure(w.pressure ?? 0, { withUnit: false });
  if (el.metricPressureUnit) el.metricPressureUnit.textContent = pressureUnitLabel();
  el.metricPressureSub.textContent = w.visibility != null
    ? `visibility ${formatDistance(w.visibility)}`
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
  renderUvSub(w);
  renderPressureSparkline(w);
  renderUvSparkline(w);
}

function renderUvSub(w) {
  const uvNow = w.uv;
  if (w.isDay && uvNow != null && uvNow >= 3) {
    const minsToBurn = Math.max(5, Math.round(200 / uvNow));
    const burnLabel = minsToBurn >= 60
      ? `${Math.floor(minsToBurn / 60)}h ${minsToBurn % 60}m`
      : `${minsToBurn} min`;
    el.metricUVSub.textContent = `burns in ~${burnLabel}`;
  } else if (w.uvPeak?.time) {
    el.metricUVSub.textContent = `peak ${Math.round(w.uvPeak.value)} at ${fmtTime(w.uvPeak.time)}`;
  } else {
    el.metricUVSub.textContent = "peak —";
  }
}

function renderWindArrows(w) {
  const wrap = document.getElementById("wind-arrows");
  if (!wrap) return;
  const hours = (w.hourly || []).slice(0, 12);
  const usable = hours.filter((h) => h.windDir != null);
  if (usable.length < 4) {
    wrap.setAttribute("data-empty", "true");
    wrap.innerHTML = "";
    return;
  }
  wrap.removeAttribute("data-empty");
  wrap.innerHTML = hours.map((h, i) => {
    const deg = h.windDir ?? 0;
    const spd = h.wind ?? 0;
    // Wind direction is the direction it BLOWS FROM; the arrow head points
    // TO where the wind is going (rotate 180°).
    const rot = (deg + 180) % 360;
    let strength = "low";
    if (spd >= 40) strength = "high";
    else if (spd >= 20) strength = "mid";
    return `<svg class="warrow" data-strength="${strength}" data-hour="${i}" viewBox="0 0 24 24" style="transform:rotate(${rot}deg)"><path d="M12 4l6 8h-4v8h-4v-8H6l6-8z" fill="currentColor"/></svg>`;
  }).join("");
}

function renderUvSparkline(w) {
  if (!el.uvSparkLine || !el.uvSparkFill) return;
  const hourly = w.hourly || [];
  const series = hourly.map((h) => h.uv).slice(0, 14);
  // If every value is null/undefined, hide markers and clear.
  const clean = series.map((v) => (v == null ? 0 : Math.max(0, v)));
  if (clean.length < 2 || clean.every((v) => v === 0)) {
    el.uvSparkLine.setAttribute("d", "");
    el.uvSparkFill.setAttribute("d", "");
    if (el.uvSparkPeak) el.uvSparkPeak.setAttribute("opacity", "0");
    if (el.uvSparkNow) el.uvSparkNow.setAttribute("opacity", "0");
    return;
  }
  drawSparkline(el.uvSparkLine, el.uvSparkFill, clean, { minSpan: 4, fixedMin: 0 });

  // Compute peak + now marker positions within the same padded viewport.
  const W = 100, H = 24, PAD = 1.5;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const max = Math.max(4, ...clean);
  const xAt = (i) => PAD + (i / (clean.length - 1)) * innerW;
  const yAt = (v) => PAD + innerH - (v / max) * innerH;

  let peakIdx = 0;
  for (let i = 1; i < clean.length; i++) if (clean[i] > clean[peakIdx]) peakIdx = i;
  if (el.uvSparkPeak) {
    if (clean[peakIdx] > 0.5) {
      el.uvSparkPeak.setAttribute("cx", xAt(peakIdx).toFixed(2));
      el.uvSparkPeak.setAttribute("cy", yAt(clean[peakIdx]).toFixed(2));
      el.uvSparkPeak.setAttribute("opacity", "0.95");
    } else {
      el.uvSparkPeak.setAttribute("opacity", "0");
    }
  }
  // "now" marker sits at the first point (hourly[0] is the current hour).
  if (el.uvSparkNow) {
    if (clean[0] > 0.2) {
      el.uvSparkNow.setAttribute("cx", xAt(0).toFixed(2));
      el.uvSparkNow.setAttribute("cy", yAt(clean[0]).toFixed(2));
      el.uvSparkNow.setAttribute("opacity", "0.95");
    } else {
      el.uvSparkNow.setAttribute("opacity", "0");
    }
  }
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

function gustBurst(wind, gusts) {
  if (wind == null || gusts == null || gusts <= wind) return null;
  const ratio = gusts / Math.max(1, wind);
  const diff = gusts - wind;
  if (gusts < 25) return null;              // ignore gentle winds entirely
  if (ratio >= 2.2 && diff >= 20) return { severity: "high", label: "gusty burst" };
  if (ratio >= 1.5 && diff >= 15) return { severity: "mid",  label: "gusty" };
  return null;
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
  renderAqAdvice(aq);
}

function renderAqAdvice(aq) {
  const chip = document.getElementById("aq-advice");
  if (!chip) return;
  if (aq?.aqi == null) { chip.hidden = true; return; }
  const advice = aqAdvice(aq.aqi);
  chip.hidden = false;
  chip.setAttribute("data-severity", advice.severity);
  chip.innerHTML = `<span class="aq-advice-dot" aria-hidden="true"></span>${escapeHtml(advice.text)}`;
}

function aqAdvice(aqi) {
  if (aqi <= 50)  return { severity: "good",     text: "Great for outdoor activity" };
  if (aqi <= 100) return { severity: "moderate", text: "Fine outdoors · sensitive groups take it easy" };
  if (aqi <= 150) return { severity: "warn",     text: "Sensitive groups limit prolonged exertion" };
  if (aqi <= 200) return { severity: "bad",      text: "Reduce prolonged outdoor exertion" };
  if (aqi <= 300) return { severity: "bad",      text: "Avoid outdoor exertion" };
  return               { severity: "hazard",   text: "Stay indoors if possible" };
}

function renderAqTrend(aq) {
  if (!el.aqTrendLine || !el.aqTrendFill) return;
  const pts = (aq?.trend || []).map((p) => p.aqi);
  if (pts.length < 2) {
    el.aqTrendLine.setAttribute("d", "");
    el.aqTrendFill.setAttribute("d", "");
    renderAqDirection(null);
    return;
  }
  drawSparkline(el.aqTrendLine, el.aqTrendFill, pts, { minSpan: 20 });
  // Trend arrow: compare the first sample (now-ish) to ~3h ahead.
  const now = pts[0];
  const later = pts[Math.min(pts.length - 1, 3)];
  renderAqDirection(later - now);
}

function renderAqDirection(delta) {
  const chip = document.getElementById("aq-direction");
  if (!chip) return;
  if (delta == null) { chip.textContent = ""; chip.className = "trend"; return; }
  if (Math.abs(delta) < 3) {
    chip.className = "trend flat";
    chip.textContent = "→ steady";
    return;
  }
  // Rising AQI = air quality WORSENING. Colour it as bad (up-arrow, red-ish).
  // Falling AQI = air improving. Down-arrow, cool-blue.
  if (delta > 0) {
    chip.className = "trend up";
    chip.textContent = `▲ +${Math.round(delta)}`;
  } else {
    chip.className = "trend down";
    chip.textContent = `▼ ${Math.round(delta)}`;
  }
}

function renderMoon(moon) {
  if (!moon) return;
  el.moonName.textContent = moon.name;
  el.moonIllum.textContent = Math.round(moon.illum * 100);
  renderMoonNext(moon);
  renderStargazing(state.weather, moon);
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

function renderStargazing(weather, moon) {
  const chip = document.getElementById("stargaze-rating");
  const stars = document.getElementById("stargaze-stars");
  const caption = document.getElementById("stargaze-caption");
  if (!chip || !stars || !caption || !weather) return;
  // Sample the sky ~1h after sunset (typical stargazing start).
  const sunsetTs = weather.daily?.[0]?.sunset || weather.sunset;
  if (!sunsetTs) { chip.hidden = true; return; }
  const observeAt = sunsetTs + 90 * 60_000;
  if (Date.now() > observeAt + 6 * 3600_000) {
    // Well past a reasonable observing window; hide until tomorrow.
    chip.hidden = true;
    return;
  }
  const hours = (weather.hourly || []);
  const nightHours = hours.filter((h) =>
    h.cloudCover != null &&
    h.time >= observeAt - 60 * 60_000 &&
    h.time <= observeAt + 3 * 3600_000
  );
  if (nightHours.length < 2) { chip.hidden = true; return; }
  const avgCloud = nightHours.reduce((s, h) => s + h.cloudCover, 0) / nightHours.length;
  const avgPop = nightHours.reduce((s, h) => s + (h.pop || 0), 0) / nightHours.length;
  const cloudScore = Math.max(0, 100 - avgCloud);        // 0..100
  const moonScore = 100 * (1 - moon.illum);              // dark moon = high
  const aqi = weather.airQuality?.aqi;
  const aqScore = aqi == null ? 70 : Math.max(0, 100 - Math.min(100, aqi / 1.5));
  const rainPenalty = avgPop > 40 ? -30 : 0;
  // Weighted average — clouds dominate because a cloudy sky is a hard no.
  const overall = Math.max(0, Math.min(100,
    cloudScore * 0.55 + moonScore * 0.25 + aqScore * 0.20 + rainPenalty
  ));
  const filled = Math.max(1, Math.min(5, Math.round(overall / 20)));
  const empty = 5 - filled;
  stars.textContent = "★".repeat(filled) + "☆".repeat(empty);
  let phrase;
  if (overall >= 78) phrase = "Prime stargazing tonight";
  else if (overall >= 60) phrase = "Good clear sky window";
  else if (overall >= 40) phrase = "Some breaks in the clouds";
  else if (overall >= 22) phrase = "Mostly cloudy — few stars";
  else phrase = "Overcast — save it for another night";
  caption.textContent = phrase;
  chip.setAttribute("data-rating", overall >= 60 ? "high" : overall >= 30 ? "" : "low");
  chip.hidden = false;
}

function renderMoonNext(moon) {
  const target = document.getElementById("moon-next");
  if (!target) return;
  const phase = moon.phase;
  const CYCLE = 29.5305882;
  // Distance around the cycle to the next full (0.5) and next new (0/1).
  const daysToFull = ((0.5 - phase + 1) % 1) * CYCLE;
  const daysToNew  = ((1.0 - phase + 1) % 1) * CYCLE;
  const [d, kind] = daysToFull < daysToNew
    ? [daysToFull, "full moon"]
    : [daysToNew,  "new moon"];
  if (d < 0.5) {
    target.textContent = `${kind} tonight`;
  } else if (d < 1.5) {
    target.textContent = `${kind} tomorrow`;
  } else {
    target.textContent = `${kind} in ${Math.round(d)} days`;
  }
}

function fmtTime(ts) {
  if (!ts) return "—";
  const twelve = useTwelveHour();
  const tz = state.weather?.timezone;
  if (tz && tz !== "auto") {
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone: tz, hour: twelve ? "numeric" : "2-digit", minute: "2-digit", hour12: twelve,
      }).format(new Date(ts));
    } catch { /* fall through */ }
  }
  const d = new Date(ts);
  if (twelve) {
    const h = d.getHours();
    const hh = ((h % 12) || 12);
    const mm = d.getMinutes().toString().padStart(2, "0");
    return `${hh}:${mm} ${h < 12 ? "am" : "pm"}`;
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
  renderSolarNoon(w);
  renderSunsetForecast(w);
  scheduleSunCountdown(w);
  scheduleSunArc(w);
  scheduleGoldenChip(w);
}

function renderSunsetForecast(w) {
  const chip = document.getElementById("sunset-forecast");
  const headline = document.getElementById("sunset-forecast-headline");
  const sub = document.getElementById("sunset-forecast-sub");
  if (!chip || !headline || !sub) return;
  chip.hidden = true;
  const sunsetTs = w?.daily?.[0]?.sunset || w.sunset;
  if (!sunsetTs || Date.now() > sunsetTs) return;
  const hours = w.hourly || [];
  // Sample cloud cover in the ±1h window around sunset.
  const window = hours.filter((h) =>
    h.cloudCover != null &&
    Math.abs(h.time - sunsetTs) <= 90 * 60_000
  );
  if (window.length < 2) return;
  const avgCC = window.reduce((s, h) => s + h.cloudCover, 0) / window.length;
  const totalPop = window.reduce((s, h) => s + (h.pop || 0), 0) / window.length;
  // Rating heuristic:
  //  - Fully overcast or fully clear: muted.
  //  - Mid-cloudy (25-75%): the "vivid" band — mid clouds catch scattered light.
  //  - Rain nearby (pop > 55%): kill it.
  let rating, phrase;
  if (totalPop > 55) { rating = "muted"; phrase = "Wet skies · probably grey"; }
  else if (avgCC >= 85) { rating = "muted"; phrase = "Overcast · unlikely to catch color"; }
  else if (avgCC <= 12) { rating = "fair"; phrase = "Clear · a clean, soft glow"; }
  else if (avgCC >= 30 && avgCC <= 75) { rating = "vivid"; phrase = "Promising · mid-cloud light show possible"; }
  else if (avgCC > 75) { rating = "muted"; phrase = "Mostly cloudy · light may struggle"; }
  else { rating = "fair"; phrase = "A soft glow tonight"; }
  chip.hidden = false;
  chip.setAttribute("data-rating", rating);
  const local = fmtTime(sunsetTs);
  headline.textContent = "Sunset colors";
  sub.textContent = `${phrase} · at ${local}`;
}

function renderDaylightDelta(w) {
  const target = document.getElementById("sun-daylight-delta");
  if (!target) return;
  target.textContent = "";
  target.removeAttribute("data-dir");
  target.removeAttribute("title");
  const days = (w.daily || []).filter((d) => d.sunrise && d.sunset);
  if (days.length < 2) return;
  const today = days[0].sunset - days[0].sunrise;
  const tomorrow = days[1].sunset - days[1].sunrise;
  const deltaMs = tomorrow - today;
  const deltaMin = Math.round(deltaMs / 60_000);
  if (deltaMin === 0) {
    target.textContent = "same as tomorrow";
    return;
  }
  const dir = deltaMin > 0 ? "up" : "down";
  const sign = deltaMin > 0 ? "+" : "−";
  target.setAttribute("data-dir", dir);
  const absMin = Math.abs(deltaMin);
  target.textContent = `${sign}${absMin}m tomorrow`;
  const sunriseDiff = Math.round((days[1].sunrise - days[0].sunrise - 24 * 3600_000) / 60_000);
  const sunsetDiff = Math.round((days[1].sunset - days[0].sunset - 24 * 3600_000) / 60_000);
  const parts = [];
  if (sunriseDiff !== 0) {
    parts.push(`sunrise ${sunriseDiff < 0 ? Math.abs(sunriseDiff) + "m earlier" : sunriseDiff + "m later"}`);
  }
  if (sunsetDiff !== 0) {
    parts.push(`sunset ${sunsetDiff > 0 ? sunsetDiff + "m later" : Math.abs(sunsetDiff) + "m earlier"}`);
  }
  if (parts.length) target.setAttribute("title", parts.join(" · "));
}

function renderSolarNoon(w) {
  const line = document.getElementById("sun-arc-noon");
  const dot = document.getElementById("sun-arc-noon-dot");
  if (!line || !dot) return;
  if (!w.sunrise || !w.sunset) {
    line.setAttribute("opacity", "0");
    dot.setAttribute("opacity", "0");
    return;
  }
  // Solar noon = midpoint between sunrise and sunset; on our normalised
  // sunrise->sunset arc that lands at t=0.5, so x is always 100.
  // The dot rides the arc's apex (100, 24 for the quadratic Bezier).
  const t = 0.5;
  const x = (1 - t) ** 2 * 10 + 2 * (1 - t) * t * 100 + t ** 2 * 190;
  const y = (1 - t) ** 2 * 74 + 2 * (1 - t) * t * -26 + t ** 2 * 74;
  line.setAttribute("x1", x.toFixed(1));
  line.setAttribute("x2", x.toFixed(1));
  line.setAttribute("y1", y.toFixed(1));
  line.setAttribute("y2", "74");
  dot.setAttribute("cx", x.toFixed(1));
  dot.setAttribute("cy", y.toFixed(1));
  line.setAttribute("opacity", "0.85");
  dot.setAttribute("opacity", "0.9");
}

function scheduleGoldenChip(w) {
  const chip = document.getElementById("golden-chip");
  const sub = document.getElementById("golden-chip-sub");
  const headline = document.getElementById("golden-chip-headline");
  if (!chip || !sub || !headline) return;
  if (state.goldenTimer) { clearInterval(state.goldenTimer); state.goldenTimer = null; }
  const GOLDEN_MS = 45 * 60_000;

  const update = () => {
    const now = Date.now();
    const windows = [];
    for (const d of (w.daily || [])) {
      if (d.sunrise) windows.push({ kind: "sunrise", start: d.sunrise, end: d.sunrise + GOLDEN_MS });
      if (d.sunset)  windows.push({ kind: "sunset",  start: d.sunset - GOLDEN_MS, end: d.sunset });
    }
    windows.sort((a, b) => a.start - b.start);
    // Active window?
    const active = windows.find((w2) => now >= w2.start && now < w2.end);
    if (active) {
      const mins = Math.max(1, Math.round((active.end - now) / 60_000));
      chip.hidden = false;
      chip.setAttribute("data-active", "true");
      headline.textContent = active.kind === "sunrise" ? "Golden hour · morning" : "Golden hour · evening";
      sub.textContent = `ends in ${mins}m · warm, long light`;
      return;
    }
    // Otherwise show soonest upcoming within the next 10 hours.
    const upcoming = windows.find((w2) => w2.start > now && w2.start - now < 10 * 3600_000);
    if (upcoming) {
      const mins = Math.max(1, Math.round((upcoming.start - now) / 60_000));
      const label = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
      chip.hidden = false;
      chip.removeAttribute("data-active");
      headline.textContent = upcoming.kind === "sunrise" ? "Golden hour · morning" : "Golden hour · evening";
      sub.textContent = `starts in ${label} · at ${fmtTime(upcoming.start)}`;
      return;
    }
    chip.hidden = true;
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
      const twelve = useTwelveHour();
      const parts = new Intl.DateTimeFormat([], {
        timeZone: tz, hour: twelve ? "numeric" : "2-digit", minute: "2-digit", hour12: twelve,
        weekday: "short", timeZoneName: "short",
      }).formatToParts(new Date());
      const day = parts.find((p) => p.type === "weekday")?.value ?? "";
      const hour = parts.find((p) => p.type === "hour")?.value ?? "";
      const minute = parts.find((p) => p.type === "minute")?.value ?? "";
      const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value ?? "";
      const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
      const timeStr = twelve
        ? `${hour}:${minute}${dayPeriod ? " " + dayPeriod : ""}`
        : `${hour}:${minute}`;
      const offsetChip = tzOffsetChip(tz);
      el.placeLocaltime.innerHTML =
        `<span class="clock-dot" aria-hidden="true"></span>` +
        `${escapeHtml(day)} ${escapeHtml(timeStr)} <span style="color:var(--fg-dim)">${escapeHtml(tzName)}</span>` +
        offsetChip;
    } catch {
      el.placeLocaltime.textContent = "";
    }
  };
  update();
  state.localTimer = setInterval(update, 10_000);
  renderSeasonChip();
}

// Rough perihelion-agnostic dates for northern hemisphere equinox/solstice.
// Good enough for a one-line seasonal chip within a few days' window.
function renderSeasonChip() {
  const chip = document.getElementById("season-chip");
  if (!chip) return;
  const now = new Date();
  const year = now.getFullYear();
  const markers = [
    { name: "Vernal equinox",   date: new Date(year, 2, 20), emoji: "🌱", tone: "warm" },  // Mar 20
    { name: "Summer solstice",  date: new Date(year, 5, 21), emoji: "☀",  tone: "warm" },  // Jun 21
    { name: "Autumn equinox",   date: new Date(year, 8, 22), emoji: "🍂", tone: "warm" },  // Sep 22
    { name: "Winter solstice",  date: new Date(year, 11, 21), emoji: "❄", tone: "cool" }, // Dec 21
  ];
  let nearest = null, nearestDays = Infinity;
  for (const m of markers) {
    const diff = Math.round((m.date - now) / 86400_000);
    if (Math.abs(diff) < Math.abs(nearestDays)) { nearest = m; nearestDays = diff; }
  }
  if (!nearest || Math.abs(nearestDays) > 3) { chip.hidden = true; return; }
  chip.hidden = false;
  if (nearest.tone) chip.setAttribute("data-tone", nearest.tone);
  const when =
    nearestDays === 0 ? "today" :
    nearestDays === 1 ? "tomorrow" :
    nearestDays === -1 ? "yesterday" :
    nearestDays > 0 ? `in ${nearestDays} days` :
    `${Math.abs(nearestDays)} days ago`;
  chip.textContent = `${nearest.emoji}  ${nearest.name} ${when}`;
}

function tzOffsetMinutes(tz) {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const m = {};
    parts.forEach((p) => { m[p.type] = p.value; });
    // Intl can return hour "24" for midnight — normalise.
    const hh = m.hour === "24" ? 0 : parseInt(m.hour, 10);
    const asUtc = Date.UTC(+m.year, +m.month - 1, +m.day, hh, +m.minute, +m.second);
    return Math.round((asUtc - now.getTime()) / 60_000);
  } catch {
    return null;
  }
}

function tzOffsetChip(tz) {
  const target = tzOffsetMinutes(tz);
  if (target == null) return "";
  const localOffset = -new Date().getTimezoneOffset();
  const delta = target - localOffset; // minutes
  if (Math.abs(delta) < 15) return ""; // same time zone
  const sign = delta > 0 ? "ahead" : "behind";
  const abs = Math.abs(delta);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const label = m === 0 ? `${h}h ${sign}` : `${h}h ${m}m ${sign}`;
  const dir = delta > 0 ? "ahead" : "behind";
  return ` <span class="tz-chip" data-dir="${dir}">${escapeHtml(label)}</span>`;
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
      // Convert delta to the same unit as the value display.
      const u = pressureUnit();
      const scale = u === "inhg" ? 0.02953 : u === "mmhg" ? 0.750062 : 1;
      const scaled = delta * scale;
      const precision = u === "inhg" ? 2 : 1;
      el.pressureTrend.textContent = `${arrow} ${scaled >= 0 ? "+" : ""}${scaled.toFixed(precision)}`;
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
  renderDailyPrecipTotals(days);
  renderDailyPicks(days, w);
  // Global min/max for the range bar + indexes for extreme-day badges.
  let gMin = Infinity, gMax = -Infinity;
  let coldestIdx = -1, hottestIdx = -1;
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    if (d.tempMin != null && d.tempMin < gMin) { gMin = d.tempMin; coldestIdx = i; }
    if (d.tempMax != null && d.tempMax > gMax) { gMax = d.tempMax; hottestIdx = i; }
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
      ? ` · gusts ${formatWind(d.gustsMax)}`
      : "";
    const popLabel = d.pop >= 30 ? ` · ${d.pop}% rain` : "";
    const extra = gustLabel || popLabel ? `<span class="daily-gust">${popLabel}${gustLabel}</span>` : "";
    const extremeBadge = (days.length >= 3 && i === hottestIdx && (gMax - gMin) >= 3)
      ? '<span class="daily-extreme daily-extreme-hot" title="Hottest of the week">↑</span>'
      : (days.length >= 3 && i === coldestIdx && (gMax - gMin) >= 3)
      ? '<span class="daily-extreme daily-extreme-cold" title="Coldest of the week">↓</span>'
      : "";
    item.innerHTML = `
      <span class="daily-day">${day}${extremeBadge}</span>
      <span class="daily-icon">${iconFor(d.condition)}</span>
      <div class="daily-range">
        <div class="daily-range-fill" style="left:${left}%;width:${Math.max(8, width)}%"></div>
      </div>
      <span class="daily-temp-min">${Math.round(convertTemp(d.tempMin))}°</span>
      <span class="daily-temp-max">${Math.round(convertTemp(d.tempMax))}°</span>
      ${extra}
      <svg class="daily-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    `;
    item.addEventListener("click", () => toggleDailyExpand(item, d, w));
    el.dailyTrack.appendChild(item);
  });
}

function renderDailyIconStrip(days) {
  if (!el.dailyIconStrip) return;
  const tz = state.weather?.timezone;
  el.dailyIconStrip.innerHTML = days.map((d, i) => {
    const day = i === 0 ? "Today" : new Date(d.time).toLocaleDateString(undefined, {
      weekday: "short",
      ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
    });
    const hi = d.tempMax != null ? `${Math.round(convertTemp(d.tempMax))}°` : "—";
    const lo = d.tempMin != null ? `${Math.round(convertTemp(d.tempMin))}°` : "—";
    const rain = d.pop >= 20 ? ` · ${d.pop}% rain` : "";
    const label = d.label || d.condition || "";
    const title = `${day}: ${label} · ${hi} / ${lo}${rain}`;
    return `<span class="strip-day${i === 0 ? " strip-day-now" : ""}" title="${escapeHtml(title)}">${iconFor(d.condition)}</span>`;
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

function scoreDay(d) {
  if (d == null) return -Infinity;
  const hi = d.tempMax;
  const lo = d.tempMin;
  const precip = Math.max(0, d.precip || 0);
  const pop = Math.max(0, d.pop || 0);
  const gusts = d.gustsMax ?? d.windMax ?? 0;
  // Comfort peak around 22°C: a gentle bell curve.
  const comfort = hi != null ? Math.max(-10, 12 - Math.abs(hi - 22)) : 0;
  // Penalize precipitation (mm) heavily; light drizzle is ok.
  const wet = precip * 2.2 + pop * 0.04;
  // Penalize strong wind gusts (>25 km/h starts to matter).
  const windy = Math.max(0, gusts - 25) * 0.4;
  // Very cold nights also hurt.
  const chilly = lo != null && lo < 4 ? (4 - lo) * 0.6 : 0;
  return comfort - wet - windy - chilly;
}

function renderDailyPicks(days, w) {
  const wrap = document.getElementById("daily-picks");
  const bestDay = document.getElementById("daily-pick-best-day");
  const roughDay = document.getElementById("daily-pick-rough-day");
  const bestBtn = document.getElementById("daily-pick-best");
  const roughBtn = document.getElementById("daily-pick-rough");
  if (!wrap || !bestDay || !roughDay || !bestBtn || !roughBtn) return;
  if (days.length < 3) { wrap.hidden = true; return; }
  const scored = days.map((d, i) => ({ d, i, score: scoreDay(d) }));
  const sorted = scored.slice().sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const rough = sorted[sorted.length - 1];
  // If everything is basically identical or too close, hide it.
  if (best.score - rough.score < 3) { wrap.hidden = true; return; }
  wrap.hidden = false;
  const tz = w?.timezone;
  const nameFor = (idx) => {
    if (idx === 0) return "Today";
    if (idx === 1) return "Tomorrow";
    return new Date(days[idx].time).toLocaleDateString(undefined, {
      weekday: "short",
      ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
    });
  };
  bestDay.textContent = nameFor(best.i);
  roughDay.textContent = nameFor(rough.i);
  bestBtn.title = `${Math.round(convertTemp(best.d.tempMax))}° · ${best.d.precip || 0}mm rain`;
  roughBtn.title = `${Math.round(convertTemp(rough.d.tempMax))}° · ${rough.d.precip || 0}mm rain · gusts ${formatWind(rough.d.gustsMax || rough.d.windMax || 0)}`;

  // Wire click-to-scroll behaviour: open that day's expanded panel.
  const focusDay = (idx) => {
    const items = el.dailyTrack?.querySelectorAll(".daily-item");
    if (!items || !items[idx]) return;
    items[idx].scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (items[idx].dataset.expanded !== "true") items[idx].click();
  };
  bestBtn.onclick = () => focusDay(best.i);
  roughBtn.onclick = () => focusDay(rough.i);
}

function renderDailyPrecipTotals(days) {
  const line = document.getElementById("daily-precip-line");
  const text = document.getElementById("daily-precip-text");
  const bars = document.getElementById("daily-precip-bars");
  if (!line || !text || !bars) return;
  const precip = days.map((d) => Math.max(0, d.precip || 0));
  const total = precip.reduce((a, b) => a + b, 0);
  if (total < 0.2) {
    line.hidden = true;
    return;
  }
  line.hidden = false;
  // Peak day within the visible range.
  let peakIdx = 0;
  for (let i = 1; i < precip.length; i++) if (precip[i] > precip[peakIdx]) peakIdx = i;
  const tz = state.weather?.timezone;
  const peakDate = new Date(days[peakIdx].time);
  const peakLabel = peakIdx === 0 ? "today" : peakDate.toLocaleDateString(undefined, {
    weekday: "short",
    ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });
  const totalDisplay = total >= 10 ? total.toFixed(0) : total.toFixed(1);
  const peakVal = precip[peakIdx];
  const peakDisplay = peakVal >= 10 ? peakVal.toFixed(0) : peakVal.toFixed(1);
  if (peakVal < 0.2) {
    text.textContent = `${totalDisplay} mm this week`;
  } else if (peakIdx === 0) {
    text.textContent = `${totalDisplay} mm this week · ${peakDisplay} mm today`;
  } else {
    text.textContent = `${totalDisplay} mm this week · peak ${peakDisplay} mm ${peakLabel}`;
  }
  // Bars: normalize so tallest is full-height.
  const maxP = Math.max(...precip);
  bars.innerHTML = precip.map((p) => {
    const h = maxP > 0 ? Math.max(6, (p / maxP) * 100) : 0;
    const dry = p < 0.2;
    return `<span class="pbar" data-dry="${dry}"><span style="height:${p > 0 ? h : 0}%"></span></span>`;
  }).join("");
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
    summary.innerHTML = `<span style="padding:8px;color:var(--fg-dim);font-size:12px">Pop ${d.pop}% · gust up to ${formatWind(d.gustsMax ?? 0)} · UV ${Math.round(d.uvMax ?? 0)}</span>`;
    item.appendChild(summary);
    item.dataset.expanded = "true";
    return;
  }
  const tMin = Math.min(...hrs.map((h) => h.temp));
  const tMax = Math.max(...hrs.map((h) => h.temp));
  const tSpan = Math.max(1, tMax - tMin);

  // Time-of-day summary chips: average temp during 6-12, 12-18, 18-22.
  const avg = (from, to) => {
    const arr = hrs.filter((h) => {
      const hh = new Date(h.time).getHours();
      return hh >= from && hh < to && h.temp != null;
    });
    if (!arr.length) return null;
    return arr.reduce((s, h) => s + h.temp, 0) / arr.length;
  };
  const morn = avg(6, 12);
  const aft  = avg(12, 18);
  const eve  = avg(18, 22);
  const summary = document.createElement("div");
  summary.className = "daily-expand-summary";
  const t = (v) => v == null ? "—" : `${Math.round(convertTemp(v))}°`;
  summary.innerHTML =
    `<span>Morn <strong>${t(morn)}</strong></span>` +
    `<span>Aft <strong>${t(aft)}</strong></span>` +
    `<span>Eve <strong>${t(eve)}</strong></span>` +
    `<span>· Pop ${d.pop ?? 0}% · UV ${Math.round(d.uvMax ?? 0)}</span>`;

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
  item.appendChild(summary);
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

// ---------- Document identity ----------
function conditionGlyph(condition, isDay) {
  switch (condition) {
    case "clear":  return isDay ? "☀" : "☾";
    case "clouds": return "☁";
    case "rain":   return "☂";
    case "snow":   return "❄";
    case "storm":  return "⛈";
    case "fog":    return "🌫";
    default:       return "•";
  }
}

function updateDocumentIdentity(w) {
  const placeName = state.place?.name || "Weather";
  const t = w.temp;
  const tempTxt = t != null ? `${Math.round(convertTemp(t))}°` : "—";
  const glyph = conditionGlyph(w.condition, w.isDay);
  document.title = `${tempTxt} ${glyph} ${placeName} — Aether`;
  updateFavicon(w);
}

function updateFavicon(w) {
  const link = document.querySelector('link[rel="icon"]');
  if (!link) return;
  // Simple SVG favicon that reflects current condition.
  const cond = w.condition;
  const isDay = w.isDay;
  let svg;
  const w2 = "64", h = "64";
  if (cond === "clear" && isDay) {
    svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w2} ${h}'><circle cx='32' cy='32' r='18' fill='%23ffd36a'/></svg>`;
  } else if (cond === "clear") {
    svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w2} ${h}'><path d='M42 34a16 16 0 11-16-24 12 12 0 0016 24z' fill='%23e8ecf5'/></svg>`;
  } else if (cond === "rain") {
    svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w2} ${h}'><path d='M18 36a10 10 0 010-20 12 12 0 0124-2 10 10 0 018 22H18z' fill='%23c8d3e0'/><path d='M22 44l-2 6M32 44l-2 6M42 44l-2 6' stroke='%237ec0ff' stroke-width='3' stroke-linecap='round'/></svg>`;
  } else if (cond === "snow") {
    svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w2} ${h}'><path d='M18 36a10 10 0 010-20 12 12 0 0124-2 10 10 0 018 22H18z' fill='%23e8ecf5'/><circle cx='24' cy='50' r='2' fill='%23fff'/><circle cx='32' cy='54' r='2' fill='%23fff'/><circle cx='40' cy='50' r='2' fill='%23fff'/></svg>`;
  } else if (cond === "storm") {
    svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w2} ${h}'><path d='M18 36a10 10 0 010-20 12 12 0 0124-2 10 10 0 018 22H18z' fill='%23a8b5c8'/><path d='M30 40l-4 10h6l-4 10' fill='none' stroke='%23ffdc7a' stroke-width='3' stroke-linejoin='round'/></svg>`;
  } else if (cond === "fog") {
    svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w2} ${h}'><path d='M14 24h36M14 34h30M14 44h34M14 54h28' stroke='%23c8d3e0' stroke-width='4' stroke-linecap='round'/></svg>`;
  } else {
    svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w2} ${h}'><path d='M18 36a10 10 0 010-20 12 12 0 0124-2 10 10 0 018 22H18z' fill='%23c8d3e0'/></svg>`;
  }
  link.setAttribute("href", "data:image/svg+xml," + svg);
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
    const glyph = p.condition ? conditionGlyph(p.condition, p.isDay ?? true) : "";
    const condKey = p.condition === "clear"
      ? (p.isDay ?? true) ? "clear-day" : "clear-night"
      : (p.condition || "");
    return `
      <div class="place-chip ${active ? "active" : ""}" data-id="${p.id}">
        ${glyph ? `<span class="chip-glyph" data-cond="${escapeHtml(condKey)}" aria-hidden="true">${glyph}</span>` : ""}
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
  if (el.searchSpinner) el.searchSpinner.hidden = false;
  try {
    const results = await searchCities(q);
    renderSearchResults(results);
  } finally {
    if (el.searchSpinner) el.searchSpinner.hidden = true;
  }
}, 200);

function renderSearchResults(results) {
  if (!results.length) {
    el.searchResults.innerHTML = `<li class="search-empty">No matching cities — try a different spelling.</li>`;
    el.searchResults._items = [];
    el.searchResults.hidden = false;
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

function updateSearchClear() {
  if (!el.searchClear) return;
  el.searchClear.hidden = !el.searchInput.value.length;
}

function bindSearch() {
  el.searchInput.addEventListener("input", (e) => {
    const v = e.target.value.trim();
    updateSearchClear();
    if (v.length < 2) {
      showRecentsIfAny();
      return;
    }
    runSearch(v);
  });
  el.searchClear?.addEventListener("click", () => {
    el.searchInput.value = "";
    updateSearchClear();
    showRecentsIfAny();
    el.searchInput.focus();
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
    const listOpen = !el.searchResults.hidden && el.searchResults._items?.length;
    if (e.key === "ArrowDown") {
      if (!listOpen) {
        // Open the dropdown if we have anything to show.
        showRecentsIfAny();
      }
      e.preventDefault();
      moveSearchCursor(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveSearchCursor(-1);
    } else if (e.key === "Enter") {
      if (!listOpen) return;
      e.preventDefault();
      const idx = getSearchCursor();
      const items = el.searchResults._items || [];
      const item = items[idx >= 0 ? idx : 0];
      if (item) selectSearchItem(item);
    } else if (e.key === "Escape") {
      el.searchResults.hidden = true;
      el.searchInput.blur();
    }
  });
  el.searchResults.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    const i = parseInt(li.dataset.index, 10);
    const item = el.searchResults._items?.[i];
    if (!item) return;
    selectSearchItem(item);
  });
  el.searchResults.addEventListener("mousemove", (e) => {
    const li = e.target.closest("li[data-index]");
    if (!li) return;
    setSearchCursor(parseInt(li.dataset.index, 10));
  });
}

function selectSearchItem(item) {
  el.searchInput.value = item.name;
  updateSearchClear();
  el.searchResults.hidden = true;
  places.add(item);
  state.handlers.onSearchSelect?.(item);
}

function getSearchCursor() {
  const active = el.searchResults.querySelector("li.active");
  return active ? parseInt(active.dataset.index, 10) : -1;
}

function setSearchCursor(idx) {
  el.searchResults.querySelectorAll("li.active").forEach((li) => li.classList.remove("active"));
  const items = el.searchResults.querySelectorAll("li[data-index]");
  if (!items.length) return;
  const clamped = ((idx % items.length) + items.length) % items.length;
  const target = el.searchResults.querySelector(`li[data-index="${clamped}"]`);
  if (target) {
    target.classList.add("active");
    target.scrollIntoView({ block: "nearest" });
  }
}

function moveSearchCursor(delta) {
  const items = el.searchResults.querySelectorAll("li[data-index]");
  if (!items.length) return;
  const current = getSearchCursor();
  const next = current < 0
    ? (delta > 0 ? 0 : items.length - 1)
    : current + delta;
  setSearchCursor(next);
}

function bindUnitToggle() {
  el.unitBtn.addEventListener("click", () => {
    state.unit = state.unit === "C" ? "F" : "C";
    localStorage.setItem("aether:unit", state.unit);
    el.unitBtn.textContent = `°${state.unit}`;
    if (el.settingUnitF) el.settingUnitF.checked = state.unit === "F";
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

  el.settingWindUnit?.addEventListener("change", () => {
    const v = el.settingWindUnit.value;
    if (["kmh", "mph", "ms", "kt"].includes(v)) {
      localStorage.setItem("aether:windUnit", v);
      if (state.weather) ui.setWeather(state.weather);
    }
  });

  el.settingPressureUnit?.addEventListener("change", () => {
    const v = el.settingPressureUnit.value;
    if (["hpa", "inhg", "mmhg"].includes(v)) {
      localStorage.setItem("aether:pressureUnit", v);
      if (state.weather) ui.setWeather(state.weather);
    }
  });

  el.settingDistanceUnit?.addEventListener("change", () => {
    const v = el.settingDistanceUnit.value;
    if (["km", "mi"].includes(v)) {
      localStorage.setItem("aether:distanceUnit", v);
      if (state.weather) ui.setWeather(state.weather);
    }
  });

  el.settingClock12?.addEventListener("change", () => {
    localStorage.setItem("aether:clock12", el.settingClock12.checked ? "1" : "0");
    if (state.weather) ui.setWeather(state.weather);
    // Localtime string is on its own timer — poke it so the change is instant.
    if (state.weather) startLocaltime(state.weather);
  });

  el.settingRefreshInterval?.addEventListener("change", () => {
    const v = parseInt(el.settingRefreshInterval.value, 10);
    if (v === 0 || (v >= 60_000 && v <= 3600_000)) {
      localStorage.setItem("aether:refreshInterval", String(v));
      state.handlers.onRefreshIntervalChange?.(v);
    }
  });

  document.querySelectorAll(".accent-swatch").forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.dataset.accent || "auto";
      applyAccentPreset(value);
      localStorage.setItem("aether:accent", value);
    });
  });

  el.settingClearPlaces?.addEventListener("click", () => {
    if (!confirm("Clear all saved places?")) return;
    for (const p of places.all()) places.remove(p);
    renderPlaces();
    ui.showToast("Saved places cleared");
    close();
  });

  el.settingClearPrefs?.addEventListener("click", () => {
    if (!confirm("Reset all preferences back to defaults?")) return;
    const keys = [
      "aether:unit", "aether:windUnit", "aether:pressureUnit",
      "aether:distanceUnit", "aether:clock12", "aether:accent",
      "aether:reduceMotion", "aether:dismissedAlerts",
    ];
    for (const k of keys) localStorage.removeItem(k);
    // Reflect immediately: unit, checkboxes, selects, accent, motion.
    state.unit = defaultTempUnit();
    if (el.unitBtn) el.unitBtn.textContent = `°${state.unit}`;
    applyStoredPreferences();
    document.documentElement.removeAttribute("data-reduce-motion");
    state.handlers.onReduceMotion?.(false);
    if (state.weather) ui.setWeather(state.weather);
    ui.showToast("Preferences reset");
    close();
  });
}

const ACCENT_PRESETS = {
  auto:   null, // fall back to scene-provided --accent
  sky:    "#9ad1ff",
  warm:   "#ff9c7a",
  mint:   "#8be0a0",
  purple: "#c9a2ff",
  gold:   "#ffd36a",
};

function applyAccentPreset(name) {
  const value = ACCENT_PRESETS[name];
  if (value == null) {
    document.documentElement.style.removeProperty("--accent");
  } else {
    document.documentElement.style.setProperty("--accent", value);
  }
  document.querySelectorAll(".accent-swatch").forEach((btn) => {
    btn.setAttribute("aria-checked", btn.dataset.accent === name ? "true" : "false");
  });
}

function applyStoredPreferences() {
  const stored = localStorage.getItem("aether:reduceMotion");
  // If the user hasn't chosen yet, respect the OS setting; once they toggle
  // manually the stored value takes over regardless of the OS.
  const prefers = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const reduce = stored != null ? stored === "1" : !!prefers;
  if (reduce) {
    document.documentElement.setAttribute("data-reduce-motion", "true");
    if (el.settingReduceMotion) el.settingReduceMotion.checked = true;
    // Defer so app.js has time to install the handler.
    queueMicrotask(() => state.handlers.onReduceMotion?.(true));
  }
  if (el.settingUnitF) el.settingUnitF.checked = state.unit === "F";
  if (el.settingWindUnit) el.settingWindUnit.value = windUnit();
  if (el.settingPressureUnit) el.settingPressureUnit.value = pressureUnit();
  if (el.settingDistanceUnit) el.settingDistanceUnit.value = distanceUnit();
  if (el.settingClock12) el.settingClock12.checked = useTwelveHour();
  if (el.settingRefreshInterval) {
    const stored = localStorage.getItem("aether:refreshInterval");
    el.settingRefreshInterval.value = stored != null ? stored : "900000";
  }
  const accent = localStorage.getItem("aether:accent") || "auto";
  applyAccentPreset(accent);
}

// Exposed so app.js can query the current preference on boot.
ui.isReduceMotion = () => {
  const stored = localStorage.getItem("aether:reduceMotion");
  if (stored != null) return stored === "1";
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
};

function startFetchedTicker() {
  const currentRefreshMs = () => {
    const stored = parseInt(localStorage.getItem("aether:refreshInterval"), 10);
    return Number.isFinite(stored) ? stored : 15 * 60_000;
  };
  const update = () => {
    const REFRESH_MS = currentRefreshMs();
    if (!el.fetchedAgo || !state.weather?.fetchedAt) {
      if (el.fetchedAgo) el.fetchedAgo.textContent = "";
      if (el.refreshBtn) el.refreshBtn.title = "Refresh weather";
      return;
    }
    const now = Date.now();
    const age = now - state.weather.fetchedAt;
    const minutes = Math.max(0, Math.floor(age / 60_000));
    const ageLabel =
      minutes < 1 ? "Just now" :
      minutes < 60 ? `Updated ${minutes}m ago` :
      `Updated ${Math.floor(minutes / 60)}h ago`;
    const nextIn = Math.max(0, REFRESH_MS - age);
    let nextLabel = "";
    if (nextIn > 0 && age < REFRESH_MS + 30_000) {
      const mm = Math.ceil(nextIn / 60_000);
      nextLabel = mm <= 1 ? " · refresh imminent" : ` · refresh in ${mm}m`;
    }
    el.fetchedAgo.textContent = "· " + ageLabel + nextLabel;
    el.fetchedAgo.classList.toggle("stale", minutes >= 20);
    if (el.refreshBtn) {
      const stamp = fmtTime(state.weather.fetchedAt);
      el.refreshBtn.title = `Refresh weather · last fetched at ${stamp}`;
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
      `Wind ${formatWind(w.windSpeed)}${w.windDir != null ? ` ${cardinal(w.windDir)}` : ""}`,
      w.uv != null ? `UV ${Math.round(w.uv)}` : null,
      w.airQuality?.aqi != null ? `AQI ${Math.round(w.airQuality.aqi)} (${w.airQuality.label})` : null,
    ].filter(Boolean);
    const shareUrl = location.href;
    const text = lines.join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: `Aether — ${placeName}`, text, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
        ui.showToast("Summary + link copied");
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
