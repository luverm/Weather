// Golden-hour / blue-hour windows + day-length trend.
//
// These are *approximate*: a fixed offset from sunrise/sunset rather than a
// true solar-elevation calculation. That keeps it dependency-free and is
// accurate enough for the "best light" hint photographers actually use.

const GOLDEN_MS = 50 * 60_000; // soft, warm light near the horizon
const BLUE_MS = 30 * 60_000;   // deep-blue twilight just beyond the edge

export function sunWindows(w) {
  if (!w?.sunrise || !w?.sunset) return null;

  // Prefer the daily series (covers tomorrow's golden hour after dusk);
  // fall back to the single top-level sun pair.
  const days = [];
  const dd = w.daily || [];
  if (dd.length) {
    for (const d of dd) {
      if (d.sunrise && d.sunset) days.push({ sunrise: d.sunrise, sunset: d.sunset });
    }
  }
  if (!days.length) days.push({ sunrise: w.sunrise, sunset: w.sunset });

  const now = Date.now();
  const windows = [];
  for (const d of days) {
    // Clamp so the morning/evening windows can't cross at high latitudes.
    windows.push({
      phase: "morning",
      start: d.sunrise,
      end: Math.min(d.sunrise + GOLDEN_MS, d.sunset),
    });
    windows.push({
      phase: "evening",
      start: Math.max(d.sunset - GOLDEN_MS, d.sunrise),
      end: d.sunset,
    });
  }
  windows.sort((a, b) => a.start - b.start);

  const golden = windows.find((win) => win.end > now);
  if (!golden) return null;

  const active = now >= golden.start && now <= golden.end;

  // The blue hour sits on the dark side of the same horizon event.
  const blue = golden.phase === "morning"
    ? { start: golden.start - BLUE_MS, end: golden.start } // before sunrise
    : { start: golden.end, end: golden.end + BLUE_MS };    // after sunset

  // Day-length trend: tomorrow's daylight vs today's.
  let trend = null;
  if (dd[0]?.sunrise && dd[0]?.sunset && dd[1]?.sunrise && dd[1]?.sunset) {
    const today = dd[0].sunset - dd[0].sunrise;
    const tomorrow = dd[1].sunset - dd[1].sunrise;
    trend = { deltaMs: tomorrow - today };
  }

  return { golden, blue, active, trend };
}
