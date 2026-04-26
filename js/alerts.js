// Derive lightweight severe-weather alerts from the data we already fetch.
// Open-Meteo's free tier doesn't expose government-issued NWS/Met-Office
// warnings, so we synthesize sensible thresholds (heat, freeze, gale, heavy
// rain, severe storm risk, dangerous UV, very low visibility).
//
// Each alert: { id, severity: "watch"|"warning"|"severe", title, detail, ts? }
// `ts` lets the user click an alert to scrub to the moment it peaks.

const ICONS = {
  wind:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h12a3 3 0 100-6M3 14h16a3 3 0 100-6M3 20h9a3 3 0 100-6"/></svg>',
  heat:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a4 4 0 014 4v6a4 4 0 11-8 0V7a4 4 0 014-4z"/><path d="M12 14v6"/></svg>',
  cold:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M4 6l16 12M20 6L4 18M2 12h20"/></svg>',
  rain:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14a4 4 0 010-8 5 5 0 019.9-1A4 4 0 0117 14H7z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/></svg>',
  storm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13a4 4 0 010-8 5 5 0 019.9-1A4 4 0 0117 13H7z"/><path d="M12 13l-2 4h3l-2 4"/></svg>',
  uv:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>',
  fog:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16M4 13h12M6 17h14"/></svg>',
  air:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h12a3 3 0 100-6M3 15h16a3 3 0 100-6"/><circle cx="6" cy="20" r="2"/></svg>',
};

