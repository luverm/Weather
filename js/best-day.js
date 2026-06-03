// Score each day in the 7-day forecast on a single "pleasantness" axis and
// pick the standout. Returns { index, score, reasons[] } | null when no day
// stands out enough to highlight.

function tempScore(hi) {
  if (hi == null) return 50;
  // Ideal afternoon high ≈ 22°C, drop off both sides.
  const ideal = 22;
  const dist = Math.abs(hi - ideal);
  return Math.max(0, 100 - dist * 4);
}

function precipPenalty(pop, mm) {
  return (pop ?? 0) * 0.4 + Math.min(40, (mm ?? 0) * 8);
}

function windPenalty(windMax, gustsMax) {
  const w = gustsMax ?? windMax ?? 0;
  if (w <= 18) return 0;
  if (w <= 28) return (w - 18) * 1.4;
  return Math.min(40, 14 + (w - 28) * 2);
}

function uvBonus(uvMax) {
  if (uvMax == null) return 0;
  // A bit of sun is nice; harsh UV is a wash, not a penalty (outfit handles it).
  if (uvMax >= 3 && uvMax <= 7) return 5;
  return 0;
}

function dayScore(d) {
  if (!d) return -Infinity;
  const t = tempScore(d.tempMax) * 0.55;
  const p = -precipPenalty(d.pop, d.precip) * 0.6;
  const w = -windPenalty(d.windMax, d.gustsMax) * 0.4;
  const u = uvBonus(d.uvMax) * 0.2;
  return t + p + w + u;
}

function reasonsFor(d) {
  const out = [];
  if (d.tempMax != null) out.push(`${Math.round(d.tempMax)}° high`);
  if ((d.pop ?? 0) < 25 && (d.precip ?? 0) < 0.5) out.push("dry");
  else if ((d.pop ?? 0) >= 60) out.push(`${Math.round(d.pop)}% rain`);
  const g = d.gustsMax ?? d.windMax;
  if (g != null) {
    if (g <= 14) out.push("calm");
    else if (g >= 35) out.push(`gusts ${Math.round(g)} km/h`);
  }
  return out.slice(0, 3);
}

export function pickBestDay(weather) {
  const days = weather?.daily || [];
  if (days.length < 3) return null;
  // Don't consider today — the user already sees today's weather directly.
  const candidates = days.slice(1);
  if (!candidates.length) return null;
  const scored = candidates.map((d, i) => ({
    index: i + 1,
    score: dayScore(d),
    day: d,
  }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const runnerUp = scored[1];
  if (!best || best.score < 45) return null;
  // Only highlight if the best is meaningfully better than runner-up.
  if (runnerUp && best.score - runnerUp.score < 8) return null;
  return {
    index: best.index,
    score: Math.round(best.score),
    reasons: reasonsFor(best.day),
  };
}
