// Predict the vividness of the next sunrise / sunset.
//
// Inspired by SunsetWx's approach: mid- and high-level clouds act as a
// canvas that catches horizon light; low clouds block it; dry, stable
// air lets colour saturate. The scoring is intentionally coarse — we
// have hourly resolution and no aerosol data — but it gives the sun
// card a small, honest hint that reads well.

const LABELS = [
  { min: 80, label: "Brilliant", stars: 5 },
  { min: 65, label: "Great",     stars: 4 },
  { min: 50, label: "Nice",      stars: 3 },
  { min: 30, label: "Muted",     stars: 2 },
  { min: 0,  label: "Grey",      stars: 1 },
];

// Bell curve peaking near 45% coverage — some canvas, not a lid.
function midHighContribution(pct) {
  if (pct == null) return 0;
  const peak = 45;
  const width = 30;
  const delta = (pct - peak) / width;
  return Math.round(35 * Math.exp(-delta * delta));
}

function lowPenalty(pct) {
  if (pct == null) return 0;
  // Below ~30% has no meaningful effect; ramp to a full 40-point hit at 100%.
  if (pct < 30) return 0;
  return Math.round(((pct - 30) / 70) * 40);
}

function humidityPenalty(rh) {
  if (rh == null) return 0;
  if (rh < 70) return 0;
  return Math.round(((rh - 70) / 30) * 12);
}

function pressureBonus(trend) {
  if (!trend) return 0;
  if (trend.direction === "rising") return 4;
  if (trend.direction === "falling") return -3;
  return 0;
}

function scoreOf({ cloudLow, cloudMid, cloudHigh, humidity, pressureTrend }) {
  const midHigh = Math.max(cloudMid ?? 0, cloudHigh ?? 0, ((cloudMid ?? 0) + (cloudHigh ?? 0)) * 0.7);
  const raw =
    45 +
    midHighContribution(midHigh) -
    lowPenalty(cloudLow) -
    humidityPenalty(humidity) +
    pressureBonus(pressureTrend);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function labelFor(score) {
  for (const row of LABELS) if (score >= row.min) return row;
  return LABELS[LABELS.length - 1];
}

// Return the sample nearest to `ts` from an hourly series that carries a
// `.time` on each entry.
function sampleNearest(hourly, ts) {
  if (!hourly?.length || ts == null) return null;
  let best = null;
  let bestDiff = Infinity;
  for (const h of hourly) {
    const diff = Math.abs(h.time - ts);
    if (diff < bestDiff) { best = h; bestDiff = diff; }
  }
  // Ignore samples more than 90 min away — the target has drifted out of range.
  if (bestDiff > 90 * 60 * 1000) return null;
  return best;
}

// Pick the next horizon event (sunrise or sunset) across today + tomorrow.
export function nextHorizonEvent(weather, now = Date.now()) {
  const days = weather?.daily || [];
  let bestTs = null;
  let bestKind = null;
  for (const d of days) {
    for (const [ts, kind] of [[d.sunrise, "sunrise"], [d.sunset, "sunset"]]) {
      if (ts && ts > now && (bestTs == null || ts < bestTs)) {
        bestTs = ts;
        bestKind = kind;
      }
    }
  }
  if (bestTs == null) return null;
  return { time: bestTs, kind: bestKind };
}

// Public: compute a quality forecast for the next horizon event.
export function sunsetQuality(weather, now = Date.now()) {
  const next = nextHorizonEvent(weather, now);
  if (!next) return null;

  const sample = sampleNearest(weather?.hourly, next.time);
  const cloudLow = sample?.cloudLow ?? null;
  const cloudMid = sample?.cloudMid ?? null;
  const cloudHigh = sample?.cloudHigh ?? null;
  const humidity = sample?.humidity ?? weather?.humidity ?? null;

  // If none of the cloud layers came back, we don't have enough signal to
  // make a meaningful prediction — better to hide the badge than mislead.
  if (cloudLow == null && cloudMid == null && cloudHigh == null) return null;

  const score = scoreOf({
    cloudLow, cloudMid, cloudHigh,
    humidity,
    pressureTrend: weather?.pressureTrend,
  });

  const meta = labelFor(score);
  return {
    kind: next.kind,           // "sunrise" | "sunset"
    time: next.time,
    score,                     // 0..100
    label: meta.label,         // Brilliant / Great / Nice / Muted / Grey
    stars: meta.stars,         // 1..5
    cloudLow, cloudMid, cloudHigh,
  };
}
