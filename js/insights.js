// Auto-generate a handful of human-readable insights from the weekly data.
// Each returns { label, value, icon, ts? } — ts optional so the UI can let the
// user click to scrub to that moment.

const ICONS = {
  rain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14a4 4 0 010-8 5 5 0 019.9-1A4 4 0 0117 14H7z"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/></svg>',
  wind: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h12a3 3 0 100-6M3 14h16a3 3 0 100-6M3 20h9a3 3 0 100-6"/></svg>',
  cold: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M4 6l16 12M20 6L4 18M2 12h20"/></svg>',
  warm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5l1.5-1.5M17 7l1.5-1.5"/></svg>',
  uv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M4 12H2M6 6l-2-2M12 18a6 6 0 006-6H6a6 6 0 006 6z"/></svg>',
  humid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg>',
  tomorrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="18" cy="6" r="1.6" fill="currentColor" stroke="none"/></svg>',
  snow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M4 6l16 12M20 6L4 18M2 12h20"/></svg>',
  sunset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 18a5 5 0 015-5M12 18a5 5 0 00-5-5M12 18h10M12 18H2M15 6l-2 2M9 6l2 2M12 3v3"/></svg>',
};

function sunsetQuality(hourly, sunset) {
  if (!sunset || sunset < Date.now()) return null;
  const nearby = (hourly || []).find((h) => Math.abs(h.time - sunset) < 60 * 60_000);
  if (!nearby || nearby.cloudCover == null) return null;
  const c = nearby.cloudCover;
  // Sweet spot for dramatic sunset colors is roughly 30-70% mid/high cloud cover.
  if (c >= 30 && c <= 65) return { label: "Sunset colors", desc: `${c}% cloud — dramatic light likely` };
  if (c < 15) return { label: "Sunset colors", desc: "clear sky — softer glow than dramatic" };
  if (c >= 85) return { label: "Sunset colors", desc: `${c}% cloud — mostly muted` };
  return null;
}

function weeklyNarrative(days, dow, T) {
  if (!days || days.length < 4) return null;
  const highs = days.map((d) => d.tempMax).filter((v) => v != null);
  if (highs.length < 3) return null;
  const firstMean = (highs[0] + (highs[1] ?? highs[0])) / 2;
  const lastMean = (highs[highs.length - 1] + (highs[highs.length - 2] ?? highs[highs.length - 1])) / 2;
  const trend = lastMean - firstMean;
  const totalPrecip = days.reduce((s, d) => s + (d.precip ?? 0), 0);
  const wetDays = days.filter((d) => (d.precip ?? 0) > 1).length;
  let mood;
  if (Math.abs(trend) >= 5) {
    mood = trend > 0 ? "warms up" : "cools off";
  } else if (highs.every((h) => h >= 22)) {
    mood = "stays warm";
  } else if (highs.every((h) => h <= 5)) {
    mood = "stays cold";
  } else {
    mood = "holds steady";
  }
  const rainMood =
    totalPrecip < 1 ? "and dry throughout" :
    totalPrecip >= 20 ? `with ${wetDays} wet day${wetDays === 1 ? "" : "s"} totaling ${Math.round(totalPrecip)} mm` :
    wetDays > 0 ? `with a few damp spells` : "with dry stretches";
  const range = `${T(Math.min(...highs))} → ${T(Math.max(...highs))}`;
  return {
    icon: ICONS.tomorrow,
    label: "Week outlook",
    value: `${mood} ${rainMood} · ${range}`,
    ts: days[0].sunrise || days[0].time,
  };
}

function tomorrowBriefing(days, dow, T) {
  const t = days?.[1];
  if (!t || t.tempMax == null || t.tempMin == null) return null;
  const label = t.label || t.condition || "Mixed";
  const rain = (t.pop ?? 0) >= 40 || (t.precip ?? 0) >= 1
    ? ` · ${t.pop ?? 0}% rain (${(t.precip ?? 0).toFixed(1)} mm)`
    : "";
  return {
    icon: ICONS.tomorrow,
    label: `${dow(t.time)} outlook`,
    value: `${label} · ${T(t.tempMin)} → ${T(t.tempMax)}${rain}`,
    ts: t.sunrise || t.time,
  };
}

