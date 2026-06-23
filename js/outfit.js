// Pick a small set of "what to wear / bring" chips from current conditions.
// Returns an ordered array of { id, label, icon, why } — empty when nothing
// noteworthy. Designed to update on every scrubber tick, so it reads only
// from the sampled weather slice (no historical state).

const ICONS = {
  umbrella: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0118 0"/><path d="M3 12c1.2-1.5 2.4-1.5 3.6 0 1.2 1.5 2.4 1.5 3.6 0 1.2-1.5 2.4-1.5 3.6 0 1.2 1.5 2.4 1.5 3.6 0"/><path d="M12 12v7a2 2 0 01-4 0"/></svg>',
  sunglasses: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="14" r="3.5"/><circle cx="17" cy="14" r="3.5"/><path d="M10.5 14h3M3 10l2 2M21 10l-2 2"/></svg>',
  sunscreen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.5"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2M6 6l1.5 1.5M16.5 16.5L18 18M6 18l1.5-1.5M16.5 7.5L18 6"/></svg>',
  sunhat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17h18"/><path d="M6 17c0-4 2.7-7 6-7s6 3 6 7"/><path d="M9 10c0-2 1.3-4 3-4s3 2 3 4"/></svg>',
  light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8l3-3h6l3 3v12h-4v-7h-4v7H6V8z"/></svg>',
  coat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8l4-4h6l4 4v13h-5v-8h-4v8H5V8z"/><path d="M12 4v17"/></svg>',
  beanie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 15c0-4 3-7 7-7s7 3 7 7"/><path d="M4 18h16M12 4v4"/></svg>',
  gloves: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21V10c0-1 .8-2 2-2s2 1 2 2"/><path d="M12 10V7a1.5 1.5 0 113 0v4"/><path d="M15 11V8.5a1.5 1.5 0 113 0V13c0 4-2 8-5 8H10c-1.5 0-2.5-1-2.5-2.5"/></svg>',
  scarf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 6c2 2 8 2 10 0M6 9c3 2 9 2 12 0"/><path d="M9 12v8M15 12v6l-2 2"/></svg>',
  boots: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3v11h-2c-1.5 0-2 1-2 2v3h14v-3c0-1-.5-2-2-2h-2v-6"/><path d="M9 14h6"/></svg>',
  shorts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12l-1 8h-4l-1 8H8l-1-8H6z"/><path d="M12 4v8"/></svg>',
};

// Look ahead a couple of hours for incoming rain so chips warn early.
function nextRainHour(weather, fromTs) {
  const hours = weather?.hourly || [];
  return hours
    .filter((h) => h.time >= fromTs && h.time <= fromTs + 3 * 3600_000)
    .find((h) => (h.pop ?? 0) >= 55 || (h.precip ?? 0) > 0.4);
}

export function pickOutfit(weather) {
  if (!weather) return [];
  const t = weather.feelsLike ?? weather.temp;
  const wind = weather.windSpeed ?? 0;
  const gust = weather.windGusts ?? wind;
  const uv = weather.uv ?? 0;
  const cond = weather.condition;
  const isDay = weather.isDay !== false;
  const now = weather._sampledTs ?? Date.now();
  const soonRain = nextRainHour(weather, now);
  const currentlyRaining = cond === "rain" || cond === "storm";
  const snowing = cond === "snow";

  const items = [];

  // ---- Weather protection ----
  if (currentlyRaining) {
    items.push({ id: "umbrella", icon: ICONS.umbrella, label: "Umbrella", why: "Rain right now" });
  } else if (soonRain) {
    const mins = Math.max(0, Math.round((soonRain.time - now) / 60_000));
    const when = mins >= 60 ? `in ~${Math.round(mins / 60)}h` : mins ? `in ~${mins}m` : "shortly";
    items.push({ id: "umbrella", icon: ICONS.umbrella, label: "Umbrella", why: `Rain ${when}` });
  }

  if (snowing) {
    items.push({ id: "boots", icon: ICONS.boots, label: "Boots", why: "Snow on the ground" });
  }

  if (isDay && uv >= 6) {
    items.push({ id: "sunscreen", icon: ICONS.sunscreen, label: "Sunscreen", why: `UV ${Math.round(uv)} — strong` });
  }
  if (isDay && uv >= 3 && (cond === "clear" || cond === "clouds")) {
    items.push({ id: "sunglasses", icon: ICONS.sunglasses, label: "Sunglasses", why: `UV ${Math.round(uv)}` });
  }
  if (isDay && (uv >= 7 || (t != null && t >= 28))) {
    items.push({ id: "sunhat", icon: ICONS.sunhat, label: "Sun hat", why: t >= 28 ? "Strong sun + heat" : "Strong sun" });
  }

  // ---- Temperature layers ----
  if (t != null) {
    if (t <= 0) {
      items.push({ id: "coat", icon: ICONS.coat, label: "Heavy coat", why: `Feels ${Math.round(t)}°` });
      items.push({ id: "beanie", icon: ICONS.beanie, label: "Beanie", why: "Freezing" });
      items.push({ id: "gloves", icon: ICONS.gloves, label: "Gloves", why: "Freezing" });
      items.push({ id: "scarf", icon: ICONS.scarf, label: "Scarf", why: "Cold wind" });
    } else if (t <= 6) {
      items.push({ id: "coat", icon: ICONS.coat, label: "Warm coat", why: `Feels ${Math.round(t)}°` });
      items.push({ id: "scarf", icon: ICONS.scarf, label: "Scarf", why: "Chilly" });
      if (t <= 3 || gust >= 35) {
        items.push({ id: "gloves", icon: ICONS.gloves, label: "Gloves", why: gust >= 35 ? "Cold + wind" : "Cold hands" });
      }
    } else if (t <= 12) {
      items.push({ id: "coat", icon: ICONS.coat, label: "Jacket", why: `Feels ${Math.round(t)}°` });
    } else if (t <= 18) {
      items.push({ id: "light", icon: ICONS.light, label: "Light jacket", why: `Feels ${Math.round(t)}°` });
    } else if (t >= 26) {
      items.push({ id: "shorts", icon: ICONS.shorts, label: "Light layers", why: `Feels ${Math.round(t)}°` });
    }
  }

  // Drop duplicate ids while preserving order.
  const seen = new Set();
  return items.filter((it) => (seen.has(it.id) ? false : (seen.add(it.id), true)));
}