export function buildAlerts(weather) {
  if (!weather) return [];
  const out = [];
  const hours = (weather.hourly || []).filter((h) => h.time >= Date.now() - 30 * 60_000);
  const next24 = hours.slice(0, 24);
  const days = weather.daily || [];

  // ----- Wind / gust -----
  let peakGust = null;
  for (const h of next24) {
    const g = h.gusts ?? h.wind ?? 0;
    if (!peakGust || g > peakGust.v) peakGust = { v: g, ts: h.time };
  }
  if (peakGust) {
    if (peakGust.v >= 90) {
      out.push(make("storm-wind", "severe", ICONS.wind, "Storm-force wind",
        `Gusts up to ${Math.round(peakGust.v)} km/h expected — secure outdoor items.`,
        peakGust.ts));
    } else if (peakGust.v >= 65) {
      out.push(make("gale", "warning", ICONS.wind, "Gale warning",
        `Gusts up to ${Math.round(peakGust.v)} km/h in the next 24 h.`,
        peakGust.ts));
    } else if (peakGust.v >= 45) {
      out.push(make("windy", "watch", ICONS.wind, "Windy hours ahead",
        `Gusts up to ${Math.round(peakGust.v)} km/h — loose items may rattle.`,
        peakGust.ts));
    }
  }

  // ----- Heat -----
  // Use the hottest "feels-like" we'll see in the next 24 h.
  let peakHeat = null;
  for (const h of next24) {
    const t = h.feelsLike ?? h.temp;
    if (t == null) continue;
    if (!peakHeat || t > peakHeat.v) peakHeat = { v: t, ts: h.time };
  }
  if (peakHeat) {
    if (peakHeat.v >= 40) {
      out.push(make("extreme-heat", "severe", ICONS.heat, "Extreme heat",
        `Feels-like reaches ${Math.round(peakHeat.v)}° — stay indoors during peak hours.`,
        peakHeat.ts));
    } else if (peakHeat.v >= 35) {
      out.push(make("heat", "warning", ICONS.heat, "Heat advisory",
        `Feels-like ${Math.round(peakHeat.v)}° — hydrate and limit outdoor effort.`,
        peakHeat.ts));
    }
  }

  // ----- Freeze / cold -----
  let coldest = null;
  for (const h of next24) {
    const t = h.feelsLike ?? h.temp;
    if (t == null) continue;
    if (!coldest || t < coldest.v) coldest = { v: t, ts: h.time };
  }
  if (coldest) {
    if (coldest.v <= -20) {
      out.push(make("extreme-cold", "severe", ICONS.cold, "Extreme cold",
        `Feels-like drops to ${Math.round(coldest.v)}° — risk of frostbite.`,
        coldest.ts));
    } else if (coldest.v <= -10) {
      out.push(make("hard-freeze", "warning", ICONS.cold, "Hard freeze",
        `Feels-like ${Math.round(coldest.v)}° expected — bundle up.`,
        coldest.ts));
    } else if (coldest.v <= 0 && (weather.temp ?? coldest.v) > 2) {
      // Frost forming overnight after a mild day.
      out.push(make("frost", "watch", ICONS.cold, "Frost overnight",
        `Cooling to ${Math.round(coldest.v)}° — protect tender plants.`,
        coldest.ts));
    }
  }

  // ----- Heavy rain (24h sum) -----
  let total24 = 0, peakHourPrecip = null;
  for (const h of next24) {
    total24 += h.precip ?? 0;
    if (!peakHourPrecip || (h.precip ?? 0) > peakHourPrecip.v) {
      peakHourPrecip = { v: h.precip ?? 0, ts: h.time };
    }
  }
  if (total24 >= 50) {
    out.push(make("heavy-rain", "severe", ICONS.rain, "Heavy rainfall",
      `${total24.toFixed(0)} mm forecast in 24 h — flooding risk.`,
      peakHourPrecip?.ts));
  } else if (total24 >= 20 && peakHourPrecip && peakHourPrecip.v >= 4) {
    out.push(make("rainy", "warning", ICONS.rain, "Wet day ahead",
      `${total24.toFixed(0)} mm over 24 h, peak ${peakHourPrecip.v.toFixed(1)} mm/h.`,
      peakHourPrecip.ts));
  }

  // ----- Thunderstorm risk in next 24 h -----
  const stormHour = next24.find((h) => h.condition === "storm");
  if (stormHour) {
    out.push(make("storm", "warning", ICONS.storm, "Thunderstorm risk",
      `Storm conditions expected ${relTime(stormHour.time)} — seek shelter if outside.`,
      stormHour.time));
  }

  // ----- Dangerous UV -----
  if (weather.uvPeak?.value >= 11) {
    out.push(make("uv-extreme", "warning", ICONS.uv, "Extreme UV",
      `UV index peaks at ${Math.round(weather.uvPeak.value)} — cover up, even briefly.`,
      weather.uvPeak.time));
  } else if (weather.uvPeak?.value >= 8 && peakHeat && peakHeat.v >= 22) {
    out.push(make("uv-high", "watch", ICONS.uv, "High UV",
      `UV peaks at ${Math.round(weather.uvPeak.value)} — sunscreen recommended.`,
      weather.uvPeak.time));
  }

  // ----- Low visibility / fog -----
  const foggyHour = next24.find((h) => h.condition === "fog");
  if (foggyHour) {
    out.push(make("fog", "watch", ICONS.fog, "Reduced visibility",
      `Fog expected ${relTime(foggyHour.time)} — drive with caution.`,
      foggyHour.time));
  } else if (weather.visibility != null && weather.visibility < 1000) {
    out.push(make("fog-now", "watch", ICONS.fog, "Low visibility now",
      `Visibility ${(weather.visibility / 1000).toFixed(1)} km — drive with caution.`));
  }

  // ----- Hazardous air -----
  const aqi = weather.airQuality?.aqi;
  if (aqi != null) {
    if (aqi >= 200) {
      out.push(make("air-bad", "severe", ICONS.air, "Hazardous air",
        `AQI ${Math.round(aqi)} — limit outdoor activity, mask up.`));
    } else if (aqi >= 150) {
      out.push(make("air-unhealthy", "warning", ICONS.air, "Unhealthy air",
        `AQI ${Math.round(aqi)} — sensitive groups should stay indoors.`));
    }
  }

  // De-duplicate by id (keep highest severity if collision).
  const ranks = { severe: 3, warning: 2, watch: 1 };
  const map = new Map();
  for (const a of out) {
    const prev = map.get(a.id);
    if (!prev || ranks[a.severity] > ranks[prev.severity]) map.set(a.id, a);
  }
  // Sort by severity desc.
  return [...map.values()].sort((a, b) => ranks[b.severity] - ranks[a.severity]);
}

function make(id, severity, icon, title, detail, ts) {
  return { id, severity, icon, title, detail, ts };
}

function relTime(ts) {
  const mins = Math.round((ts - Date.now()) / 60_000);
  if (mins < 0) return "now";
  if (mins < 60) return `in ${mins} min`;
  const hrs = Math.round(mins / 60);
  return `in ${hrs} h`;
}
