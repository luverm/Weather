// "Dress for it" — turn the sampled weather into a small set of
// at-a-glance recommendations: umbrella, layers, sun protection, wind, snow.
//
// Returns an array of { key, label, detail, level, icon }, where
// level ∈ { "no", "maybe", "yes", "essential" } drives the pill colour.
// Always returns at least the four core items (umbrella / layers / sun /
// wind) so the grid stays visually consistent across conditions.

const ICON = {
  umbrella: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0118 0H3z" fill="currentColor" fill-opacity="0.15"/><path d="M3 12a9 9 0 0118 0"/><path d="M12 3v9"/><path d="M12 18a2 2 0 002 2"/></svg>',
  jacket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7l3-3h6l3 3v13H6z" fill="currentColor" fill-opacity="0.12"/><path d="M6 7l3-3h6l3 3v13H6z"/><path d="M12 4v16"/><path d="M9 10l1 2M15 10l-1 2"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4" fill="currentColor" fill-opacity="0.18"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>',
  shades: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="7" height="6" rx="2" fill="currentColor" fill-opacity="0.18"/><rect x="14" y="9" width="7" height="6" rx="2" fill="currentColor" fill-opacity="0.18"/><path d="M10 12h4"/><path d="M3 10l-1-2M22 10l-1-2"/></svg>',
  wind: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h10a3 3 0 100-6"/><path d="M3 14h14a3 3 0 110 6"/><path d="M2 18h8"/></svg>',
  snow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M4 7l16 10M4 17L20 7"/><path d="M6 10l-2-1 1-2M18 14l2 1-1 2M16 6l2-1-1-2M8 18l-2 1 1 2"/></svg>',
  tshirt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4l-4 2 1 4 3-1v11h12V9l3 1 1-4-4-2-3 2h-6z" fill="currentColor" fill-opacity="0.12"/><path d="M8 4l-4 2 1 4 3-1v11h12V9l3 1 1-4-4-2-3 2h-6z"/></svg>',
};

const LEVEL_RANK = { no: 0, maybe: 1, yes: 2, essential: 3 };

function maxLevel(a, b) { return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b; }

// Max probability + total precipitation across the next N hours *following*
// the sampled time, so recommendations stay sensible when scrubbing.
function lookahead(weather, ts, hours = 6) {
  const list = weather?.hourly || [];
  if (!list.length) return { pop: 0, precip: 0, snow: false, hoursFound: 0 };
  const span = hours * 3600 * 1000;
  let pop = 0;
  let precip = 0;
  let snow = false;
  let found = 0;
  for (const h of list) {
    if (h.time < ts - 30 * 60_000) continue;
    if (h.time > ts + span) break;
    found++;
    if ((h.pop ?? 0) > pop) pop = h.pop;
    precip += h.precip ?? 0;
    if (h.condition === "snow") snow = true;
  }
  return { pop, precip, snow, hoursFound: found };
}

function umbrellaItem(sampled, look) {
  const pop = Math.max(sampled.condition === "rain" ? 90 : 0, look.pop || 0);
  const mm = look.precip || 0;
  const heavy = mm >= 4 || pop >= 85;
  if (heavy) {
    return {
      key: "umbrella", icon: ICON.umbrella, label: "Umbrella", level: "essential",
      detail: `${Math.round(pop)}% rain · ${mm.toFixed(1)} mm`,
    };
  }
  if (pop >= 55 || mm >= 1) {
    return {
      key: "umbrella", icon: ICON.umbrella, label: "Umbrella", level: "yes",
      detail: `${Math.round(pop)}% rain soon`,
    };
  }
  if (pop >= 25) {
    return {
      key: "umbrella", icon: ICON.umbrella, label: "Umbrella", level: "maybe",
      detail: `${Math.round(pop)}% chance`,
    };
  }
  return {
    key: "umbrella", icon: ICON.umbrella, label: "Umbrella", level: "no",
    detail: "Dry window",
  };
}

function layersItem(sampled) {
  const feels = sampled.feelsLike ?? sampled.temp;
  if (feels == null) {
    return { key: "layers", icon: ICON.jacket, label: "Layers", level: "maybe", detail: "—" };
  }
  const feelStr = `Feels ${Math.round(feels)}°`;
  if (feels < 0) return { key: "layers", icon: ICON.jacket, label: "Heavy coat", level: "essential", detail: `${feelStr} · bitter` };
  if (feels < 7) return { key: "layers", icon: ICON.jacket, label: "Warm coat", level: "yes", detail: `${feelStr} · cold` };
  if (feels < 13) return { key: "layers", icon: ICON.jacket, label: "Jacket", level: "yes", detail: `${feelStr} · cool` };
  if (feels < 18) return { key: "layers", icon: ICON.jacket, label: "Light layer", level: "maybe", detail: `${feelStr} · mild` };
  if (feels < 25) return { key: "layers", icon: ICON.tshirt, label: "T-shirt", level: "no", detail: `${feelStr} · comfortable` };
  if (feels < 30) return { key: "layers", icon: ICON.tshirt, label: "T-shirt", level: "no", detail: `${feelStr} · warm` };
  return { key: "layers", icon: ICON.tshirt, label: "Stay cool", level: "maybe", detail: `${feelStr} · hot` };
}

