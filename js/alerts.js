// Derive client-side weather alerts from the existing forecast payload.
// Open-Meteo doesn't ship official alert text on the free tier, so we infer
// a small set of advisories from hourly / daily / nowcast data. Each alert
// gets a stable id so the UI can remember dismissals across re-renders.
//
// Alert shape:
//   { id, severity: "advisory"|"warning"|"severe",
//     title, body, icon, ts? }

const ICONS = {
  storm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13a4 4 0 010-8 5 5 0 019.9-1A4 4 0 0117 13H7z"/><path d="M12 13l-2 4h3l-2 4"/></svg>',
  rain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14a4 4 0 010-8 5 5 0 019.9-1A4 4 0 0117 14H7z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/></svg>',
  snow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14a4 4 0 010-8 5 5 0 019.9-1A4 4 0 0117 14H7z"/><path d="M9 18v3M12 17v4M15 18v3"/></svg>',
  wind: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h12a3 3 0 100-6M3 14h16a3 3 0 100-6M3 20h9a3 3 0 100-6"/></svg>',
  heat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v9M9 5l3-3 3 3"/><circle cx="12" cy="17" r="4"/></svg>',
  cold: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M4 6l16 12M20 6L4 18M2 12h20"/></svg>',
  uv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>',
  air: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h11a3 3 0 100-6M3 14h15a3 3 0 100-6M3 20h8a3 3 0 100-6"/><circle cx="20" cy="20" r="1.4" fill="currentColor"/></svg>',
  fog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16M4 14h12M6 18h14"/></svg>',
};

const HOUR = 3600_000;

