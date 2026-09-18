// Predicts the visual quality of the next sunrise or sunset ("golden hour")
// and computes the golden-hour clock window around that event.
//
// Inputs: the normalized weather object (`w.hourly[]` with cloudCover, plus
// `w.daily[]` with sunrise/sunset). Output is either null (nothing to show)
// or `{ kind, whenTs, goldenStart, goldenEnd, cloudPct, score, label, tone,
// obscured }` — small, self-describing, ready for the UI layer.
//
// Scoring is intentionally simple and observational (broken mid-clouds paint
// the best sunsets); it's a nudge, not a promise.

const HOUR = 3600_000;
const MINUTE = 60_000;

/** Find the closest hourly cloud-cover value to a timestamp, or null. */
function cloudCoverAt(hourly, ts) {
  if (!hourly?.length) return null;
  let best = null, bestDiff = Infinity;
  for (const h of hourly) {
    if (h?.cloudCover == null) continue;
    const diff = Math.abs(h.time - ts);
    if (diff < bestDiff) { best = h; bestDiff = diff; }
  }
  // Only trust the sample if within ~90 min of the event.
  if (!best || bestDiff > 90 * MINUTE) return null;
  return best.cloudCover;
}

/** Is any hour in the ±window flagged as fog / rain / snow / storm? */
function obscuringConditionNear(hourly, ts, windowMs = 60 * MINUTE) {
  if (!hourly?.length) return null;
  for (const h of hourly) {
    if (Math.abs(h.time - ts) > windowMs) continue;
    if (h.condition === "fog") return "fog";
    if (h.condition === "rain") return "rain";
    if (h.condition === "snow") return "snow";
    if (h.condition === "storm") return "storm";
  }
  return null;
}

/** Cloud-cover-only score in [0,100]: broken mid-clouds score highest. */
function cloudScore(pct) {
  if (pct == null) return 55; // neutral guess
  // Piecewise: 0→60, 30→85, 55→95, 75→55, 95→10, 100→0
  const anchors = [
    [0, 55],
    [15, 78],
    [30, 88],
    [50, 95],
    [70, 62],
    [85, 30],
    [100, 5],
  ];
  for (let i = 1; i < anchors.length; i++) {
    const [x0, y0] = anchors[i - 1];
    const [x1, y1] = anchors[i];
    if (pct <= x1) {
      const t = (pct - x0) / (x1 - x0);
      return Math.round(y0 + (y1 - y0) * t);
    }
  }
  return 5;
}

function labelFor(score, kind, obscured) {
  const noun = kind === "Sunrise" ? "sunrise" : "sunset";
  if (obscured === "fog") return { label: `Foggy ${noun} — muted`, tone: "muted" };
  if (obscured === "rain") return { label: `Rain during ${noun}`, tone: "muted" };
  if (obscured === "snow") return { label: `Snow during ${noun}`, tone: "muted" };
  if (obscured === "storm") return { label: `Stormy ${noun}`, tone: "muted" };
  if (score >= 85) return { label: `Vivid ${noun} likely`, tone: "vivid" };
  if (score >= 70) return { label: `Warm ${noun} light`, tone: "warm" };
  if (score >= 50) return { label: `Fair ${noun}`, tone: "fair" };
  if (score >= 30) return { label: `Muted ${noun}`, tone: "muted" };
  return { label: `Overcast ${noun}`, tone: "overcast" };
}

/**
 * Compute the next sun event (>= now) from w.daily[] and its predicted quality.
 * Returns null if we can't find an upcoming event.
 */
export function nextSunQuality(weather, nowTs = Date.now()) {
  const daily = weather?.daily;
  if (!daily?.length) return null;
  let whenTs = null, kind = null;
  for (const d of daily) {
    for (const [ts, k] of [[d.sunrise, "Sunrise"], [d.sunset, "Sunset"]]) {
      if (ts && ts > nowTs && (!whenTs || ts < whenTs)) { whenTs = ts; kind = k; }
    }
  }
  if (!whenTs) return null;

  const cloudPct = cloudCoverAt(weather.hourly, whenTs);
  const obscured = obscuringConditionNear(weather.hourly, whenTs, 45 * MINUTE);
  const rawScore = cloudScore(cloudPct);
  const score = obscured ? Math.min(rawScore, 25) : rawScore;
  const { label, tone } = labelFor(score, kind, obscured);

  // Golden hour: roughly the 30 minutes on the "day" side of the horizon.
  // Sunrise: from sunrise-5min to sunrise+35min. Sunset: -35 to +5.
  const goldenStart = kind === "Sunrise" ? whenTs - 5 * MINUTE : whenTs - 35 * MINUTE;
  const goldenEnd   = kind === "Sunrise" ? whenTs + 35 * MINUTE : whenTs + 5 * MINUTE;

  return {
    kind,
    whenTs,
    goldenStart,
    goldenEnd,
    cloudPct,
    score,
    label,
    tone,
    obscured,
  };
}
