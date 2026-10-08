// Auto-generate a handful of human-readable insights from the weekly data.
// Each returns { label, value, icon, ts? } — ts optional so the UI can let the
// user click to scrub to that moment.

import { nextAstroEvent } from "./solstice.js";

const ICONS = {
  rain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14a4 4 0 010-8 5 5 0 019.9-1A4 4 0 0117 14H7z"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/></svg>',
  wind: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h12a3 3 0 100-6M3 14h16a3 3 0 100-6M3 20h9a3 3 0 100-6"/></svg>',
  cold: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M4 6l16 12M20 6L4 18M2 12h20"/></svg>',
  warm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5l1.5-1.5M17 7l1.5-1.5"/></svg>',
  uv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M4 12H2M6 6l-2-2M12 18a6 6 0 006-6H6a6 6 0 006 6z"/></svg>',
  humid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg>',
};

export function buildInsights(weather, { fmtTime, weekday } = {}) {
  const out = [];
  if (!weather) return out;

  const hours = weather.hourly || [];
  const days = weather.daily || [];
  const fmt = fmtTime || ((t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  const dow = weekday || ((t) => new Date(t).toLocaleDateString([], { weekday: "short" }));

  // 1. Next rain in the week.
  const rainyDay = days.find((d) => (d.pop ?? 0) >= 55 || (d.precip ?? 0) >= 1.5);
  const rainyHour = hours.find((h) => (h.pop ?? 0) >= 60 || (h.precip ?? 0) > 0.4);
  if (rainyHour) {
    out.push({
      icon: ICONS.rain, label: "Next rain", tone: "cool",
      value: `${fmt(rainyHour.time)} · ${rainyHour.pop}%`,
      ts: rainyHour.time,
    });
  } else if (rainyDay) {
    out.push({
      icon: ICONS.rain, label: "Next rain", tone: "cool",
      value: `${dow(rainyDay.time)} · ${rainyDay.pop}%`,
      ts: rainyDay.sunrise || rainyDay.time,
    });
  } else {
    out.push({ icon: ICONS.sun, label: "This week", tone: "warm", value: "No rain in the outlook" });
  }

  // 2. Peak wind in next 24h.
  let peakGust = null;
  for (const h of hours) {
    const g = h.gusts ?? h.wind ?? 0;
    if (!peakGust || g > peakGust.v) peakGust = { v: g, ts: h.time };
  }
  if (peakGust && peakGust.v >= 20) {
    out.push({
      icon: ICONS.wind, label: "Peak gust", tone: peakGust.v >= 50 ? "hot" : "cool",
      value: `${Math.round(peakGust.v)} km/h at ${fmt(peakGust.ts)}`,
      ts: peakGust.ts,
    });
  }

  // 3. Coldest next 24h.
  let coldest = null, warmest = null;
  for (const h of hours) {
    if (coldest == null || h.temp < coldest.t) coldest = { t: h.temp, ts: h.time };
    if (warmest == null || h.temp > warmest.t) warmest = { t: h.temp, ts: h.time };
  }
  if (coldest && warmest && warmest.t - coldest.t >= 4) {
    out.push({
      icon: ICONS.cold, label: "Coldest", tone: "cool",
      value: `${Math.round(coldest.t)}° at ${fmt(coldest.ts)}`,
      ts: coldest.ts,
    });
    out.push({
      icon: ICONS.warm, label: "Warmest", tone: "warm",
      value: `${Math.round(warmest.t)}° at ${fmt(warmest.ts)}`,
      ts: warmest.ts,
    });
  }

  // 4. Weekly extremes (days).
  if (days.length >= 2) {
    let hotDay = null, coolDay = null;
    for (const d of days) {
      if (d.tempMax == null) continue;
      if (hotDay == null || d.tempMax > hotDay.tempMax) hotDay = d;
      if (coolDay == null || d.tempMin < coolDay.tempMin) coolDay = d;
    }
    if (hotDay && coolDay && hotDay !== coolDay) {
      out.push({
        icon: ICONS.warm, label: "Week high", tone: "warm",
        value: `${Math.round(hotDay.tempMax)}° on ${dow(hotDay.time)}`,
        ts: hotDay.sunrise || hotDay.time,
      });
    }
  }

  // 5. UV peak
  if (weather.uvPeak?.value >= 6) {
    out.push({
      icon: ICONS.uv, label: "UV peak", tone: weather.uvPeak.value >= 10 ? "hot" : "warm",
      value: `${Math.round(weather.uvPeak.value)} at ${fmt(weather.uvPeak.time)}`,
      ts: weather.uvPeak.time,
    });
  }

  // 6. Snow in the week.
  const snowDay = days.find((d) => (d.snowfall ?? 0) >= 1);
  if (snowDay) {
    out.push({
      icon: ICONS.cold, label: "Snow expected", tone: "cool",
      value: `${snowDay.snowfall.toFixed(1)} cm on ${dow(snowDay.time)}`,
      ts: snowDay.sunrise || snowDay.time,
    });
  }

  // 7. Rainiest day in the week.
  if (days.length >= 2) {
    const rainiest = days.reduce((best, d) => ((d.precip ?? 0) > (best?.precip ?? 0) ? d : best), null);
    if (rainiest && (rainiest.precip ?? 0) >= 3) {
      out.push({
        icon: ICONS.rain, label: "Wettest day", tone: "cool",
        value: `${rainiest.precip.toFixed(1)} mm on ${dow(rainiest.time)}`,
        ts: rainiest.sunrise || rainiest.time,
      });
    }
  }

  // 8. Longest dry run of hours (≥6 consecutive <20% pop).
  if (hours.length > 6) {
    let runStart = -1, runLen = 0, best = null;
    for (let i = 0; i < hours.length; i++) {
      if ((hours[i].pop ?? 0) < 20) {
        if (runStart < 0) runStart = i;
        runLen++;
        if (!best || runLen > best.len) best = { start: runStart, len: runLen, startTs: hours[runStart].time };
      } else {
        runStart = -1; runLen = 0;
      }
    }
    if (best && best.len >= 6) {
      const end = hours[best.start + best.len - 1].time;
      out.push({
        icon: ICONS.sun, label: "Dry window", tone: "warm",
        value: `${best.len}h from ${fmt(best.startTs)}`,
        ts: best.startTs,
        _endTs: end,
      });
    }
  }

  // 9. Nearest solstice/equinox when ≤ 30 days away — tiny bit of flavor.
  const astro = nextAstroEvent();
  if (astro && astro.days <= 30 && out.length < 6) {
    out.push({
      icon: ICONS.sun, label: astro.name, tone: "warm",
      value: astro.days === 0 ? "today" : astro.days === 1 ? "tomorrow" : `in ${astro.days} days`,
    });
  }

  return out.slice(0, 6);
}
