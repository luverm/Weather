// Score the 7-day daily forecast and highlight the standout "best" day.
// "Best" is a subjective compromise of pleasant temperature, low rain, and
// mild wind — a heuristic aimed at weekend planning, not meteorology.
//
// Returns { index, reason } or null when nothing stands out (only today,
// or every day is similarly mediocre).

export function pickBestDay(days) {
  if (!Array.isArray(days) || days.length < 3) return null;
  const candidates = days
    .map((d, i) => ({ d, i, score: scoreDay(d) }))
    .filter((x) => x.i >= 1 && x.d.tempMax != null); // skip "today"
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const runnerUp = candidates[1];
  // Require a meaningful margin over the average of the rest so we don't
  // celebrate a day that's only marginally better than a similar sibling.
  const others = candidates.slice(1).map((c) => c.score);
  const avg = others.length ? others.reduce((s, v) => s + v, 0) / others.length : 0;
  if (best.score - avg < 8 && best.score - (runnerUp?.score ?? 0) < 4) return null;
  return { index: best.i, reason: reasonFor(best.d) };
}

function scoreDay(d) {
  let s = 100;
  // Temperature sweet-spot 18–24 °C max; taper away.
  const hi = d.tempMax ?? 20;
  if (hi >= 18 && hi <= 24) s += 30;
  else if (hi >= 14 && hi <= 28) s += 15;
  else if (hi < 5 || hi > 32) s -= 20;
  else s += 0;

  // Precipitation is the biggest killer.
  s -= Math.min(60, (d.precip ?? 0) * 20);
  s -= Math.min(40, (d.pop ?? 0) * 0.4);

  // Wind — start penalising above 20 km/h; heavy penalty for gales.
  const w = d.windMax ?? 0;
  const g = d.gustsMax ?? w;
  if (w > 20) s -= (w - 20) * 1.2;
  if (g > 40) s -= (g - 40) * 1.4;

  // Sunlight bias — clear/cloudy label bonuses.
  if (d.condition === "clear") s += 8;
  else if (d.condition === "clouds") s += 2;
  else if (d.condition === "storm") s -= 25;
  else if (d.condition === "snow") s -= 15;

  return s;
}

function reasonFor(d) {
  const hi = d.tempMax != null ? `${Math.round(d.tempMax)}°` : null;
  const dry = (d.precip ?? 0) < 0.5 && (d.pop ?? 0) < 25;
  const bits = [];
  if (d.condition === "clear") bits.push("sunny");
  else if (d.condition === "clouds") bits.push("bright");
  if (dry) bits.push("dry");
  if (hi) bits.push(hi);
  if ((d.windMax ?? 0) < 15) bits.push("light winds");
  if (!bits.length) return "the pick of the week";
  return bits.slice(0, 3).join(" · ");
}
