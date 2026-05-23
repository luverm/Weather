// Comfort score: synthesizes temperature, humidity, wind, UV, and air quality
// at the sampled time into a single 0..100 "how pleasant is it right now" index.
//
// The score isn't a forecast — it's an at-a-glance summary. The breakdown
// chips show which factors are pulling the score down so the user can tell
// *why* it's not perfect.

export function computeComfortScore(weather) {
  if (!weather) return null;

  // Each factor returns a 0..100 sub-score plus a chip describing it. Sub-scores
  // below 100 mean "this factor is pulling comfort down".
  const factors = [
    tempFactor(weather.feelsLike ?? weather.temp),
    humidityFactor(weather.humidity, weather.feelsLike ?? weather.temp),
    windFactor(weather.windSpeed ?? 0, weather.windGusts ?? 0),
    uvFactor(weather.uv, weather.isDay),
    aqFactor(weather.airQuality?.aqi),
  ].filter(Boolean);

  if (!factors.length) return null;

  // Weighted average — temp and humidity dominate, AQ/UV pull harder when bad.
  const weights = { temp: 3, humidity: 2, wind: 1.5, uv: 1, aq: 1.5 };
  let weighted = 0, total = 0;
  for (const f of factors) {
    const w = weights[f.key] ?? 1;
    weighted += f.score * w;
    total += w;
  }
  const score = Math.round(weighted / total);

  // Highlight the two worst factors as the "why" chips. If everything is great
  // (>= 85), surface the temp + best stat instead so the card still reads.
  const sorted = [...factors].sort((a, b) => a.score - b.score);
  const chips = score >= 85
    ? factors.slice(0, 3)
    : sorted.slice(0, 3);

  return {
    score,
    label: labelFor(score),
    tone: toneFor(score),
    tagline: taglineFor(score, sorted[0]),
    chips,
  };
}

function tempFactor(t) {
  if (t == null) return null;
  // Sweet spot 18–24 °C. Score falls off symmetrically.
  let score;
  if (t >= 18 && t <= 24) score = 100;
  else if (t >= 14 && t < 18) score = 100 - (18 - t) * 6;
  else if (t > 24 && t <= 28) score = 100 - (t - 24) * 8;
  else if (t >= 8 && t < 14) score = 76 - (14 - t) * 6;
  else if (t > 28 && t <= 33) score = 68 - (t - 28) * 8;
  else if (t < 8) score = Math.max(10, 40 - (8 - t) * 3);
  else score = Math.max(0, 28 - (t - 33) * 5);
  const label = t == null ? "—" : `${Math.round(t)}° feels`;
  return { key: "temp", icon: "thermo", score: clamp(score), label, hint: tempHint(t) };
}

function tempHint(t) {
  if (t <= 0) return "freezing";
  if (t < 8) return "cold";
  if (t < 14) return "chilly";
  if (t <= 24) return "comfy";
  if (t <= 28) return "warm";
  if (t <= 33) return "hot";
  return "scorching";
}

function humidityFactor(h, feelsLike) {
  if (h == null) return null;
  // Comfortable RH 35–60 %. Penalize sticky heat extra (high RH + warm temp).
  let score;
  if (h >= 35 && h <= 60) score = 100;
  else if (h < 35) score = 100 - (35 - h) * 1.4;
  else if (h <= 75) score = 100 - (h - 60) * 2.2;
  else score = Math.max(10, 67 - (h - 75) * 2.6);
  // Sticky penalty: high humidity above 22 °C feels worse.
  if (feelsLike != null && feelsLike >= 22 && h >= 65) {
    score -= Math.min(25, (h - 65) * 0.6 + (feelsLike - 22) * 1.5);
  }
  let hint = "ok";
  if (h < 30) hint = "dry";
  else if (h > 75) hint = "muggy";
  else if (h > 60) hint = "humid";
  else if (h > 45) hint = "balanced";
  return { key: "humidity", icon: "drop", score: clamp(score), label: `${Math.round(h)}% rh`, hint };
}