export function buildAlerts(weather, { fmtTime, formatTemp } = {}) {
  if (!weather) return [];
  const fmt = fmtTime || ((t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  // Default temperature formatter assumes Celsius input.
  const fmtT = formatTemp || ((c) => `${Math.round(c)}°C`);
  const now = Date.now();
  const hours = (weather.hourly || []).filter((h) => h.time >= now - HOUR);
  const next12 = hours.filter((h) => h.time <= now + 12 * HOUR);
  const next24 = hours.filter((h) => h.time <= now + 24 * HOUR);
  const nowcast = (weather.nowcast || []).filter((n) => n.time > now);
  const today = weather.daily?.[0];

  const out = [];

  // ---- Thunderstorm in the next 12h.
  const storm = next12.find((h) => h.condition === "storm");
  if (storm) {
    out.push({
      id: `storm:${dayKey(storm.time)}`,
      severity: "severe",
      icon: ICONS.storm,
      title: "Thunderstorm possible",
      body: `Storm activity around ${fmt(storm.time)}. Stay weather-aware.`,
      ts: storm.time,
    });
  }

  // ---- Heavy precipitation in the next ~2h (nowcast totals).
  const totalMm = nowcast.reduce((s, n) => s + (n.precip || 0), 0);
  if (totalMm >= 5 && !storm) {
    const heavy = totalMm >= 10;
    const first = nowcast.find((n) => n.precip > 0.4) || nowcast[0];
    const kind = first && first.code >= 71 && first.code <= 86 ? "snow" : "rain";
    out.push({
      id: `precip:${kind}:${Math.round(totalMm)}:${first ? Math.round(first.time / HOUR) : 0}`,
      severity: heavy ? "warning" : "advisory",
      icon: kind === "snow" ? ICONS.snow : ICONS.rain,
      title: heavy ? `Heavy ${kind} incoming` : `${cap(kind)} incoming`,
      body: `${totalMm.toFixed(1)} mm expected in the next 2 hours${first ? ` · starts near ${fmt(first.time)}` : ""}.`,
      ts: first?.time,
    });
  }

  // ---- Snowfall (next 12h beyond nowcast horizon).
  const snowHours = next12.filter((h) => h.condition === "snow" && (h.precip ?? 0) > 0.3);
  const snowMm = snowHours.reduce((s, h) => s + (h.precip || 0), 0);
  if (snowMm >= 4 && !storm && totalMm < 5) {
    out.push({
      id: `snow:${dayKey(snowHours[0].time)}:${Math.round(snowMm)}`,
      severity: snowMm >= 10 ? "warning" : "advisory",
      icon: ICONS.snow,
      title: snowMm >= 10 ? "Heavy snowfall ahead" : "Snow expected",
      body: `~${snowMm.toFixed(0)} mm of snow over the next 12 hours, starting near ${fmt(snowHours[0].time)}.`,
      ts: snowHours[0].time,
    });
  }

  // ---- High wind / damaging gusts.
  let peakGust = null;
  for (const h of next24) {
    const g = h.gusts ?? h.wind ?? 0;
    if (!peakGust || g > peakGust.v) peakGust = { v: g, ts: h.time };
  }
  if (peakGust && peakGust.v >= 60) {
    const sev = peakGust.v >= 80 ? "severe" : "warning";
    out.push({
      id: `wind:${dayKey(peakGust.ts)}:${Math.round(peakGust.v)}`,
      severity: sev,
      icon: ICONS.wind,
      title: peakGust.v >= 80 ? "Damaging wind gusts" : "High wind warning",
      body: `Gusts up to ${Math.round(peakGust.v)} km/h near ${fmt(peakGust.ts)}. Secure loose items outside.`,
      ts: peakGust.ts,
    });
  } else if (peakGust && peakGust.v >= 45) {
    out.push({
      id: `wind:adv:${dayKey(peakGust.ts)}:${Math.round(peakGust.v)}`,
      severity: "advisory",
      icon: ICONS.wind,
      title: "Breezy conditions",
      body: `Gusts approaching ${Math.round(peakGust.v)} km/h around ${fmt(peakGust.ts)}.`,
      ts: peakGust.ts,
    });
  }

  // ---- Heat advisory (uses Celsius internally; UI re-formats elsewhere).
  let hotPeak = null;
  for (const h of next24) {
    if (hotPeak == null || h.temp > hotPeak.t) hotPeak = { t: h.temp, ts: h.time };
  }
  if (hotPeak && hotPeak.t >= 32) {
    const sev = hotPeak.t >= 38 ? "severe" : "warning";
    out.push({
      id: `heat:${dayKey(hotPeak.ts)}:${Math.round(hotPeak.t)}`,
      severity: sev,
      icon: ICONS.heat,
      title: hotPeak.t >= 38 ? "Extreme heat" : "Heat advisory",
      body: `Highs near ${fmtT(hotPeak.t)} around ${fmt(hotPeak.ts)}. Hydrate and limit midday activity.`,
      ts: hotPeak.ts,
    });
  }

  // ---- Hard freeze / extreme cold.
  let coldPeak = null;
  for (const h of next24) {
    if (coldPeak == null || h.temp < coldPeak.t) coldPeak = { t: h.temp, ts: h.time };
  }
  if (coldPeak && coldPeak.t <= -10) {
    const sev = coldPeak.t <= -20 ? "severe" : "warning";
    out.push({
      id: `cold:${dayKey(coldPeak.ts)}:${Math.round(coldPeak.t)}`,
      severity: sev,
      icon: ICONS.cold,
      title: coldPeak.t <= -20 ? "Extreme cold" : "Hard freeze",
      body: `Down to ${fmtT(coldPeak.t)} near ${fmt(coldPeak.ts)}. Protect pipes and dress in layers.`,
      ts: coldPeak.ts,
    });
  }

  // ---- High UV (only when sun is actually up).
  if (weather.uvPeak?.value >= 8 && weather.uvPeak.time > now - 2 * HOUR && weather.uvPeak.time < now + 12 * HOUR) {
    const sev = weather.uvPeak.value >= 11 ? "warning" : "advisory";
    out.push({
      id: `uv:${dayKey(weather.uvPeak.time)}:${Math.round(weather.uvPeak.value)}`,
      severity: sev,
      icon: ICONS.uv,
      title: weather.uvPeak.value >= 11 ? "Extreme UV" : "Strong UV",
      body: `UV peaks at ${Math.round(weather.uvPeak.value)} around ${fmt(weather.uvPeak.time)}. SPF and shade.`,
      ts: weather.uvPeak.time,
    });
  }

  // ---- Air quality.
  const aqi = weather.airQuality?.aqi;
  if (aqi != null && aqi >= 100) {
    const sev = aqi >= 200 ? "severe" : aqi >= 150 ? "warning" : "advisory";
    out.push({
      id: `aq:${Math.round(aqi)}`,
      severity: sev,
      icon: ICONS.air,
      title:
        aqi >= 200 ? "Very unhealthy air" :
        aqi >= 150 ? "Unhealthy air" :
        "Air quality advisory",
      body: `AQI ${Math.round(aqi)} (${weather.airQuality.label}). Sensitive groups should limit outdoor exertion.`,
    });
  }

  // ---- Dense fog (visibility < 1 km right now).
  if (weather.visibility != null && weather.visibility < 1000) {
    out.push({
      id: `fog:now`,
      severity: "advisory",
      icon: ICONS.fog,
      title: "Dense fog",
      body: `Visibility ${(weather.visibility / 1000).toFixed(1)} km. Drive with low-beams and slow speeds.`,
    });
  }

  // Sort by severity (severe > warning > advisory), keep at most 4.
  const rank = { severe: 0, warning: 1, advisory: 2 };
  out.sort((a, b) => rank[a.severity] - rank[b.severity]);
  return out.slice(0, 4);
}

function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
