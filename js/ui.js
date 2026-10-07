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
import { nextSunWindow } from "./sun-windows.js";

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
  aqTrendPeak: $("#aq-trend-peak"),
  moonLit: $("#moon-lit"),
  moonName: $("#moon-name"),
  moonIllum: $("#moon-illum"),
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
  liveAnchor: $("#live-anchor"),
  liveAnchorTemp: $("#live-anchor-temp"),
  pleasantness: $("#pleasantness"),
  pleasantnessDots: $("#pleasantness-dots"),
  pleasantnessLabel: $("#pleasantness-label"),
  uvLevel: $("#m-uv-level"),
  humidityComfort: $("#m-humidity-comfort"),
  pressureSparkLine: $("#pressure-spark-line"),
  pressureSparkFill: $("#pressure-spark-fill"),
  pressureSparkLow: $("#pressure-spark-low"),
  humiditySparkLine: $("#humidity-spark-line"),
  humiditySparkFill: $("#humidity-spark-fill"),
  windSparkLine: $("#wind-spark-line"),
  windSparkFill: $("#wind-spark-fill"),
  windSparkGusts: $("#wind-spark-gusts"),
  uvSparkLine: $("#uv-spark-line"),
  uvSparkFill: $("#uv-spark-fill"),
  uvSparkPeak: $("#uv-spark-peak"),
  dailySpark: $("#daily-spark"),
  dailyHi: $("#daily-hi"),
  dailyLo: $("#daily-lo"),
  dailyRangeArea: $("#daily-range-area"),
  dailySparkDots: $("#daily-spark-dots"),
  dailyDelta: $("#daily-delta"),
  dailyPrecipStrip: $("#daily-precip-strip"),
  shareBtn: $("#share-btn"),
  installBtn: $("#install-btn"),
  refreshBtn: $("#refresh-btn"),
  fetchedAgo: $("#fetched-ago"),
  dailyIconStrip: $("#daily-icon-strip"),
  settingsBtn: $("#settings-btn"),
  settingsMenu: $("#settings-menu"),
  settingReduceMotion: $("#setting-reduce-motion"),
  settingUnitF: $("#setting-unit-f"),
  settingCompact: $("#setting-compact"),
  settingDim: $("#setting-dim"),
  settingVolume: $("#setting-volume"),
  settingRefreshInterval: $("#setting-refresh-interval"),
  settingTheme: $("#setting-theme"),
  settingCopyLink: $("#setting-copy-link"),
  settingSaveImage: $("#setting-save-image"),
  settingReset: $("#setting-reset"),
  settingClearPlaces: $("#setting-clear-places"),
  chartPopover: $("#chart-popover"),
  insightsCard: $("#insights-card"),
  insightsList: $("#insights-list"),
  activityCard: $("#activity-card"),
  activityList: $("#activity-list"),
  alertsStrip: $("#alerts-strip"),
  sunArcMarker: $("#sun-arc-marker"),
  sunArcPath: $("#sun-arc-path"),
  sunWindow: $("#sun-window"),
  sunWindowHeadline: $("#sun-window-headline"),
  sunWindowDetail: $("#sun-window-detail"),
  sunWindowCountdown: $("#sun-window-countdown"),
  sunWindowSwatch: $("#sun-window-swatch"),
  comfortStrip: $("#comfort-strip"),
  weekendChip: $("#weekend-chip"),
  weekendHeadline: $("#weekend-headline"),
  weekendDetail: $("#weekend-detail"),
  weekendIconSat: $("#weekend-icon-sat"),
  weekendIconSun: $("#weekend-icon-sun"),
  forecastTrack: $("#forecast-track"),
  forecastSummary: $("#forecast-summary"),
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
  sunWindowTimer: null,
  nowcastTimer: null,
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
    renderScrubberPrecip(weather);
    renderAdvice(weather);
    renderPollen(weather.pollen);
    renderTrends(weather);
    renderInsights(weather);
    renderActivity(weather);
    renderAlerts(weather);
    renderWeekend(weather);
    startLocaltime(weather);
    updateFavicon(weather.condition, weather.isDay !== false);
    updateDocumentTitle(weather);
    if (state.chart) state.chart.setHours(weather.hourly);
    if (state.comfortStrip) state.comfortStrip.setHours(weather.hourly);
    if (el.narrative) el.narrative.textContent = narrative || "";
    renderOfflineBanner(weather);
    flashHero(weather);
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
    updateLiveAnchor(on);
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
  // Dual-unit tooltip so a quick hover converts without toggling.
  if (w.temp != null) {
    const c = Math.round(w.temp);
    const f = Math.round(w.temp * 9 / 5 + 32);
    el.temp.setAttribute("title", `${c}°C / ${f}°F`);
  }
  // Prefix the label with a tiny glyph so condition reads at a glance.
  const glyph = conditionGlyph(w.condition, w.isDay !== false);
  el.conditionLabel.textContent = glyph
    ? `${glyph}  ${capitalize(w.label)}`
    : capitalize(w.label);
  el.feelsLike.textContent = `Feels like ${Math.round(feels)}°`;
  renderDayRange(w);
  renderPleasantness(w);
}

function pleasantnessScore(w) {
  if (!w || w.temp == null) return null;
  let s = 0;
  const t = w.temp;
  if (t >= 16 && t <= 26) s += 3;
  else if ((t >= 12 && t < 16) || (t > 26 && t <= 30)) s += 2;
  else if ((t >= 5 && t < 12) || (t > 30 && t <= 33)) s += 1;
  const wind = w.windSpeed ?? 0;
  if (wind < 12) s += 2;
  else if (wind < 25) s += 1;
  const rh = w.humidity;
  if (rh != null && rh >= 35 && rh <= 70) s += 2;
  else if (rh != null && rh >= 25 && rh <= 85) s += 1;
  // Not raining right now.
  if (!(w.condition === "rain" || w.condition === "storm" || w.condition === "snow")) s += 1;
  // Low UV burn risk (but still some sun).
  if (w.uv != null && w.uv >= 1 && w.uv < 7) s += 1;
  else if (w.uv != null && w.uv < 1) s += 0.5;
  // Clear or partly cloudy bonus.
  if (w.condition === "clear" || w.condition === "clouds") s += 1;
  return Math.max(0, Math.min(10, s));
}

function pleasantnessLabel(score) {
  if (score == null) return null;
  if (score >= 9) return { label: "Lovely", cls: "great" };
  if (score >= 7) return { label: "Pleasant", cls: "good" };
  if (score >= 5) return { label: "Fine", cls: "ok" };
  if (score >= 3) return { label: "Rough", cls: "poor" };
  return { label: "Harsh", cls: "bad" };
}

