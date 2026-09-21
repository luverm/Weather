// Compute photography-friendly windows (golden hour + blue hour) from
// sunrise/sunset. Approximation — treats golden hour as the ~50 min around
// sunrise/sunset when the sun is roughly 6° above the horizon, and blue hour
// as the ~30 min of civil twilight on either side. Good enough for a UI hint.
//
// Returns:
//   { windows: [{kind: 'blue'|'golden', side: 'am'|'pm', start, end, label}...],
//     next:    { kind, side, start, end, label, inMs }  // the next window,
//                                                       // or null if none today }

const BLUE_MIN = 30;
const GOLDEN_MIN = 50;

export function goldenHourWindows(sunrise, sunset, now = Date.now()) {
  if (!sunrise || !sunset) return { windows: [], next: null };
  const blueBefore = { kind: "blue", side: "am",
                       start: sunrise - BLUE_MIN * 60_000, end: sunrise };
  const goldenAm   = { kind: "golden", side: "am",
                       start: sunrise, end: sunrise + GOLDEN_MIN * 60_000 };
  const goldenPm   = { kind: "golden", side: "pm",
                       start: sunset - GOLDEN_MIN * 60_000, end: sunset };
  const blueAfter  = { kind: "blue", side: "pm",
                       start: sunset, end: sunset + BLUE_MIN * 60_000 };
  const windows = [blueBefore, goldenAm, goldenPm, blueAfter].map(labelWindow);

  // Pick the next one that hasn't ended yet.
  const upcoming = windows
    .filter((w) => w.end > now)
    .sort((a, b) => a.start - b.start);
  const next = upcoming[0] || null;
  return { windows, next: next ? { ...next, inMs: Math.max(0, next.start - now) } : null };
}

function labelWindow(w) {
  const label = `${w.kind === "golden" ? "Golden" : "Blue"} hour`;
  return { ...w, label };
}

// Given a window (start,end) and the sunrise/sunset bounds, return two
// fractions along the daylight arc where the window intersects it — used to
// paint arc markers. Fractions outside [0,1] mean the window is entirely
// before dawn or after dusk (blue hour) and the caller can decide how to
// render it.
export function arcFraction(ts, sunrise, sunset) {
  if (!sunrise || !sunset || sunset <= sunrise) return null;
  return (ts - sunrise) / (sunset - sunrise);
}

// Format an "in Xh Ym" style countdown for the chip.
export function formatCountdown(ms) {
  if (ms <= 0) return "now";
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 60) return `in ${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `in ${h}h ${m}m` : `in ${h}h`;
}
