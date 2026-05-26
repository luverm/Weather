// Golden-hour quality forecast.
//
// Predicts how vivid the next sunset (or sunrise) will be based on the cloud
// composition, humidity, visibility, and air quality at that hour. Photographers
// know the canvas matters: 25–60% cloud cover with clear air below tends to
// catch the most colour; overcast blankets wash it out; perfectly clear skies
// give a soft fade with little drama.
//
// Returns null when no relevant event is upcoming, otherwise:
//   { kind: "sunset"|"sunrise", ts, score: 0..100,
//     label, headline, why: string[], tone: "gold"|"warm"|"neutral"|"cool"|"dim" }

const TONES = [
  // score floor, label, tone, headline prefix
  [82, "Spectacular", "gold",    "Spectacular"],
  [66, "Vivid",       "warm",    "Vivid"],
  [48, "Pleasant",    "neutral", "Pleasant"],
  [30, "Muted",       "cool",    "Muted"],
  [0,  "Hidden",      "dim",     "Hidden"],
];

export function predictGoldenHour(weather, now = Date.now()) {
  if (!weather) return null;
  const event = pickNextEvent(weather, now);
  if (!event) return null;

  const sample = sampleAtTime(weather, event.ts);
  const { score, why } = scoreGoldenHour(sample);

  const bucket = TONES.find(([floor]) => score >= floor) || TONES[TONES.length - 1];
  const [, label, tone, headline] = bucket;

  return {
    kind: event.kind,
    ts: event.ts,
    score,
    label,
    headline: event.kind === "sunset" ? `${headline} sunset` : `${headline} sunrise`,
    tone,
    why: why.slice(0, 3),
  };
}

function pickNextEvent(weather, now) {
  const events = [];
  for (const d of weather.daily || []) {
    if (d.sunrise && d.sunrise > now) events.push({ kind: "sunrise", ts: d.sunrise });
    if (d.sunset  && d.sunset  > now) events.push({ kind: "sunset",  ts: d.sunset  });
  }
  events.sort((a, b) => a.ts - b.ts);
  const next = events[0];
  if (!next) return null;
  // Only show predictions for events within ~20h. Beyond that the hourly
  // data is unreliable and the chip is just noise.
  if (next.ts - now > 20 * 3600_000) return null;
  return next;
}

function sampleAtTime(weather, ts) {
  const hours = weather.hourly || [];
  let nearest = null;
  let bestDiff = Infinity;
  for (const h of hours) {
    const diff = Math.abs(h.time - ts);
    if (diff < bestDiff) { bestDiff = diff; nearest = h; }
  }
  // If the event lies beyond the 24h hourly window, fall back to current.
  if (!nearest || bestDiff > 90 * 60_000) {
    return {
      cloud: weather.cloudCover,
      humidity: weather.humidity,
      visibility: weather.visibility,
      precip: 0,
      condition: weather.condition,
      aqi: weather.airQuality?.aqi,
      _fallback: true,
    };
  }
  return {
    cloud: nearest.cloud ?? weather.cloudCover,
    humidity: nearest.humidity ?? weather.humidity,
    visibility: weather.visibility, // hourly viz not requested; current is good enough
    precip: nearest.precip ?? 0,
    pop: nearest.pop ?? 0,
    condition: nearest.condition,
    aqi: weather.airQuality?.aqi,
  };
}

function scoreGoldenHour(s) {
  const why = [];

  // Hard blockers first — bypass the additive model.
  if (s.condition === "storm") {
    why.push("Thunderstorm overhead");
    return { score: 8, why };
  }
  if (s.condition === "fog") {
    why.push("Fog cuts visibility");
    return { score: 14, why };
  }
  if (s.precip > 1.5) {
    why.push("Heavy precip in progress");
    return { score: 18, why };
  }

  let score = 50;

  // Cloud composition is the dominant factor. Mid coverage (25–60%) is the
  // sweet spot — clouds catch and scatter colour. Anything beyond 85% blocks
  // the show; under 10% gives a clean but subtle fade.
  const cloud = clamp(s.cloud ?? 0, 0, 100);
  if (cloud >= 25 && cloud <= 60) {
    score += 30;
    why.push("Mid-level clouds for colour");
  } else if (cloud > 60 && cloud <= 80) {
    score += 12;
    why.push("Patchy clouds");
  } else if (cloud > 80 && cloud <= 92) {
    score -= 18;
    why.push("Mostly overcast");
  } else if (cloud > 92) {
    score -= 35;
    why.push("Overcast blanket");
  } else if (cloud < 10) {
    score += 4;
    why.push("Clear, soft fade");
  } else { // 10..25
    score += 16;
    why.push("Few high clouds");
  }

  // Humidity haze.
  const rh = s.humidity;
  if (rh != null) {
    if (rh >= 90) { score -= 8; why.push("Humid haze"); }
    else if (rh <= 45) { score += 6; why.push("Crisp dry air"); }
  }

  // Visibility (meters → km).
  if (s.visibility != null) {
    const km = s.visibility / 1000;
    if (km < 4) { score -= 14; why.push("Low visibility"); }
    else if (km >= 15) { score += 4; why.push("Clear air"); }
  }

  // Air quality. Light aerosols enhance reds (golden-hour photographers know
  // this trick); heavy pollution flattens and dirties them.
  const aqi = s.aqi;
  if (aqi != null) {
    if (aqi > 150) { score -= 10; why.push("Air quality smudges colour"); }
    else if (aqi >= 40 && aqi <= 100) { score += 3; why.push("Aerosols boost the red"); }
  }

  // Light precip discount even if not a blocker above.
  if (s.precip > 0.2 && s.precip <= 1.5) {
    score -= 8;
    why.push("Light showers");
  } else if (s.pop != null && s.pop >= 70) {
    score -= 4;
    why.push("High rain chance");
  }

  return { score: clamp(Math.round(score), 0, 100), why };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