function flashHero(w) {
  if (!el.heroInner) return;
  // Skip the very first render — that's the initial load, not a refresh.
  if (!flashHero._primed) { flashHero._primed = true; return; }
  // Also skip when the user has reduced motion on.
  if (document.documentElement.getAttribute("data-reduce-motion") === "true") return;
  el.heroInner.classList.remove("just-refreshed");
  // Force reflow so the animation re-triggers if it was already applied.
  void el.heroInner.offsetWidth;
  el.heroInner.classList.add("just-refreshed");
  setTimeout(() => el.heroInner.classList.remove("just-refreshed"), 1000);
}

function renderOfflineBanner(w) {
  const banner = document.getElementById("offline-banner");
  if (!banner) return;
  if (!w?.offline) { banner.hidden = true; return; }
  banner.hidden = false;
  if (!banner._bound) {
    banner._bound = true;
    document.getElementById("offline-retry")?.addEventListener("click", () => {
      state.handlers.onRefresh?.();
    });
    document.getElementById("offline-dismiss")?.addEventListener("click", () => {
      banner.hidden = true;
    });
  }
}

function updateLiveAnchor(scrubbing) {
  if (!el.liveAnchor || !el.liveAnchorTemp) return;
  const live = state.weather;
  if (!scrubbing || !live || live.temp == null) {
    el.liveAnchor.hidden = true;
    return;
  }
  el.liveAnchor.hidden = false;
  const temp = Math.round(convertTemp(live.temp));
  el.liveAnchorTemp.textContent = `${temp}°`;
  if (!el.liveAnchor._bound) {
    el.liveAnchor._bound = true;
    el.liveAnchor.addEventListener("click", () => {
      state.handlers.onHourClick?.(Date.now());
    });
  }
}

function renderPleasantness(w) {
  if (!el.pleasantness || !el.pleasantnessDots || !el.pleasantnessLabel) return;
  const score = pleasantnessScore(w);
  if (score == null) { el.pleasantness.hidden = true; return; }
  const bucket = pleasantnessLabel(score);
  el.pleasantness.hidden = false;
  el.pleasantness.className = `pleasantness ${bucket.cls}`;
  const whole = Math.round(score);
  const dots = [];
  for (let i = 0; i < 10; i++) {
    dots.push(`<span class="dot ${i < whole ? "on" : ""}"></span>`);
  }
  el.pleasantnessDots.innerHTML = dots.join("");
  el.pleasantnessLabel.textContent = `${bucket.label} · ${whole}/10`;
  el.pleasantness.setAttribute("title", `Pleasantness ${whole}/10`);
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
    // Append a conservative "burn in" estimate for average skin when UV is
    // meaningfully present. Formula follows the ICNIRP/EPA burn-time rule
    // of thumb: minutes ≈ 200 / UV for Fitzpatrick II skin, unprotected.
    const burn = uvBurnMinutes(w.uv);
    const burnPart = burn ? ` · burn ~${burn}` : "";
    el.metricUVSub.textContent =
      `peak ${Math.round(w.uvPeak.value)} at ${fmtTime(w.uvPeak.time)}${burnPart}`;
  } else {
    el.metricUVSub.textContent = "peak —";
  }
  renderPressureSparkline(w);
}

function uvBurnMinutes(uv) {
  if (uv == null || uv < 2) return null;
  const raw = 200 / uv;
  const mins = Math.round(Math.max(10, Math.min(240, raw)));
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
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
  const pSeries = (w.hourly || []).map((h) => h.pressure).filter((v) => v != null).slice(0, 12);
  drawSparkline(
    el.pressureSparkLine, el.pressureSparkFill,
    pSeries,
    { minSpan: 1.5 }
  );
  // Expose min/max/range on hover for anyone curious.
  const pSvg = document.getElementById("pressure-spark");
  if (pSvg && pSeries.length >= 2) {
    pSvg.setAttribute("aria-label",
      `Pressure next 12h: ${Math.round(Math.min(...pSeries))}–${Math.round(Math.max(...pSeries))} hPa`);
    pSvg.setAttribute("title", pSvg.getAttribute("aria-label"));
  }
  const hSvg = document.getElementById("humidity-spark");
  const hSeries = (w.hourly || []).map((h) => h.humidity).filter((v) => v != null).slice(0, 12);
  if (hSvg && hSeries.length >= 2) {
    hSvg.setAttribute("aria-label",
      `Humidity next 12h: ${Math.round(Math.min(...hSeries))}–${Math.round(Math.max(...hSeries))}%`);
    hSvg.setAttribute("title", hSvg.getAttribute("aria-label"));
  }
  const wSvg = document.getElementById("wind-spark");
  const wSeries = (w.hourly || []).map((h) => h.wind).filter((v) => v != null).slice(0, 12);
  if (wSvg && wSeries.length >= 2) {
    wSvg.setAttribute("aria-label",
      `Wind next 12h: ${Math.round(Math.min(...wSeries))}–${Math.round(Math.max(...wSeries))} km/h`);
    wSvg.setAttribute("title", wSvg.getAttribute("aria-label"));
  }
  const uSvg = document.getElementById("uv-spark");
  const uSeries = (w.hourly || []).slice(0, 14).map((h) => h.uv ?? 0);
  if (uSvg && uSeries.length >= 2) {
    const uMax = Math.max(...uSeries);
    uSvg.setAttribute("aria-label", `UV next 14h: peak ${uMax.toFixed(1)}`);
    uSvg.setAttribute("title", uSvg.getAttribute("aria-label"));
  }
  if (el.pressureSparkLow) {
    if (pSeries.length < 2) {
      el.pressureSparkLow.setAttribute("r", "0");
    } else {
      const minVal = Math.min(...pSeries);
      const maxVal = Math.max(...pSeries);
      const span = Math.max(1.5, maxVal - minVal);
      const idx = pSeries.indexOf(minVal);
      const W = 100, H = 24, PAD = 1.5;
      const innerW = W - PAD * 2;
      const innerH = H - PAD * 2;
      const x = PAD + (idx / (pSeries.length - 1)) * innerW;
      const y = PAD + innerH - ((minVal - minVal) / span) * innerH; // = PAD + innerH
      // Only highlight the low when the drop is meaningful (≥ 2 hPa).
      if (maxVal - minVal >= 2) {
        el.pressureSparkLow.setAttribute("cx", x.toFixed(1));
        el.pressureSparkLow.setAttribute("cy", y.toFixed(1));
        el.pressureSparkLow.setAttribute("r", "1.8");
      } else {
        el.pressureSparkLow.setAttribute("r", "0");
      }
    }
  }
  drawSparkline(
    el.humiditySparkLine, el.humiditySparkFill,
    (w.hourly || []).map((h) => h.humidity).filter((v) => v != null).slice(0, 12),
    { minSpan: 10, fixedMin: 0, fixedMax: 100 }
  );
  renderWindSparkline(w);
  renderUvSparkline(w);
}

