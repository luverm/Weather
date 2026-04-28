// Find the best 2-3h windows in the next 24h for typical activities.
// Score each hour 0..100; rolling-average across the window length; pick the
// peak window per activity. Returns an array of { kind, label, icon, start,
// end, score, why } items, ready for the UI to render.

const ICONS = {
  walk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="4" r="2"/><path d="M9 21l3-7 4 3 2-4M7 13l3-3 3 4"/></svg>',
  stars: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.6 4.5L18 9l-4.4 1.5L12 15l-1.6-4.5L6 9l4.4-1.5L12 3z"/><path d="M19 14l.7 1.8L21 17l-1.3.6L19 19l-.7-1.4L17 17l1.3-1.2z"/></svg>',
};

function tempScore(t) {
  if (t == null) return 50;
  // Comfy band 14..22°C, drop sharply outside.
  const ideal = 18;
  const dist = Math.abs(t - ideal);
  return Math.max(0, 100 - dist * 6);
}

function windScore(kmh) {
  if (kmh == null) return 60;
  if (kmh <= 8) return 100;
  if (kmh <= 18) return 100 - (kmh - 8) * 4; // 100 -> 60
  if (kmh <= 32) return 60 - (kmh - 18) * 3; // 60 -> 18
  return 10;
}

function precipScore(pop, mm) {
  // Combine probability + intensity. Either one being high tanks the score.
  const popPenalty = pop != null ? pop : 0;
  const mmPenalty = Math.min(60, (mm ?? 0) * 30);
  return Math.max(0, 100 - popPenalty * 0.7 - mmPenalty);
}

function uvPenalty(uv) {
  if (uv == null) return 0;
  if (uv < 6) return 0;
  if (uv < 8) return 10;
  if (uv < 11) return 25;
  return 40;
}

function activityScore(h) {
  if (!h) return 0;
  const tw = tempScore(h.temp) * 0.30;
  const ww = windScore(h.wind ?? h.windSpeed) * 0.25;
  const pw = precipScore(h.pop, h.precip) * 0.40;
  const daytimeBonus = h.isDay ? 5 : -8;
  return Math.round(tw + ww + pw + daytimeBonus - uvPenalty(h.uv));
}

function stargazeScore(h) {
  if (!h) return 0;
  // Need: night, clear, dry. Cloud cover not in hourly — proxy via condition.
  if (h.isDay) return 0;
  const isClear = h.condition === "clear";
  const isCloudy = h.condition === "clouds" || h.condition === "fog";
  const isWet = h.condition === "rain" || h.condition === "snow" || h.condition === "storm";
  if (isWet) return 0;
  const base = isClear ? 95 : isCloudy ? 35 : 60;
  const popPenalty = (h.pop ?? 0) * 0.6;
  const windPenalty = Math.max(0, ((h.wind ?? 0) - 18) * 2);
  return Math.max(0, Math.round(base - popPenalty - windPenalty));
}

function rollingPeak(hours, scoreFn, span) {
  if (!hours?.length) return null;
  let best = null;
  for (let i = 0; i + span <= hours.length; i++) {
    let sum = 0;
    for (let k = 0; k < span; k++) sum += scoreFn(hours[i + k]);
    const avg = sum / span;
    if (!best || avg > best.score) {
      best = {
        score: avg,
        startIdx: i,
        endIdx: i + span - 1,
      };
    }
  }
  return best;
}

function reasonsFor(window, hours) {
  if (!window) return [];
  const slice = hours.slice(window.startIdx, window.endIdx + 1);
  const avgT = avg(slice.map((h) => h.temp));
  const avgW = avg(slice.map((h) => h.wind ?? h.windSpeed));
  const maxPop = Math.max(...slice.map((h) => h.pop ?? 0));
  const maxUv = Math.max(...slice.map((h) => h.uv ?? 0));
  const reasons = [];
  if (avgT != null) reasons.push(`${Math.round(avgT)}° feel`);
  if (avgW != null) reasons.push(`wind ${Math.round(avgW)} km/h`);
  if (maxPop > 0) reasons.push(`${Math.round(maxPop)}% rain`);
  if (maxUv >= 6) reasons.push(`UV ${Math.round(maxUv)}`);
  return reasons;
}

function avg(arr) {
  const xs = arr.filter((v) => v != null);
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function findActivityWindows(weather) {
  const hours = weather?.hourly || [];
  if (hours.length < 3) return [];
  const out = [];

  const walk = rollingPeak(hours, activityScore, 3);
  if (walk && walk.score >= 55) {
    out.push({
      kind: "walk",
      icon: ICONS.walk,
      label: "Best for outdoors",
      start: hours[walk.startIdx].time,
      end: hours[walk.endIdx].time + 60 * 60 * 1000,
      score: Math.round(walk.score),
      why: reasonsFor(walk, hours),
    });
  }

  // Stargazing: 2h window.
  const stars = rollingPeak(hours, stargazeScore, 2);
  if (stars && stars.score >= 60) {
    out.push({
      kind: "stars",
      icon: ICONS.stars,
      label: "Best for stargazing",
      start: hours[stars.startIdx].time,
      end: hours[stars.endIdx].time + 60 * 60 * 1000,
      score: Math.round(stars.score),
      why: reasonsFor(stars, hours),
    });
  }

  return out;
}
