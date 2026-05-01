// Synthesize a "today's story" — a 3-to-4 chapter timeline built from the
// hourly forecast. Each chapter summarizes a slice of the day with the
// dominant condition, average temp, and a short headline phrase.
//
// Output: [{ key, label, startTs, endTs, condition, label, tempAvg, peakPop, phrase }]

const CHAPTERS = [
  { key: "morning", label: "Morning", from: 6, to: 12 },
  { key: "afternoon", label: "Afternoon", from: 12, to: 17 },
  { key: "evening", label: "Evening", from: 17, to: 21 },
  { key: "night", label: "Night", from: 21, to: 30 }, // wraps past midnight
];

export function buildStory(weather, { tz } = {}) {
  if (!weather?.hourly?.length) return [];
  const useTz = tz && tz !== "auto" ? tz : null;
  // Anchor on the local day of the first hourly entry.
  const dayStart = startOfLocalDay(weather.hourly[0].time, useTz);

  const chapters = [];
  for (const c of CHAPTERS) {
    const startTs = dayStart + c.from * 3600_000;
    const endTs = dayStart + c.to * 3600_000;
    const hrs = weather.hourly.filter(
      (h) => h.time >= startTs && h.time < endTs && h.temp != null,
    );
    if (hrs.length < 2) continue;
    const tempAvg = hrs.reduce((s, h) => s + h.temp, 0) / hrs.length;
    const peakPop = Math.max(0, ...hrs.map((h) => h.pop || 0));
    const dominant = pickDominant(hrs);
    chapters.push({
      key: c.key,
      label: c.label,
      startTs: hrs[0].time,
      endTs: hrs[hrs.length - 1].time,
      condition: dominant.condition,
      conditionLabel: dominant.label,
      tempAvg,
      peakPop,
      phrase: phraseFor(tempAvg, dominant.condition, peakPop),
    });
  }
  return chapters;
}

// Pick the most "noteworthy" condition over the chapter, biasing toward
// stormy / wet conditions over benign ones.
function pickDominant(hours) {
  const PRIO = ["storm", "snow", "rain", "fog", "clouds", "clear"];
  const counts = {};
  for (const h of hours) counts[h.condition] = (counts[h.condition] || 0) + 1;
  for (const p of PRIO) {
    // Significant condition: at least 1 hour for storm/snow, ≥30% of chapter
    // for others — avoids a single misty hour overshadowing 5 sunny hours.
    const required = p === "storm" || p === "snow" ? 1 : Math.ceil(hours.length * 0.3);
    if ((counts[p] ?? 0) >= required) {
      const exemplar = hours.find((h) => h.condition === p);
      return { condition: p, label: exemplar?.label || p };
    }
  }
  // Fallback: most common.
  let best = hours[0];
  let bestCount = 0;
  for (const h of hours) {
    if (counts[h.condition] > bestCount) { bestCount = counts[h.condition]; best = h; }
  }
  return { condition: best.condition, label: best.label };
}

function phraseFor(temp, condition, pop) {
  const tempWord =
    temp < -5 ? "Frigid"
    : temp < 2 ? "Freezing"
    : temp < 10 ? "Cool"
    : temp < 18 ? "Mild"
    : temp < 26 ? "Warm"
    : temp < 32 ? "Hot"
    : "Scorching";
  const condWord =
    condition === "storm" ? "thunder"
    : condition === "snow" ? "snowy"
    : condition === "rain" ? "wet"
    : condition === "fog" ? "foggy"
    : condition === "clouds" ? "cloudy"
    : "clear";
  // Suffix "shower-prone" when pop high but condition is clouds.
  const tail = (condition === "clouds" && pop >= 50) ? ", shower-prone" : "";
  return `${tempWord}, ${condWord}${tail}`;
}

function startOfLocalDay(ts, tz) {
  if (tz) {
    try {
      const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric", month: "2-digit", day: "2-digit",
      });
      const parts = fmt.formatToParts(new Date(ts));
      const y = parts.find((p) => p.type === "year").value;
      const m = parts.find((p) => p.type === "month").value;
      const d = parts.find((p) => p.type === "day").value;
      // Re-parse as the start of that day in tz; approximate via Date parse.
      // We accept a few minutes of skew in DST edge cases.
      return Date.UTC(+y, +m - 1, +d) + tzOffsetMs(tz, +y, +m - 1, +d);
    } catch { /* fall through */ }
  }
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function tzOffsetMs(tz, y, m, d) {
  // Compute UTC-offset for tz at noon of the given date so we land in the
  // right local day even across DST.
  try {
    const noon = Date.UTC(y, m, d, 12, 0, 0);
    const here = new Date(noon);
    const local = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).formatToParts(here);
    const get = (t) => +local.find((p) => p.type === t).value;
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
    return -(asUtc - noon);
  } catch {
    return 0;
  }
}