function renderUvSparkline(w) {
  if (!el.uvSparkLine) return;
  // 14h horizon captures peak UV in nearly all mid-latitude days without
  // smearing night zeroes.
  const hours = (w.hourly || []).slice(0, 14);
  const series = hours.map((h) => h.uv ?? 0);
  const peakIdx = series.reduce((bi, v, i, arr) => (v > arr[bi] ? i : bi), 0);
  const peakValue = series[peakIdx] ?? 0;
  if (series.length < 2 || peakValue <= 0) {
    el.uvSparkLine.setAttribute("d", "");
    el.uvSparkFill?.setAttribute("d", "");
    if (el.uvSparkPeak) {
      el.uvSparkPeak.setAttribute("cx", "-10");
      el.uvSparkPeak.style.pointerEvents = "none";
      el.uvSparkPeak.onclick = null;
    }
    return;
  }
  drawSparkline(el.uvSparkLine, el.uvSparkFill, series,
    { minSpan: 3, fixedMin: 0 });
  if (el.uvSparkPeak) {
    const W = 100, H = 24, PAD = 1.5;
    const innerW = W - PAD * 2;
    const innerH = H - PAD * 2;
    const max = Math.max(3, ...series);
    const x = PAD + (peakIdx / (series.length - 1)) * innerW;
    const y = PAD + innerH - (peakValue / max) * innerH;
    el.uvSparkPeak.setAttribute("cx", x.toFixed(1));
    el.uvSparkPeak.setAttribute("cy", y.toFixed(1));
    el.uvSparkPeak.setAttribute("r", "2.4");
    el.uvSparkPeak.style.cursor = "pointer";
    el.uvSparkPeak.style.pointerEvents = "auto";
    const peakTs = hours[peakIdx]?.time;
    el.uvSparkPeak.onclick = (ev) => {
      ev.stopPropagation();
      if (peakTs) state.handlers.onHourClick?.(peakTs);
    };
    el.uvSparkPeak.setAttribute("tabindex", "0");
    el.uvSparkPeak.setAttribute("role", "button");
    el.uvSparkPeak.setAttribute("aria-label",
      `Jump to UV peak (${Math.round(peakValue)}) at ${fmtTime(peakTs)}`);
  }
}

function renderWindSparkline(w) {
  if (!el.windSparkLine) return;
  const hours = (w.hourly || []).slice(0, 12);
  const winds = hours.map((h) => h.wind).filter((v) => v != null);
  const gusts = hours.map((h) => h.gusts).filter((v) => v != null);
  // Share a common vertical scale between wind + gusts so they read together.
  const allVals = [...winds, ...gusts];
  if (allVals.length < 2) {
    el.windSparkLine.setAttribute("d", "");
    el.windSparkFill?.setAttribute("d", "");
    el.windSparkGusts?.setAttribute("d", "");
    return;
  }
  const fixedMax = Math.max(...allVals) * 1.1;
  drawSparkline(el.windSparkLine, el.windSparkFill, winds,
    { minSpan: 4, fixedMin: 0, fixedMax });
  if (el.windSparkGusts && gusts.length >= 2) {
    // Reuse the same geometry logic as drawSparkline for the gust overlay,
    // but write only the stroke path (no fill).
    const W = 100, H = 24, PAD = 1.5;
    const innerW = W - PAD * 2;
    const innerH = H - PAD * 2;
    const span = Math.max(4, fixedMax);
    const x = (i) => PAD + (i / (gusts.length - 1)) * innerW;
    const y = (v) => PAD + innerH - (v / span) * innerH;
    let path = "";
    gusts.forEach((v, i) => {
      path += (i === 0 ? "M" : "L") + x(i).toFixed(1) + "," + y(v).toFixed(1) + " ";
    });
    el.windSparkGusts.setAttribute("d", path.trim());
  } else if (el.windSparkGusts) {
    el.windSparkGusts.setAttribute("d", "");
  }
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
  el.aqCard.setAttribute("title", aqAdvice(aq.aqi));
  renderAqTrend(aq);
}

function aqAdvice(aqi) {
  if (aqi == null) return "Air quality unknown";
  if (aqi <= 50) return "Good — air quality poses little or no risk.";
  if (aqi <= 100) return "Moderate — unusually sensitive people should limit prolonged outdoor exertion.";
  if (aqi <= 150) return "Unhealthy for sensitive groups — reduce outdoor time if asthmatic or heart-condition prone.";
  if (aqi <= 200) return "Unhealthy — everyone should limit outdoor exertion.";
  if (aqi <= 300) return "Very unhealthy — avoid outdoor activity, keep windows closed.";
  return "Hazardous — stay indoors with air filtration if possible.";
}

