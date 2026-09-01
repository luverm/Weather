// Synthesize high-impact weather alerts from the existing forecast data.
// Open-Meteo's free tier doesn't expose government NWS-style alerts, so we
// derive them locally. Each alert is { id, severity, title, detail, ts? }.
// `ts` lets the UI scrub to the exact moment of the alert when clicked.

import { fmtSpeed, getUnit } from "./units.js";

export function buildAlerts(weather) {
  if (!weather) return [];
  const out = [];
  const hours = (weather.hourly || []).slice(0, 24);
  const today = (weather.daily || [])[0];
  const tomorrow = (weather.daily || [])[1];

  // ---- Heat ----
  const hottest = hottestHour(hours);
  if (hottest && hottest.t >= 35) {
    out.push({
      id: "severe-heat",
      severity: "danger",
      title: "Severe heat",
      detail: `Up to ${Math.round(hottest.t)}° at ${shortClock(hottest.ts)} — hydrate, avoid sun.`,
      ts: hottest.ts,
    });
  } else if (hottest && hottest.t >= 30) {
    out.push({
      id: "heat",
      severity: "warn",
      title: "Heat advisory",
      detail: `Peaks near ${Math.round(hottest.t)}° around ${shortClock(hottest.ts)}.`,
      ts: hottest.ts,
    });
  }

  // ---- Frost / freeze ----
  const coldest = coldestNight(weather);
  if (coldest && coldest.t <= -5) {
    out.push({
      id: "hard-freeze",
      severity: "danger",
      title: "Hard freeze tonight",
      detail: `Lows near ${Math.round(coldest.t)}° — bring plants in, drip pipes.`,
      ts: coldest.ts,
    });
  } else if (coldest && coldest.t <= 2) {
    out.push({
      id: "frost",
      severity: "warn",
      title: "Frost overnight",
      detail: `Drops to ${Math.round(coldest.t)}° around ${shortClock(coldest.ts)}.`,
      ts: coldest.ts,
    });
  }

  // ---- Wind / gusts ----
  const gust = peakGust(hours);
  if (gust && gust.v >= 75) {
    out.push({
      id: "storm-wind",
      severity: "danger",
      title: "Damaging wind",
      detail: `Gusts to ${fmtSpeed(gust.v)} near ${shortClock(gust.ts)}.`,
      ts: gust.ts,
    });
  } else if (gust && gust.v >= 50) {
    out.push({
      id: "gale",
      severity: "warn",
      title: "Gale-force gusts",
      detail: `Up to ${fmtSpeed(gust.v)} around ${shortClock(gust.ts)}.`,
      ts: gust.ts,
    });
  }

  // ---- Rain accumulation ----
  const rainy = wettestRunningWindow(hours, 6);
  const dayTotal = today?.precip ?? 0;
  if (rainy && rainy.sum >= 25) {
    out.push({
      id: "heavy-rain",
      severity: "danger",
      title: "Heavy rainfall",
      detail: `${rainy.sum.toFixed(0)} mm expected over 6h from ${shortClock(rainy.start)}.`,
      ts: rainy.start,
    });
  } else if (rainy && rainy.sum >= 10) {
    out.push({
      id: "soaking-rain",
      severity: "warn",
      title: "Soaking rain",
      detail: `~${rainy.sum.toFixed(0)} mm over 6h from ${shortClock(rainy.start)}.`,
      ts: rainy.start,
    });
  } else if (dayTotal >= 15) {
    out.push({
      id: "wet-day",
      severity: "info",
      title: "Wet day ahead",
      detail: `${dayTotal.toFixed(0)} mm forecast in total.`,
    });
  }

  // ---- Snow ----
  const snowHour = hours.find((h) => h.condition === "snow");
  if (snowHour) {
    out.push({
      id: "snow",
      severity: "info",
      title: "Snow in forecast",
      detail: `Starts around ${shortClock(snowHour.time)}.`,
      ts: snowHour.time,
    });
  }

  // ---- Thunder ----
  const stormHour = hours.find((h) => h.condition === "storm");
  if (stormHour) {
    out.push({
      id: "thunder",
      severity: "warn",
      title: "Thunderstorms",
      detail: `Possible around ${shortClock(stormHour.time)}.`,
      ts: stormHour.time,
    });
  }

  // ---- Snowfall ----
  const dailies = (weather.daily || []).slice(0, 3);
  const snowyDay = dailies.reduce(
    (best, d) => ((d.snow || 0) > (best?.snow ?? 0) ? d : best), null
  );
  if (snowyDay && (snowyDay.snow || 0) >= 15) {
    out.push({
      id: "heavy-snow",
      severity: "danger",
      title: "Heavy snow expected",
      detail: `${fmtSnow(snowyDay.snow)} forecast on ${new Date(snowyDay.time).toLocaleDateString(undefined, { weekday: "long" })}.`,
      ts: snowyDay.sunrise || snowyDay.time,
    });
  } else if (snowyDay && (snowyDay.snow || 0) >= 5) {
    // Distinct id from the hourly "Snow in forecast" alert so dismissals
    // of one don't silently silence the other.
    out.push({
      id: "snow-accum",
      severity: "warn",
      title: "Snow accumulating",
      detail: `${fmtSnow(snowyDay.snow)} expected on ${new Date(snowyDay.time).toLocaleDateString(undefined, { weekday: "long" })}.`,
      ts: snowyDay.sunrise || snowyDay.time,
    });
  }

  // ---- Rapid pressure drop (proxy for approaching front / storm) ----
  const pt = weather.pressureTrend;
  if (pt && pt.direction === "falling" && pt.delta <= -3) {
    out.push({
      id: "pressure-drop",
      severity: "warn",
      title: "Pressure dropping fast",
      detail: `${Math.abs(pt.delta).toFixed(1)} hPa in the last 3 h — weather change likely.`,
    });
  }

  // ---- Fog ----
  if (weather.visibility != null && weather.visibility < 500) {
    out.push({
      id: "fog",
      severity: "warn",
      title: "Dense fog",
      detail: `Visibility under ${Math.round(weather.visibility)} m right now.`,
    });
  }

  // ---- UV (only if not already mentioned by heat) ----
  if (!out.some((a) => a.id === "severe-heat" || a.id === "heat")
      && weather.uvPeak?.value >= 9) {
    out.push({
      id: "uv",
      severity: "warn",
      title: "Extreme UV",
      detail: `UV index ${Math.round(weather.uvPeak.value)} at ${shortClock(weather.uvPeak.time)}.`,
      ts: weather.uvPeak.time,
    });
  }

  // De-dupe (if a daily heat triggers heat AND severe-heat, keep the worst).
  const SEV = { danger: 3, warn: 2, info: 1 };
  return dedupe(out)
    .sort((a, b) => (SEV[b.severity] ?? 0) - (SEV[a.severity] ?? 0))
    .slice(0, 4);
}

