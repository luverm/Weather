// Compute golden-hour and blue-hour windows from the daily sunrise/sunset
// times. Returns the next upcoming window of each kind, plus a flag if it's
// already happening right now.
//
//   Golden hour: ~60 min after sunrise + ~60 min before sunset.
//                Warm low-angle light that photographers love.
//   Blue  hour: ~30 min before sunrise + ~30 min after sunset.
//                Cool twilight wash before/after the sun crosses the horizon.

const GOLDEN_MS = 60 * 60 * 1000;
const BLUE_MS = 30 * 60 * 1000;

function windowsForDay(day) {
  const out = [];
  if (day?.sunrise) {
    out.push({ kind: "blue",   start: day.sunrise - BLUE_MS,   end: day.sunrise });
    out.push({ kind: "golden", start: day.sunrise,             end: day.sunrise + GOLDEN_MS });
  }
  if (day?.sunset) {
    out.push({ kind: "golden", start: day.sunset - GOLDEN_MS,  end: day.sunset });
    out.push({ kind: "blue",   start: day.sunset,              end: day.sunset + BLUE_MS });
  }
  return out;
}

/**
 * Look across the next ~36h of daily forecast and return the soonest upcoming
 * (or currently-active) window of each kind: { golden, blue }. Each value is
 * { start, end, active, partOfDay }  or null.
 */
export function nextLightWindows(weather, now = Date.now()) {
  const days = weather?.daily || [];
  const candidates = [];
  for (const d of days.slice(0, 3)) candidates.push(...windowsForDay(d));
  candidates.sort((a, b) => a.start - b.start);

  const result = { golden: null, blue: null };
  for (const w of candidates) {
    if (w.end < now) continue;                       // already finished
    if (result[w.kind]) continue;                    // already picked one
    const active = now >= w.start && now <= w.end;
    const partOfDay = isMorning(w, days) ? "morning" : "evening";
    result[w.kind] = { ...w, active, partOfDay };
    if (result.golden && result.blue) break;
  }
  return result;
}

function isMorning(win, days) {
  // A window is "morning" if its end (or start) sits closer to a sunrise than
  // a sunset across the upcoming days.
  let bestDist = Infinity;
  let isMorn = false;
  for (const d of days.slice(0, 3)) {
    if (d.sunrise) {
      const dist = Math.abs(d.sunrise - win.start);
      if (dist < bestDist) { bestDist = dist; isMorn = true; }
    }
    if (d.sunset) {
      const dist = Math.abs(d.sunset - win.start);
      if (dist < bestDist) { bestDist = dist; isMorn = false; }
    }
  }
  return isMorn;
}
