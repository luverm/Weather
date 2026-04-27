// Derive higher-level outlook signals from a normalized weather object:
//   - findBestWindow(weather): best contiguous outdoor stretch in next 24h.
//   - findAlerts(weather): notable severe-condition warnings ranked by severity.
//
// Pure functions — no DOM, no side effects. The UI layer renders the result.

const HOUR_MS = 3600_000;

// --- Best outdoor window ---------------------------------------------------
// Scores each hour 0..1 and slides a window to find the highest mean.
// Longer stretches are slightly preferred, capped at 4h so the result stays
// actionable rather than vague.
const WINDOW_SIZES = [4, 3, 2];

function comfortScoreCelsius(t) {
  if (t == null) return 0.5;
  // Bell-ish curve peaking at 21°C, useful from roughly 8°C to 28°C.
  const peak = 21;
  const sigma = 7;
  const z = (t - peak) / sigma;
  return Math.max(0, Math.min(1, Math.exp(-(z * z) / 2)));
}

function precipScore(pop, precip) {
  // pop is 0..100, precip is mm/h. Either pushes the score down quickly.
  const popPenalty = Math.min(1, (pop ?? 0) / 80);
  const mmPenalty = Math.min(1, (precip ?? 0) / 2);
  return 1 - Math.max(popPenalty, mmPenalty);
}

function windScore(wind, gusts) {
  const w = Math.max(wind ?? 0, (gusts ?? 0) * 0.7);
  // Comfortable up to ~15 km/h, painful above ~45.
  if (w <= 12) return 1;
  if (w >= 50) return 0;
  return 1 - (w - 12) / 38;
}

function uvScore(uv) {
  if (uv == null) return 0.85;
  if (uv <= 5) return 1;
  if (uv >= 11) return 0.25;
  return 1 - (uv - 5) / 12;
}

function dayScore(isDay) {
  // Daylight matters but doesn't disqualify night entirely (e.g., evening walks).
  return isDay ? 1 : 0.55;
}

function scoreHour(h) {
  if (!h) return 0;
  const c = comfortScoreCelsius(h.feelsLike ?? h.temp);
  const p = precipScore(h.pop, h.precip);
  const w = windScore(h.wind, h.gusts);
  const u = uvScore(h.uv);
  const d = dayScore(h.isDay);
  // Precipitation is a hard multiplier so a soaked hour can't be saved by other factors.
  const blended = c * 0.35 + w * 0.25 + u * 0.15 + d * 0.25;
  return blended * p;
}

// Build a one-line reason explaining why a window is good or what's worth noting.
function reasonFor(hours) {
  if (!hours.length) return "";
  const avgTemp = avg(hours.map((h) => h.feelsLike ?? h.temp));
  const maxPop = Math.max(...hours.map((h) => h.pop ?? 0));
  const maxWind = Math.max(...hours.map((h) => Math.max(h.wind ?? 0, (h.gusts ?? 0) * 0.7)));
  const peakUv = Math.max(...hours.map((h) => h.uv ?? 0));
  const allDay = hours.every((h) => h.isDay);

  if (maxPop < 15 && avgTemp >= 16 && avgTemp <= 26 && maxWind < 20 && allDay) {
    return "Calm, dry, comfortable.";
  }
  if (maxPop < 25 && allDay && peakUv >= 6) return "Sunny — wear sunscreen.";
  if (maxPop < 25 && !allDay) return "Dry evening, mild conditions.";
  if (maxPop < 35) return "Mostly dry across the window.";
  if (maxWind >= 30) return "Best stretch, but breezy — secure loose items.";
  if (avgTemp <= 8) return "Driest stretch — bundle up.";
  return "Driest, mildest stretch ahead.";
}

function avg(xs) {
  const f = xs.filter((x) => x != null);
  return f.length ? f.reduce((a, b) => a + b, 0) / f.length : null;
}

export function findBestWindow(weather) {
  const hours = (weather?.hourly || []).filter((h) => h.time >= Date.now() - 30 * 60_000);
  if (hours.length < 3) return null;
  // Limit search to ~next 18 hours for relevance.
  const horizon = Math.min(hours.length, 18);
  const candidates = hours.slice(0, horizon);

  let best = null;
  for (const size of WINDOW_SIZES) {
    if (candidates.length < size) continue;
    for (let i = 0; i + size <= candidates.length; i++) {
      const slice = candidates.slice(i, i + size);
      const mean = slice.reduce((s, h) => s + scoreHour(h), 0) / size;
      // Mild bonus for longer windows so 3h beats 2h on a tie.
      const score = mean + (size === 4 ? 0.02 : size === 3 ? 0.01 : 0);
      if (!best || score > best.score) best = { score, slice, size };
    }
  }
  if (!best || best.score < 0.45) return null; // nothing genuinely good
  const slice = best.slice;
  return {
    start: slice[0].time,
    end: slice[slice.length - 1].time + HOUR_MS,
    score: best.score,
    hours: slice,
    reason: reasonFor(slice),
  };
}

