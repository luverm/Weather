// Round 34: compute the current astronomical season for a given latitude
// and how many days remain to the next solstice / equinox. All math is
// done in UTC and uses the mean dates of the four astronomical events
// (Mar 20, Jun 21, Sep 22, Dec 21) — accurate within a day for any year
// in the next ~50 years and plenty for a UI chip.

const EVENTS = [
  { month: 2,  day: 20, name: "spring equinox" },  // Mar 20
  { month: 5,  day: 21, name: "summer solstice" }, // Jun 21
  { month: 8,  day: 22, name: "autumn equinox" },  // Sep 22
  { month: 11, day: 21, name: "winter solstice" }, // Dec 21
];

const NORTHERN_SEASONS = ["Winter", "Spring", "Summer", "Autumn", "Winter"];
const SOUTHERN_SEASONS = ["Summer", "Autumn", "Winter", "Spring", "Summer"];

// Returns the UTC timestamp of each event in `year` and `year + 1` so we
// can always find one that is still ahead of `now`.
function eventTimestamps(now) {
  const year = new Date(now).getUTCFullYear();
  const stamps = [];
  for (const y of [year, year + 1]) {
    for (const e of EVENTS) {
      stamps.push({ time: Date.UTC(y, e.month, e.day), name: e.name });
    }
  }
  return stamps;
}

function seasonFor(now, lat) {
  const d = new Date(now);
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  // Which season bucket we're in — advance when past the event date.
  let idx = 0;
  if (m > 2 || (m === 2 && day >= 20)) idx = 1;
  if (m > 5 || (m === 5 && day >= 21)) idx = 2;
  if (m > 8 || (m === 8 && day >= 22)) idx = 3;
  if (m > 11 || (m === 11 && day >= 21)) idx = 4;
  const table = (lat ?? 0) >= 0 ? NORTHERN_SEASONS : SOUTHERN_SEASONS;
  return table[idx];
}

export function seasonInfo(lat, now = Date.now()) {
  const season = seasonFor(now, lat);
  const stamps = eventTimestamps(now).filter((s) => s.time > now);
  stamps.sort((a, b) => a.time - b.time);
  const next = stamps[0];
  if (!next) return { season, nextName: null, daysUntil: null };
  const daysUntil = Math.max(0, Math.round((next.time - now) / 86400_000));
  return { season, nextName: next.name, daysUntil, nextTime: next.time };
}
