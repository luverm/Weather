// Round 27: single-number comfort score for a weather snapshot.
// Blends deviation from a "perfect" reading (22 °C, 50 % rh, calm, moderate UV)
// with a few penalties that dominate at their own extremes (freezing,
// hurricane-force wind, extreme UV). Output is a 0..100 integer plus a
// human label + tone bucket for chip colouring.

const IDEAL = { temp: 22, rh: 50 };

const TONE_BUCKETS = [
  { min: 82, label: "Delightful", tone: "great" },
  { min: 66, label: "Comfy", tone: "good" },
  { min: 48, label: "OK", tone: "mid" },
  { min: 30, label: "Rough", tone: "poor" },
  { min: 0,  label: "Harsh", tone: "bad" },
];

export function scoreWeather(w) {
  if (!w || w.temp == null) return null;
  let score = 100;
  const notes = [];

  const feels = w.feelsLike ?? w.temp;
  const tempDev = Math.abs(feels - IDEAL.temp);
  const tempPenalty = Math.min(45, tempDev * tempDev * 0.35);
  score -= tempPenalty;
  if (feels <= 0) { score -= 8; notes.push("freezing"); }
  else if (feels >= 32) { score -= 8; notes.push("hot"); }
  else if (tempDev >= 10) notes.push(feels > IDEAL.temp ? "warm" : "chilly");

  if (w.humidity != null) {
    const rhDev = Math.abs(w.humidity - IDEAL.rh);
    const humidPenalty = Math.min(20, rhDev * rhDev * 0.006);
    score -= humidPenalty;
    if (w.humidity >= 85) notes.push("damp");
    else if (w.humidity <= 25) notes.push("dry");
  }

  if (w.windSpeed != null) {
    // Light breeze up to 15 km/h is welcome; penalise beyond.
    if (w.windSpeed > 15) {
      const windPenalty = Math.min(25, (w.windSpeed - 15) * 0.55);
      score -= windPenalty;
      if (w.windSpeed >= 40) notes.push("windy");
    }
  }

  if (w.uv != null && w.uv >= 8) {
    score -= Math.min(10, (w.uv - 7) * 2);
    notes.push("high UV");
  }

  // Precipitation right now bumps discomfort a bit.
  if ((w.hourly?.[0]?.precip ?? 0) >= 0.4) {
    score -= 6;
    notes.push("wet");
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const bucket = TONE_BUCKETS.find((b) => clamped >= b.min) || TONE_BUCKETS[TONE_BUCKETS.length - 1];
  return {
    score: clamped,
    label: bucket.label,
    tone: bucket.tone,
    notes: notes.slice(0, 3),
  };
}
