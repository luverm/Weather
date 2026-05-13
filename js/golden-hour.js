// Compute photographer's golden + blue hour windows around sunrise/sunset.
//
// Definitions (common photography conventions):
//   blue_am  : sunrise − 30 min  →  sunrise
//   golden_am: sunrise           →  sunrise + 60 min
//   golden_pm: sunset − 60 min   →  sunset
//   blue_pm  : sunset            →  sunset + 30 min
//
// Returns the *next upcoming* window relative to `now` across today and
// tomorrow, or null if no sun data is available.

const BLUE_BEFORE_MS = 30 * 60_000;
const GOLDEN_AFTER_MS = 60 * 60_000;
const GOLDEN_BEFORE_MS = 60 * 60_000;
const BLUE_AFTER_MS = 30 * 60_000;

export function nextGoldenWindow(daily, now = Date.now()) {
  if (!Array.isArray(daily) || !daily.length) return null;
  const windows = [];
  for (const d of daily.slice(0, 3)) {
    if (d.sunrise) {
      windows.push({ kind: "blue", phase: "morning", start: d.sunrise - BLUE_BEFORE_MS, end: d.sunrise });
      windows.push({ kind: "golden", phase: "morning", start: d.sunrise, end: d.sunrise + GOLDEN_AFTER_MS });
    }
    if (d.sunset) {
      windows.push({ kind: "golden", phase: "evening", start: d.sunset - GOLDEN_BEFORE_MS, end: d.sunset });
      windows.push({ kind: "blue", phase: "evening", start: d.sunset, end: d.sunset + BLUE_AFTER_MS });
    }
  }
  // Earliest window whose end is still in the future.
  let pick = null;
  for (const w of windows) {
    if (w.end <= now) continue;
    if (!pick || w.start < pick.start) pick = w;
  }
  if (!pick) return null;
  const active = now >= pick.start && now <= pick.end;
  return {
    ...pick,
    active,
    label: labelFor(pick),
    countdown: active ? pick.end - now : pick.start - now,
  };
}

function labelFor(w) {
  if (w.kind === "golden") return w.phase === "morning" ? "Morning golden hour" : "Evening golden hour";
  return w.phase === "morning" ? "Morning blue hour" : "Evening blue hour";
}

// Total daylight in ms for a daily entry (or null if incomplete).
export function daylightMs(day) {
  if (!day?.sunrise || !day?.sunset) return null;
  return day.sunset - day.sunrise;
}
