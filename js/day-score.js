// Score a day 0..100 for "general comfort" and return a small {score, cls,
// label} badge. Pure derived number — never introduces its own data.

export function dayScore(d) {
  if (!d) return null;
  // Temperature: ideal band 16..24°C using hi/lo midpoint.
  const mid = (d.tempMax + d.tempMin) / 2;
  const tempScore = tempBand(mid);
  // Precipitation: higher precip & POP cost more.
  const popPen = (d.pop ?? 0) * 0.35;             // 0..35
  const precipPen = Math.min(45, (d.precip ?? 0) * 6); // 0..45
  // Wind: calm good, strong bad.
  const windPen = windPenalty(d.windMax ?? 0, d.gustsMax ?? 0);
  // UV: harsh UV costs a little comfort.
  const uvPen = uvPenalty(d.uvMax ?? 0);
  // Severe conditions override.
  if (d.condition === "storm") return bandBadge(15);
  if (d.condition === "snow") return bandBadge(Math.max(25, 70 - precipPen));
  if (d.condition === "fog") return bandBadge(Math.max(35, tempScore - 20));

  const score = Math.max(0, Math.min(100,
    Math.round(tempScore - popPen - precipPen - windPen - uvPen)
  ));
  return bandBadge(score);
}

function tempBand(c) {
  if (c == null || isNaN(c)) return 50;
  const ideal = 20;
  const dist = Math.abs(c - ideal);
  return Math.max(0, 100 - dist * 4); // 20°C -> 100, 30°C or 10°C -> 60
}
function windPenalty(wind, gusts) {
  const g = Math.max(wind, gusts * 0.6);
  if (g < 15) return 0;
  if (g < 25) return 5;
  if (g < 40) return 15;
  if (g < 60) return 30;
  return 45;
}
function uvPenalty(uv) {
  if (uv < 6) return 0;
  if (uv < 8) return 3;
  if (uv < 11) return 7;
  return 12;
}

function bandBadge(score) {
  let cls, label;
  if (score >= 80)      { cls = "great"; label = "Great"; }
  else if (score >= 65) { cls = "good";  label = "Good"; }
  else if (score >= 45) { cls = "mixed"; label = "Mixed"; }
  else if (score >= 25) { cls = "rough"; label = "Rough"; }
  else                  { cls = "bad";   label = "Harsh"; }
  return { score, cls, label };
}
