// Pick a handful of "notable moments" from the next ~24 hours, sorted in time
// order so the user can see the day's rhythm at a glance. Each item is
// { id, icon, label, value, ts, tone }. The UI renders them as clickable chips
// that scrub to that exact moment.

const HORIZON_MS = 26 * 3600_000; // a little past the next sunrise/sunset edge

export function buildHighlights(weather, { fmtTime } = {}) {
  if (!weather) return [];
  const fmt = fmtTime || ((t) => new Date(t).toLocaleTimeString([],
    { hour: "2-digit", minute: "2-digit", hour12: false }));

  const now = Date.now();
  const limit = now + HORIZON_MS;
  const hours = (weather.hourly || []).filter((h) => h.time >= now - 30 * 60_000 && h.time <= limit);
  if (!hours.length) return [];

  const out = [];

  // Sunrise — today's or tomorrow's, whichever is next in horizon.
  const sunrise = pickUpcoming(weather, "sunrise", now, limit);
  if (sunrise) {
    out.push({
      id: "sunrise", tone: "warm",
      icon: "🌅", label: "Sunrise",
      value: fmt(sunrise), ts: sunrise,
    });
  }

  // Warmest hour (only if range is meaningful).
  let warm = null, cool = null;
  for (const h of hours) {
    if (h.temp == null) continue;
    if (!warm || h.temp > warm.t) warm = { t: h.temp, ts: h.time };
    if (!cool || h.temp < cool.t) cool = { t: h.temp, ts: h.time };
  }
  if (warm && cool && warm.t - cool.t >= 3) {
    out.push({
      id: "warmest", tone: "warm",
      icon: "🔥", label: "Warmest",
      value: `${Math.round(warm.t)}° · ${fmt(warm.ts)}`, ts: warm.ts,
      _rawTemp: warm.t,
    });
  }

  // Peak rain probability — only worth surfacing when actually rainy.
  let rain = null;
  for (const h of hours) {
    const pop = h.pop ?? 0;
    if (pop < 40) continue;
    if (!rain || pop > rain.pop || (pop === rain.pop && (h.precip ?? 0) > (rain.precip ?? 0))) {
      rain = { pop, precip: h.precip ?? 0, ts: h.time };
    }
  }
  if (rain) {
    out.push({
      id: "peak-rain", tone: "cool",
      icon: "🌧️", label: "Peak rain",
      value: `${Math.round(rain.pop)}% · ${fmt(rain.ts)}`, ts: rain.ts,
    });
  }

  // UV peak — only if it lands in the horizon AND is meaningful.
  if (weather.uvPeak?.value >= 6 && weather.uvPeak.time >= now && weather.uvPeak.time <= limit) {
    out.push({
      id: "uv-peak", tone: "warm",
      icon: "☀️", label: "UV peak",
      value: `${Math.round(weather.uvPeak.value)} · ${fmt(weather.uvPeak.time)}`,
      ts: weather.uvPeak.time,
    });
  }

  // Windiest hour — gusts >= 30 km/h is when it starts being noteworthy.
  let gust = null;
  for (const h of hours) {
    const v = h.gusts ?? h.wind ?? 0;
    if (v == null) continue;
    if (!gust || v > gust.v) gust = { v, ts: h.time };
  }
  if (gust && gust.v >= 30) {
    out.push({
      id: "windy", tone: "cool",
      icon: "💨", label: "Windiest",
      value: `${Math.round(gust.v)} km/h · ${fmt(gust.ts)}`, ts: gust.ts,
    });
  }

  // Sunset.
  const sunset = pickUpcoming(weather, "sunset", now, limit);
  if (sunset) {
    out.push({
      id: "sunset", tone: "dusk",
      icon: "🌇", label: "Sunset",
      value: fmt(sunset), ts: sunset,
    });
  }

  // Sort chronologically and cap.
  return out
    .filter((x) => x.ts != null && x.ts >= now - 30 * 60_000)
    .sort((a, b) => a.ts - b.ts)
    .slice(0, 6);
}

function pickUpcoming(weather, key, now, limit) {
  // First check `weather.{key}` (today's), then walk daily forecast.
  const candidates = [];
  if (weather[key]) candidates.push(weather[key]);
  for (const d of weather.daily || []) {
    if (d[key]) candidates.push(d[key]);
  }
  // Prefer the next future occurrence; fall back to within the last hour
  // so freshly-passed sunrises still anchor the morning.
  let best = null;
  for (const ts of candidates) {
    if (ts < now - 60 * 60_000) continue;
    if (ts > limit) continue;
    if (best == null || ts < best) best = ts;
  }
  return best;
}
