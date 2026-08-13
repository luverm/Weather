// Sunset (and sunrise) color-quality forecast.
//
// Vivid sunsets need mid-level clouds acting as a projection screen,
// high wisps to catch the horizon light, and a clear-ish low deck so the
// beams actually reach those clouds. This module scores the next sunset
// (or sunrise, whichever comes first within 12 h) on that mix.

const OK_CLOUD_MID = 55;    // mid clouds sweet spot around 40-70%
const HEAVY_LOW_PENALTY = 60; // low cloud >60% kills it

export function forecastNextSunEvent(weather) {
  if (!weather?.daily?.length || !weather?.hourly?.length) return null;
  const now = Date.now();
  let best = null;
  for (const d of weather.daily) {
    for (const [ts, kind] of [
      [d.sunset, "sunset"],
      [d.sunrise, "sunrise"],
    ]) {
      if (!ts || ts <= now) continue;
      if (ts - now > 14 * 3600_000) continue;
      if (!best || ts < best.ts) best = { ts, kind };
    }
  }
  if (!best) return null;

  const near = nearestHour(weather.hourly, best.ts);
  if (!near) return null;

  const score = scoreVividness({
    low: near.cloudLow,
    mid: near.cloudMid,
    high: near.cloudHigh,
    total: near.cloudCover,
    pop: near.pop,
  });
  const bucket = pickBucket(score);
  return {
    kind: best.kind,
    ts: best.ts,
    score,
    ...bucket,
    clouds: {
      low: near.cloudLow,
      mid: near.cloudMid,
      high: near.cloudHigh,
      total: near.cloudCover,
    },
  };
}

function nearestHour(hourly, ts) {
  let best = null, bestDiff = Infinity;
  for (const h of hourly) {
    const diff = Math.abs(h.time - ts);
    if (diff < bestDiff) { bestDiff = diff; best = h; }
  }
  return best;
}

// Score 0..100. Higher = more vivid colors expected.
function scoreVividness({ low, mid, high, total, pop }) {
  if (mid == null && high == null && total == null) return 50; // no data — neutral
  const m = clamp(mid ?? 0, 0, 100);
  const h = clamp(high ?? 0, 0, 100);
  const l = clamp(low ?? 0, 0, 100);
  const t = clamp(total ?? Math.max(m, h, l), 0, 100);

  // Mid clouds: bell curve peaking at ~55%.
  const midBell = 1 - Math.abs(m - OK_CLOUD_MID) / OK_CLOUD_MID;
  const midScore = clamp(midBell, 0, 1) * 55;

  // High clouds: linear-ish, capped at 40% contribution.
  const highScore = clamp(h / 60, 0, 1) * 25;

  // Low clouds: subtract heavily when they blanket the horizon.
  const lowPenalty = l > HEAVY_LOW_PENALTY
    ? -30 * ((l - HEAVY_LOW_PENALTY) / (100 - HEAVY_LOW_PENALTY))
    : -8 * (l / HEAVY_LOW_PENALTY);

  // Fully overcast (no gaps at all): flatten score.
  const overcastFlatten = t >= 92 ? -18 : 0;
  // Perfectly clear: pretty but not colorful.
  const clearFlatten = t <= 5 ? -15 : 0;

  // Heavy rain forecast at that hour blows the show.
  const rainPenalty = (pop ?? 0) >= 70 ? -12 : 0;

  // Baseline so partial clouds always feel a little exciting.
  const baseline = 25;

  return Math.round(clamp(
    baseline + midScore + highScore + lowPenalty + overcastFlatten + clearFlatten + rainPenalty,
    0, 100,
  ));
}

function pickBucket(score) {
  if (score >= 78) return { label: "Vivid", tone: "vivid", tint: "#ff8a58",
    detail: "Colorful sky likely" };
  if (score >= 60) return { label: "Warm", tone: "warm", tint: "#ff9f5c",
    detail: "Nice colors expected" };
  if (score >= 42) return { label: "Fair", tone: "fair", tint: "#f0c26b",
    detail: "Some color, softer" };
  if (score >= 25) return { label: "Muted", tone: "muted", tint: "#8fa1c7",
    detail: "Mostly grey palette" };
  return { label: "Grey", tone: "grey", tint: "#6b7690",
    detail: "Little color likely" };
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
