// Build a short natural-language summary from the weather data.
// Picks the most noteworthy signal: rain arrival, cold snap, heat, wind, etc.

function fmtHour(ts) {
  const d = new Date(ts);
  const m = d.getMinutes();
  return `${d.getHours()}${m ? ":" + String(m).padStart(2, "0") : ""}${d.getHours() < 12 ? "am" : "pm"}`
    .replace(/^(\d{1,2})/, (s) => (parseInt(s, 10) % 12 || 12));
}

function findNextPrecip(nowcast, hourly) {
  // Prefer the 15-min nowcast (≤ 2h ahead), fall back to hourly.
  const now = Date.now();
  for (const n of (nowcast || [])) {
    if (n.time > now && n.precip > 0.1) {
      const inMin = Math.round((n.time - now) / 60_000);
      return { kind: n.code >= 71 && n.code <= 86 ? "snow" : "rain", inMin, ts: n.time };
    }
  }
  for (const h of (hourly || [])) {
    if (h.time > now && (h.pop > 60 || h.precip > 0.5)) {
      const inMin = Math.round((h.time - now) / 60_000);
      return { kind: h.condition === "snow" ? "snow" : "rain", inMin, ts: h.time };
    }
  }
  return null;
}

function findTempSwing(hourly) {
  if (!hourly?.length) return null;
  const nowTemp = hourly[0]?.temp;
  let min = { t: null, v: Infinity }, max = { t: null, v: -Infinity };
  for (const h of hourly.slice(0, 12)) {
    if (h.temp < min.v) min = { t: h.time, v: h.temp };
    if (h.temp > max.v) max = { t: h.time, v: h.temp };
  }
  if (max.v - min.v < 6) return null;
  const drop = nowTemp - min.v;
  const rise = max.v - nowTemp;
  if (drop > 5 && min.t > Date.now()) return { kind: "drop", by: Math.round(drop), ts: min.t };
  if (rise > 5 && max.t > Date.now()) return { kind: "rise", by: Math.round(rise), ts: max.t };
  return null;
}

function findGusts(hourly) {
  if (!hourly?.length) return null;
  let peak = { t: null, v: -Infinity };
  for (const h of hourly.slice(0, 12)) {
    const g = h.gusts ?? h.wind ?? 0;
    if (g > peak.v) peak = { t: h.time, v: g };
  }
  if (peak.v > 35) return { ts: peak.t, kmh: Math.round(peak.v) };
  return null;
}

/**
 * Return a one or two-sentence narrative for the current weather.
 */
export function narrate(weather) {
  if (!weather) return "";
  const bits = [];
  const { condition, label, temp, feelsLike, uvPeak, windSpeed } = weather;

  // Lead: describe current state.
  const feels = Math.abs((feelsLike ?? temp) - temp) >= 3
    ? ` — feels closer to ${Math.round(feelsLike)}°`
    : "";
  bits.push(`${label} at ${Math.round(temp)}°${feels}.`);

  // Precipitation arriving.
  const rain = findNextPrecip(weather.nowcast, weather.hourly);
  if (rain && condition !== "rain" && condition !== "storm" && condition !== "snow") {
    if (rain.inMin <= 120) {
      bits.push(`${rain.kind === "snow" ? "Snow" : "Rain"} starting around ${fmtHour(rain.ts)}.`);
    }
  } else if (condition === "rain" || condition === "storm") {
    // If it's raining now, look ahead for when it stops.
    const dry = weather.hourly?.find((h) => h.pop < 30 && h.time > Date.now() + 30 * 60_000);
    if (dry) bits.push(`Easing off by ${fmtHour(dry.time)}.`);
  }

  // Temperature swing.
  if (bits.length < 2) {
    const swing = findTempSwing(weather.hourly);
    if (swing) {
      bits.push(swing.kind === "drop"
        ? `Temperature drops ${swing.by}° by ${fmtHour(swing.ts)}.`
        : `Warming ${swing.by}° by ${fmtHour(swing.ts)}.`);
    }
  }

  // Wind gusts.
  if (bits.length < 2) {
    const gust = findGusts(weather.hourly);
    if (gust) bits.push(`Gusts up to ${gust.kmh} km/h around ${fmtHour(gust.ts)}.`);
  }

  // UV warning.
  if (bits.length < 2 && uvPeak?.value >= 6) {
    bits.push(`UV peaks at ${Math.round(uvPeak.value)} near ${fmtHour(uvPeak.time)}.`);
  }

  // Pressure trend narrative.
  if (bits.length < 2 && weather.pressureTrend) {
    const { direction, delta } = weather.pressureTrend;
    if (direction === "rising" && Math.abs(delta) >= 1.5) {
      bits.push("Pressure is rising — skies tend to clear soon.");
    } else if (direction === "falling" && Math.abs(delta) >= 1.5) {
      bits.push("Pressure is falling — watch for weather moving in.");
    }
  }

  // Clear night → stargazing hint. Only when actually dark and the sky
  // is calm and clear enough for it to be worth mentioning.
  if (bits.length < 2 && weather.isDay === false && condition === "clear" && windSpeed < 15) {
    bits.push("Clear skies tonight — good stargazing conditions.");
  }

  // Frost / near-freezing dawn.
  if (bits.length < 2) {
    const near = findDawnChill(weather);
    if (near) bits.push(`${near.verb} down to ${near.v}° near dawn — ${near.hint}.`);
  }

  // Calm night fallback.
  if (bits.length < 2 && condition === "clear" && windSpeed < 10) {
    bits.push("Calm and settled for the next few hours.");
  }

  return bits.slice(0, 2).join(" ");
}

// Catch the typical pre-sunrise cold minimum. Only fire when the hourly
// data actually straddles the small hours.
function findDawnChill(w) {
  const hours = (w.hourly || []).slice(0, 24);
  if (!hours.length) return null;
  let coldest = null;
  for (const h of hours) {
    const d = new Date(h.time);
    const hr = d.getHours();
    if (hr < 2 || hr > 8) continue;
    if (!coldest || h.temp < coldest.temp) coldest = h;
  }
  if (!coldest) return null;
  if (coldest.temp <= -3) return { v: Math.round(coldest.temp), verb: "Dips", hint: "bundle up" };
  if (coldest.temp <= 2)  return { v: Math.round(coldest.temp), verb: "Falls",  hint: "possible frost" };
  return null;
}
