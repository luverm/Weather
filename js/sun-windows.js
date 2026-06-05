// Compute golden-hour and blue-hour windows from sunrise / sunset.
//
// Conventions (approximate but standard for civil photography):
//   Blue hour   morning: sunrise − 30 min  →  sunrise
//   Golden hour morning: sunrise           →  sunrise + 60 min
//   Golden hour evening: sunset  − 60 min  →  sunset
//   Blue hour   evening: sunset            →  sunset  + 30 min
//
// `windowsForDays(daily)` returns the ordered list of upcoming windows across
// every day in the daily forecast, ready to filter for "current" or "next".

const GOLDEN_MS = 60 * 60 * 1000;
const BLUE_MS = 30 * 60 * 1000;

export function windowsForDays(days) {
  const out = [];
  for (const d of days || []) {
    if (d.sunrise) {
      out.push({ kind: "blue",   when: "morning", start: d.sunrise - BLUE_MS, end: d.sunrise });
      out.push({ kind: "golden", when: "morning", start: d.sunrise,            end: d.sunrise + GOLDEN_MS });
    }
    if (d.sunset) {
      out.push({ kind: "golden", when: "evening", start: d.sunset - GOLDEN_MS, end: d.sunset });
      out.push({ kind: "blue",   when: "evening", start: d.sunset,             end: d.sunset + BLUE_MS });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Find the active window at `now`, or the next upcoming one if none active. */
export function currentOrNext(windows, now = Date.now()) {
  if (!windows?.length) return null;
  const active = windows.find((w) => now >= w.start && now <= w.end);
  if (active) return { ...active, active: true };
  const next = windows.find((w) => w.start > now);
  return next ? { ...next, active: false } : null;
}

export function labelFor(w) {
  if (!w) return null;
  const kind = w.kind === "golden" ? "Golden hour" : "Blue hour";
  return w.when ? `${kind} · ${w.when}` : kind;
}

/** Format a "in 2h 13m" / "12 min left" string for a window at `now`. */
export function countdownFor(w, now = Date.now()) {
  if (!w) return "";
  const target = w.active ? w.end : w.start;
  const mins = Math.max(0, Math.round((target - now) / 60_000));
  const fmt = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return w.active ? `${fmt} left` : `in ${fmt}`;
}

/** Compute today's sun-arc fractions for the window edges, given the
 *  day's sunrise / sunset (so morning blue is < 0 and evening blue > 1). */
export function arcFractions(sunrise, sunset) {
  if (!sunrise || !sunset || sunset <= sunrise) return null;
  const span = sunset - sunrise;
  return {
    blueMorning:   { a: -BLUE_MS / span,                  b: 0 },
    goldenMorning: { a: 0,                                b: GOLDEN_MS / span },
    goldenEvening: { a: 1 - GOLDEN_MS / span,             b: 1 },
    blueEvening:   { a: 1,                                b: 1 + BLUE_MS / span },
  };
}
