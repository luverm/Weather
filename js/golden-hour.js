// Golden-hour / blue-hour planner.
//
// Golden hour, blue hour and civil twilight depend on the sun's altitude
// angle, but at most latitudes a fixed clock-time offset from sunrise /
// sunset is a good enough approximation to plan a photo shoot or an
// evening walk. We expose:
//
//   - civilDawn / civilDusk  ≈ sunrise - 30 min  /  sunset + 30 min
//   - blueMorning            ≈ sunrise - 20 min → sunrise + 10 min
//   - goldenMorning          ≈ sunrise - 10 min → sunrise + 60 min
//   - goldenEvening          ≈ sunset  - 60 min → sunset  + 10 min
//   - blueEvening            ≈ sunset  - 10 min → sunset  + 20 min
//
// Each window carries { start, end, label, tone } for the UI. The caller
// decides whether the window is "upcoming" / "now" / "past" relative to a
// clock.

const MINUTE = 60_000;

export function computeGoldenHours({ sunrise, sunset }) {
  if (!sunrise || !sunset) return null;
  return {
    civilDawn: { start: sunrise - 30 * MINUTE, end: sunrise, label: "Civil dawn", tone: "dawn" },
    blueMorning: { start: sunrise - 20 * MINUTE, end: sunrise + 10 * MINUTE, label: "Blue hour", tone: "blue" },
    goldenMorning: { start: sunrise - 10 * MINUTE, end: sunrise + 60 * MINUTE, label: "Golden hour", tone: "gold" },
    goldenEvening: { start: sunset - 60 * MINUTE, end: sunset + 10 * MINUTE, label: "Golden hour", tone: "gold" },
    blueEvening: { start: sunset - 10 * MINUTE, end: sunset + 20 * MINUTE, label: "Blue hour", tone: "blue" },
    civilDusk: { start: sunset, end: sunset + 30 * MINUTE, label: "Civil dusk", tone: "dusk" },
  };
}

// Return the next upcoming window, or the one in progress right now.
export function nextWindow(windows, now = Date.now()) {
  if (!windows) return null;
  const list = [
    windows.civilDawn,
    windows.blueMorning,
    windows.goldenMorning,
    windows.goldenEvening,
    windows.blueEvening,
    windows.civilDusk,
  ];
  // In-progress first.
  const live = list.find((w) => w.start <= now && now <= w.end);
  if (live) return { ...live, status: "live" };
  const upcoming = list
    .filter((w) => w.start > now)
    .sort((a, b) => a.start - b.start)[0];
  if (upcoming) return { ...upcoming, status: "upcoming" };
  return null;
}

export function formatRange(start, end) {
  const fmt = (ts) => new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function minutesUntil(ts, now = Date.now()) {
  return Math.round((ts - now) / MINUTE);
}
