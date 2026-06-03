// Pick a small list of clothing/gear items based on the current sampled
// weather. Each item has a stable key, label, hint, and inline SVG icon.
// The function returns an opinionated, ranked subset of items (max 6) so
// the card stays scannable.

const ICONS = {
  sunglasses: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="14" r="3.5"/><circle cx="18" cy="14" r="3.5"/><path d="M9.5 14h5M2 11l2-3h4M22 11l-2-3h-4"/></svg>',
  sunscreen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="6" r="2"/><path d="M12 9v6M9 13l6-3M9 10l6 3M7 17h10l-1 4H8z"/></svg>',
  sunhat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16h18M6 16c0-4 3-8 6-8s6 4 6 8"/><ellipse cx="12" cy="16" rx="9" ry="2"/></svg>',
  beanie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16a7 7 0 0114 0M5 16h14v3H5zM12 4v3"/></svg>',
  umbrella: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0118 0H3z"/><path d="M12 12v7a2 2 0 003 1.5"/></svg>',
  raincoat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l4-4h4l4 4v11H6zM10 5l2 4 2-4M9 13l-1 3M15 13l1 3"/></svg>',
  jacket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l3-2h6l3 2 2 4-3 1v10H7V11L4 10z"/><path d="M12 4v16"/></svg>',
  coat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5l3-1h6l3 1 2 4v12H4V9z"/><path d="M12 4v17M9 11h.01M15 11h.01M9 15h.01M15 15h.01"/></svg>',
  parka: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6l3-2h8l3 2 2 5-3 1v10H5V12L2 11z"/><path d="M12 4v17M8 9c1 2 7 2 8 0"/></svg>',
  scarf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l3 6-2 11h4l1-8M18 4l-3 6 2 11h-4M9 10h6"/></svg>',
  gloves: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21v-6c0-1 .5-2 1-2V5a1.5 1.5 0 013 0v7M11 12V4a1.5 1.5 0 013 0v8M14 12V6a1.5 1.5 0 013 0v7M17 13a2 2 0 012 2v6"/></svg>',
  tee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l3-2h6l3 2 2 3-3 2v9H7v-9L4 9z"/></svg>',
  longsleeve: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l3-2h6l3 2 2 4-3 1v9H7v-9L4 10z"/><path d="M4 10l-2 7M20 10l2 7"/></svg>',
  shorts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h14l-1 8h-4l-1-4-1 4H6z"/></svg>',
  boots: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h4v10l4 2v6H6v-6l3-1z"/><path d="M9 11h4"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4z"/><path d="M3 12l9 4 9-4M3 17l9 4 9-4"/></svg>',
  mask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10c0-1 1-2 2-2h12c1 0 2 1 2 2v3c0 1-1 2-2 2l-3 3h-6l-3-3c-1 0-2-1-2-2z"/><path d="M8 12h8M8 15h8"/></svg>',
};

// Look at the next ~8h to anticipate the user's outing.
function nextRainSoon(weather) {
  const hours = weather.hourly || [];
  const horizon = 8;
  for (let i = 0; i < Math.min(horizon, hours.length); i++) {
    const h = hours[i];
    if ((h.pop ?? 0) >= 55 || (h.precip ?? 0) >= 0.4) {
      const mins = Math.round((h.time - Date.now()) / 60_000);
      return { mins: mins > 0 ? mins : 0, pop: h.pop ?? 0, precip: h.precip ?? 0 };
    }
  }
  return null;
}

function tempSwing(weather) {
  const hours = (weather.hourly || []).slice(0, 12).map((h) => h.temp).filter((v) => v != null);
  if (hours.length < 3) return 0;
  return Math.max(...hours) - Math.min(...hours);
}

