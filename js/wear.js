// What-to-wear chips — a short row of SVG icons chosen from the sampled
// weather. Pairs with the one-line text advice in advice.js; the chips give
// a glanceable summary without reading the sentence.

const ICONS = {
  tshirt: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l-4 3 2 3 2-1v9h10v-9l2 1 2-3-4-3-3 2h-4L7 5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  longsleeve: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4l-5 4 2 4 2-1v10h10V11l2 1 2-4-5-4h-3l-2 2H9L8 4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  jacket: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l-4 3 2 4 2-1v11h4v-9h2v9h4V10l2 1 2-4-4-3h-2a3 3 0 01-6 0H7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 4v10" stroke="currentColor" stroke-width="1.2"/></svg>`,
  parka: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5l-3 4 2 4 2-1v10h10V12l2 1 2-4-3-4-3 1h-6L6 5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 10c0 2 1 3 3 3s3-1 3-3M12 13v9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  umbrella: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11a9 9 0 0118 0H3z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 2v9M12 20a2 2 0 002-2M12 11v9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  hat: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17c0-5 4-9 8-9s8 4 8 9H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M2 19h20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  beanie: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16a8 8 0 0116 0v2H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 18h16M12 4v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  gloves: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 20V8a2 2 0 014 0v4m0-2a2 2 0 014 0v4m0-2a2 2 0 013 0v6a4 4 0 01-4 4H10a4 4 0 01-4-4V12a2 2 0 014 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>`,
  sunglasses: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="14" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="14" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 14h2M3 10l3-2M21 10l-3-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  sunscreen: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7V5h6v2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><rect x="7" y="7" width="10" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 12h4M10 16h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  boots: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h3v10l5 3v4H6v-6l2-1V4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  mask: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10c1-1 3-2 8-2s7 1 8 2v4c-1 1-3 2-8 2s-7-1-8-2v-4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 11l-2-1M20 11l2-1M4 13l-2 1M20 13l2 1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
};

/**
 * Pick 2–4 chip suggestions for the given weather snapshot. Each entry is
 * `{ key, icon, label }`. Order is intentional — leftmost = most relevant.
 */
export function suggestWear(weather) {
  if (!weather) return [];
  const t = weather.feelsLike ?? weather.temp;
  if (t == null) return [];
  const wind = weather.windSpeed ?? 0;
  const gust = weather.windGusts ?? wind;
  const uv = weather.uv ?? 0;
  const cond = weather.condition;
  const vis = weather.visibility; // meters
  const aq = weather.airQuality?.value;
  const pop0 = weather.hourly?.[0]?.pop ?? 0;
  const nextRain = (weather.hourly || []).slice(0, 6)
    .find((h) => (h.pop ?? 0) >= 55 || (h.precip ?? 0) > 0.4);
  const isDay = weather.isDay !== false;

  const picks = [];
  const add = (key, label) => {
    if (!ICONS[key]) return;
    if (picks.some((p) => p.key === key)) return;
    picks.push({ key, icon: ICONS[key], label });
  };

  // ---- Layering ----
  if (t <= -10)       add("parka", "Serious coat");
  else if (t <= 0)    add("parka", "Winter coat");
  else if (t <= 8)    add("jacket", "Jacket");
  else if (t <= 14)   add("jacket", "Light jacket");
  else if (t <= 20)   add("longsleeve", "Long sleeve");
  else                add("tshirt", "T-shirt");

  if (t <= 0)         add("beanie", "Hat");
  if (t <= -3)        add("gloves", "Gloves");

  // ---- Rain / snow ----
  if (cond === "rain" || cond === "storm" || pop0 > 70) add("umbrella", "Umbrella");
  else if (nextRain) add("umbrella", "Umbrella (soon)");
  if (cond === "snow" || (t <= 0 && (cond === "rain" || pop0 > 50))) add("boots", "Boots");

  // ---- Sun ----
  if (isDay && uv >= 6) add("sunscreen", "Sunscreen");
  if (isDay && uv >= 7) add("hat", "Sun hat");
  if (isDay && uv >= 5) add("sunglasses", "Shades");

  // ---- Air quality / low visibility ----
  if (aq != null && aq >= 150) add("mask", "Mask (AQI)");
  else if (vis != null && vis < 1000 && cond === "fog") add("mask", "Low visibility");

  // ---- Wind — upgrade the main top layer when it is blustery ----
  if (gust > 45 && t > 0) {
    if (picks[0]?.key === "tshirt" || picks[0]?.key === "longsleeve") {
      picks[0] = { key: "jacket", icon: ICONS.jacket, label: "Windbreaker" };
    }
  }

  // Keep the row compact — 4 chips max, prioritised by order of insertion.
  return picks.slice(0, 4);
}