// Format snowfall in cm or inches depending on the active unit toggle.
function fmtSnow(cm) {
  if (getUnit() === "F") return `${(cm * 0.3937).toFixed(1)} in`;
  return `${cm.toFixed(1)} cm`;
}

function hottestHour(hours) {
  let best = null;
  for (const h of hours) {
    if (h.temp == null) continue;
    if (!best || h.temp > best.t) best = { t: h.temp, ts: h.time };
  }
  return best;
}

function coldestNight(weather) {
  // Look at today's overnight + tomorrow's overnight from hourly data.
  const hours = (weather.hourly || []).slice(0, 24);
  let best = null;
  for (const h of hours) {
    if (h.temp == null) continue;
    if (h.isDay) continue;
    if (!best || h.temp < best.t) best = { t: h.temp, ts: h.time };
  }
  // Fallback: today's daily min.
  if (!best && weather.daily?.[0]?.tempMin != null) {
    best = { t: weather.daily[0].tempMin, ts: weather.daily[0].sunrise };
  }
  return best;
}

function peakGust(hours) {
  let best = null;
  for (const h of hours) {
    const g = h.gusts ?? h.wind ?? 0;
    if (g == null) continue;
    if (!best || g > best.v) best = { v: g, ts: h.time };
  }
  return best;
}

function wettestRunningWindow(hours, span) {
  if (hours.length < span) return null;
  let best = null;
  for (let i = 0; i + span <= hours.length; i++) {
    let sum = 0;
    for (let k = 0; k < span; k++) sum += hours[i + k].precip ?? 0;
    if (!best || sum > best.sum) {
      best = { sum, start: hours[i].time, end: hours[i + span - 1].time };
    }
  }
  return best;
}

function shortClock(ts) {
  if (!ts) return "later";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function dedupe(items) {
  // Drop "wet-day" if "soaking-rain" or "heavy-rain" present, and "heat"
  // if "severe-heat" present, and "frost" if "hard-freeze" present.
  const ids = new Set(items.map((x) => x.id));
  const drop = new Set();
  if (ids.has("severe-heat")) drop.add("heat");
  if (ids.has("hard-freeze")) drop.add("frost");
  if (ids.has("heavy-rain") || ids.has("soaking-rain")) drop.add("wet-day");
  return items.filter((x) => !drop.has(x.id));
}