function renderAqTrend(aq) {
  if (!el.aqTrendLine || !el.aqTrendFill) return;
  const trend = aq?.trend || [];
  const pts = trend.map((p) => p.aqi);
  if (pts.length < 2) {
    el.aqTrendLine.setAttribute("d", "");
    el.aqTrendFill.setAttribute("d", "");
    if (el.aqTrendPeak) {
      el.aqTrendPeak.setAttribute("r", "0");
      el.aqTrendPeak.onclick = null;
    }
    return;
  }
  drawSparkline(el.aqTrendLine, el.aqTrendFill, pts, { minSpan: 20 });
  if (el.aqTrendPeak) {
    const peakIdx = pts.reduce((bi, v, i, arr) => (v > arr[bi] ? i : bi), 0);
    const peakVal = pts[peakIdx];
    const W = 100, H = 24, PAD = 1.5;
    const innerW = W - PAD * 2;
    const innerH = H - PAD * 2;
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = Math.max(20, max - min);
    const x = PAD + (peakIdx / (pts.length - 1)) * innerW;
    const y = PAD + innerH - ((peakVal - min) / span) * innerH;
    el.aqTrendPeak.setAttribute("cx", x.toFixed(1));
    el.aqTrendPeak.setAttribute("cy", y.toFixed(1));
    el.aqTrendPeak.setAttribute("r", "2.1");
    el.aqTrendPeak.style.cursor = "pointer";
    el.aqTrendPeak.style.pointerEvents = "auto";
    const ts = trend[peakIdx]?.time;
    el.aqTrendPeak.onclick = (ev) => {
      ev.stopPropagation();
      if (ts) state.handlers.onHourClick?.(ts);
    };
    el.aqTrendPeak.setAttribute("aria-label",
      `Jump to AQ peak (${Math.round(peakVal)}) at ${fmtTime(ts)}`);
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

function renderSeasonChip(place) {
  const chip = document.getElementById("season-chip");
  if (!chip) return;
  if (!place || place.lat == null) { chip.textContent = ""; return; }
  const south = place.lat < 0;
  const month = new Date().getMonth(); // 0..11
  // Meteorological seasons: Dec-Feb winter in N; shift 6 months in S.
  const seasonsN = ["Winter","Winter","Spring","Spring","Spring","Summer","Summer","Summer","Autumn","Autumn","Autumn","Winter"];
  const seasonsS = ["Summer","Summer","Autumn","Autumn","Autumn","Winter","Winter","Winter","Spring","Spring","Spring","Summer"];
  const name = (south ? seasonsS : seasonsN)[month];
  const glyph = { Winter: "❄", Spring: "🌱", Summer: "🌻", Autumn: "🍂" }[name] || "";
  chip.textContent = `${glyph} ${name}`;
}

function renderSun(w) {
  el.sunRise.textContent = fmtTime(w.sunrise);
  el.sunSet.textContent = fmtTime(w.sunset);
  if (w.sunrise && w.sunset) {
    const mins = Math.round((w.sunset - w.sunrise) / 60_000);
    const hh = Math.floor(mins / 60);
    const mm = mins % 60;
    el.sunDaylight.textContent = `${hh}h ${mm}m`;
    renderDaylightDelta(w, mins);
  } else {
    el.sunDaylight.textContent = "—";
    if (el.sunDaylightDelta) el.sunDaylightDelta.textContent = "";
  }
  scheduleSunCountdown(w);
  scheduleSunArc(w);
  scheduleSunWindow(w);
  renderSeasonChip(state.place);
}

function scheduleSunWindow(w) {
  if (!el.sunWindow) return;
  if (state.sunWindowTimer) { clearInterval(state.sunWindowTimer); state.sunWindowTimer = null; }
  const update = () => {
    const win = nextSunWindow(w?.daily);
    if (!win) { el.sunWindow.hidden = true; return; }
    el.sunWindow.hidden = false;
    el.sunWindow.dataset.kind = win.kind;
    el.sunWindow.dataset.state = win.state;
    const whenLabel = win.when === "am" ? "morning" : "evening";
    el.sunWindowHeadline.textContent = `${win.label} · ${whenLabel}`;
    el.sunWindowDetail.textContent = `${fmtTime(win.start)} – ${fmtTime(win.end)}`;
    const ms = win.state === "active" ? win.msToEnd : win.msToStart;
    const totalMin = Math.max(0, Math.round(ms / 60_000));
    const compact = totalMin >= 60
      ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`
      : `${totalMin}m`;
    el.sunWindowCountdown.textContent = win.state === "active"
      ? `ends in ${compact}`
      : `in ${compact}`;
    el.sunWindow.setAttribute("title",
      `${win.label} ${whenLabel}: ${fmtTime(win.start)} – ${fmtTime(win.end)}. Click to preview.`);
  };
  update();
  // Tick each minute — windows are short, countdown should feel live.
  state.sunWindowTimer = setInterval(update, 60_000);
  el.sunWindow.onclick = () => {
    const win = nextSunWindow(w?.daily);
    if (!win) return;
    // Scrub to the middle of the window for the best preview.
    const mid = Math.round((win.start + win.end) / 2);
    state.handlers.onHourClick?.(mid);
  };
}

function renderDaylightDelta(w, todayMins) {
  if (!el.sunDaylightDelta) return;
  const tmrw = w?.daily?.[1];
  if (!tmrw?.sunrise || !tmrw?.sunset) { el.sunDaylightDelta.textContent = ""; return; }
  const tmrwMins = Math.round((tmrw.sunset - tmrw.sunrise) / 60_000);
  const delta = tmrwMins - todayMins;
  if (delta === 0) {
    el.sunDaylightDelta.className = "sun-daylight-delta flat";
    el.sunDaylightDelta.textContent = "same tmrw";
    return;
  }
  const seconds = Math.abs(delta) * 60;
  const label = seconds >= 60
    ? `${Math.round(seconds / 60)}m`
    : `${seconds}s`;
  const dir = delta > 0 ? "up" : "down";
  const sign = delta > 0 ? "+" : "−";
  el.sunDaylightDelta.className = `sun-daylight-delta ${dir}`;
  el.sunDaylightDelta.textContent = `${sign}${label} tmrw`;
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
      el.pressureTrend.setAttribute("title", pressureNarrative(direction, delta));
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
}

function pressureNarrative(direction, delta) {
  const mag = Math.abs(delta);
  if (direction === "falling") {
    if (mag >= 4) return "Falling fast — storms possible";
    if (mag >= 2) return "Falling — unsettled weather moving in";
    return "Easing lower — some change ahead";
  }
  if (direction === "rising") {
    if (mag >= 4) return "Rising quickly — rapid clearing";
    if (mag >= 2) return "Rising — skies trending clearer";
    return "Nudging higher — settling pattern";
  }
  return "Steady — no quick change";
}

function cardinal(deg) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const i = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return dirs[i];
}

function renderHourly(w) {
  renderForecastSummary(w);
  el.forecastTrack.innerHTML = "";
  for (const h of (w.hourly || []).slice(0, 24)) {
    const item = document.createElement("div");
    item.className = "forecast-item";
    const severe = hourSeverity(h);
    if (severe) {
      item.classList.add("severe", `severe-${severe.kind}`);
    }
    item.dataset.ts = h.time;
    const severeBadge = severe ? `<span class="forecast-flag" title="${escapeHtml(severe.title)}">${severe.glyph}</span>` : "";
    item.innerHTML = `
      <span class="forecast-time">${fmtTime(h.time)}</span>
      <span class="forecast-icon">${iconFor(h.condition)}${severeBadge}</span>
      <span class="forecast-temp">${Math.round(convertTemp(h.temp))}°</span>
      <span class="forecast-pop ${h.pop < 20 ? "dim" : ""}">${h.pop}%</span>
    `;
    item.addEventListener("click", () => state.handlers.onHourClick?.(h.time));
    el.forecastTrack.appendChild(item);
  }
}

function renderForecastSummary(w) {
  if (!el.forecastSummary) return;
  const hours = (w.hourly || []).slice(0, 24);
  if (hours.length < 4) { el.forecastSummary.textContent = ""; return; }
  const totalMm = hours.reduce((s, h) => s + (h.precip || 0), 0);
  const rainyHours = hours.filter((h) => (h.precip || 0) >= 0.1).length;
  const temps = hours.map((h) => h.temp).filter((v) => v != null);
  const hiC = Math.max(...temps);
  const loC = Math.min(...temps);
  const unit = state.unit;
  const t = (c) => Math.round(unit === "F" ? c * 9 / 5 + 32 : c);
  const parts = [`${t(hiC)}° / ${t(loC)}°`];
  if (totalMm >= 0.1) {
    parts.push(`${totalMm.toFixed(1)} mm · ${rainyHours}h rain`);
  } else {
    parts.push("dry");
  }
  el.forecastSummary.textContent = parts.join(" · ");
}

function hourSeverity(h) {
  // Highest-priority alert wins — a thunderstorm already implies rain.
  if (h.condition === "storm") {
    return { kind: "storm", glyph: "⚡", title: "Thunderstorm" };
  }
  if (h.gusts != null && h.gusts >= 50) {
    return { kind: "gale", glyph: "⚠", title: `Gale-force gusts (${Math.round(h.gusts)} km/h)` };
  }
  if (h.precip != null && h.precip >= 4) {
    return { kind: "heavy", glyph: "☔", title: `Heavy rain (${h.precip.toFixed(1)} mm/h)` };
  }
  if (h.temp != null && h.temp <= 0) {
    return { kind: "freeze", glyph: "❆", title: `Freezing (${Math.round(h.temp)}°C)` };
  }
  if (h.temp != null && h.temp >= 32) {
    return { kind: "hot", glyph: "🔥", title: `Very hot (${Math.round(h.temp)}°C)` };
  }
  return null;
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
  renderDailyPrecipStrip(days);
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
    const isSnow = d.condition === "snow";
    const snowLabel = isSnow && d.precip > 0
      // Rough liquid-equivalent → snow ratio: 1 mm ≈ 1 cm fresh snow when
      // close to 0°C, higher when colder. Keep it conservative at ×10.
      ? ` · ~${(d.precip * 10).toFixed(0)} cm snow`
      : "";
    const popLabel = !isSnow && d.pop >= 30 ? ` · ${d.pop}% rain` : "";
    const uvLabel = (d.uvMax != null && d.uvMax >= 8)
      ? ` · UV ${Math.round(d.uvMax)}`
      : "";
    const extra = gustLabel || popLabel || snowLabel || uvLabel
      ? `<span class="daily-gust">${popLabel}${snowLabel}${gustLabel}${uvLabel}</span>`
      : "";
    const prev = i > 0 ? days[i - 1] : null;
    const trend = dailyTempTrend(d, prev);
    item.innerHTML = `
      <span class="daily-day">${day}${trend ? ` <span class="daily-trend ${trend.cls}" title="${escapeHtml(trend.title)}">${trend.glyph}</span>` : ""}</span>
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

function dailyTempTrend(d, prev) {
  if (!prev || d?.tempMax == null || prev?.tempMax == null) return null;
  const deltaC = d.tempMax - prev.tempMax;
  const unit = state.unit;
  const delta = unit === "F" ? deltaC * 9 / 5 : deltaC;
  const absR = Math.round(Math.abs(delta));
  if (absR < 1) return { cls: "flat", glyph: "→", title: `Similar to prior day` };
  if (delta > 0) return { cls: "up", glyph: "▲", title: `+${absR}° vs prior day` };
  return { cls: "down", glyph: "▼", title: `−${absR}° vs prior day` };
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
  // Fill between hi and lo as a gradient band — visualizes diurnal range.
  if (el.dailyRangeArea) {
    const hiPts = days.map((d, i) => `${x(i).toFixed(1)},${y(d.tempMax).toFixed(1)}`);
    const loPts = days.map((d, i) => `${x(i).toFixed(1)},${y(d.tempMin).toFixed(1)}`).reverse();
    el.dailyRangeArea.setAttribute("d", `M${hiPts.join(" L")} L${loPts.join(" L")} Z`);
  }
  // Dots at each day + per-day temp labels above/below
  el.dailySparkDots.innerHTML = "";
  const tz = state.weather?.timezone;
  const weekday = (ts, i) => i === 0 ? "Today" : new Date(ts).toLocaleDateString(undefined, {
    weekday: "short",
    ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });
  days.forEach((d, i) => {
    const label = weekday(d.time, i);
    const hiT = d.tempMax != null ? `${Math.round(convertTemp(d.tempMax))}°` : "—";
    const loT = d.tempMin != null ? `${Math.round(convertTemp(d.tempMin))}°` : "—";
    if (d.tempMax != null) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", x(i).toFixed(1));
      c.setAttribute("cy", y(d.tempMax).toFixed(1));
      c.setAttribute("r", "2.5");
      c.setAttribute("class", "dot-hi");
      c.setAttribute("tabindex", "0");
      c.setAttribute("style", "cursor:pointer");
      c.addEventListener("click", () => state.handlers.onHourClick?.(d.sunrise || d.time));
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `${label} · high ${hiT} / low ${loT}`;
      c.appendChild(title);
      el.dailySparkDots.appendChild(c);
    }
    if (d.tempMin != null) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", x(i).toFixed(1));
      c.setAttribute("cy", y(d.tempMin).toFixed(1));
      c.setAttribute("r", "2.5");
      c.setAttribute("class", "dot-lo");
      c.setAttribute("tabindex", "0");
      c.setAttribute("style", "cursor:pointer");
      c.addEventListener("click", () => state.handlers.onHourClick?.(d.sunrise || d.time));
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `${label} · low ${loT} / high ${hiT}`;
      c.appendChild(title);
      el.dailySparkDots.appendChild(c);
    }
  });
}

function renderDailyPrecipStrip(days) {
  if (!el.dailyPrecipStrip) return;
  const totals = days.map((d) => Math.max(0, d.precip ?? 0));
  const anyRain = totals.some((v) => v > 0.1);
  if (!anyRain) {
    el.dailyPrecipStrip.hidden = false;
    el.dailyPrecipStrip.innerHTML =
      `<span class="precip-dry">Dry week · no measurable rain forecast</span>`;
    return;
  }
  el.dailyPrecipStrip.hidden = false;
  // Scale bar heights off the wettest day so the ratios read clearly;
  // cap at 20mm so a single storm doesn't flatten every other day's bar.
  const maxMm = Math.max(2, Math.min(20, Math.max(...totals)));
  const tz = state.weather?.timezone;
  const weekday = (ts) => new Date(ts).toLocaleDateString(undefined, {
    weekday: "short",
    ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });
  const sum = totals.reduce((s, v) => s + v, 0);
  const summary = `${sum.toFixed(1)} mm total · 7 days`;
  const cells = days.map((d, i) => {
    const mm = totals[i];
    const pct = Math.min(100, (mm / maxMm) * 100);
    const label = i === 0 ? "Today" : weekday(d.time);
    const isSnow = d.condition === "snow";
    const amount = isSnow && mm > 0.1
      ? `${Math.round(mm * 10)} cm snow`
      : `${mm.toFixed(1)} mm`;
    const title = mm > 0.1
      ? `${label} · ${amount} · ${d.pop ?? 0}%`
      : `${label} · dry`;
    const dryClass = mm <= 0.1 ? "dry" : "";
    const snowClass = isSnow && mm > 0.1 ? "snow" : "";
    return `
      <button type="button" class="precip-bar-cell ${dryClass} ${snowClass}"
              data-ts="${d.time}" title="${escapeHtml(title)}">
        <span class="precip-bar-wrap">
          <span class="precip-bar" style="height:${pct.toFixed(1)}%"></span>
        </span>
        <span class="precip-bar-day">${escapeHtml(label)}</span>
      </button>
    `;
  }).join("");
  el.dailyPrecipStrip.innerHTML =
    `<div class="precip-strip-head"><span>Rainfall</span><span>${escapeHtml(summary)}</span></div>` +
    `<div class="precip-strip-bars">${cells}</div>`;
  el.dailyPrecipStrip.querySelectorAll(".precip-bar-cell").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ts = parseInt(btn.dataset.ts, 10);
      // Scrub to the day's noon so the chart cursor lands somewhere useful.
      if (ts) state.handlers.onHourClick?.(ts + 12 * 3600_000);
    });
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

function precipIntensityClass(mmPer15Min) {
  if (mmPer15Min == null) return "intensity-none";
  // mm/hr = mm/15min * 4 (approx). Thresholds follow NOAA's descriptive bands.
  const perHr = mmPer15Min * 4;
  if (perHr >= 7.5) return "intensity-heavy";
  if (perHr >= 2.5) return "intensity-moderate";
  if (perHr >= 0.5) return "intensity-light";
  return "intensity-trace";
}

function precipIntensityLabel(mmPer15Min) {
  switch (precipIntensityClass(mmPer15Min)) {
    case "intensity-heavy": return "heavy";
    case "intensity-moderate": return "moderate";
    case "intensity-light": return "light";
    case "intensity-trace": return "trace";
    default: return "";
  }
}

function renderScrubberPrecip(w) {
  const root = document.getElementById("scrubber-precip");
  if (!root) return;
  const hours = (w.hourly || []).slice(0, 24);
  const anyRain = hours.some((h) => (h.precip || 0) >= 0.1 || (h.pop || 0) >= 30);
  if (hours.length < 4 || !anyRain) {
    root.hidden = true;
    root.innerHTML = "";
    return;
  }
  root.hidden = false;
  const maxP = Math.max(0.5, ...hours.map((h) => h.precip || 0));
  root.innerHTML = hours.map((h) => {
    const mm = Math.max(0, h.precip || 0);
    const popFrac = Math.min(1, (h.pop || 0) / 100);
    const heightPct = mm > 0 ? Math.min(100, (mm / maxP) * 90 + 10) : 0;
    const cls = precipIntensityClass(mm / 4); // chart cells show per-hour, class wants per-15min scale
    const opacity = (0.35 + popFrac * 0.55).toFixed(2);
    const hh = new Date(h.time).getHours().toString().padStart(2, "0");
    const title = mm > 0
      ? `${hh}:00 · ${mm.toFixed(1)} mm · ${h.pop ?? 0}%`
      : `${hh}:00 · ${h.pop ?? 0}% chance`;
    return `<span class="sp-cell ${cls}" style="--h:${heightPct.toFixed(0)}%;--o:${opacity}" title="${escapeHtml(title)}"></span>`;
  }).join("");
}

function renderNowcast(w) {
  // Clear any previous countdown timer before re-rendering.
  if (state.nowcastTimer) { clearInterval(state.nowcastTimer); state.nowcastTimer = null; }
  const nowcast = (w.nowcast || []).filter((n) => n.time > Date.now());
  // Find first >0.1 precip entry.
  const first = nowcast.find((n) => n.precip > 0.1);
  if (!first) {
    el.nowcast.hidden = true;
    return;
  }
  const inMin = Math.max(0, Math.round((first.time - Date.now()) / 60_000));
  const kind = first.code >= 71 && first.code <= 86 ? "Snow" : "Rain";
  // Clicking the headline area jumps to the first precipitation moment.
  if (!el.nowcast._clickBound) {
    el.nowcast._clickBound = true;
    el.nowcast.querySelector(".nowcast-text")?.addEventListener("click", () => {
      if (el.nowcast._firstTs) state.handlers.onHourClick?.(el.nowcast._firstTs);
    });
    const text = el.nowcast.querySelector(".nowcast-text");
    if (text) { text.style.cursor = "pointer"; }
  }
  el.nowcast._firstTs = first.time;
  // If precipitation is active now, find when the next sustained dry window
  // begins so we can say "clearing at HH:MM" instead of just "Rain now".
  let dryTs = null;
  if (inMin === 0) {
    const dryIdx = nowcast.findIndex((n, i) =>
      i > 0 && n.precip <= 0.1 && (nowcast[i + 1]?.precip ?? 0) <= 0.1
    );
    if (dryIdx > 0) dryTs = nowcast[dryIdx].time;
  }
  const totalMm = nowcast.reduce((s, n) => s + (n.precip || 0), 0);
  const applyHeadline = () => {
    let headline;
    if (inMin === 0) {
      if (dryTs) {
        const mins = Math.max(0, Math.round((dryTs - Date.now()) / 60_000));
        headline = `${kind} now · clearing in ${mins}m`;
      } else {
        headline = `${kind} now · continuing`;
      }
    } else {
      headline = `${kind} in ${inMin} minute${inMin === 1 ? "" : "s"}`;
    }
    el.nowcastHeadline.textContent = headline;
  };
  applyHeadline();
  el.nowcastSub.textContent = `${totalMm.toFixed(1)} mm expected in the next 2 hours`;
  // If we have a clearing time, keep the countdown ticking each minute.
  if (dryTs) {
    state.nowcastTimer = setInterval(() => {
      if (Date.now() >= dryTs) {
        clearInterval(state.nowcastTimer);
        state.nowcastTimer = null;
        return;
      }
      applyHeadline();
    }, 60_000);
  }
  // Bars (time-labeled, clickable to scrub).
  el.nowcastBars.innerHTML = "";
  const slice = nowcast.slice(0, 8);
  const maxP = Math.max(0.5, ...slice.map((n) => n.precip || 0));
  slice.forEach((n, i) => {
    const bar = document.createElement("button");
    bar.type = "button";
    bar.className = `nowcast-bar ${precipIntensityClass(n.precip)}`;
    bar.style.height = `${Math.max(2, (n.precip / maxP) * 28)}px`;
    const mins = Math.round((n.time - Date.now()) / 60_000);
    const kindTag = precipIntensityLabel(n.precip);
    bar.title = `+${Math.max(0, mins)} min · ${n.precip.toFixed(1)} mm${kindTag ? ` · ${kindTag}` : ""}`;
    bar.setAttribute("aria-label", bar.title);
    bar.addEventListener("click", () => state.handlers.onHourClick?.(n.time));
    el.nowcastBars.appendChild(bar);
  });
  el.nowcast.hidden = false;
}

// Live page title: "22° Partly cloudy · London — Aether".
function updateDocumentTitle(w) {
  if (!w || w.temp == null) return;
  const unit = state.unit;
  const temp = Math.round(unit === "F" ? w.temp * 9 / 5 + 32 : w.temp);
  const placeName = state.place?.name || "";
  const parts = [`${temp}°`];
  if (w.label) parts.push(capitalize(w.label));
  const left = parts.join(" ");
  document.title = placeName
    ? `${left} · ${placeName} — Aether`
    : `${left} — Aether`;
}

// Render a shareable PNG snapshot of the current weather and trigger a
// download. Everything is drawn on a Canvas 2D context — no SVG → raster
// pipeline, so this works consistently across modern browsers.
function saveSnapshotImage() {
  const w = state.weather;
  const place = state.place;
  if (!w || !place) { ui.showToast("No weather to snapshot yet"); return; }
  const scale = 2; // retina
  const W = 720;
  const Hh = 1080;
  const c = document.createElement("canvas");
  c.width = W * scale;
  c.height = Hh * scale;
  const ctx = c.getContext("2d");
  if (!ctx) { ui.showToast("Canvas unavailable"); return; }
  ctx.scale(scale, scale);
  // Background gradient tied to the current tone.
  const tone = document.documentElement.getAttribute("data-tone") || "dark";
  const bgTop = tone === "bright" ? "#dfeafc" : tone === "warm" ? "#3a1f28" : "#0d132a";
  const bgBot = tone === "bright" ? "#a9c8f0" : tone === "warm" ? "#1a0f1f" : "#040718";
  const g = ctx.createLinearGradient(0, 0, 0, Hh);
  g.addColorStop(0, bgTop); g.addColorStop(1, bgBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, Hh);
  const isLight = tone === "bright";
  const fg = isLight ? "#0f1428" : "#f6f7fb";
  const dim = isLight ? "rgba(15,20,40,0.55)" : "rgba(246,247,251,0.55)";
  const accent = isLight ? "#5c7cb8" : "#9ad1ff";
  // Brand strip
  ctx.fillStyle = accent;
  ctx.font = "600 22px 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText("Aether", 56, 72);
  ctx.fillStyle = dim;
  ctx.font = "12px system-ui, sans-serif";
  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
  ctx.fillText(dateStr, 56, 92);
  // Place
  ctx.fillStyle = fg;
  ctx.font = "500 32px 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText(place.name || "—", 56, 220);
  ctx.fillStyle = dim;
  ctx.font = "16px system-ui, sans-serif";
  const sub = [place.admin1, place.country].filter(Boolean).join(", ");
  if (sub) ctx.fillText(sub, 56, 248);
  // Big temperature + glyph
  const unit = state.unit;
  const temp = Math.round(unit === "F" ? w.temp * 9 / 5 + 32 : w.temp);
  ctx.fillStyle = fg;
  ctx.font = "200 220px 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText(`${temp}°`, 56, 500);
  ctx.font = "300 60px system-ui, sans-serif";
  ctx.fillStyle = dim;
  const glyph = conditionGlyph(w.condition, w.isDay !== false);
  if (glyph) ctx.fillText(glyph, 420, 490);
  // Condition label
  ctx.fillStyle = fg;
  ctx.font = "400 28px 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText(capitalize(w.label || ""), 56, 550);
  // Secondary row
  const feels = Math.round(unit === "F" ? (w.feelsLike ?? w.temp) * 9 / 5 + 32 : (w.feelsLike ?? w.temp));
  ctx.fillStyle = dim;
  ctx.font = "16px system-ui, sans-serif";
  const lines = [
    `Feels like ${feels}°${unit}`,
    `Wind ${Math.round(w.windSpeed || 0)} km/h${w.windDir != null ? ` ${cardinal(w.windDir)}` : ""}`,
    `Humidity ${Math.round(w.humidity ?? 0)}%  ·  Pressure ${Math.round(w.pressure ?? 0)} hPa`,
    w.uv != null ? `UV ${Math.round(w.uv)}` : null,
    w.airQuality?.aqi != null ? `AQI ${Math.round(w.airQuality.aqi)} (${w.airQuality.label})` : null,
  ].filter(Boolean);
  let y = 620;
  for (const line of lines) {
    ctx.fillText(line, 56, y);
    y += 32;
  }
  // Daily strip at the bottom (next 7 days high/low).
  const days = (w.daily || []).slice(0, 7);
  if (days.length) {
    const bandTop = Hh - 240;
    ctx.fillStyle = fg;
    ctx.font = "500 14px system-ui, sans-serif";
    ctx.fillText("7-day outlook", 56, bandTop);
    const cellW = (W - 112) / days.length;
    days.forEach((d, i) => {
      const x = 56 + i * cellW;
      const dayName = i === 0 ? "Today" : new Date(d.time).toLocaleDateString(undefined, { weekday: "short" });
      ctx.fillStyle = dim;
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(dayName, x, bandTop + 28);
      ctx.fillStyle = fg;
      ctx.font = "500 20px system-ui, sans-serif";
      const dglyph = conditionGlyph(d.condition, true);
      if (dglyph) ctx.fillText(dglyph, x, bandTop + 60);
      ctx.font = "400 16px system-ui, sans-serif";
      const hi = d.tempMax != null ? `${Math.round(unit === "F" ? d.tempMax * 9 / 5 + 32 : d.tempMax)}°` : "—";
      const lo = d.tempMin != null ? `${Math.round(unit === "F" ? d.tempMin * 9 / 5 + 32 : d.tempMin)}°` : "—";
      ctx.fillText(hi, x, bandTop + 90);
      ctx.fillStyle = dim;
      ctx.fillText(lo, x, bandTop + 112);
    });
  }
  // Footer attribution.
  ctx.fillStyle = dim;
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText("Open-Meteo · generated by Aether", 56, Hh - 32);
  c.toBlob((blob) => {
    if (!blob) { ui.showToast("Snapshot failed"); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (place.name || "aether").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    a.href = url;
    a.download = `aether-${safeName}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    ui.showToast("Snapshot saved");
  }, "image/png");
}

// ---------- Dynamic favicon ----------
// Rewrite the <link rel="icon"> href with a small SVG matching the condition.
function updateFavicon(condition, isDay) {
  const link = document.querySelector('link[rel="icon"]');
  if (!link) return;
  const svg = faviconSvg(condition, isDay);
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function faviconSvg(condition, isDay) {
  const bg = isDay ? "#1b2340" : "#070a16";
  const strokeDay = "#fff";
  const stroke = isDay ? "#f0e6cb" : "#9ad1ff";
  const open = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${bg}"/>`;
  const close = `</svg>`;
  const common = `fill="none" stroke="${stroke}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"`;
  const sun = `<circle cx="32" cy="32" r="12" fill="${isDay ? "#fff1c9" : "#9ad1ff"}"/>
    <path d="M32 10v6M32 48v6M10 32h6M48 32h6M15 15l4 4M45 45l4 4M15 49l4-4M45 19l4-4" stroke="${isDay ? "#fff1c9" : "#9ad1ff"}" stroke-width="3.5" stroke-linecap="round"/>`;
  const cloud = `<path d="M18 42a9 9 0 010-18 11 11 0 0121-2 9 9 0 013 20H18z" fill="${stroke}" opacity="0.9"/>`;
  const moon = `<path d="M44 36a16 16 0 11-16-16 12 12 0 0016 16z" fill="#f0e6cb"/>`;
  switch (condition) {
    case "clear":
      return open + (isDay ? sun : moon) + close;
    case "clouds":
      return open + (isDay ? sun : moon) + cloud + close;
    case "rain":
      return open + cloud +
        `<path d="M22 48l-3 8M32 48l-3 8M42 48l-3 8" stroke="#9ad1ff" stroke-width="3.5" stroke-linecap="round"/>` + close;
    case "snow":
      return open + cloud +
        `<path d="M22 52l0 4M20 54l4 0M32 50l0 4M30 52l4 0M42 52l0 4M40 54l4 0" ${common}/>` + close;
    case "storm":
      return open + cloud +
        `<path d="M30 44l-5 10h7l-4 8" fill="none" stroke="#ffd36a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>` + close;
    case "fog":
      return open +
        `<path d="M12 24h40M8 36h48M14 48h36" ${common}/>` + close;
    default:
      return open + (isDay ? sun : moon) + close;
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

function conditionGlyph(condition, isDay) {
  switch (condition) {
    case "clear": return isDay === false ? "🌙" : "☀";
    case "clouds": return "⛅";
    case "rain": return "🌧";
    case "snow": return "🌨";
    case "storm": return "⛈";
    case "fog": return "🌫";
    default: return "";
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
    const glyph = conditionGlyph(p.condition);
    return `
      <div class="place-chip ${active ? "active" : ""}" data-id="${p.id}">
        ${glyph ? `<span class="place-chip-glyph" aria-hidden="true">${glyph}</span>` : ""}
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
    // Nudge the user to notice the toolbar install icon on their first
    // eligible session. We only toast once per device so we don't nag.
    try {
      if (!localStorage.getItem("aether:installNudged")) {
        ui.showToast("Install Aether as an app from the toolbar", 4000);
        localStorage.setItem("aether:installNudged", "1");
      }
    } catch { /* ignore */ }
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

  el.settingCompact?.addEventListener("change", () => {
    const on = el.settingCompact.checked;
    document.documentElement.setAttribute("data-compact", on ? "true" : "false");
    localStorage.setItem("aether:compact", on ? "1" : "0");
  });

  el.settingDim?.addEventListener("change", () => {
    const on = el.settingDim.checked;
    document.documentElement.setAttribute("data-dim", on ? "true" : "false");
    localStorage.setItem("aether:dim", on ? "1" : "0");
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

  el.settingVolume?.addEventListener("input", () => {
    const v = parseInt(el.settingVolume.value, 10) / 100;
    localStorage.setItem("aether:volume", String(v));
    state.handlers.onVolume?.(v);
  });

  el.settingRefreshInterval?.addEventListener("change", () => {
    const ms = parseInt(el.settingRefreshInterval.value, 10) || 0;
    localStorage.setItem("aether:refreshMs", String(ms));
    state.handlers.onRefreshInterval?.(ms);
  });

  el.settingTheme?.addEventListener("change", () => {
    const v = el.settingTheme.value;
    document.documentElement.setAttribute("data-theme", v);
    localStorage.setItem("aether:theme", v);
  });

  el.settingCopyLink?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      ui.showToast("Link copied to clipboard");
    } catch {
      ui.showToast("Couldn't copy — select the address bar manually");
    }
    close();
  });

  el.settingSaveImage?.addEventListener("click", () => {
    saveSnapshotImage();
    close();
  });

  el.settingReset?.addEventListener("click", () => {
    if (!confirm("Reset Aether preferences to defaults? Saved places are kept.")) return;
    const prefKeys = [
      "aether:unit", "aether:reduceMotion", "aether:compact", "aether:dim",
      "aether:volume", "aether:refreshMs", "aether:theme",
    ];
    for (const k of prefKeys) {
      try { localStorage.removeItem(k); } catch { /* ignore */ }
    }
    ui.showToast("Preferences reset — reloading");
    close();
    setTimeout(() => location.reload(), 400);
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
  const compact = localStorage.getItem("aether:compact") === "1";
  if (compact) {
    document.documentElement.setAttribute("data-compact", "true");
    if (el.settingCompact) el.settingCompact.checked = true;
  }
  const dim = localStorage.getItem("aether:dim") === "1";
  if (dim) {
    document.documentElement.setAttribute("data-dim", "true");
    if (el.settingDim) el.settingDim.checked = true;
  }
  const storedVol = parseFloat(localStorage.getItem("aether:volume"));
  const vol = isFinite(storedVol) ? storedVol : 0.5;
  if (el.settingVolume) el.settingVolume.value = String(Math.round(vol * 100));
  queueMicrotask(() => state.handlers.onVolume?.(vol));
  const storedRefresh = parseInt(localStorage.getItem("aether:refreshMs"), 10);
  const refreshMs = isFinite(storedRefresh) ? storedRefresh : 15 * 60_000;
  if (el.settingRefreshInterval) el.settingRefreshInterval.value = String(refreshMs);
  queueMicrotask(() => state.handlers.onRefreshInterval?.(refreshMs));
  const theme = localStorage.getItem("aether:theme") || "dark";
  document.documentElement.setAttribute("data-theme", theme);
  if (el.settingTheme) el.settingTheme.value = theme;
}

// Exposed so app.js can query the current preference on boot.
ui.isReduceMotion = () => localStorage.getItem("aether:reduceMotion") === "1";

function startFetchedTicker() {
  const update = () => {
    if (!el.fetchedAgo || !state.weather?.fetchedAt) {
      if (el.fetchedAgo) el.fetchedAgo.textContent = "";
      if (el.refreshBtn) el.refreshBtn.setAttribute("title", "Refresh weather");
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
    if (el.refreshBtn) {
      const stamp = new Date(state.weather.fetchedAt).toLocaleString(undefined, {
        weekday: "short", hour: "2-digit", minute: "2-digit",
      });
      el.refreshBtn.setAttribute("title",
        `Refresh weather · last fetched ${stamp} (${label.toLowerCase()})`);
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
      `Wind ${Math.round(w.windSpeed)} km/h${w.windDir != null ? ` ${cardinal(w.windDir)}` : ""}`,
      w.uv != null ? `UV ${Math.round(w.uv)}` : null,
      w.airQuality?.aqi != null ? `AQI ${Math.round(w.airQuality.aqi)} (${w.airQuality.label})` : null,
    ].filter(Boolean);
    // Append a deep-link that reopens Aether on the same city.
    const url = window.location.href;
    if (url && window.location.hash) lines.push(url);
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
