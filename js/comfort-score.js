// Per-hour comfort scoring. Produces a 0..100 index composed of four axes:
//   - temperature: triangular curve centred on 21°C (feels-like preferred)
//   - precipitation chance: lower is better
//   - UV index: a mild 3–6 zone is best; harsh outside
//   - wind:    a breeze (<15 km/h) is best, gale is bad
//
// Also returns the "best hour" today (= among the next 24 hours of daytime)
// and the "worst hour" for completeness.
//
// This is intentionally opinionated: it mirrors the kind of advice a
// weather app anchor might give — "head out around 2 pm, that's your best
// window."

const WEIGHTS = {
  temp: 0.42,
  rain: 0.28,
  uv: 0.15,
  wind: 0.15,
};

export function scoreHour(h) {
  if (!h) return null;
  const temp = h.feelsLike ?? h.temp;
  const parts = {
    temp: tempScore(temp),
    rain: rainScore(h.pop ?? 0, h.precip ?? 0),
    uv: uvScore(h.uv ?? 0),
    wind: windScore(h.wind ?? 0),
  };
  let total = 0;
  for (const k of Object.keys(WEIGHTS)) total += parts[k] * WEIGHTS[k];
  return Math.round(total * 100);
}

export function scoreSeries(hours) {
  return (hours || []).map((h, i) => ({ i, h, score: scoreHour(h) }));
}

export function pickHighlights(hours) {
  const scored = scoreSeries(hours);
  // Only consider daytime hours for the "best outing" window — nobody picnics
  // in the dark. Fall back to any hour if the whole window is night.
  const day = scored.filter((s) => s.h?.isDay);
  const pool = day.length ? day : scored;
  if (!pool.length) return { best: null, worst: null };
  let best = pool[0], worst = pool[0];
  for (const s of pool) {
    if (s.score > best.score) best = s;
    if (s.score < worst.score) worst = s;
  }
  return { best, worst, scored };
}

function tempScore(t) {
  if (t == null) return 0.5;
  // Peak at 21°C, 0 at 0°C or 38°C.
  const peak = 21;
  const dist = Math.abs(t - peak);
  if (t <= 0 || t >= 38) return 0;
  const span = t > peak ? 17 : 21;
  return clamp01(1 - dist / span);
}

function rainScore(pop, precip) {
  // Any accumulated precip is a strong penalty.
  const popFrac = clamp01(pop / 100);
  const precipPenalty = clamp01(precip / 3); // 3mm/h = soaked
  return clamp01(1 - popFrac * 0.75 - precipPenalty * 0.4);
}

function uvScore(uv) {
  if (uv == null) return 0.6;
  if (uv < 1) return 0.6; // no sun, overcast
  if (uv < 3) return 0.9;
  if (uv < 6) return 1.0; // sweet spot
  if (uv < 8) return 0.65;
  if (uv < 11) return 0.3;
  return 0.1;
}

function windScore(w) {
  if (w == null) return 0.7;
  if (w < 4) return 0.95;   // calm but a bit stale
  if (w < 15) return 1.0;    // light breeze
  if (w < 25) return 0.75;
  if (w < 40) return 0.4;
  return 0.1;
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

export function describeScore(score) {
  if (score == null) return "—";
  if (score >= 85) return "Beautiful";
  if (score >= 72) return "Great";
  if (score >= 58) return "Comfortable";
  if (score >= 42) return "So-so";
  if (score >= 25) return "Rough";
  return "Harsh";
}
