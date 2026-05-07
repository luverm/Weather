// Aether Comfort Score — a 0-100 outdoor-friendliness score that combines
// the major comfort drivers (temperature, wind, precipitation, humidity, UV,
// air quality) into a single number. Designed to update with the scrubber so
// users can spot the most pleasant hour of the day at a glance.
//
// Each factor contributes a non-negative penalty; the final score is
// clamp(0, 100, 100 - sum(penalties)). The factor with the largest penalty
// becomes the "limited by …" reason, so the UI can explain *why* a hour is
// uncomfortable rather than just showing a number.

const TEMP_IDEAL = 21; // °C — the centre of "pleasant".

function tempPenalty(c) {
  if (c == null) return 0;
  // Quadratic falloff with mild asymmetry: cold pinches faster than warm.
  const delta = c - TEMP_IDEAL;
  const k = delta < 0 ? 0.42 : 0.32;
  return Math.min(45, Math.pow(Math.abs(delta), 1.7) * k);
}

function windPenalty(kmh) {
  if (kmh == null) return 0;
  if (kmh <= 8) return 0;
  // Linear above a calm threshold, capped at 35.
  return Math.min(35, (kmh - 8) * 1.0);
}

function precipPenalty(precipMm, pop) {
  // Active precipitation hurts more than just a forecast probability.
  let p = 0;
  if (precipMm != null) p += Math.min(40, precipMm * 18);
  if (pop != null) p += Math.min(15, pop * 0.15);
  return Math.min(45, p);
}

function humidityPenalty(rh) {
  if (rh == null) return 0;
  // Comfort band 35–65; quadratic outside.
  if (rh >= 35 && rh <= 65) return 0;
  const off = rh < 35 ? 35 - rh : rh - 65;
  return Math.min(20, Math.pow(off, 1.4) * 0.18);
}

function uvPenalty(uv) {
  if (uv == null) return 0;
  if (uv <= 5) return 0;
  return Math.min(15, (uv - 5) * 3);
}

function aqiPenalty(aqi) {
  if (aqi == null) return 0;
  if (aqi <= 50) return 0;
  if (aqi <= 100) return (aqi - 50) * 0.18;     // up to 9
  if (aqi <= 150) return 9 + (aqi - 100) * 0.32; // up to 25
  return Math.min(40, 25 + (aqi - 150) * 0.25);
}

const LABELS = [
  { min: 88, label: "Excellent", tone: "great" },
  { min: 74, label: "Great",     tone: "great" },
  { min: 60, label: "Pleasant",  tone: "good" },
  { min: 44, label: "Mild",      tone: "okay" },
  { min: 26, label: "Tough",     tone: "rough" },
  { min: 0,  label: "Harsh",     tone: "rough" },
];

function pickLabel(score) {
  return LABELS.find((l) => score >= l.min) || LABELS[LABELS.length - 1];
}

const FACTOR_LABELS = {
  temp: "temperature",
  wind: "wind",
  precip: "precipitation",
  humidity: "humidity",
  uv: "UV exposure",
  aqi: "air quality",
};

/**
 * Compute the comfort score for a sampled weather snapshot.
 * Returns { score, label, tone, limitedBy, factors }.
 *   - score: 0..100 (integer)
 *   - label: e.g. "Pleasant"
 *   - tone:  one of "great" | "good" | "okay" | "rough"
 *   - limitedBy: the dominant penalty's human-readable name, or null when score >= 90.
 *   - factors: raw penalty values per factor (for tooltips / debugging).
 */
export function computeComfortScore(w) {
  if (!w) return null;

  // Prefer feels-like over raw temp — it's what the body actually senses.
  const sensedTemp = w.feelsLike ?? w.temp;
  const aqi = w.airQuality?.aqi ?? null;

  const factors = {
    temp: tempPenalty(sensedTemp),
    wind: windPenalty(w.windGusts ?? w.windSpeed),
    precip: precipPenalty(w.precip, w.pop),
    humidity: humidityPenalty(w.humidity),
    uv: uvPenalty(w.uv),
    aqi: aqiPenalty(aqi),
  };

  const total = Object.values(factors).reduce((s, v) => s + v, 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - total)));
  const meta = pickLabel(score);

  let limitedBy = null;
  if (score < 90) {
    const top = Object.entries(factors).reduce(
      (best, [k, v]) => (v > best.v ? { k, v } : best),
      { k: null, v: 0 }
    );
    if (top.k && top.v >= 4) limitedBy = FACTOR_LABELS[top.k];
  }

  return { score, label: meta.label, tone: meta.tone, limitedBy, factors };
}
