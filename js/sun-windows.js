// Compute golden-hour and blue-hour windows around sunrise/sunset.
//
// These windows are approximations tuned for UI copy, not for astronomical
// precision — the sun's actual elevation thresholds (6° above / 4-6° below
// the horizon) depend on latitude and season, so we use fixed offsets that
// read well across temperate locations:
//
//   Blue hour (am)   : sunrise - 25m  →  sunrise
//   Golden hour (am) : sunrise        →  sunrise + 60m
//   Golden hour (pm) : sunset  - 60m  →  sunset
//   Blue hour (pm)   : sunset         →  sunset + 25m
//
// `nextSunWindow(daily, now)` returns the next upcoming window (or the
// currently-active one) across today + tomorrow, so the countdown stays
// meaningful through the night.

const GOLDEN_MIN = 60;
const BLUE_MIN = 25;

export function sunWindowsForDay(day) {
  if (!day?.sunrise || !day?.sunset) return [];
  return [
    {
      kind: "blue",
      when: "am",
      start: day.sunrise - BLUE_MIN * 60_000,
      end: day.sunrise,
      label: "Blue hour",
    },
    {
      kind: "golden",
      when: "am",
      start: day.sunrise,
      end: day.sunrise + GOLDEN_MIN * 60_000,
      label: "Golden hour",
    },
    {
      kind: "golden",
      when: "pm",
      start: day.sunset - GOLDEN_MIN * 60_000,
      end: day.sunset,
      label: "Golden hour",
    },
    {
      kind: "blue",
      when: "pm",
      start: day.sunset,
      end: day.sunset + BLUE_MIN * 60_000,
      label: "Blue hour",
    },
  ];
}

export function nextSunWindow(daily, now = Date.now()) {
  if (!Array.isArray(daily) || !daily.length) return null;
  // Walk through the next 2–3 days of windows and pick the first that hasn't ended.
  const windows = [];
  for (let i = 0; i < Math.min(3, daily.length); i++) {
    windows.push(...sunWindowsForDay(daily[i]));
  }
  // Prefer a window the user is currently inside, otherwise the next one.
  const current = windows.find((w) => now >= w.start && now <= w.end);
  if (current) return { ...current, state: "active", msToStart: 0, msToEnd: current.end - now };
  const next = windows.find((w) => w.start > now);
  if (!next) return null;
  return { ...next, state: "upcoming", msToStart: next.start - now, msToEnd: next.end - now };
}
