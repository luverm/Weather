// Precipitation outlook: summarize the next 24 hourly points into a
// clickable timeline of intensity bars, plus a headline total and peak.
//
// Returned shape:
//   {
//     bars:    [{ ts, mm, pop, kind, level }],  // 24 entries at most
//     totalMm, wetHours, peak: { ts, mm } | null,
//     kind:    "rain" | "snow" | "mixed" | "dry",
//     dryReason: string | null,                 // populated when nothing meaningful
//     firstWetTs, lastWetTs,                    // for the "starts…" phrase
//   }
//
// Callers can hide the card whenever `dryReason` is set — the module doesn't
// itself decide visibility, so tests can still inspect the summary.

const WET_THRESHOLD_MM = 0.1;
const SNOW_CODES = new Set(["snow"]);
const RAIN_CODES = new Set(["rain", "storm", "drizzle"]);

function intensityLevel(mm) {
  if (mm < 0.1) return 0;
  if (mm < 0.5) return 1;   // trace / drizzle
  if (mm < 2.0) return 2;   // light
  if (mm < 5.0) return 3;   // moderate
  if (mm < 10.0) return 4;  // heavy
  return 5;                 // torrential
}

function classify(cond) {
  if (!cond) return "rain";
  if (SNOW_CODES.has(cond)) return "snow";
  if (RAIN_CODES.has(cond)) return "rain";
  return "rain";
}

export function buildPrecipOutlook(weather) {
  const hourly = (weather?.hourly || []).slice(0, 24);
  if (!hourly.length) {
    return {
      bars: [], totalMm: 0, wetHours: 0, peak: null,
      kind: "dry", dryReason: "No hourly data yet",
      firstWetTs: null, lastWetTs: null,
    };
  }

  const bars = hourly.map((h) => {
    const mm = Math.max(0, h.precip ?? 0);
    const pop = Math.max(0, Math.min(100, h.pop ?? 0));
    return {
      ts: h.time,
      mm,
      pop,
      kind: classify(h.condition),
      level: intensityLevel(mm),
    };
  });

  let totalMm = 0;
  let wetHours = 0;
  let peak = null;
  let firstWetTs = null;
  let lastWetTs = null;
  let rainCount = 0, snowCount = 0;

  for (const b of bars) {
    totalMm += b.mm;
    if (b.mm >= WET_THRESHOLD_MM) {
      wetHours += 1;
      if (firstWetTs == null) firstWetTs = b.ts;
      lastWetTs = b.ts;
      if (b.kind === "snow") snowCount += 1;
      else rainCount += 1;
      if (!peak || b.mm > peak.mm) peak = { ts: b.ts, mm: b.mm };
    }
  }

  // High-pop but zero-mm hours still deserve a nod ("60% but dry — likely near-misses").
  const maxPop = bars.reduce((m, b) => Math.max(m, b.pop), 0);

  let kind = "dry";
  if (wetHours > 0) {
    if (snowCount > 0 && rainCount > 0) kind = "mixed";
    else if (snowCount > 0) kind = "snow";
    else kind = "rain";
  }

  let dryReason = null;
  if (wetHours === 0) {
    if (maxPop >= 30) {
      dryReason = `A ${maxPop}% chance, but no measurable amount expected`;
    } else {
      dryReason = "No rain or snow expected in the next 24 hours";
    }
  }

  return {
    bars, totalMm, wetHours, peak, kind, dryReason,
    firstWetTs, lastWetTs, maxPop,
  };
}

/** Human "starts in 3 h · lasts 4 h" phrase or similar. */
export function precipTimingPhrase(outlook, nowTs = Date.now()) {
  if (!outlook || outlook.kind === "dry" || outlook.firstWetTs == null) return "";
  const mins = Math.max(0, Math.round((outlook.firstWetTs - nowTs) / 60_000));
  const startsStr =
    mins < 30 ? "Starts now" :
    mins < 90 ? `Starts in ~${Math.round(mins / 15) * 15} min` :
    `Starts in ~${Math.round(mins / 60)} h`;
  const spanHours = outlook.wetHours;
  const lasts = spanHours >= 2 ? ` · ${spanHours} wet hours` : "";
  return startsStr + lasts;
}
