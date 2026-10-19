// Round 23: approximate golden hour & blue hour windows and the next-up
// prompt. "Golden hour" here is the hour-ish of warm, low-angle light
// around sunrise and sunset; "blue hour" is the deeper twilight that
// brackets it. We use time-based windows (not solar elevation) — accurate
// enough for a UI hint without a sun-position dependency.

const GOLDEN_LEAD_MIN = 20;      // minutes before sunrise / after sunset
const GOLDEN_TAIL_MIN = 60;      // minutes after sunrise / before sunset
const BLUE_LEAD_MIN = 20;        // minutes between blue-hour and civil twilight

// Returns the paired windows for one day.
export function windowsForDay(sunrise, sunset) {
  if (!sunrise || !sunset) return null;
  const m = (min) => min * 60_000;
  return {
    morning: {
      blue:   { start: sunrise - m(GOLDEN_LEAD_MIN + BLUE_LEAD_MIN), end: sunrise - m(GOLDEN_LEAD_MIN) },
      golden: { start: sunrise - m(GOLDEN_LEAD_MIN), end: sunrise + m(GOLDEN_TAIL_MIN) },
    },
    evening: {
      golden: { start: sunset - m(GOLDEN_TAIL_MIN), end: sunset + m(GOLDEN_LEAD_MIN) },
      blue:   { start: sunset + m(GOLDEN_LEAD_MIN), end: sunset + m(GOLDEN_LEAD_MIN + BLUE_LEAD_MIN) },
    },
  };
}

// From a list of daily entries, find the next upcoming golden/blue window
// relative to `now`. Returns { kind: "golden"|"blue", side: "morning"|"evening",
// state: "now"|"soon", start, end }.
export function nextLightWindow(dailyList, now = Date.now()) {
  const candidates = [];
  for (const d of dailyList || []) {
    const w = windowsForDay(d?.sunrise, d?.sunset);
    if (!w) continue;
    candidates.push(
      { kind: "blue",   side: "morning", ...w.morning.blue },
      { kind: "golden", side: "morning", ...w.morning.golden },
      { kind: "golden", side: "evening", ...w.evening.golden },
      { kind: "blue",   side: "evening", ...w.evening.blue },
    );
  }
  // Prefer an in-progress window; otherwise the soonest upcoming.
  const live = candidates.find((c) => now >= c.start && now <= c.end);
  if (live) return { ...live, state: "now" };
  const upcoming = candidates
    .filter((c) => c.start > now)
    .sort((a, b) => a.start - b.start)[0];
  return upcoming ? { ...upcoming, state: "soon" } : null;
}

function fmt(ms, tz) {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit", hour12: false,
    ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });
}

function dur(ms) {
  const total = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

// Render-ready text for the sun card.
export function goldenHourLine(dailyList, { now = Date.now(), tz = null } = {}) {
  const next = nextLightWindow(dailyList, now);
  if (!next) return null;
  const label = next.kind === "golden" ? "Golden hour" : "Blue hour";
  if (next.state === "now") {
    return {
      text: `${label} now · ends ${fmt(next.end, tz)}`,
      kind: next.kind,
      live: true,
    };
  }
  const until = next.start - now;
  const when = `${fmt(next.start, tz)}–${fmt(next.end, tz)}`;
  return {
    text: `${label} in ${dur(until)} · ${when}`,
    kind: next.kind,
    live: false,
  };
}
