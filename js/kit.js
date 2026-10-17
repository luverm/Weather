// "Grab these" kit suggestions — a short list of icon chips that answer the
// "what do I take with me" question at a glance. Complements the single-line
// advice pill by surfacing _every_ relevant item, not just the dominant one.
//
// Keep the list short (<= 5 chips) and ordered by urgency so the first chip
// is the one the user would miss most if they forgot it.

const ICON = {
  umbrella: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c5 0 9 4 9 9H3a9 9 0 019-9z"/><path d="M12 12v7a2 2 0 004 0"/></svg>',
  jacket:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4l5 2 5-2 3 3-3 2v11H4V7l3-3z"/><path d="M12 6v15"/></svg>',
  heavy:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l6 2 6-2 3 4-3 2v12H3V8l3-4z"/><path d="M12 6v16M9 11h6"/></svg>',
  shades:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="7" height="6" rx="2"/><rect x="14" y="9" width="7" height="6" rx="2"/><path d="M10 12h4M2 10l1-3h4M22 10l-1-3h-4"/></svg>',
  sunscreen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5l1.5-1.5M17 7l1.5-1.5"/></svg>',
  hat:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17c2-2 5-3 8-3s6 1 8 3"/><path d="M7 15c0-5 2-9 5-9s5 4 5 9"/></svg>',
  water:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z"/></svg>',
  gloves:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21V11a2 2 0 014 0M12 11V7a2 2 0 014 0v4"/><path d="M8 11h8l1 4-2 6H8l-1-5a3 3 0 011-5z"/></svg>',
  layers:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5M3 17l9 5 9-5"/></svg>',
  boots:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h3v10a4 4 0 004 4h5v4H5V8a5 5 0 013-5z"/><path d="M11 10h4"/></svg>',
  windproof:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h12a3 3 0 100-6M3 14h16a3 3 0 100-6M3 20h9a3 3 0 100-6"/></svg>',
};

const MM_IN_NEXT = (hourly, hours) =>
  (hourly || []).slice(0, hours).reduce((s, h) => s + (Number(h.precip) || 0), 0);

const MAX_POP_IN_NEXT = (hourly, hours) =>
  (hourly || []).slice(0, hours).reduce((m, h) => Math.max(m, Number(h.pop) || 0), 0);

const PEAK_UV_TODAY = (uvPeak) => (uvPeak ? Number(uvPeak.value) || 0 : 0);

/**
 * Build a prioritised chip list for the current weather.
 * @returns {Array<{id:string, label:string, why:string, icon:string, tone:"warm"|"cool"|"wet"|"sun"|"wind"}>}
 */
export function buildKit(weather) {
  if (!weather) return [];
  const chips = [];
  const t = weather.feelsLike ?? weather.temp ?? 15;
  const temp = weather.temp ?? t;
  const wind = Number(weather.windSpeed) || 0;
  const gust = Number(weather.windGusts) || wind;
  const uv = Number(weather.uv) || 0;
  const peakUv = Math.max(uv, PEAK_UV_TODAY(weather.uvPeak));
  const cond = weather.condition;
  const nowHour = (weather.hourly || [])[0] || {};
  const popNow = Number(nowHour.pop) || 0;
  const popNext6 = MAX_POP_IN_NEXT(weather.hourly, 6);
  const popToday = MAX_POP_IN_NEXT(weather.hourly, 12);
  const mmNext6 = MM_IN_NEXT(weather.hourly, 6);
  const mmToday = MM_IN_NEXT(weather.hourly, 24);
  const isSnowy = cond === "snow" || (weather.hourly || []).slice(0, 6).some((h) => h.condition === "snow");

  // 1. Snow footwear takes precedence over umbrella — an umbrella is not the
  //    tool for snow.
  if (isSnowy) {
    chips.push({ id: "boots", label: "Waterproof boots", why: "Snow in the forecast", icon: ICON.boots, tone: "cool" });
  } else if (cond === "rain" || cond === "storm" || popNow >= 55) {
    chips.push({ id: "umbrella", label: "Umbrella", why: "Rain right now", icon: ICON.umbrella, tone: "wet" });
  } else if (popNext6 >= 55 || mmNext6 >= 0.8) {
    chips.push({ id: "umbrella", label: "Umbrella", why: `${Math.round(popNext6)}% rain within 6h`, icon: ICON.umbrella, tone: "wet" });
  } else if (popToday >= 50 || mmToday >= 1.5) {
    chips.push({ id: "umbrella", label: "Compact brolly", why: "Possible shower later", icon: ICON.umbrella, tone: "wet" });
  }

  // 3. Warmth tiers — pick one.
  if (t <= -5) {
    chips.push({ id: "heavy", label: "Heavy coat", why: `Feels ${Math.round(t)}°`, icon: ICON.heavy, tone: "cool" });
    chips.push({ id: "gloves", label: "Gloves", why: "Below freezing", icon: ICON.gloves, tone: "cool" });
  } else if (t <= 2) {
    chips.push({ id: "heavy", label: "Winter coat", why: `Feels ${Math.round(t)}°`, icon: ICON.heavy, tone: "cool" });
  } else if (t <= 9) {
    chips.push({ id: "jacket", label: "Jacket", why: `Feels ${Math.round(t)}°`, icon: ICON.jacket, tone: "cool" });
  } else if (t <= 15) {
    chips.push({ id: "layers", label: "Light layers", why: `Feels ${Math.round(t)}°`, icon: ICON.layers, tone: "cool" });
  } else if (t >= 28) {
    chips.push({ id: "water", label: "Water bottle", why: "Hot — hydrate", icon: ICON.water, tone: "warm" });
  }

  // 4. Sun protection: UV / clear-sky.
  if (peakUv >= 7) {
    chips.push({ id: "sunscreen", label: "SPF 30+", why: `UV peaks ${Math.round(peakUv)}`, icon: ICON.sunscreen, tone: "sun" });
  } else if (peakUv >= 5 && cond === "clear") {
    chips.push({ id: "shades", label: "Sunglasses", why: "Bright and clear", icon: ICON.shades, tone: "sun" });
  }
  if (peakUv >= 8 && (cond === "clear" || cond === "clouds")) {
    chips.push({ id: "hat", label: "Hat", why: "Strong midday sun", icon: ICON.hat, tone: "sun" });
  }

  // 5. Wind protection.
  if (gust >= 45) {
    chips.push({ id: "windproof", label: "Windproof shell", why: `Gusts ${Math.round(gust)} km/h`, icon: ICON.windproof, tone: "wind" });
  }

  // De-duplicate by id (highest priority wins — our pushes are already ordered).
  const seen = new Set();
  const unique = [];
  for (const c of chips) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    unique.push(c);
  }
  return unique.slice(0, 5);
}
