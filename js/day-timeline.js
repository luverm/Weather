// Build a chronological "next 12 hours" timeline of notable moments:
// sunrise/sunset, peak warmth & cool, peak UV, peak gust, next rain start.
// Returns layout-friendly percentages so the UI can render markers on a track.

const WINDOW_HOURS = 12;

export function buildDayTimeline(weather, { now = Date.now() } = {}) {
  if (!weather) return null;
  const hours = (weather.hourly || []).filter((h) => h.time >= now - 30 * 60_000);
  if (hours.length < 2) return null;

  const start = now;
  const end = now + WINDOW_HOURS * 3600_000;
  const inWindow = (ts) => ts != null && ts >= start && ts <= end;
  const pct = (ts) => Math.max(0, Math.min(100, ((ts - start) / (end - start)) * 100));

  // Daylight spans within the window — read off the hourly isDay flag.
  const daylight = [];
  let cur = null;
  for (const h of hours) {
    if (h.time > end) break;
    if (h.isDay) {
      if (!cur) cur = { from: h.time, to: h.time + 3600_000 };
      else cur.to = h.time + 3600_000;
    } else if (cur) {
      daylight.push(cur);
      cur = null;
    }
  }
  if (cur) daylight.push(cur);
  // Clip to window bounds.
  for (const d of daylight) {
    d.from = Math.max(d.from, start);
    d.to = Math.min(d.to, end);
  }

  const events = [];

  // Sunrise / sunset from each day in the daily forecast.
  for (const d of (weather.daily || [])) {
    if (inWindow(d.sunrise)) {
      events.push({ id: "sunrise", ts: d.sunrise, icon: "sunrise", kind: "sun",
        label: "Sunrise", value: fmt(d.sunrise) });
    }
    if (inWindow(d.sunset)) {
      events.push({ id: "sunset", ts: d.sunset, icon: "sunset", kind: "sun",
        label: "Sunset", value: fmt(d.sunset) });
    }
  }

  // Peak warmth + coolest hour within the window.
  let warmest = null, coolest = null;
  for (const h of hours) {
    if (h.time > end || h.temp == null) continue;
    if (!warmest || h.temp > warmest.temp) warmest = h;
    if (!coolest || h.temp < coolest.temp) coolest = h;
  }
  if (warmest && coolest && warmest.temp - coolest.temp >= 3) {
    events.push({
      id: "warm", ts: warmest.time, icon: "warm", kind: "warm",
      label: "Warmest", value: `${Math.round(warmest.temp)}°`,
    });
    events.push({
      id: "cool", ts: coolest.time, icon: "cool", kind: "cool",
      label: "Coolest", value: `${Math.round(coolest.temp)}°`,
    });
  }

  // Peak UV (only worth flagging if it actually matters).
  let uvPeak = null;
  for (const h of hours) {
    if (h.time > end || h.uv == null) continue;
    if (!uvPeak || h.uv > uvPeak.uv) uvPeak = h;
  }
  if (uvPeak && uvPeak.uv >= 4) {
    events.push({
      id: "uv", ts: uvPeak.time, icon: "uv", kind: "uv",
      label: "UV peak", value: `${Math.round(uvPeak.uv)}`,
    });
  }

  // Peak gust.
  let gust = null;
  for (const h of hours) {
    if (h.time > end) continue;
    const g = h.gusts ?? h.wind ?? 0;
    if (g == null) continue;
    if (!gust || g > gust.v) gust = { v: g, ts: h.time };
  }
  if (gust && gust.v >= 25) {
    events.push({
      id: "gust", ts: gust.ts, icon: "wind", kind: "wind",
      label: "Peak gust", value: `${Math.round(gust.v)} km/h`,
    });
  }

  // First rain-onset hour (start of a precip window).
  const rainStart = hours.find((h) =>
    h.time <= end && ((h.pop ?? 0) >= 55 || (h.precip ?? 0) >= 0.4));
  if (rainStart) {
    const kind = rainStart.condition === "snow" ? "snow" : "rain";
    events.push({
      id: "rain", ts: rainStart.time, icon: kind, kind,
      label: kind === "snow" ? "Snow starts" : "Rain starts",
      value: `${rainStart.pop ?? 0}%`,
    });
  }

  // De-dupe events that fall within ~20 min of each other (keep first).
  events.sort((a, b) => a.ts - b.ts);
  const deduped = [];
  for (const e of events) {
    const near = deduped.find((x) => Math.abs(x.ts - e.ts) < 20 * 60_000 && x.id === e.id);
    if (!near) deduped.push(e);
  }

  // Compute layout positions and "stack lane" (0 above the rail, 1 below) to
  // avoid label collisions. Walk left-to-right; prefer whichever lane has more
  // space. If both lanes are crowded, pick the less-crowded one.
  const MIN_GAP = 12;
  const laid = [];
  let lastTop = -Infinity, lastBot = -Infinity;
  for (const e of deduped) {
    const p = pct(e.ts);
    const topGap = p - lastTop;
    const botGap = p - lastBot;
    let lane;
    if (topGap > MIN_GAP) lane = 0;
    else if (botGap > MIN_GAP) lane = 1;
    else lane = topGap >= botGap ? 0 : 1;
    if (lane === 0) lastTop = p; else lastBot = p;
    laid.push({ ...e, pct: p, lane });
  }

  return {
    start, end,
    nowPct: 0,
    ticks: [0, 3, 6, 9, 12].map((h) => ({ hour: h, pct: (h / WINDOW_HOURS) * 100 })),
    daylight: daylight.map((d) => ({ fromPct: pct(d.from), toPct: pct(d.to) })),
    events: laid,
  };
}

function fmt(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}