function windFactor(wind, gusts) {
  // Up to ~15 km/h is pleasant; gusts above 40 km/h start to annoy.
  const ref = Math.max(wind, gusts * 0.9);
  let score;
  if (ref <= 15) score = 100;
  else if (ref <= 25) score = 100 - (ref - 15) * 2;
  else if (ref <= 40) score = 80 - (ref - 25) * 2.8;
  else if (ref <= 60) score = 38 - (ref - 40) * 1.2;
  else score = Math.max(0, 14 - (ref - 60) * 0.5);
  let hint = "calm";
  if (ref > 50) hint = "blustery";
  else if (ref > 35) hint = "windy";
  else if (ref > 20) hint = "breezy";
  else if (ref > 10) hint = "light breeze";
  return { key: "wind", icon: "wind", score: clamp(score), label: `${Math.round(ref)} km/h`, hint };
}

function uvFactor(uv, isDay) {
  if (uv == null) return null;
  if (!isDay) {
    // At night the index doesn't subtract from comfort.
    return { key: "uv", icon: "sun", score: 100, label: "UV 0", hint: "after dark" };
  }
  let score;
  if (uv <= 2) score = 100;
  else if (uv <= 5) score = 100 - (uv - 2) * 5;
  else if (uv <= 7) score = 85 - (uv - 5) * 7;
  else if (uv <= 10) score = 71 - (uv - 7) * 9;
  else score = Math.max(20, 44 - (uv - 10) * 4);
  let hint = "low";
  if (uv >= 11) hint = "extreme";
  else if (uv >= 8) hint = "very high";
  else if (uv >= 6) hint = "high";
  else if (uv >= 3) hint = "moderate";
  return { key: "uv", icon: "sun", score: clamp(score), label: `UV ${Math.round(uv)}`, hint };
}

function aqFactor(aqi) {
  if (aqi == null) return null;
  let score;
  if (aqi <= 50) score = 100;
  else if (aqi <= 100) score = 100 - (aqi - 50) * 0.7;
  else if (aqi <= 150) score = 65 - (aqi - 100) * 0.7;
  else if (aqi <= 200) score = 30 - (aqi - 150) * 0.4;
  else score = Math.max(0, 10 - (aqi - 200) * 0.05);
  let hint = "clean";
  if (aqi > 150) hint = "unhealthy";
  else if (aqi > 100) hint = "poor";
  else if (aqi > 50) hint = "moderate";
  return { key: "aq", icon: "leaf", score: clamp(score), label: `AQI ${Math.round(aqi)}`, hint };
}

function labelFor(score) {
  if (score >= 90) return "Pristine";
  if (score >= 78) return "Excellent";
  if (score >= 66) return "Pleasant";
  if (score >= 52) return "Fair";
  if (score >= 38) return "So-so";
  if (score >= 22) return "Rough";
  return "Brutal";
}

function toneFor(score) {
  if (score >= 78) return "great";
  if (score >= 60) return "good";
  if (score >= 42) return "fair";
  return "poor";
}

function taglineFor(score, worst) {
  if (score >= 88) return "Step outside — conditions are textbook.";
  if (score >= 70 && worst) return `Comfy overall · watch the ${humanKey(worst.key)}.`;
  if (score >= 55 && worst) return `Workable, but ${worst.hint} ${humanKey(worst.key)} drags it down.`;
  if (score >= 38 && worst) return `Tough mix — ${worst.hint} ${humanKey(worst.key)} is the main offender.`;
  if (worst) return `Stay in if you can — ${worst.hint} ${humanKey(worst.key)}.`;
  return "Stay in if you can.";
}

function humanKey(k) {
  return { temp: "temperature", humidity: "humidity", wind: "wind", uv: "UV", aq: "air" }[k] || k;
}

function clamp(v) { return Math.max(0, Math.min(100, v)); }

// SVG glyphs for the chip icons. Kept small and uniform.
export const COMFORT_ICONS = {
  thermo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14V5a2 2 0 10-4 0v9a4 4 0 104 0z"/><circle cx="12" cy="17" r="1.6" fill="currentColor" stroke="none"/></svg>',
  drop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z"/></svg>',
  wind: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h12a3 3 0 100-6M3 14h16a3 3 0 100-6M3 20h9a3 3 0 100-6"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5l1.5-1.5M17 7l1.5-1.5"/></svg>',
  leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20C4 11 11 4 20 4c0 9-7 16-16 16z"/><path d="M4 20l8-8"/></svg>',
};
