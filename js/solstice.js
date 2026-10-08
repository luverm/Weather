// Lightweight astronomical events — returns the nearest upcoming solstice or
// equinox within the next 90 days, in UTC.
//
// Dates are approximate (good to ±1 day across 1900-2100) — the sun's
// actual crossing of the celestial equator / tropics drifts year by year.

const EVENTS = [
  { name: "Spring equinox", month: 3,  day: 20 },
  { name: "Summer solstice", month: 6,  day: 21 },
  { name: "Autumn equinox", month: 9,  day: 22 },
  { name: "Winter solstice", month: 12, day: 21 },
];

export function nextAstroEvent(now = new Date()) {
  const year = now.getUTCFullYear();
  const candidates = [];
  for (const y of [year, year + 1]) {
    for (const ev of EVENTS) {
      const d = new Date(Date.UTC(y, ev.month - 1, ev.day, 0, 0, 0));
      if (d >= now) candidates.push({ name: ev.name, date: d });
    }
  }
  candidates.sort((a, b) => a.date - b.date);
  const next = candidates[0];
  if (!next) return null;
  const days = Math.round((next.date - now) / 86400_000);
  if (days > 90) return null;
  return { name: next.name, date: next.date, days };
}
