// Pick the "best day" out of the 7-day forecast. "Best" = low precip,
// moderate temperature, moderate wind. Returns a day object plus a tag.

export function findBestDay(days) {
  const list = (days || []).slice(0, 7);
  if (list.length < 2) return null;

  // Score each day, higher = better.
  const scored = list.map((d, i) => ({ day: d, index: i, score: scoreDay(d) }));
  // Only call out a best day when at least one is noticeably nicer than the median.
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const median = scored[Math.floor(scored.length / 2)];
  if (best.score - median.score < 10) return null;
  // Prefer non-today unless today is genuinely a standout.
  if (best.index === 0 && scored[1] && scored[1].score >= best.score - 5) {
    return { ...scored[1], tag: tagFor(scored[1].day) };
  }
  return { ...best, tag: tagFor(best.day) };
}

function scoreDay(d) {
  let s = 60;
  // Precip: strong penalty for rain.
  const pop = d.pop ?? 0;
  const precip = d.precip ?? 0;
  s -= pop * 0.5;
  s -= precip * 3;
  // Wind: penalty above 25 km/h, mild above 15.
  const wind = d.windMax ?? 0;
  if (wind > 15) s -= (wind - 15) * 1.2;
  const gusts = d.gustsMax ?? 0;
  if (gusts > 35) s -= (gusts - 35);
  // Temperature: ideal 16-24°C, taper off outside.
  const hi = d.tempMax ?? 20;
  if (hi >= 16 && hi <= 24) s += 20;
  else if (hi < 16) s -= (16 - hi) * 1.1;
  else s -= (hi - 24) * 1.0;
  // Condition bonus for clear/partly cloudy.
  if (d.condition === "clear") s += 15;
  else if (d.condition === "clouds") s += 5;
  else if (d.condition === "storm") s -= 25;
  else if (d.condition === "snow") s -= 15;
  else if (d.condition === "fog") s -= 5;
  else if (d.condition === "rain") s -= 10;
  return s;
}

function tagFor(d) {
  if ((d.pop ?? 0) >= 40 || (d.precip ?? 0) >= 1) return "Driest day";
  if (d.condition === "clear" && (d.tempMax ?? 0) >= 15) return "Sunniest day";
  if ((d.windMax ?? 0) <= 12) return "Calmest day";
  if ((d.tempMax ?? 0) >= 22) return "Warmest day";
  return "Best day";
}
