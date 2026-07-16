// Compute the "sunniest window" over the next several daytime hours.
// Uses hourly cloudCover; falls back to null when data is unavailable.

export function findSunniestWindow(weather, { hours = 12, span = 3 } = {}) {
  const list = (weather?.hourly || [])
    .filter((h) => h.cloudCover != null && h.time >= Date.now() - 30 * 60_000)
    .slice(0, hours);
  if (list.length < span) return null;
  // Prefer daylight cells so we don't pitch a "sunny window" at 03:00.
  const daylight = list.filter((h) => h.isDay);
  const pool = daylight.length >= span ? daylight : list;
  let bestStart = 0, bestAvg = Infinity;
  for (let i = 0; i + span <= pool.length; i++) {
    let sum = 0;
    for (let j = 0; j < span; j++) sum += pool[i + j].cloudCover;
    const avg = sum / span;
    if (avg < bestAvg) { bestAvg = avg; bestStart = i; }
  }
  const window = pool.slice(bestStart, bestStart + span);
  return {
    start: window[0].time,
    end: window[window.length - 1].time,
    avgClouds: Math.round(bestAvg),
    cells: list.map((h) => ({ time: h.time, cover: h.cloudCover, isDay: h.isDay })),
    daylightOnly: daylight.length >= span,
  };
}

export function sunnyLabel(avgClouds) {
  if (avgClouds == null) return "—";
  if (avgClouds < 15) return "Clear";
  if (avgClouds < 35) return "Mostly sunny";
  if (avgClouds < 60) return "Partly cloudy";
  if (avgClouds < 85) return "Mostly cloudy";
  return "Overcast";
}
