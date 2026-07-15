// Twilight windows — golden hour and blue hour — computed from the
// sunrise/sunset times we already have on each daily entry. Uses the common
// photographer approximation: golden hour is roughly the 45 minutes just
// inside sunrise/sunset; blue hour is the ~30 minutes just outside.
//
// This avoids a full solar-altitude calculation. It's inaccurate near the
// poles and around the solstices, but for a UI hint that says "golden hour in
// 32m" it's more than close enough.
//
// Output shape:
//   { kind: "golden-am"|"blue-am"|"golden-pm"|"blue-pm",
//     label: "Golden hour", subLabel: "morning",
//     start, end, active, minutesUntilStart, minutesRemaining }
//
// Returns null if we can't find a future window (e.g. missing daily data).

const GOLDEN_MIN = 45;
const BLUE_MIN = 30;

export function nextTwilightWindow(daily, now = Date.now()) {
  if (!Array.isArray(daily) || !daily.length) return null;

  const candidates = [];
  for (const d of daily) {
    if (d?.sunrise) {
      candidates.push(makeWindow("blue-am",   d.sunrise - BLUE_MIN * 60_000, d.sunrise));
      candidates.push(makeWindow("golden-am", d.sunrise, d.sunrise + GOLDEN_MIN * 60_000));
    }
    if (d?.sunset) {
      candidates.push(makeWindow("golden-pm", d.sunset - GOLDEN_MIN * 60_000, d.sunset));
      candidates.push(makeWindow("blue-pm",   d.sunset, d.sunset + BLUE_MIN * 60_000));
    }
  }
  if (!candidates.length) return null;

  // Prefer an active window; otherwise the nearest upcoming one.
  const active = candidates.find((w) => now >= w.start && now < w.end);
  if (active) {
    return {
      ...active,
      active: true,
      minutesUntilStart: 0,
      minutesRemaining: Math.max(0, Math.round((active.end - now) / 60_000)),
    };
  }

  const upcoming = candidates
    .filter((w) => w.start > now)
    .sort((a, b) => a.start - b.start)[0];
  if (!upcoming) return null;

  return {
    ...upcoming,
    active: false,
    minutesUntilStart: Math.max(0, Math.round((upcoming.start - now) / 60_000)),
    minutesRemaining: 0,
  };
}

function makeWindow(kind, start, end) {
  const isGolden = kind.startsWith("golden");
  const isMorning = kind.endsWith("am");
  return {
    kind,
    start,
    end,
    label: isGolden ? "Golden hour" : "Blue hour",
    subLabel: isMorning ? "morning" : "evening",
  };
}

// Format a duration in minutes as "1h 5m" / "42m" / "just now".
export function formatMinutes(mins) {
  if (mins == null || mins < 0) return "";
  if (mins === 0) return "now";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