export function buildInsights(weather, { fmtTime, weekday, unit = "C" } = {}) {
  const out = [];
  if (!weather) return out;

  const hours = weather.hourly || [];
  const days = weather.daily || [];
  const fmt = fmtTime || ((t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  const dow = weekday || ((t) => new Date(t).toLocaleDateString([], { weekday: "short" }));
  const T = (c) => c == null ? "—" : `${Math.round(unit === "F" ? c * 9 / 5 + 32 : c)}°`;

  const week = weeklyNarrative(days, dow, T);
  if (week) out.push(week);
  const tmrw = tomorrowBriefing(days, dow, T);
  if (tmrw) out.push(tmrw);

  // 1. Next rain in the week.
  const rainyDay = days.find((d) => (d.pop ?? 0) >= 55 || (d.precip ?? 0) >= 1.5);
  const rainyHour = hours.find((h) => (h.pop ?? 0) >= 60 || (h.precip ?? 0) > 0.4);
  if (rainyHour) {
    out.push({
      icon: ICONS.rain, label: "Next rain",
      value: `${fmt(rainyHour.time)} · ${rainyHour.pop}%`,
      ts: rainyHour.time,
    });
  } else if (rainyDay) {
    out.push({
      icon: ICONS.rain, label: "Next rain",
      value: `${dow(rainyDay.time)} · ${rainyDay.pop}%`,
      ts: rainyDay.sunrise || rainyDay.time,
    });
  } else {
    out.push({ icon: ICONS.sun, label: "This week", value: "No rain in the outlook" });
  }

  // 2. Peak wind in next 24h.
  let peakGust = null;
  for (const h of hours) {
    const g = h.gusts ?? h.wind ?? 0;
    if (!peakGust || g > peakGust.v) peakGust = { v: g, ts: h.time };
  }
  if (peakGust && peakGust.v >= 20) {
    out.push({
      icon: ICONS.wind, label: "Peak gust",
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
      icon: ICONS.cold, label: "Coldest",
      value: `${T(coldest.t)} at ${fmt(coldest.ts)}`,
      ts: coldest.ts,
    });
    out.push({
      icon: ICONS.warm, label: "Warmest",
      value: `${T(warmest.t)} at ${fmt(warmest.ts)}`,
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
        icon: ICONS.warm, label: "Week high",
        value: `${T(hotDay.tempMax)} on ${dow(hotDay.time)}`,
        ts: hotDay.sunrise || hotDay.time,
      });
    }
  }

  // 5. UV peak
  if (weather.uvPeak?.value >= 6) {
    out.push({
      icon: ICONS.uv, label: "UV peak",
      value: `${Math.round(weather.uvPeak.value)} at ${fmt(weather.uvPeak.time)}`,
      ts: weather.uvPeak.time,
    });
  }

  // 5b. Big day-over-day swings in the 7-day forecast.
  let biggest = null;
  for (let i = 1; i < days.length; i++) {
    const p = days[i - 1], c = days[i];
    if (p.tempMax == null || c.tempMax == null) continue;
    const delta = c.tempMax - p.tempMax;
    if (!biggest || Math.abs(delta) > Math.abs(biggest.delta)) biggest = { delta, day: c };
  }
  if (biggest && Math.abs(biggest.delta) >= 6) {
    const kind = biggest.delta > 0 ? "Warm-up" : "Cool-down";
    out.push({
      icon: biggest.delta > 0 ? ICONS.warm : ICONS.cold,
      label: `${kind} on ${dow(biggest.day.time)}`,
      value: `${biggest.delta > 0 ? "+" : ""}${Math.round(unit === "F" ? biggest.delta * 9 / 5 : biggest.delta)}° vs day before`,
      ts: biggest.day.sunrise || biggest.day.time,
    });
  }

  // 6a. Sunset quality (only when sunset is still ahead today).
  const sq = sunsetQuality(hours, weather.sunset);
  if (sq) {
    out.push({
      icon: ICONS.sunset,
      label: sq.label,
      value: `${sq.desc} at ${fmt(weather.sunset)}`,
      ts: weather.sunset,
    });
  }

  // 6. Snowfall total when the week has snow.
  const snowyDay = days.reduce((best, d) => (d.snowfall ?? 0) > (best?.snowfall ?? 0) ? d : best, null);
  if (snowyDay && (snowyDay.snowfall ?? 0) >= 1) {
    out.push({
      icon: ICONS.snow, label: "Snowfall",
      value: `${snowyDay.snowfall.toFixed(snowyDay.snowfall < 5 ? 1 : 0)} cm on ${dow(snowyDay.time)}`,
      ts: snowyDay.sunrise || snowyDay.time,
    });
  }

  return out.slice(0, 8);
}
