// Precipitation outlook: aggregate the hourly + daily forecast into a compact
// summary — next-24h accumulation, next-7-day accumulation, peak-intensity
// hour, and a tiny 7-day distribution used by the UI bar chart.

export function summarizePrecip(weather) {
  const hourly = Array.isArray(weather?.hourly) ? weather.hourly : [];
  const daily = Array.isArray(weather?.daily) ? weather.daily : [];
  const now = Date.now();

  let next24 = 0;
  let peak = null; // { time, precip, pop }
  let firstWetHour = null;
  for (const h of hourly) {
    if (h?.time == null) continue;
    if (h.time < now - 30 * 60_000) continue;
    if (h.time > now + 24 * 3600_000) break;
    const mm = Math.max(0, h.precip ?? 0);
    next24 += mm;
    if (!peak || mm > peak.precip) peak = { time: h.time, precip: mm, pop: h.pop ?? 0 };
    if (firstWetHour == null && (mm >= 0.1 || (h.pop ?? 0) >= 60)) {
      firstWetHour = { time: h.time, precip: mm, pop: h.pop ?? 0 };
    }
  }

  // 7-day bar values from the daily forecast.
  const week = daily.slice(0, 7).map((d) => ({
    time: d?.time,
    precip: Math.max(0, d?.precip ?? 0),
    pop: d?.pop ?? 0,
  }));
  const weekTotal = week.reduce((s, d) => s + d.precip, 0);
  const wetDays = week.filter((d) => d.precip >= 0.5).length;

  // Wettest day of the week.
  let wettest = null;
  for (const d of week) {
    if (!wettest || d.precip > wettest.precip) wettest = d;
  }

  return {
    next24,          // mm expected in the next 24h
    weekTotal,       // mm expected across the next 7 days
    wetDays,         // days with ≥ 0.5 mm
    peak,            // hour with the largest single-hour precip in next 24h
    firstWetHour,    // when it starts raining (if it does)
    wettest,         // wettest day in the week
    week,            // per-day distribution (for the bar chart)
    hasAny: next24 > 0 || weekTotal > 0,
  };
}
