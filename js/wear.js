// Suggest a small set of "what to wear / bring" pictograms based on the next
// ~6 hours of forecast. Returns { headline, tagline, items: [{key, label, icon}] }
// or null if we don't have enough data.

const ICONS = {
  tee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M8 4l-4 3 2 3 2-1v9h8v-9l2 1 2-3-4-3-2 2h-4z"/></svg>',
  longSleeve: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M9 4l-5 4 2 4 2-1v8h8v-8l2 1 2-4-5-4-2 2h-4zM6 11v6M18 11v6"/></svg>',
  jacket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M7 4l-3 3 1 4 2 0v9h10v-9l2 0 1-4-3-3-3 1h-4zM12 5v14"/></svg>',
  coat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M7 4l-4 3 1 5h2v9h12v-9h2l1-5-4-3-3 1h-4zM12 5v15M9 14h.01M15 14h.01"/></svg>',
  umbrella: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M3 12a9 9 0 0118 0H3z"/><path d="M12 3v0M12 12v7a2 2 0 003.5 1.3"/></svg>',
  sunglasses: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><circle cx="6.5" cy="13" r="3.5"/><circle cx="17.5" cy="13" r="3.5"/><path d="M10 13h4M3 9l3 1M21 9l-3 1"/></svg>',
  beanie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M5 15a7 7 0 0114 0v2H5z"/><path d="M3 17h18M12 4v3"/></svg>',
  scarf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M7 5a5 5 0 0110 0v3H7zM7 8v3l-2 9h4l1-7M17 8v3l2 9h-4l-1-7"/></svg>',
  boots: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M8 4h4v10l5 3v3H6v-3l2-1V4z"/><path d="M8 12h4"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M12 4l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5M3 17l9 5 9-5"/></svg>',
  shorts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M6 4h12v6l-1 8h-4l-1-6-1 6H7l-1-8z"/></svg>',
  windbreaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M7 4l-3 4 2 3 2-1v9h8v-9l2 1 2-3-3-4-3 2h-4z"/><path d="M3 7l-1 2M3 12l-1 2M21 7l1 2M21 12l1 2"/></svg>',
};

function nextHours(weather, hrs = 6) {
  const now = Date.now();
  return (weather?.hourly || [])
    .filter((h) => h.time >= now - 30 * 60_000)
    .slice(0, hrs);
}

function pickBaseLayer(feelsAvg, feelsMin) {
  // Use the colder of the two so people aren't underdressed.
  const t = Math.min(feelsAvg, feelsMin ?? feelsAvg);
  if (t == null || isNaN(t)) return null;
  if (t >= 24) return { key: "tee", label: "T-shirt", icon: ICONS.tee, tier: "warm" };
  if (t >= 18) return { key: "tee", label: "Light tee", icon: ICONS.tee, tier: "mild" };
  if (t >= 12) return { key: "longSleeve", label: "Long sleeves", icon: ICONS.longSleeve, tier: "cool" };
  if (t >= 4) return { key: "jacket", label: "Jacket", icon: ICONS.jacket, tier: "cold" };
  return { key: "coat", label: "Heavy coat", icon: ICONS.coat, tier: "freezing" };
}

function makeHeadline(base, swing, anyRain, anySnow) {
  if (anySnow) return "Bundle up";
  if (anyRain && base?.tier === "warm") return "Stay dry";
  if (anyRain) return "Stay dry & warm";
  if (swing >= 8) return "Layer up";
  if (!base) return "Pick your fit";
  return {
    warm: "Dress light",
    mild: "Easy outfit",
    cool: "A light layer",
    cold: "Wrap up",
    freezing: "Bundle up",
  }[base.tier] || "Pick your fit";
}

