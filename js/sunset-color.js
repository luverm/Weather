// Round 23 — Sunset color forecast.
//
// Photographers know sunsets need mid-level clouds to catch the low-angle
// light. We don't have a "sunset colors" API, but we do have a per-hour
// condition, so we approximate: a partly-cloudy sky over sunset gives the
// most vivid colors; heavy overcast or thunder dulls them; a fully clear
// sky is muted; rain/snow/fog kills them.

import { CONDITIONS } from "./weather-service.js";

export function forecastSunsetColor(weather) {
  const now = Date.now();
  const days = weather?.daily || [];
  const nextSunset = days.map((d) => d.sunset).filter((t) => t && t > now).sort((a, b) => a - b)[0];
  if (!nextSunset) return null;

  // Nearest hourly slot to sunset (also glance one hour earlier to catch the
  // conditions the sun will be dropping into).
  const hours = weather.hourly || [];
  if (!hours.length) return null;
  const nearest = hours.reduce((best, h) =>
    !best || Math.abs(h.time - nextSunset) < Math.abs(best.time - nextSunset) ? h : best, null);
  if (!nearest) return null;
  const idx = hours.indexOf(nearest);
  const preceding = idx > 0 ? hours[idx - 1] : nearest;

  const rating = rate(nearest.condition, preceding.condition);
  return {
    when: nextSunset,
    hourCondition: nearest.condition,
    label: rating.label,
    hint: rating.hint,
    tone: rating.tone,
    score: rating.score, // 0..1
  };
}

function rate(now, prev) {
  const bad = new Set([CONDITIONS.RAIN, CONDITIONS.SNOW, CONDITIONS.FOG, CONDITIONS.THUNDER]);
  if (bad.has(now)) {
    return { label: "Washed out", hint: "Rain or thick weather over the horizon.", tone: "flat", score: 0.1 };
  }
  if (now === CONDITIONS.OVERCAST) {
    // Overcast can still glow if there's a break at the horizon (proxied here
    // by the preceding hour being partly cloudy).
    if (prev === CONDITIONS.CLOUDS) {
      return { label: "Moody", hint: "Overcast, but a gap at the horizon may catch light.", tone: "moody", score: 0.4 };
    }
    return { label: "Dimmed", hint: "Overcast — colors will stay flat.", tone: "flat", score: 0.2 };
  }
  if (now === CONDITIONS.CLOUDS) {
    return { label: "Vivid", hint: "Mid-level clouds — prime sunset conditions.", tone: "vivid", score: 0.95 };
  }
  if (now === CONDITIONS.CLEAR) {
    // Clear at sunset with clouds an hour earlier → afterglow potential.
    if (prev === CONDITIONS.CLOUDS) {
      return { label: "Afterglow", hint: "Clear at set, clouds nearby — watch the afterglow.", tone: "warm", score: 0.7 };
    }
    return { label: "Muted", hint: "Clear sky — colors will be soft.", tone: "muted", score: 0.45 };
  }
  return { label: "—", hint: "", tone: "muted", score: 0.5 };
}
