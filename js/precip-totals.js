// Compute compact rainfall totals from the hourly forecast.
// Returns null when nothing meaningful is happening — the UI hides the chip.
//
// Output shape (when non-null):
//   {
//     next6mm:   number,   // sum of precip in the first 6 hourly buckets
//     next24mm:  number,   // sum across all available hourly (usually 24)
//     peak:      { pop: number, ts: number } | null,
//     wettest:   { start: ts, end: ts, sum: mm },   // wettest 3h running window
//     tone:      "light" | "steady" | "heavy",
//     kind:      "rain" | "snow" | "mix",
//   }

const MIN_TOTAL_MM = 0.2;   // below this, don't bother the user
const MIN_PEAK_POP = 40;    // ditto for probability

export function computePrecipTotals(weather) {
  const hours = weather?.hourly || [];
  if (!hours.length) return null;

  const first6 = hours.slice(0, 6);
  const first24 = hours.slice(0, 24);

  const sum = (arr) => arr.reduce((a, h) => a + (h.precip ?? 0), 0);
  const next6mm = sum(first6);
  const next24mm = sum(first24);

  let peak = null;
  for (const h of first24) {
    const p = h.pop ?? 0;
    if (!peak || p > peak.pop) peak = { pop: p, ts: h.time };
  }

  const wettest = wettestWindow(first24, 3);

  // Bail out if nothing to say.
  const noRain = next24mm < MIN_TOTAL_MM && (!peak || peak.pop < MIN_PEAK_POP);
  if (noRain) return null;

  // Distinguish rain vs snow from hourly condition codes.
  let rainHours = 0, snowHours = 0;
  for (const h of first24) {
    if ((h.precip ?? 0) <= 0) continue;
    if (h.condition === "snow") snowHours++;
    else if (h.condition === "rain") rainHours++;
  }
  const kind = snowHours > rainHours ? "snow" : (snowHours ? "mix" : "rain");

  const tone =
    next24mm >= 15 || (wettest && wettest.sum >= 8) ? "heavy" :
    next24mm >= 3  || (wettest && wettest.sum >= 2) ? "steady" :
    "light";

  return { next6mm, next24mm, peak, wettest, tone, kind };
}

function wettestWindow(hours, span) {
  if (hours.length < span) return null;
  let best = null;
  for (let i = 0; i + span <= hours.length; i++) {
    let s = 0;
    for (let k = 0; k < span; k++) s += hours[i + k].precip ?? 0;
    if (!best || s > best.sum) {
      best = { start: hours[i].time, end: hours[i + span - 1].time, sum: s };
    }
  }
  return best && best.sum > 0 ? best : null;
}

// Format a mm value compactly. Sub-mm rounds to one decimal.
export function fmtMm(mm) {
  if (mm == null) return "—";
  if (mm < 0.05) return "0";
  if (mm < 1) return mm.toFixed(1);
  if (mm < 10) return mm.toFixed(1);
  return Math.round(mm).toString();
}
