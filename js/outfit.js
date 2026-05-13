// Suggest a small set of outfit icons based on current conditions.
// Returns an array of { key, glyph, label }. Empty when conditions don't
// warrant any specific gear (mild, pleasant weather).

export function outfitFor(w) {
  if (!w) return [];
  const items = [];
  const feels = w.feelsLike ?? w.temp;
  const cond = w.condition;
  const gust = w.windGusts ?? w.windSpeed ?? 0;
  const uv = w.uv ?? 0;
  const pop = (w.hourly?.[0]?.pop) ?? 0;
  const incomingRain = (w.hourly || []).slice(0, 3)
    .some((h) => (h.pop ?? 0) >= 55 || (h.precip ?? 0) > 0.4);

  // Order matters — we want the most relevant pieces first.
  if (cond === "snow") {
    items.push({ key: "boots", glyph: "🥾", label: "Boots" });
    items.push({ key: "gloves", glyph: "🧤", label: "Gloves" });
  }
  if (feels != null && feels <= 0) {
    items.push({ key: "scarf", glyph: "🧣", label: "Scarf" });
    if (!items.some((i) => i.key === "gloves")) {
      items.push({ key: "gloves", glyph: "🧤", label: "Gloves" });
    }
  }
  if (feels != null && feels <= 12) {
    items.push({ key: "jacket", glyph: "🧥", label: "Warm jacket" });
  } else if (feels != null && feels <= 18) {
    items.push({ key: "light-jacket", glyph: "🧥", label: "Light layer" });
  }
  if (cond === "rain" || cond === "storm" || pop > 65 || incomingRain) {
    items.push({ key: "umbrella", glyph: "☂", label: "Umbrella" });
  }
  if (gust >= 45) {
    items.push({ key: "wind", glyph: "💨", label: "Wind-proof shell" });
  }
  if (uv >= 6) {
    items.push({ key: "sunglasses", glyph: "🕶", label: "Sunglasses" });
    if (uv >= 8) items.push({ key: "hat", glyph: "🧢", label: "Sun hat" });
  }
  if (feels != null && feels >= 28) {
    items.push({ key: "hydrate", glyph: "🥤", label: "Hydrate" });
  }
  // Deduplicate by key, keep first occurrence, cap at 4 to keep the strip tidy.
  const seen = new Set();
  const out = [];
  for (const it of items) {
    if (seen.has(it.key)) continue;
    seen.add(it.key);
    out.push(it);
    if (out.length >= 4) break;
  }
  return out;
}
