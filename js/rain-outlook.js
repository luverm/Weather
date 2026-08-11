// Hour-scale rain outlook — fills the gap between the minute-scale nowcast
// (imminent) and the alerts strip (severe totals). Reads the next 12 hourly
// buckets and produces a short headline plus a 12-cell probability strip.

const HORIZON = 12;                       // hours ahead to inspect
const RAIN_PROB = 40;                     // pop % that counts as "wet"
const RAIN_PRECIP = 0.2;                  // mm/h that counts as "wet"

export function buildRainOutlook(weather, now = Date.now()) {
  const source = weather?.hourly;
  if (!source?.length) return null;

  // Take the next HORIZON hours starting from the current bucket.
  const hours = [];
  for (const h of source) {
    if (h.time < now - 30 * 60_000) continue;
    hours.push(h);
    if (hours.length >= HORIZON) break;
  }
  if (!hours.length) return null;

  const cells = hours.map((h) => ({
    time: h.time,
    pop: clamp(h.pop ?? 0, 0, 100),
    precip: Math.max(0, h.precip ?? 0),
    wet: isWet(h),
  }));

  const rainingNow = cells[0].wet;
  const firstRain = cells.findIndex((c) => c.wet);
  const lastRain = lastIndex(cells, (c) => c.wet);
  const dryUntil = firstRain === -1
    ? cells[cells.length - 1].time
    : cells[firstRain].time;
  const peak = cells.reduce((best, c) => (c.pop > (best?.pop ?? -1) ? c : best), null);

  if (firstRain === -1) {
    const label = untilLabel(now, dryUntil);
    return {
      kind: "dry",
      headline: `Dry ${label}`,
      sub: `${HORIZON} h ahead — no rain expected.`,
      ts: null,
      cells,
    };
  }

  if (rainingNow) {
    // Find the first dry hour after now.
    const dry = cells.findIndex((c, i) => i > 0 && !c.wet);
    if (dry === -1) {
      return {
        kind: "wet-through",
        headline: `Rain through the next ${HORIZON} h`,
        sub: `Peak ${peak.pop}% around ${clock(peak.time)}.`,
        ts: peak.time,
        cells,
      };
    }
    return {
      kind: "easing",
      headline: `Rain easing around ${clock(cells[dry].time)}`,
      sub: `Currently ${cells[0].pop}% · dries after ${clock(cells[dry].time)}.`,
      ts: cells[dry].time,
      cells,
    };
  }

  const start = cells[firstRain].time;
  const end = cells[lastRain].time;
  const runLen = lastRain - firstRain + 1;
  const gapH = Math.max(1, Math.round((start - now) / 3600_000));

  if (runLen >= 4) {
    return {
      kind: "extended",
      headline: `Rain ${clock(start)}–${clock(end + 3600_000)}`,
      sub: `${runLen} h stretch, peak ${peak.pop}% around ${clock(peak.time)}.`,
      ts: start,
      cells,
    };
  }

  return {
    kind: "shower",
    headline: `Rain around ${clock(start)}${gapH > 1 ? ` · ~${gapH} h away` : ""}`,
    sub: runLen > 1
      ? `Brief window ${clock(start)}–${clock(end + 3600_000)} · peak ${peak.pop}%.`
      : `Short spell, ~${peak.pop}% chance.`,
    ts: start,
    cells,
  };
}

function isWet(h) {
  return (h?.pop ?? 0) >= RAIN_PROB || (h?.precip ?? 0) >= RAIN_PRECIP;
}

function untilLabel(now, ts) {
  const nowDate = new Date(now);
  const endDate = new Date(ts);
  const sameDay = nowDate.toDateString() === endDate.toDateString();
  const hour = nowDate.getHours();
  if (sameDay) {
    if (hour < 12) return "through the afternoon";
    if (hour < 17) return "through the evening";
    return "through the night";
  }
  return `through ${endDate.toLocaleTimeString([], { hour: "2-digit", hour12: false })}`;
}

function clock(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function lastIndex(arr, pred) {
  for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i], i)) return i;
  return -1;
}
