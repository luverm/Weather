// "Pack list" — small, opinionated icon pills recommending what to bring or
// wear right now, derived from current + near-term weather. Each item is
// { key, label, title, icon } so the UI can render a compact pill strip.
//
// Priority order is baked into the list; `buildPack` returns at most `max`
// items so the strip never spills onto a second row on common widths.

const ICONS = {
  umbrella: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v2"/><path d="M3 12a9 9 0 0118 0H3z"/><path d="M12 12v8a2 2 0 002 2"/></svg>',
  boots: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h4v10h4a4 4 0 014 4v4H4v-4a4 4 0 014-4V3z"/><path d="M12 13v4"/></svg>',
  jacket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l5-3 3 2 3-2 5 3-2 4v9H6v-9L4 7z"/><path d="M12 6v15"/></svg>',
  thermal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v6M9 5h6M4 20l4-4M20 20l-4-4M4 20h16M8 16a4 4 0 018 0"/></svg>',
  tee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l4-4h8l4 4-3 3-2-2v12H9V8L7 10 4 7z"/></svg>',
  windbreaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h11a3 3 0 100-6"/><path d="M3 14h15a3 3 0 100-6"/><path d="M3 20h9a3 3 0 100-6"/></svg>',
  sunglasses: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10h20"/><rect x="3" y="10" width="7" height="7" rx="2"/><rect x="14" y="10" width="7" height="7" rx="2"/><path d="M10 13h4"/></svg>',
  sunscreen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>',
  water: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z"/></svg>',
  mask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a3 3 0 013-3h10a3 3 0 013 3v3a5 5 0 01-5 5h-6a5 5 0 01-5-5v-3z"/><path d="M8 12h8M8 15h8"/></svg>',
  scarf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v4a6 6 0 11-12 0V4z"/><path d="M9 14v6M13 14v8"/></svg>',
};

export function buildPack(weather, { max = 5 } = {}) {
  if (!weather) return [];
  const items = [];
  const feels = weather.feelsLike ?? weather.temp ?? 15;
  const temp = weather.temp ?? feels;
  const wind = weather.windSpeed ?? 0;
  const gust = weather.windGusts ?? wind;
  const uv = weather.uv ?? 0;
  const cond = weather.condition;
  const isDay = weather.isDay !== false;
  const hourly = weather.hourly || [];
  const nowcast = weather.nowcast || [];

  // Rain in the next three hours (via nowcast first, then hourly).
  const soonRain = nowcast.find((n) => n.precip > 0.3 && n.time - Date.now() <= 3 * 3600_000)
    || hourly.slice(0, 3).find((h) => (h.pop ?? 0) >= 55 || (h.precip ?? 0) > 0.4);
  const anySnow = cond === "snow" || hourly.slice(0, 6).some((h) => h.condition === "snow");
  const snowHour = hourly.find((h) => h.condition === "snow");
  const uvPeak = weather.uvPeak?.value ?? uv;
  const uvPeakTs = weather.uvPeak?.time ?? null;
  const hottestHour = hourly.reduce((best, h) => (
    best == null || (h.temp ?? -Infinity) > (best.temp ?? -Infinity) ? h : best
  ), null);

  // ---- Umbrella / rain shell ----
  if (cond === "rain" || cond === "storm") {
    items.push(pill("umbrella", "Umbrella", "Rain is active — grab an umbrella."));
  } else if (soonRain) {
    const mins = Math.round((soonRain.time - Date.now()) / 60_000);
    const when = mins >= 60 ? `~${Math.round(mins / 60)}h` : `${Math.max(0, mins)}m`;
    items.push(pill("umbrella", "Umbrella", `Rain likely in ${when} — bring a shell.`, soonRain.time));
  }

  // ---- Boots (snow) ----
  if (anySnow) {
    items.push(pill("boots", "Boots", "Snow underfoot — grip and warmth.", snowHour?.time));
  }

  // ---- Layer by felt temperature ----
  if (feels <= -5) {
    items.push(pill("thermal", "Thermals", `Feels ${Math.round(feels)}° — layer up fully.`));
    items.push(pill("scarf", "Scarf & gloves", "Cover extremities — frostbite risk."));
  } else if (feels <= 2) {
    items.push(pill("thermal", "Heavy coat", `Feels ${Math.round(feels)}° — thick layers.`));
  } else if (feels <= 10) {
    items.push(pill("jacket", "Jacket", `Feels ${Math.round(feels)}° — proper jacket.`));
  } else if (feels <= 16) {
    items.push(pill("jacket", "Light jacket", `Feels ${Math.round(feels)}° — a light layer.`));
  } else if (feels >= 24 && cond !== "rain" && cond !== "storm") {
    items.push(pill("tee", "T-shirt", `Feels ${Math.round(feels)}° — light clothing.`));
  }

  // ---- Windbreaker when breezy but not already cold enough for a coat ----
  if (gust >= 40 && feels > 2 && !items.some((i) => i.key === "jacket" || i.key === "thermal")) {
    items.push(pill("windbreaker", "Windbreaker", `Gusts ~${Math.round(gust)} km/h — add a shell.`));
  }

  // ---- Sunscreen ----
  if (uvPeak >= 6 && (cond === "clear" || cond === "clouds")) {
    items.push(pill("sunscreen", "Sunscreen", `UV peaks at ${Math.round(uvPeak)} — SPF 30+.`, uvPeakTs));
  }

  // ---- Sunglasses: bright day without stormy sky. ----
  if (isDay && uv >= 3 && (cond === "clear" || cond === "clouds" || anySnow)) {
    items.push(pill("sunglasses", "Sunglasses", anySnow ? "Snow glare — eye protection." : "Bright sun — eye protection.", uvPeakTs));
  }

  // ---- Hydrate when it's hot. ----
  if ((temp >= 28 || feels >= 28)) {
    items.push(pill("water", "Water", `Feels ${Math.round(feels)}° — carry water.`, hottestHour?.time));
  }

  // ---- Mask: poor AQ or high pollen. ----
  const aqi = weather.airQuality?.aqi;
  const pollenLevel = weather.pollen?.level;
  const pollenHigh = pollenLevel === "High" || pollenLevel === "Very high";
  if ((aqi != null && aqi >= 150) || pollenHigh) {
    const reason = aqi != null && aqi >= 150
      ? `AQI ${Math.round(aqi)} — consider a mask.`
      : `${pollenLevel} pollen — mask may help.`;
    items.push(pill("mask", "Mask", reason));
  }

  // Dedupe by key, cap length.
  const seen = new Set();
  const unique = [];
  for (const it of items) {
    if (seen.has(it.key)) continue;
    seen.add(it.key);
    unique.push(it);
    if (unique.length >= max) break;
  }
  return unique;
}

function pill(key, label, title, ts) {
  return { key, label, title, icon: ICONS[key], ts: ts ?? null };
}

export const PACK_ICONS = ICONS;
