// Compute a compact "next precipitation" outlook from the hourly forecast.
//
// Given the weather object, returns:
//   {
//     status: "raining" | "starts" | "dry",
//     kind:   "rain" | "snow",
//     minutesUntil: number | null,    // when the next event starts
//     minutesRemaining: number | null,// when the current event ends
//     totalMm: number,                // sum across the next 24h
//     peakMm: number,                 // strongest single hour
//     peakTime: number | null,        // ts of that hour
//     eventDuration: number | null,   // hours of contiguous precip in event
//     bars: [{ time, precip, pop, isDay, isEvent }]   // 24 bars
//   }
//
// "Precipitating" means >= 0.15 mm/h (a real drizzle threshold). We fall back
// to precipitation probability >= 60 % when precip is missing but pop is high,
// so we don't wrongly announce "dry" on locations where the API only gives us
// probability.

const WET_MM = 0.15;
const POP_HIGH = 60;

export function precipOutlook(weather) {
  const hours = (weather?.hourly || []).slice(0, 24);
  if (!hours.length) return null;

  const bars = hours.map((h) => ({
    time: h.time,
    precip: h.precip || 0,
    pop: h.pop || 0,
    isDay: !!h.isDay,
    kind: precipKind(h.condition),
    isWet: isWet(h),
  }));

  const totalMm = bars.reduce((s, b) => s + b.precip, 0);
  let peakMm = 0, peakTime = null;
  for (const b of bars) if (b.precip > peakMm) { peakMm = b.precip; peakTime = b.time; }

  // Where does the first contiguous wet block start / end?
  const firstWet = bars.findIndex((b) => b.isWet);
  let status = "dry", minutesUntil = null, minutesRemaining = null, eventDuration = null;
  let eventStart = null, eventEnd = null;

  if (firstWet === 0) {
    // Currently precipitating — find when the block ends.
    status = "raining";
    let end = 0;
    while (end < bars.length && bars[end].isWet) end++;
    eventStart = bars[0].time;
    eventEnd = end < bars.length ? bars[end].time : bars[bars.length - 1].time + 3600_000;
    eventDuration = end;
    minutesRemaining = Math.max(0, Math.round((eventEnd - Date.now()) / 60_000));
  } else if (firstWet > 0) {
    status = "starts";
    let end = firstWet;
    while (end < bars.length && bars[end].isWet) end++;
    eventStart = bars[firstWet].time;
    eventEnd = end < bars.length ? bars[end].time : bars[bars.length - 1].time + 3600_000;
    eventDuration = end - firstWet;
    minutesUntil = Math.max(0, Math.round((eventStart - Date.now()) / 60_000));
  }

  // Flag which bars belong to the primary event (for highlighting).
  for (const b of bars) {
    b.isEvent = eventStart != null && b.time >= eventStart && b.time < eventEnd;
  }

  const kind = dominantKind(bars);

  return {
    status, kind,
    minutesUntil, minutesRemaining,
    totalMm, peakMm, peakTime,
    eventStart, eventEnd, eventDuration,
    bars,
  };
}

function isWet(h) {
  if ((h.precip || 0) >= WET_MM) return true;
  // API sometimes lacks precip for future hours but has strong pop.
  if ((h.precip || 0) === 0 && (h.pop || 0) >= POP_HIGH) return true;
  return false;
}

function precipKind(condition) {
  if (condition === "snow") return "snow";
  return "rain";
}

function dominantKind(bars) {
  let snow = 0, rain = 0;
  for (const b of bars) {
    if (!b.isWet) continue;
    if (b.kind === "snow") snow++; else rain++;
  }
  return snow > rain ? "snow" : "rain";
}

// Format helpers used by the UI layer.

export function formatDuration(minutes) {
  if (minutes == null || !isFinite(minutes)) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function summarize(outlook, tz) {
  if (!outlook) return { headline: "—", detail: "", tone: "neutral" };
  const kindLabel = outlook.kind === "snow" ? "Snow" : "Rain";

  if (outlook.status === "raining") {
    if (outlook.minutesRemaining == null || outlook.minutesRemaining <= 0) {
      return {
        headline: `${kindLabel} easing`,
        detail: `${outlook.totalMm.toFixed(1)} mm expected in 24 h`,
        tone: "wet",
      };
    }
    return {
      headline: `${kindLabel} for ${formatDuration(outlook.minutesRemaining)}`,
      detail: `${outlook.totalMm.toFixed(1)} mm in 24 h · peak ${outlook.peakMm.toFixed(1)} mm/h`,
      tone: "wet",
    };
  }

  if (outlook.status === "starts") {
    const when = outlook.minutesUntil <= 0
      ? `${kindLabel} imminent`
      : `${kindLabel} in ${formatDuration(outlook.minutesUntil)}`;
    const startAt = formatClock(outlook.eventStart, tz);
    const durText = outlook.eventDuration
      ? ` · about ${outlook.eventDuration} h`
      : "";
    return {
      headline: when,
      detail: `Starts ${startAt}${durText}`,
      tone: "wet",
    };
  }

  // Dry
  return {
    headline: "Dry next 24 h",
    detail: outlook.totalMm > 0
      ? `Only ${outlook.totalMm.toFixed(1)} mm expected`
      : "No precipitation in the forecast",
    tone: "dry",
  };
}

function formatClock(ts, tz) {
  if (ts == null) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: (tz && tz !== "auto") ? tz : undefined,
    }).format(new Date(ts));
  } catch {
    const d = new Date(ts);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
}