export function pickOutfit(weather) {
  if (!weather) return [];
  const t = weather.feelsLike ?? weather.temp;
  if (t == null) return [];
  const wind = weather.windGusts ?? weather.windSpeed ?? 0;
  const uv = weather.uv ?? 0;
  const cond = weather.condition;
  const isDay = !!weather.isDay;
  const rh = weather.humidity ?? 50;
  const rainSoon = nextRainSoon(weather);
  const swing = tempSwing(weather);
  const items = [];

  const add = (key, label, hint, priority) =>
    items.push({ key, label, hint, icon: ICONS[key], priority });

  // ----- Precipitation / wet weather -----
  if (cond === "rain" || (rainSoon && rainSoon.mins < 240)) {
    if (rainSoon && rainSoon.mins > 0 && cond !== "rain") {
      add("umbrella", "Umbrella", `rain in ~${rainSoon.mins >= 60 ? Math.round(rainSoon.mins / 60) + "h" : rainSoon.mins + "m"}`, 9);
    } else {
      add("umbrella", "Umbrella", `${Math.round((rainSoon?.pop ?? 80))}% chance`, 9);
    }
    if (wind > 35) {
      // Wind makes umbrellas useless — push a raincoat instead.
      add("raincoat", "Raincoat", "wind would flip a brolly", 10);
    } else if (t <= 12) {
      add("raincoat", "Waterproof", "cool and wet", 7);
    }
  }
  if (cond === "snow") {
    add("boots", "Waterproof boots", "snowy underfoot", 9);
  }

  // ----- Layering core -----
  if (t <= -10) {
    add("parka", "Heavy parka", `feels ${Math.round(t)}°`, 10);
    add("scarf", "Scarf", "cover your face", 8);
    add("gloves", "Gloves", "skin-numbing cold", 9);
    add("beanie", "Beanie", "keep heat in", 8);
  } else if (t <= 0) {
    add("coat", "Heavy coat", `feels ${Math.round(t)}°`, 10);
    add("scarf", "Scarf", "near freezing", 7);
    add("gloves", "Gloves", "fingers will sting", 8);
    add("beanie", "Beanie", "wool hat helps", 7);
  } else if (t <= 6) {
    add("coat", "Warm coat", `feels ${Math.round(t)}°`, 9);
    add("beanie", "Hat", "ears get cold first", 5);
  } else if (t <= 12) {
    add("jacket", "Jacket", `feels ${Math.round(t)}°`, 8);
  } else if (t <= 17) {
    add("longsleeve", "Long sleeve", `mild — feels ${Math.round(t)}°`, 7);
    if (swing >= 8) add("layers", "Layers", `${Math.round(swing)}° swing today`, 6);
  } else if (t <= 23) {
    add("tee", "T-shirt", `pleasant — feels ${Math.round(t)}°`, 7);
    if (t < 20 && swing >= 8) add("longsleeve", "Long sleeve handy", "for after sunset", 5);
  } else if (t <= 28) {
    add("tee", "Light tee", `warm — feels ${Math.round(t)}°`, 8);
    add("shorts", "Shorts", "stay cool", 5);
  } else {
    add("tee", "Loose, light", `hot — feels ${Math.round(t)}°`, 9);
    add("shorts", "Shorts", "shed heat", 6);
  }

  // ----- Sun protection -----
  if (uv >= 7 && isDay) {
    add("sunscreen", "SPF 30+", `UV ${Math.round(uv)}`, 9);
    add("sunhat", "Sun hat", "burn risk", 7);
    add("sunglasses", "Sunglasses", "glare protection", 6);
  } else if (uv >= 5 && isDay) {
    add("sunscreen", "Sunscreen", `UV ${Math.round(uv)}`, 7);
    add("sunglasses", "Sunglasses", "bright day", 5);
  } else if (uv >= 3 && isDay && (cond === "clear" || cond === "clouds")) {
    add("sunglasses", "Sunglasses", "bright outside", 3);
  }

  // ----- Air quality mask -----
  const aqi = weather.airQuality?.aqi;
  if (aqi != null && aqi >= 150) {
    add("mask", "N95 mask", `AQI ${Math.round(aqi)}`, 9);
  }

  // ----- Sort by priority desc, dedupe by key, keep top 6 -----
  const seen = new Set();
  const out = items
    .sort((a, b) => b.priority - a.priority)
    .filter((it) => {
      if (seen.has(it.key)) return false;
      seen.add(it.key);
      return true;
    })
    .slice(0, 6);

  return out;
}
