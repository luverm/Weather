// Predicts the visual quality of the next sunrise/sunset based on cloud cover
// near the horizon and current weather conditions, plus golden-hour window.
//
// Quality heuristic: a small amount of mid-to-high cloud cover catches the
// low-angle light beautifully; clear skies are pretty but plain; overcast or
// stormy skies wash out colour entirely.
//
// Cloud-cover sweet spot ≈ 30–70 %. Outside that range, score drops.

import { CONDITIONS } from "./weather-service.js";

const TIERS = [
  { min: 78, key: "spectacular", label: "Spectacular", swatch: ["#ff5a3c", "#ffb45c", "#f06bd0"] },
  { min: 58, key: "good",        label: "Good",        swatch: ["#ff8552", "#ffc679", "#c87bff"] },
  { min: 38, key: "fair",        label: "Fair",        swatch: ["#ffa977", "#ffd9a4", "#9ac9ff"] },
  { min: 0,  key: "quiet",       label: "Quiet",       swatch: ["#94a8c8", "#cfd6e3", "#7a8aa8"] },
];

export function sunQuality(weather) {
  if (!weather) return null;
  const now = Date.now();
  const event = nextSunEvent(weather, now);
  if (!event) return null;

  const cc = cloudCoverAt(weather, event.ts);
  const cond = conditionAt(weather, event.ts);

  // Bell-shape: peak at 50 % cloud cover.
  let score;
  if (cc == null) {
    score = 45; // neutral if we don't know
  } else {
    const distance = Math.abs(cc - 50); // 0 best, 50 worst
    score = Math.max(0, 100 - distance * 1.7);
  }

  // Penalties for conditions that obscure the horizon.
  if (cond === CONDITIONS.RAIN)  score -= 35;
  if (cond === CONDITIONS.SNOW)  score -= 30;
  if (cond === CONDITIONS.STORM) score -= 45;
  if (cond === CONDITIONS.FOG)   score -= 40;

  // Bright clear skies are pretty too — pull up the low end slightly.
  if (cond === CONDITIONS.CLEAR && cc != null && cc < 15) score = Math.max(score, 42);

  score = Math.max(5, Math.min(98, Math.round(score)));
  const tier = TIERS.find((t) => score >= t.min) || TIERS[TIERS.length - 1];

  return {
    kind: event.kind,             // "Sunrise" | "Sunset"
    ts: event.ts,
    score,
    tier: tier.key,
    label: tier.label,
    swatch: tier.swatch,
    cloudCover: cc,
    goldenHour: goldenHourWindow(event),
  };
}

function nextSunEvent(weather, now) {
  let best = null;
  for (const d of weather.daily || []) {
    for (const pair of [[d.sunrise, "Sunrise"], [d.sunset, "Sunset"]]) {
      const [ts, kind] = pair;
      if (!ts) continue;
      if (ts <= now) continue;
      if (!best || ts < best.ts) best = { ts, kind };
    }
  }
  return best;
}

// Golden hour ≈ 30 min before sunset → 10 min after (and inverse for sunrise).
// Loose approximation — accurate enough for a "step outside" hint.
function goldenHourWindow(event) {
  if (event.kind === "Sunset") {
    return { start: event.ts - 30 * 60_000, end: event.ts + 10 * 60_000 };
  }
  return { start: event.ts - 10 * 60_000, end: event.ts + 30 * 60_000 };
}

// Find the hourly entry closest to a timestamp and return cloud cover.
function cloudCoverAt(weather, ts) {
  const h = nearestHour(weather, ts);
  return h?.cloudCover ?? null;
}

function conditionAt(weather, ts) {
  const h = nearestHour(weather, ts);
  return h?.condition;
}

function nearestHour(weather, ts) {
  const hours = weather.hourly || [];
  if (!hours.length) return null;
  let best = hours[0], bestDiff = Math.abs(best.time - ts);
  for (let i = 1; i < hours.length; i++) {
    const diff = Math.abs(hours[i].time - ts);
    if (diff < bestDiff) { best = hours[i]; bestDiff = diff; }
  }
  return best;
}