function summarizeTagline(feelsAvg, maxPop, maxUv, maxWind, anySnow) {
  const parts = [];
  if (feelsAvg != null && !isNaN(feelsAvg)) parts.push(`feels ~${Math.round(feelsAvg)}°`);
  if (anySnow) parts.push("snow possible");
  else if (maxPop >= 50) parts.push(`${Math.round(maxPop)}% rain chance`);
  if (maxUv >= 8) parts.push(`UV ${Math.round(maxUv)}`);
  if (maxWind >= 35) parts.push(`gusty ${Math.round(maxWind)} km/h`);
  return parts.slice(0, 3).join(" · ");
}

export function buildWear(weather) {
  if (!weather) return null;
  const slice = nextHours(weather, 6);
  if (slice.length < 2) return null;

  const feelsArr = slice.map((h) => h.feelsLike ?? h.temp).filter((v) => v != null);
  if (!feelsArr.length) return null;
  const feelsAvg = feelsArr.reduce((a, b) => a + b, 0) / feelsArr.length;
  const feelsMin = Math.min(...feelsArr);
  const feelsMax = Math.max(...feelsArr);
  const swing = feelsMax - feelsMin;

  const maxPop = Math.max(0, ...slice.map((h) => h.pop ?? 0));
  const maxPrecip = Math.max(0, ...slice.map((h) => h.precip ?? 0));
  const maxUv = Math.max(0, ...slice.map((h) => h.uv ?? 0));
  const maxWind = Math.max(0, ...slice.map((h) => h.gusts ?? h.wind ?? 0));
  const anySnow = slice.some((h) => h.condition === "snow");
  const anyRain = !anySnow && (maxPop >= 45 || maxPrecip >= 0.4);
  const anyClearDay = slice.some((h) => h.isDay && h.condition === "clear");
  const minTemp = Math.min(...slice.map((h) => h.temp ?? feelsAvg));

  const items = [];
  const base = pickBaseLayer(feelsAvg, feelsMin);
  if (base) items.push(base);

  // Layer up if there's a meaningful swing or transition between cool and cold.
  if (swing >= 8 && base && base.tier !== "freezing") {
    items.push({ key: "layers", label: "Layer up", icon: ICONS.layers });
  }

  // Wet-weather pickups.
  if (anySnow) {
    if (!items.some((i) => i.key === "boots")) items.push({ key: "boots", label: "Waterproof boots", icon: ICONS.boots });
  } else if (anyRain) {
    items.push({ key: "umbrella", label: "Umbrella", icon: ICONS.umbrella });
  }

  // Wind: stiff breeze suggestion when not already in coat/snow gear.
  if (maxWind >= 35 && !anySnow && base?.tier !== "freezing" && base?.tier !== "cold") {
    items.push({ key: "windbreaker", label: "Windbreaker", icon: ICONS.windbreaker });
  }

  // Sun: high UV or clear daytime hours.
  if (maxUv >= 6 || (anyClearDay && feelsAvg >= 16)) {
    items.push({ key: "sunglasses", label: "Sunglasses", icon: ICONS.sunglasses });
  }

  // Cold extras: prefer beanie when it's actually freezing or snowing.
  if (minTemp != null && (minTemp <= 2 || anySnow)) {
    items.push({ key: "beanie", label: "Beanie & scarf", icon: ICONS.beanie });
  } else if (minTemp != null && minTemp <= 7 && (maxWind >= 25 || swing >= 6)) {
    items.push({ key: "scarf", label: "Scarf", icon: ICONS.scarf });
  }

  // Hot weather shorts hint.
  if (feelsMin >= 24 && !anyRain) {
    items.push({ key: "shorts", label: "Shorts weather", icon: ICONS.shorts });
  }

  // Dedupe and cap to 4 picks (base + 3 extras at most).
  const seen = new Set();
  const deduped = items.filter((i) => (seen.has(i.key) ? false : (seen.add(i.key), true))).slice(0, 4);

  return {
    headline: makeHeadline(base, swing, anyRain, anySnow),
    tagline: summarizeTagline(feelsAvg, maxPop, maxUv, maxWind, anySnow),
    items: deduped,
    feelsRange: { min: feelsMin, max: feelsMax, avg: feelsAvg },
  };
}