function sunItem(sampled) {
  const uv = sampled.uv;
  if (!sampled.isDay) {
    return { key: "sun", icon: ICON.shades, label: "Sun", level: "no", detail: "After dark" };
  }
  if (uv == null) return { key: "sun", icon: ICON.sun, label: "Sun", level: "maybe", detail: "UV —" };
  if (uv >= 8) return { key: "sun", icon: ICON.sun, label: "SPF + shades", level: "essential", detail: `UV ${Math.round(uv)} · very high` };
  if (uv >= 6) return { key: "sun", icon: ICON.sun, label: "SPF + shades", level: "yes", detail: `UV ${Math.round(uv)} · high` };
  if (uv >= 3) return { key: "sun", icon: ICON.shades, label: "Shades", level: "maybe", detail: `UV ${Math.round(uv)} · moderate` };
  return { key: "sun", icon: ICON.shades, label: "Shades", level: "no", detail: `UV ${Math.round(uv)} · low` };
}

function windItem(sampled) {
  const wind = sampled.windSpeed ?? 0;
  const gust = sampled.windGusts ?? wind;
  const base = Math.max(wind, gust * 0.9);
  const label = `${Math.round(wind)} km/h${gust > wind + 3 ? ` · gust ${Math.round(gust)}` : ""}`;
  if (base >= 55) return { key: "wind", icon: ICON.wind, label: "Shelter", level: "essential", detail: label };
  if (base >= 38) return { key: "wind", icon: ICON.wind, label: "Windbreaker", level: "yes", detail: label };
  if (base >= 22) return { key: "wind", icon: ICON.wind, label: "Breezy", level: "maybe", detail: label };
  return { key: "wind", icon: ICON.wind, label: "Still air", level: "no", detail: label };
}

function snowItem(sampled, look) {
  if (sampled.condition !== "snow" && !look.snow) return null;
  const feels = sampled.feelsLike ?? sampled.temp ?? 0;
  const level = feels <= -5 ? "essential" : "yes";
  return {
    key: "snow", icon: ICON.snow, label: "Boots + gloves", level,
    detail: feels <= -5 ? "Deep cold" : "Snow in forecast",
  };
}

// A short one-line headline that sums the recommendations up.
function headlineFor(items) {
  const umbrella = items.find((i) => i.key === "umbrella");
  const layers = items.find((i) => i.key === "layers");
  const sun = items.find((i) => i.key === "sun");
  const parts = [];
  if (layers && LEVEL_RANK[layers.level] >= 2) parts.push(layers.label.toLowerCase());
  if (umbrella && LEVEL_RANK[umbrella.level] >= 2) parts.push("umbrella");
  if (sun && LEVEL_RANK[sun.level] >= 2 && sun.key === "sun") parts.push("SPF");
  if (!parts.length) {
    if (umbrella && LEVEL_RANK[umbrella.level] === 1) return "Could grab an umbrella.";
    if (sun && LEVEL_RANK[sun.level] === 1) return "Nothing urgent — maybe shades.";
    if (layers && layers.key === "layers" && layers.label === "T-shirt") return "Easy going — a tee is plenty.";
    return "Nothing special needed.";
  }
  if (parts.length === 1) return `Grab ${parts[0]}.`;
  if (parts.length === 2) return `Grab ${parts[0]} and ${parts[1]}.`;
  return `Grab ${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}.`;
}

export function dressFor(sampled) {
  if (!sampled) return null;
  const ts = sampled._sampledTs ?? Date.now();
  const look = lookahead(sampled, ts, 6);
  const items = [
    umbrellaItem(sampled, look),
    layersItem(sampled),
    sunItem(sampled),
    windItem(sampled),
  ];
  const snow = snowItem(sampled, look);
  if (snow) items.push(snow);
  // Highest-urgency item leads so the UI can draw the eye to it.
  const topLevel = items.reduce((top, it) => maxLevel(top, it.level), "no");
  return { items, headline: headlineFor(items), topLevel };
}
