// "What to wear" — pick a minimal set of apparel icons based on the current
// conditions. Keeps the list to 2–5 items so the strip stays legible.

export function attireItems(weather) {
  if (!weather) return [];
  const feels = weather.feelsLike ?? weather.temp;
  const temp = weather.temp;
  const wind = weather.windSpeed ?? 0;
  const gust = weather.windGusts ?? wind;
  const uv = weather.uv ?? 0;
  const cond = weather.condition;
  const isDay = !!weather.isDay;
  const pop = weather.hourly?.[0]?.pop ?? 0;
  const nextPrecip = (weather.hourly || []).slice(0, 4)
    .some((h) => (h.precip ?? 0) > 0.3 || (h.pop ?? 0) >= 60);

  const picks = [];
  const add = (key, label) => {
    if (picks.find((p) => p.key === key)) return;
    picks.push({ key, label, svg: ICONS[key] });
  };

  // Primary layer by feels-like.
  if (feels != null) {
    if (feels <= -5)      add("coat", "Heavy coat");
    else if (feels <= 5)  add("coat", "Winter coat");
    else if (feels <= 12) add("jacket", "Jacket");
    else if (feels <= 18) add("sweater", "Long sleeves");
    else                  add("tee", "T-shirt");
  }

  // Accessories.
  if (feels != null && feels <= 2) add("gloves", "Gloves");
  if (feels != null && feels <= 0) add("hat", "Beanie");
  if (cond === "snow" || (temp != null && temp <= 0)) add("boots", "Boots");
  if (gust >= 35 && (feels == null || feels <= 10)) add("scarf", "Scarf");

  // Rain gear.
  if (cond === "rain" || cond === "storm" || pop >= 60 || nextPrecip) {
    add("umbrella", "Umbrella");
  }

  // Sun stuff — daytime only.
  if (isDay) {
    if (uv >= 6) add("sunglasses", "Sunglasses");
    if (uv >= 8) add("sunhat", "Sun hat");
  }

  return picks.slice(0, 5);
}

const COMMON = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"';
const ICONS = {
  tee:
    `<svg viewBox="0 0 24 24" ${COMMON}><path d="M8 4l-4 3 2 3 2-1v10h8V9l2 1 2-3-4-3-2 1a2 2 0 01-4 0z"/></svg>`,
  sweater:
    `<svg viewBox="0 0 24 24" ${COMMON}><path d="M8 4l-4 3 2 4 2-1v10h8V10l2 1 2-4-4-3-2 1a2 2 0 01-4 0z"/><path d="M9 15h6"/></svg>`,
  jacket:
    `<svg viewBox="0 0 24 24" ${COMMON}><path d="M8 4l-5 3 2 4 3-1v10h3V7h2v13h3V10l3 1 2-4-5-3-2 1a2 2 0 01-4 0z"/></svg>`,
  coat:
    `<svg viewBox="0 0 24 24" ${COMMON}><path d="M8 4l-5 3 2 5 3-1v9h8v-9l3 1 2-5-5-3-2 1a2 2 0 01-4 0z"/><path d="M12 7v13"/></svg>`,
  gloves:
    `<svg viewBox="0 0 24 24" ${COMMON}><path d="M10 20h5a2 2 0 002-2v-3a2 2 0 00-2-2V7a1 1 0 10-2 0v3V7a1 1 0 10-2 0v3V8a1 1 0 10-2 0v6l-2-2a1 1 0 00-2 1l2 4 1 1z"/></svg>`,
  hat:
    `<svg viewBox="0 0 24 24" ${COMMON}><path d="M5 15c0-5 3-9 7-9s7 4 7 9H5z"/><path d="M4 15h16"/><circle cx="12" cy="4" r="1"/></svg>`,
  scarf:
    `<svg viewBox="0 0 24 24" ${COMMON}><path d="M6 7c0-2 2-4 6-4s6 2 6 4v3H6V7z"/><path d="M8 10v8l-2 2M16 10v8l2 2"/><path d="M6 10h12"/></svg>`,
  boots:
    `<svg viewBox="0 0 24 24" ${COMMON}><path d="M7 4h4v12l5 3v2H6l-1-3V4z"/><path d="M11 12l5 3"/></svg>`,
  umbrella:
    `<svg viewBox="0 0 24 24" ${COMMON}><path d="M3 12a9 9 0 0118 0H3z"/><path d="M12 12v7a2 2 0 11-4 0"/></svg>`,
  sunglasses:
    `<svg viewBox="0 0 24 24" ${COMMON}><circle cx="7" cy="13" r="3.5"/><circle cx="17" cy="13" r="3.5"/><path d="M3 10l3-4h12l3 4M10.5 13h3"/></svg>`,
  sunhat:
    `<svg viewBox="0 0 24 24" ${COMMON}><path d="M4 17c0-3 4-6 8-6s8 3 8 6H4z"/><path d="M7 17c0-5 2-9 5-9s5 4 5 9"/></svg>`,
};
