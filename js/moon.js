// Local moon-rise / moon-set and next-phase estimates.
// Open-Meteo's free tier doesn't carry moonrise/moonset, so we approximate
// them. Accuracy is well within a few minutes — plenty for a UI badge.
//
// Rise/set uses the standard low-precision lunar ephemeris + a linear
// hour-angle solve on the local observer. Not published-paper precise, but
// comparable to typical weather-app numbers.

const SYNODIC = 29.530588853;   // mean lunation length (days)
const JD2000 = 2451545.0;       // J2000.0

export function moonTimes(date, lat, lon) {
  // Returns { rise, set, alwaysUp, alwaysDown } for the given local date.
  // Dates in ms. If the moon never rises/sets that day, returns the flags.
  const d0 = new Date(date);
  d0.setHours(0, 0, 0, 0);
  const startMs = d0.getTime();

  // Sample lunar altitude every 10 minutes across the day; find zero
  // crossings and refine with linear interpolation.
  let rise = null, set = null;
  let prevAlt = altitude(startMs, lat, lon);
  let maxAlt = prevAlt, minAlt = prevAlt;
  for (let m = 10; m <= 1440; m += 10) {
    const ts = startMs + m * 60_000;
    const alt = altitude(ts, lat, lon);
    maxAlt = Math.max(maxAlt, alt);
    minAlt = Math.min(minAlt, alt);
    if (prevAlt < 0 && alt >= 0 && rise == null) {
      const frac = -prevAlt / (alt - prevAlt);
      rise = startMs + (m - 10 + frac * 10) * 60_000;
    }
    if (prevAlt >= 0 && alt < 0 && set == null) {
      const frac = prevAlt / (prevAlt - alt);
      set = startMs + (m - 10 + frac * 10) * 60_000;
    }
    prevAlt = alt;
  }

  return {
    rise,
    set,
    alwaysUp: rise == null && set == null && minAlt >= 0,
    alwaysDown: rise == null && set == null && maxAlt < 0,
  };
}

// Returns moon altitude (degrees) at ms for the given observer.
function altitude(ms, lat, lon) {
  const JD = ms / 86_400_000 + 2440587.5;
  const d = JD - JD2000;
  // Low-precision lunar position (Meeus-ish, degrees).
  const L = norm360(218.316 + 13.176396 * d);          // mean longitude
  const M = norm360(134.963 + 13.064993 * d);          // mean anomaly
  const F = norm360(93.272 + 13.229350 * d);           // argument of latitude
  const lambda = L + 6.289 * sinD(M);                  // ecliptic longitude
  const beta = 5.128 * sinD(F);                        // ecliptic latitude
  const epsilon = 23.4397;                              // obliquity
  // Ecliptic -> equatorial
  const sinDec = sinD(beta) * cosD(epsilon) + cosD(beta) * sinD(epsilon) * sinD(lambda);
  const dec = Math.asin(sinDec) * 180 / Math.PI;
  const ra = Math.atan2(
    sinD(lambda) * cosD(epsilon) - tanD(beta) * sinD(epsilon),
    cosD(lambda)
  ) * 180 / Math.PI;
  // Local sidereal time (degrees)
  const gmst = norm360(280.46061837 + 360.98564736629 * d);
  const lst = norm360(gmst + lon);
  const H = norm360(lst - ra); // hour angle (0..360)
  const Hd = H > 180 ? H - 360 : H;
  const sinAlt = sinD(lat) * sinDec + cosD(lat) * Math.cos(dec * Math.PI / 180) * cosD(Hd);
  return Math.asin(sinAlt) * 180 / Math.PI;
}

function sinD(deg) { return Math.sin(deg * Math.PI / 180); }
function cosD(deg) { return Math.cos(deg * Math.PI / 180); }
function tanD(deg) { return Math.tan(deg * Math.PI / 180); }
function norm360(x) { return ((x % 360) + 360) % 360; }

// Return days until the next key phase (new, first-quarter, full, last-quarter)
// from `phase` (0..1). Also returns the phase name and the target date in ms.
export function nextPhases(phase, now) {
  const keyPhases = [
    { name: "New moon",    at: 0 },
    { name: "First quarter", at: 0.25 },
    { name: "Full moon",   at: 0.5 },
    { name: "Last quarter",at: 0.75 },
  ];
  // Find the next phase > current one; wrap if we're past 0.75.
  let soonest = null;
  for (const kp of keyPhases) {
    let dPhase = kp.at - phase;
    if (dPhase <= 0.005) dPhase += 1; // nearly on this phase -> go to next cycle
    const days = dPhase * SYNODIC;
    if (!soonest || days < soonest.days) soonest = { ...kp, days };
  }
  // Full moon specifically — handy to show always.
  let fullDays = 0.5 - phase;
  if (fullDays <= 0.005) fullDays += 1;
  fullDays *= SYNODIC;
  return {
    next: soonest,
    nextTs: now + soonest.days * 86_400_000,
    nextFull: { days: fullDays, ts: now + fullDays * 86_400_000 },
  };
}
