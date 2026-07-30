// Day-ahead timeline: pick out key "moments" in the next 24 hours from the
// hourly forecast and surface them as a chronological strip. Complements the
// insights card (which is a list of highlights) by showing WHEN things happen.

const HOUR = 3600_000;

export function buildDayAhead(w, { now = Date.now(), windowHours = 24 } = {}) {
  const hourly = (w?.hourly || []).filter((h) => h.time >= now - HOUR / 2 && h.time <= now + windowHours * HOUR);
  if (hourly.length < 3) return [];

  const events = [];

  // --- Sunrise & sunset within the window (up to two days) ---
  for (const d of (w?.daily || [])) {
    if (d.sunrise && d.sunrise >= now && d.sunrise <= now + windowHours * HOUR) {
      events.push({ kind: "sunrise", icon: "🌅", label: "Sunrise", ts: d.sunrise });
    }
    if (d.sunset && d.sunset >= now && d.sunset <= now + windowHours * HOUR) {
      events.push({ kind: "sunset", icon: "🌇", label: "Sunset", ts: d.sunset });
    }
  }

  // --- Temperature extremes in the window ---
  let hi = hourly[0], lo = hourly[0];
  for (const h of hourly) {
    if (h.temp > hi.temp) hi = h;
    if (h.temp < lo.temp) lo = h;
  }
  if (hi && hi.temp - lo.temp >= 2) {
    events.push({ kind: "temp-hi", icon: "🌡️", label: "High", value: `${Math.round(hi.temp)}°`, ts: hi.time });
    events.push({ kind: "temp-lo", icon: "❄️", label: "Low", value: `${Math.round(lo.temp)}°`, ts: lo.time });
  }

  // --- Rain start / end (based on hourly precip > 0.1 mm or POP >= 55%) ---
  const rainy = hourly.map((h) => (h.precip ?? 0) >= 0.1 || (h.pop ?? 0) >= 55);
  // Rain start: first index where curr is rainy but prev is not (or first entry is rainy and we're not currently raining).
  for (let i = 0; i < rainy.length; i++) {
    const prevRainy = i > 0 ? rainy[i - 1] : (w?.condition === "rain" || w?.condition === "storm");
    if (rainy[i] && !prevRainy) {
      const h = hourly[i];
      const label = h.condition === "storm" ? "Storms begin" : "Rain begins";
      events.push({ kind: "rain-start", icon: h.condition === "storm" ? "⛈️" : "🌧️", label, ts: h.time });
    }
    if (!rainy[i] && (i > 0 ? rainy[i - 1] : false)) {
      events.push({ kind: "rain-end", icon: "🌤️", label: "Rain ends", ts: hourly[i].time });
    }
    // Cap number of rain flips we push to avoid clutter.
    if (events.filter((e) => e.kind === "rain-start" || e.kind === "rain-end").length >= 3) break;
  }

  // --- Peak wind (only if gusts hit a meaningful threshold) ---
  let peakWind = null;
  for (const h of hourly) {
    const g = h.gusts ?? h.wind ?? 0;
    if (!peakWind || g > (peakWind.gusts ?? peakWind.wind ?? 0)) peakWind = h;
  }
  if (peakWind && (peakWind.gusts ?? peakWind.wind ?? 0) >= 30) {
    events.push({
      kind: "wind",
      icon: "💨",
      label: "Peak wind",
      value: `${Math.round(peakWind.gusts ?? peakWind.wind)} km/h`,
      ts: peakWind.time,
    });
  }

  // --- UV peak (only if noticeably high) ---
  let uvPeak = null;
  for (const h of hourly) {
    if (h.uv != null && (!uvPeak || h.uv > uvPeak.uv)) uvPeak = h;
  }
  if (uvPeak && uvPeak.uv >= 6) {
    events.push({
      kind: "uv",
      icon: "🔆",
      label: "UV peak",
      value: `${Math.round(uvPeak.uv)}`,
      ts: uvPeak.time,
    });
  }

  // De-dup events that fall in the same hour + kind.
  const seen = new Set();
  const deduped = [];
  for (const e of events) {
    const key = `${e.kind}:${Math.round(e.ts / HOUR)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(e);
  }

  // Sort chronologically and cap the count so the strip stays compact.
  deduped.sort((a, b) => a.ts - b.ts);
  return deduped.slice(0, 8);
}

export function formatRelative(ts, now = Date.now(), { fmtTime } = {}) {
  const diffMin = Math.round((ts - now) / 60_000);
  if (diffMin <= 0) return "now";
  if (diffMin < 60) return `in ${diffMin}m`;
  const hours = Math.round(diffMin / 60);
  if (hours < 36) return `in ${hours}h`;
  return fmtTime ? fmtTime(ts) : new Date(ts).toLocaleTimeString([], { hour: "numeric" });
}
