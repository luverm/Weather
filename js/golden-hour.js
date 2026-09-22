// Golden / blue-hour indicator: the photographer's warm and cool windows
// around sunrise and sunset. Times are approximate — enough for a UI badge
// without pulling in a full solar-position library.
//
// Windows (all measured from sunrise / sunset):
//   Morning blue hour:   sunrise - 25 min → sunrise
//   Morning golden hour: sunrise           → sunrise + 55 min
//   Evening golden hour: sunset  - 55 min  → sunset
//   Evening blue hour:   sunset            → sunset + 25 min
//
// Duration is a hand-tuned compromise between the astronomical definition
// (sun angle 6° above/below the horizon) and what feels right at mid-lat.

const GOLDEN_MIN = 55;
const BLUE_MIN = 25;

/**
 * @typedef {Object} GoldenState
 * @property {"golden-morning"|"golden-evening"|"blue-morning"|"blue-evening"|"idle"} state
 * @property {string} label      Human title ("Golden hour", "Blue hour")
 * @property {string} detail     Countdown text ("12 min left", "starts 17:32")
 * @property {number|null} startsAt   ms epoch of next window if idle, else null
 * @property {number|null} endsAt     ms epoch when the current window ends, else null
 */

/**
 * Compute the next / current golden-hour or blue-hour window.
 *
 * @param {{ sunrise:number, sunset:number, tomorrowSunrise?:number|null, now?:number }} opts
 * @returns {GoldenState}
 */
export function computeGoldenHour({ sunrise, sunset, tomorrowSunrise = null, now = Date.now() }) {
  if (!sunrise || !sunset) {
    return { state: "idle", label: "", detail: "", startsAt: null, endsAt: null };
  }
  const windows = collectWindows(sunrise, sunset, tomorrowSunrise);

  // Active window first.
  for (const w of windows) {
    if (now >= w.start && now < w.end) {
      const minsLeft = Math.max(0, Math.round((w.end - now) / 60_000));
      return {
        state: w.state,
        label: w.label,
        detail: `${minsLeft}m left · to ${formatClock(w.end)}`,
        startsAt: null,
        endsAt: w.end,
      };
    }
  }

  // Otherwise: soonest upcoming window.
  const upcoming = windows
    .filter((w) => w.start > now)
    .sort((a, b) => a.start - b.start)[0];
  if (!upcoming) {
    return { state: "idle", label: "", detail: "", startsAt: null, endsAt: null };
  }
  const mins = Math.max(0, Math.round((upcoming.start - now) / 60_000));
  const inLabel = mins >= 60
    ? `in ${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ""}`
    : `in ${mins}m`;
  return {
    state: "idle",
    label: upcoming.label,
    detail: `${inLabel} · ${formatClock(upcoming.start)}`,
    startsAt: upcoming.start,
    endsAt: null,
  };
}

function collectWindows(sunrise, sunset, tomorrowSunrise) {
  const minute = 60_000;
  const windows = [
    {
      state: "blue-morning",
      label: "Blue hour",
      start: sunrise - BLUE_MIN * minute,
      end: sunrise,
    },
    {
      state: "golden-morning",
      label: "Golden hour",
      start: sunrise,
      end: sunrise + GOLDEN_MIN * minute,
    },
    {
      state: "golden-evening",
      label: "Golden hour",
      start: sunset - GOLDEN_MIN * minute,
      end: sunset,
    },
    {
      state: "blue-evening",
      label: "Blue hour",
      start: sunset,
      end: sunset + BLUE_MIN * minute,
    },
  ];
  if (tomorrowSunrise) {
    windows.push(
      {
        state: "blue-morning",
        label: "Blue hour",
        start: tomorrowSunrise - BLUE_MIN * minute,
        end: tomorrowSunrise,
      },
      {
        state: "golden-morning",
        label: "Golden hour",
        start: tomorrowSunrise,
        end: tomorrowSunrise + GOLDEN_MIN * minute,
      },
    );
  }
  return windows;
}

function formatClock(ts) {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}
