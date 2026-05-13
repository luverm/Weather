// Synthesize a simple driving-conditions score from current weather.
// Returns { score 0-100, level, label, reasons[] }.
//
// We don't aim for any official road-safety index — just a quick "should I
// be careful?" signal driven by visibility, precip type, wind, and ice risk.

export function drivingConditions(w) {
  if (!w) return null;
  const reasons = [];
  let score = 100;

  const vis = w.visibility; // meters
  if (vis != null) {
    if (vis < 200) { score -= 60; reasons.push("dense fog"); }
    else if (vis < 1000) { score -= 35; reasons.push("low visibility"); }
    else if (vis < 4000) { score -= 12; reasons.push("hazy"); }
  }

  const cond = w.condition;
  if (cond === "rain") { score -= 12; reasons.push("wet roads"); }
  if (cond === "storm") { score -= 28; reasons.push("storms"); }
  if (cond === "snow") { score -= 38; reasons.push("snow on roads"); }
  if (cond === "fog" && (vis == null || vis >= 1000)) { score -= 18; reasons.push("fog"); }

  const gust = w.windGusts ?? w.windSpeed ?? 0;
  if (gust > 80) { score -= 28; reasons.push("violent gusts"); }
  else if (gust > 60) { score -= 16; reasons.push("strong gusts"); }
  else if (gust > 45) { score -= 8; reasons.push("crosswinds"); }

  if (w.temp != null && w.temp <= 1 && (cond === "rain" || cond === "snow")) {
    score -= 22; reasons.push("ice risk");
  }

  // Sun glare at low sun angle (within 30 min of sunrise/sunset, clear sky).
  const now = Date.now();
  if (cond === "clear" && (w.sunrise || w.sunset)) {
    const nearSun = [w.sunrise, w.sunset].some(
      (t) => t && Math.abs(now - t) < 30 * 60_000
    );
    if (nearSun) { score -= 6; reasons.push("low-sun glare"); }
  }

  score = Math.max(0, Math.min(100, score));
  let level, label;
  if (score >= 85) { level = "good"; label = "Roads clear"; }
  else if (score >= 65) { level = "fair"; label = "Fair driving"; }
  else if (score >= 40) { level = "caution"; label = "Drive with care"; }
  else { level = "hazard"; label = "Hazardous driving"; }

  return { score, level, label, reasons };
}
