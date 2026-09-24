// Extract the day's key inflection points so a mini timeline can show
// dots at "warmest hour", "peak UV", "rain starts", etc. Returns an
// array of { key, label, time, sub } sorted by time.

export function extractArrivals(weather, now = Date.now()) {
  if (!weather?.hourly?.length) return [];
  const hours = weather.hourly.filter((h) => h.time >= now - 30 * 60_000);
  if (!hours.length) return [];
  const dayEnd = now + 24 * 3600_000;
  const inWindow = hours.filter((h) => h.time <= dayEnd);
  if (!inWindow.length) return [];

  const events = [];

  // Warmest and coldest in the next 24h.
  const warmest = inWindow.reduce((a, h) => (!a || h.temp > a.temp) ? h : a, null);
  const coldest = inWindow.reduce((a, h) => (!a || h.temp < a.temp) ? h : a, null);
  if (warmest) events.push({
    key: "warm", label: "High", time: warmest.time,
    sub: `${Math.round(warmest.temp)}°`,
  });
  if (coldest && coldest !== warmest) events.push({
    key: "cold", label: "Low", time: coldest.time,
    sub: `${Math.round(coldest.temp)}°`,
  });

  // Peak UV in the next 24h.
  const peakUV = inWindow.reduce((a, h) => (h.uv != null && (!a || h.uv > a.uv)) ? h : a, null);
  if (peakUV && peakUV.uv >= 3) {
    events.push({
      key: "uv", label: "UV peak", time: peakUV.time, sub: `${Math.round(peakUV.uv)}`,
    });
  }

  // First rain hour if any.
  const firstRain = inWindow.find((h) => (h.pop ?? 0) >= 40 || (h.precip ?? 0) >= 0.3);
  if (firstRain) events.push({
    key: "rain", label: "Rain starts", time: firstRain.time,
    sub: `${Math.round(firstRain.pop)}%`,
  });

  // Windiest hour if gusts are notable.
  const gusty = inWindow.reduce(
    (a, h) => ((h.gusts ?? h.wind ?? 0) > (a?.gusts ?? a?.wind ?? 0)) ? h : a,
    null
  );
  if (gusty && (gusty.gusts ?? gusty.wind ?? 0) >= 35) {
    events.push({
      key: "gust", label: "Windy", time: gusty.time,
      sub: `${Math.round(gusty.gusts ?? gusty.wind)} km/h`,
    });
  }

  // Sunrise / sunset for the day the user is currently in (or next).
  const days = weather.daily || [];
  for (const d of days.slice(0, 2)) {
    for (const [ts, label, key] of [[d.sunrise, "Sunrise", "sunrise"], [d.sunset, "Sunset", "sunset"]]) {
      if (!ts) continue;
      if (ts < now - 30 * 60_000) continue;
      if (ts > dayEnd) continue;
      events.push({ key, label, time: ts, sub: fmtHHMM(ts) });
    }
  }

  events.sort((a, b) => a.time - b.time);
  // De-dup identical labels within 45 min (e.g. warm/coldest of same hour).
  const compact = [];
  for (const e of events) {
    if (compact.some((p) => p.key === e.key && Math.abs(p.time - e.time) < 45 * 60_000)) continue;
    compact.push(e);
  }
  return compact.slice(0, 6);
}

function fmtHHMM(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}
