// Round 22 — Golden hour & blue hour indicator.
//
// Given the current day's sunrise + sunset, produce the golden-hour and
// blue-hour windows and label the current light quality. Approximated on
// the sun-elevation model without needing the observer's latitude:
//   * Golden hour: 60 min around sunrise/sunset (sun ~ -4° to +6°).
//   * Blue hour: 30 min before sunrise / after sunset (sun ~ -6° to -4°).
//
// The approximation is close enough for planning + narrative use;
// exact values require a full solar-position calculation and the
// user's timezone/latitude, which we already pass through elsewhere.

const GOLDEN_MS = 60 * 60_000;
const BLUE_MS = 30 * 60_000;

export function lightWindows(sunrise, sunset) {
  if (!sunrise || !sunset) return null;
  return {
    blueMorning:   { start: sunrise - BLUE_MS,       end: sunrise                 },
    goldenMorning: { start: sunrise,                 end: sunrise + GOLDEN_MS     },
    day:           { start: sunrise + GOLDEN_MS,     end: sunset - GOLDEN_MS      },
    goldenEvening: { start: sunset - GOLDEN_MS,      end: sunset                  },
    blueEvening:   { start: sunset,                  end: sunset + BLUE_MS        },
  };
}

export function currentPhase(now, sunrise, sunset) {
  const w = lightWindows(sunrise, sunset);
  if (!w) return { key: "unknown", label: "—", tone: "" };
  const inBand = (b) => now >= b.start && now < b.end;
  if (inBand(w.goldenMorning)) return { key: "golden", label: "Golden hour", tone: "warm", ends: w.goldenMorning.end };
  if (inBand(w.goldenEvening)) return { key: "golden", label: "Golden hour", tone: "warm", ends: w.goldenEvening.end };
  if (inBand(w.blueMorning))   return { key: "blue",   label: "Blue hour",   tone: "cool", ends: w.blueMorning.end };
  if (inBand(w.blueEvening))   return { key: "blue",   label: "Blue hour",   tone: "cool", ends: w.blueEvening.end };
  if (inBand(w.day)) {
    // Split "harsh noon" from softer mid-morning / mid-afternoon.
    const noon = (sunrise + sunset) / 2;
    const isHarsh = Math.abs(now - noon) < 90 * 60_000;
    return { key: "day", label: isHarsh ? "Harsh light" : "Soft daylight", tone: "day", ends: w.goldenEvening.start };
  }
  return { key: "night", label: "Night", tone: "night", ends: sunrise > now ? sunrise : null };
}

export function nextGoldenHour(now, weather) {
  const days = weather?.daily || [];
  for (const d of days) {
    const w = lightWindows(d.sunrise, d.sunset);
    if (!w) continue;
    for (const band of [w.goldenMorning, w.goldenEvening]) {
      if (band.start > now) return band;
    }
  }
  return null;
}

// Convert a timestamp within [sunrise, sunset] to the sun-arc t parameter
// (0..1). We match the arc curve in `scheduleSunArc` — it maps time linearly
// to t across the daylight span, so we do the same.
export function tOnArc(ts, sunrise, sunset) {
  if (!sunrise || !sunset || sunset <= sunrise) return 0;
  return Math.max(0, Math.min(1, (ts - sunrise) / (sunset - sunrise)));
}

// Point on the arc's quadratic Bézier at param t (matches scheduleSunArc).
export function pointOnArc(t) {
  const x = (1 - t) ** 2 * 10 + 2 * (1 - t) * t * 100 + t ** 2 * 190;
  const y = (1 - t) ** 2 * 74 + 2 * (1 - t) * t * -26 + t ** 2 * 74;
  return { x, y };
}
