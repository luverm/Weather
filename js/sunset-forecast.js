// Predict the next sunset's color quality from cloud-layer cover, humidity,
// visibility, and precipitation around sunset hour. Vivid sunsets need mid
// or high clouds to catch under-lit colour, plus a clear horizon (low
// cloud + good visibility) and dry air.

const TIERS = [
  { min: 75, tier: "vivid",    label: "Vivid sunset likely" },
  { min: 55, tier: "colorful", label: "Colorful sunset"     },
  { min: 35, tier: "soft",     label: "Soft sunset"         },
  { min: 0,  tier: "muted",    label: "Muted sunset"        },
];

function nearestHourBefore(hours, ts) {
  let best = null;
  for (const h of hours) {
    if (h.time <= ts && (!best || h.time > best.time)) best = h;
  }
  return best;
}

// Bell-curve scoring around an ideal value: 1.0 at ideal, falling off in
// either direction by the given half-width.
function bell(value, ideal, halfWidth) {
  if (value == null) return 0.5;
  const d = Math.abs(value - ideal) / halfWidth;
  return Math.max(0, 1 - d * d);
}

export function predictSunset(weather, now = Date.now()) {
  const hours = weather?.hourly;
  const daily = weather?.daily;
  if (!hours?.length || !daily?.length) return null;

  // Pick the next sunset that hasn't fully passed yet (tolerate 30 min late).
  const sunset = daily
    .map((d) => d.sunset)
    .filter((s) => s != null && s > now - 30 * 60_000)[0];
  if (!sunset) return null;

  // We need cloud data at sunset hour. If sunset is more than ~24h out,
  // bail — the chip would just be speculative.
  if (sunset - now > 26 * 60 * 60 * 1000) return null;

  const sample = nearestHourBefore(hours, sunset) ?? hours[0];
  if (sample == null) return null;
  if (sample.cloudMid == null && sample.cloudHigh == null && sample.cloudCover == null) {
    return null;
  }

  const high = sample.cloudHigh ?? sample.cloudCover ?? 0;
  const mid  = sample.cloudMid  ?? 0;
  const low  = sample.cloudLow  ?? sample.cloudCover ?? 0;
  const humidity = sample.humidity ?? 60;
  const visKm = sample.visibility != null ? sample.visibility / 1000 : 16;
  const popPenalty = (sample.pop ?? 0) * 0.4 + Math.min(60, (sample.precip ?? 0) * 30);

  // Mid+high together at ~50% is the sweet spot. Low cloud should be small.
  const upperCanvas = bell((mid + high) / 2, 50, 40);   // 0..1
  const horizonClear = 1 - clamp01(low / 70);            // 1 when low<5%; 0 when >70%
  const dryAir = 1 - clamp01((humidity - 40) / 50);      // 1 below 40%, 0 above 90%
  const visibility = clamp01(visKm / 20);                // 1 at 20km+
  const dryness = clamp01(1 - popPenalty / 100);

  let score = Math.round(
    upperCanvas * 38 +
    horizonClear * 22 +
    dryAir       * 14 +
    visibility   * 14 +
    dryness      * 12
  );
  // Rain at sunset tanks colour; a totally cloudless sky is at best "soft".
  score = Math.round(score * (0.4 + 0.6 * dryness));
  if (upperCanvas < 0.15) score = Math.min(score, 45);

  const tier = TIERS.find((t) => score >= t.min);
  return {
    sunsetTs: sunset,
    score,
    tier: tier.tier,
    label: tier.label,
    sample: { mid, high, low, humidity, visKm, pop: sample.pop ?? 0 },
  };
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
