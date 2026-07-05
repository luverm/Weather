// Golden hour + blue hour computations.
//
// We approximate the twilight windows around each sunrise/sunset with fixed
// durations rather than proper solar-altitude math. That keeps the module tiny
// and behaves well at any latitude (real solar altitude near the poles produces
// hours-long, confusing bands). The durations are tuned to feel useful for
// photographers and joggers at mid-latitudes.

const GOLDEN_MIN = 45 * 60_000;
const BLUE_MIN = 25 * 60_000;

/**
 * Given a day (with .sunrise and .sunset timestamps in ms), return the
 * four twilight windows: morning blue, morning golden, evening golden,
 * evening blue. Missing sunrise/sunset (polar day / night) yields nulls.
 */
export function twilightWindows(day) {
  if (!day?.sunrise || !day?.sunset) return null;
  const sr = day.sunrise, ss = day.sunset;
  return {
    morningBlue: { start: sr - BLUE_MIN, end: sr, kind: "blue", when: "morning" },
    morningGolden: { start: sr, end: sr + GOLDEN_MIN, kind: "golden", when: "morning" },
    eveningGolden: { start: ss - GOLDEN_MIN, end: ss, kind: "golden", when: "evening" },
    eveningBlue: { start: ss, end: ss + BLUE_MIN, kind: "blue", when: "evening" },
  };
}

/**
 * Pick the "next up" window relative to `now` across a list of daily entries.
 * If we're currently inside a window, that one is returned first with
 * `active: true`.
 */
export function nextTwilight(daily, now = Date.now()) {
  if (!daily?.length) return null;
  const all = [];
  for (const d of daily) {
    const w = twilightWindows(d);
    if (!w) continue;
    for (const key of ["morningBlue", "morningGolden", "eveningGolden", "eveningBlue"]) {
      all.push(w[key]);
    }
  }
  // Currently active?
  for (const w of all) {
    if (now >= w.start && now < w.end) return { ...w, active: true };
  }
  let best = null;
  for (const w of all) {
    if (w.start > now && (!best || w.start < best.start)) best = w;
  }
  return best ? { ...best, active: false } : null;
}

/**
 * Return today's two golden hour windows for quick chip rendering.
 * Fallback to tomorrow's morning golden hour if we've already passed today's
 * evening golden hour.
 */
export function todaysGoldenPair(daily, now = Date.now()) {
  if (!daily?.length) return null;
  const today = twilightWindows(daily[0]);
  if (!today) return null;
  const pair = {
    morning: today.morningGolden,
    evening: today.eveningGolden,
  };
  // If evening golden is already fully past, roll morning forward to tomorrow.
  if (now > pair.evening.end && daily[1]) {
    const tomorrow = twilightWindows(daily[1]);
    if (tomorrow) {
      pair.morning = tomorrow.morningGolden;
      pair.evening = tomorrow.eveningGolden;
    }
  }
  return pair;
}
