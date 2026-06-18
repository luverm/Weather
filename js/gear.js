// Suggest items to bring or wear based on the next ~12 hours of weather.
// Output is a small, opinionated list — each item carries a glyph, label, and
// short rationale. The renderer hides the card if nothing meaningful surfaces.

export function buildGear(weather) {
  if (!weather) return [];
  const hours = (weather.hourly || []).slice(0, 12);
  if (!hours.length) return [];

  const temps = hours.map((h) => h.temp).filter((v) => v != null);
  const feels = hours.map((h) => h.feelsLike ?? h.temp).filter((v) => v != null);
  const winds = hours.map((h) => h.wind ?? 0);
  const gusts = hours.map((h) => h.gusts ?? h.wind ?? 0);
  const pops = hours.map((h) => h.pop ?? 0);
  const precs = hours.map((h) => h.precip ?? 0);
  const uvs = hours.map((h) => h.uv ?? 0);

  const tMin = temps.length ? Math.min(...temps) : null;
  const tMax = temps.length ? Math.max(...temps) : null;
  const feelMin = feels.length ? Math.min(...feels) : null;
  const feelMax = feels.length ? Math.max(...feels) : null;
  const windMax = winds.length ? Math.max(...winds) : 0;
  const gustMax = gusts.length ? Math.max(...gusts) : 0;
  const popMax = pops.length ? Math.max(...pops) : 0;
  const precSum = precs.reduce((a, b) => a + b, 0);
  const uvMax = uvs.length ? Math.max(...uvs) : 0;

  const isStorm = hours.some((h) => h.condition === "storm");
  const isSnow = hours.some((h) => h.condition === "snow");
  const isFog = hours.some((h) => h.condition === "fog");
  const swing = (feelMax != null && feelMin != null) ? feelMax - feelMin : 0;
  const dayHours = hours.filter((h) => h.isDay).length;
  const hasDaylight = dayHours >= 2;

  const out = [];

  // --- Precipitation (skip the rain pill if it's actually snow falling) ---
  if (!isSnow && (isStorm || precSum >= 4 || popMax >= 70)) {
    out.push({
      key: "umbrella",
      glyph: "☂️",
      label: "Umbrella",
      detail: isStorm
        ? "Storms forecast"
        : `${popMax}% rain, ${precSum.toFixed(1)} mm expected`,
      weight: 95,
    });
  } else if (!isSnow && (popMax >= 40 || precSum >= 1)) {
    out.push({
      key: "umbrella-lite",
      glyph: "☔",
      label: "Pocket brolly",
      detail: `${popMax}% chance of showers`,
      weight: 65,
    });
  }

  // --- Snow ---
  if (isSnow) {
    out.push({
      key: "boots",
      glyph: "🥾",
      label: "Snow boots",
      detail: "Snow expected — grip & warmth",
      weight: 95,
    });
  }

  // --- Cold ---
  if (feelMin != null && feelMin <= -2) {
    out.push({
      key: "heavy-coat",
      glyph: "🧥",
      label: "Heavy coat",
      detail: `Feels ${Math.round(feelMin)}° at coldest`,
      weight: 92,
    });
  } else if (feelMin != null && feelMin <= 8) {
    out.push({
      key: "jacket",
      glyph: "🧥",
      label: "Warm jacket",
      detail: `Feels ${Math.round(feelMin)}° at coldest`,
      weight: 70,
    });
  } else if (feelMin != null && feelMin <= 14 && swing >= 6) {
    out.push({
      key: "light-jacket",
      glyph: "🧥",
      label: "Light layer",
      detail: `Cools to ${Math.round(feelMin)}° later`,
      weight: 55,
    });
  }

  // --- Wind ---
  if (gustMax >= 50) {
    out.push({
      key: "windproof",
      glyph: "🌬️",
      label: "Windproof shell",
      detail: `Gusts to ${Math.round(gustMax)} km/h`,
      weight: 80,
    });
  } else if (windMax >= 28 && !out.some((g) => g.key === "windproof")) {
    out.push({
      key: "wind-layer",
      glyph: "🌬️",
      label: "Wind layer",
      detail: `Sustained ${Math.round(windMax)} km/h winds`,
      weight: 50,
    });
  }

  // --- Sun / UV ---
  if (hasDaylight && uvMax >= 6) {
    out.push({
      key: "sunscreen",
      glyph: "🧴",
      label: "Sunscreen",
      detail: `UV peaks at ${Math.round(uvMax)}`,
      weight: uvMax >= 8 ? 88 : 75,
    });
  }
  if (hasDaylight && uvMax >= 3 && !isStorm && !isFog && popMax < 70) {
    out.push({
      key: "shades",
      glyph: "🕶️",
      label: "Sunglasses",
      detail: uvMax >= 6 ? "Bright + high UV" : "Bright skies ahead",
      weight: 35,
    });
  }

  // --- Heat / hydration ---
  if (tMax != null && tMax >= 28) {
    out.push({
      key: "water",
      glyph: "💧",
      label: "Water bottle",
      detail: tMax >= 32 ? `Hot — peaks ${Math.round(tMax)}°` : `Warm day, peaks ${Math.round(tMax)}°`,
      weight: tMax >= 32 ? 78 : 60,
    });
  }
  if (tMax != null && tMax >= 26 && uvMax >= 5) {
    out.push({
      key: "hat",
      glyph: "🧢",
      label: "Hat",
      detail: "Warm and sunny",
      weight: 45,
    });
  }

  // --- Fog ---
  if (isFog) {
    out.push({
      key: "fog",
      glyph: "🔦",
      label: "Be visible",
      detail: "Fog around — reflective layer",
      weight: 40,
    });
  }

  // --- Layers for big swings ---
  if (swing >= 9 && !out.some((g) => g.key.includes("jacket"))) {
    out.push({
      key: "layers",
      glyph: "🧣",
      label: "Layers",
      detail: `${Math.round(swing)}° swing today`,
      weight: 48,
    });
  }

  // Dedupe by key, rank by weight, cap at 5.
  const seen = new Set();
  return out
    .filter((g) => (seen.has(g.key) ? false : (seen.add(g.key), true)))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);
}
