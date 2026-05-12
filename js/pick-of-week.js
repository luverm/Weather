// Score the next ~6 days and return the one with the most pleasant weather.
//
// Scoring is intentionally simple and value-laden ("warm + dry + calm" wins).
// Each component is normalized then summed; the strongest positive factor
// becomes the headline reason. Returns `null` if we don't have enough days or
// no day stands out.

const IDEAL_C = 22;

const CONDITION_BIAS = {
  clear: 18,
  clouds: 6,
  fog: -4,
  rain: -16,
  snow: -10,
  storm: -22,
};

export function pickOfWeek(weather) {
  const days = (weather?.daily || []).slice(0, 7);
  if (days.length < 3) return null;

  const scored = days.map((d, i) => {
    const mid = (d.tempMax != null && d.tempMin != null) ? (d.tempMax + d.tempMin) / 2 : null;
    const tempScore = mid != null ? 20 - Math.abs(mid - IDEAL_C) * 1.6 : 0;
    const popPenalty = Math.max(0, (d.pop ?? 0) - 10) * 0.35;
    const precipPenalty = (d.precip ?? 0) * 2.4;
    const windPenalty = Math.max(0, (d.windMax ?? 0) - 22) * 0.55;
    const gustPenalty = Math.max(0, (d.gustsMax ?? 0) - 38) * 0.4;
    const uvPenalty = (d.uvMax != null && d.uvMax > 8) ? (d.uvMax - 8) * 1.2 : 0;
    const conditionScore = CONDITION_BIAS[d.condition] ?? 0;
    const score = tempScore + conditionScore - popPenalty - precipPenalty - windPenalty - gustPenalty - uvPenalty;
    return { i, day: d, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0];
  if (!winner) return null;

  // Today already has its own treatment in the hero. If today is the winner
  // but a later day is essentially tied, hand the spotlight to the future day
  // so the chip surfaces fresh information.
  let pick = winner;
  if (winner.i === 0) {
    const challenger = scored.find((s) => s.i !== 0);
    if (challenger && winner.score - challenger.score < 2) {
      pick = challenger;
    }
  }
  // Need a meaningful gap over the runner-up, otherwise the pick is just
  // arbitrary noise (e.g. the offline mock returns near-identical days).
  const runnerUp = scored.find((s) => s.i !== pick.i);
  if (runnerUp && pick.score - runnerUp.score < 3 && pick.score < 12) {
    return null;
  }

  return {
    index: pick.i,
    day: pick.day,
    score: Math.round(pick.score),
    reason: explain(pick.day, scored),
  };
}

function explain(d, scored) {
  const others = scored.map((s) => s.day);
  const minPop = Math.min(...others.map((o) => o.pop ?? 0));
  const minWind = Math.min(...others.map((o) => o.windMax ?? Infinity));
  const maxTemp = Math.max(...others.map((o) => o.tempMax ?? -Infinity));

  const traits = [];
  if (d.condition === "clear") traits.push("clear skies");
  else if (d.condition === "clouds") traits.push("mostly cloudless");
  if (d.tempMax != null && d.tempMax >= maxTemp - 0.5) traits.push("warmest stretch");
  if ((d.pop ?? 0) <= minPop + 5 && (d.pop ?? 0) <= 20) traits.push("low rain risk");
  if ((d.windMax ?? Infinity) <= minWind + 2 && (d.windMax ?? 0) < 18) traits.push("calm winds");
  if (d.uvMax != null && d.uvMax >= 3 && d.uvMax <= 7) traits.push("comfortable UV");

  if (!traits.length) {
    if ((d.precip ?? 0) < 0.5 && (d.pop ?? 0) < 30) return "Driest day in the run";
    return "Best balance of the week";
  }
  // Cap to two traits to keep the headline crisp.
  return traits.slice(0, 2).join(" · ");
}