// --- Severe / notable alerts -----------------------------------------------
// Returns a ranked list. Each entry: { severity, kind, title, detail, ts }
// severity: "watch" | "advisory" | "warning"

const SEVERITY_RANK = { warning: 3, advisory: 2, watch: 1 };

export function findAlerts(weather) {
  if (!weather) return [];
  const out = [];
  const hours = weather.hourly || [];
  const now = Date.now();
  const next6 = hours.filter((h) => h.time >= now - 30 * 60_000 && h.time <= now + 6 * HOUR_MS);
  const next12 = hours.filter((h) => h.time >= now - 30 * 60_000 && h.time <= now + 12 * HOUR_MS);

  // Thunderstorms imminent.
  const stormHour = next6.find((h) => h.condition === "storm");
  if (stormHour) {
    const mins = Math.max(0, Math.round((stormHour.time - now) / 60_000));
    out.push({
      severity: "warning", kind: "storm",
      title: mins < 60 ? "Thunderstorm imminent" : "Thunderstorm developing",
      detail: mins < 60 ? `Within the hour · ${stormHour.label || "storm"}` : `In ~${Math.round(mins / 60)}h`,
      ts: stormHour.time,
    });
  }

  // Wind gust warnings.
  let peakGust = null;
  for (const h of next12) {
    const g = h.gusts ?? 0;
    if (!peakGust || g > peakGust.v) peakGust = { v: g, ts: h.time };
  }
  if (peakGust && peakGust.v >= 75) {
    out.push({
      severity: "warning", kind: "wind",
      title: "Damaging wind gusts",
      detail: `Up to ${Math.round(peakGust.v)} km/h`,
      ts: peakGust.ts,
    });
  } else if (peakGust && peakGust.v >= 55) {
    out.push({
      severity: "advisory", kind: "wind",
      title: "Strong gusts ahead",
      detail: `Gusts to ${Math.round(peakGust.v)} km/h`,
      ts: peakGust.ts,
    });
  }

  // Heavy rain (mm in any hour).
  let wetHour = null;
  for (const h of next12) {
    if ((h.precip ?? 0) >= (wetHour?.v ?? 0)) wetHour = { v: h.precip ?? 0, ts: h.time };
  }
  if (wetHour && wetHour.v >= 8) {
    out.push({
      severity: wetHour.v >= 15 ? "warning" : "advisory", kind: "rain",
      title: wetHour.v >= 15 ? "Heavy rainfall" : "Significant rainfall",
      detail: `${wetHour.v.toFixed(1)} mm/h expected`,
      ts: wetHour.ts,
    });
  }

  // Heat / cold extremes (use feels-like, current).
  const feels = weather.feelsLike ?? weather.temp;
  if (feels != null) {
    if (feels >= 35) out.push({
      severity: "warning", kind: "heat",
      title: "Extreme heat", detail: `Feels like ${Math.round(feels)}° — limit exertion`,
    });
    else if (feels >= 30) out.push({
      severity: "advisory", kind: "heat",
      title: "Heat advisory", detail: `Feels like ${Math.round(feels)}° — hydrate`,
    });
    else if (feels <= -15) out.push({
      severity: "warning", kind: "cold",
      title: "Severe cold", detail: `Feels like ${Math.round(feels)}° — frostbite risk`,
    });
    else if (feels <= -5) out.push({
      severity: "advisory", kind: "cold",
      title: "Sharp cold", detail: `Feels like ${Math.round(feels)}° — dress warmly`,
    });
  }

  // Extreme UV — only worth flagging once it lands in the visible window.
  if (weather.uvPeak?.value >= 11 && weather.uvPeak.time > now - HOUR_MS) {
    out.push({
      severity: "advisory", kind: "uv",
      title: "Extreme UV", detail: `Peak ${Math.round(weather.uvPeak.value)} — cover up`,
      ts: weather.uvPeak.time,
    });
  }

  // Air quality.
  const aqi = weather.airQuality?.aqi;
  if (aqi != null && aqi >= 151) {
    out.push({
      severity: aqi >= 201 ? "warning" : "advisory", kind: "air",
      title: aqi >= 201 ? "Unhealthy air" : "Poor air quality",
      detail: `AQI ${Math.round(aqi)} — sensitive groups stay in`,
    });
  }

  out.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  return out.slice(0, 3);
}
