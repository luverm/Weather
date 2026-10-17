// Precipitation accumulation outlook.
//
// Summarises the next 24 hours of expected rainfall into a single card:
// total mm, peak intensity hour, and a per-hour bar strip. Complements the
// hourly chart (which emphasises probability) by showing _amounts_.

const DRY_THRESHOLD_MM = 0.3; // Below this, we don't surface the card at all.

/**
 * Build an outlook object from the forecast's `hourly` series.
 *
 * @param {Array} hourly  Normalised hourly entries (time, precip, pop, condition).
 * @param {number} [horizonHours=24]
 * @returns {null | {
 *   totalMm:number, maxHour:{time:number,mm:number}|null,
 *   firstWetHour:{time:number,mm:number}|null,
 *   hours: Array<{time:number, mm:number, pop:number, kind:"rain"|"snow"}>,
 *   snowy:boolean
 * }}
 */
export function buildPrecipOutlook(hourly, horizonHours = 24) {
  if (!Array.isArray(hourly) || hourly.length === 0) return null;
  const slice = hourly.slice(0, horizonHours);
  let total = 0;
  let peak = null;
  let firstWet = null;
  let snowyCount = 0;
  const hours = slice.map((h) => {
    const mm = Math.max(0, Number(h.precip) || 0);
    total += mm;
    if (mm > 0 && (!peak || mm > peak.mm)) peak = { time: h.time, mm };
    if (mm >= 0.1 && !firstWet) firstWet = { time: h.time, mm };
    const kind = h.condition === "snow" ? "snow" : "rain";
    if (kind === "snow") snowyCount++;
    return { time: h.time, mm, pop: Math.max(0, Number(h.pop) || 0), kind };
  });
  if (total < DRY_THRESHOLD_MM) return null;
  return {
    totalMm: total,
    maxHour: peak,
    firstWetHour: firstWet,
    hours,
    snowy: snowyCount > hours.length / 2,
  };
}

export const PRECIP_DRY_THRESHOLD_MM = DRY_THRESHOLD_MM;
