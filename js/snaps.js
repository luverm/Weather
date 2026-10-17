// Compact "jump to a notable moment" chips rendered below the scrubber.
// Each entry is clickable to scrub the forecast to that time.

const ICON = {
  sunrise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18h16M12 3v6M8 7l4-4 4 4M6 14a6 6 0 0112 0"/></svg>',
  sunset:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18h16M12 9V3M8 5l4 4 4-4M6 14a6 6 0 0112 0"/></svg>',
  warm:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5l1.5-1.5M17 7l1.5-1.5"/></svg>',
  cold:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M4 6l16 12M20 6L4 18M2 12h20"/></svg>',
  rain:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14a4 4 0 010-8 5 5 0 019.9-1A4 4 0 0117 14H7z"/><path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3"/></svg>',
};

/**
 * Build the list of snap chips from a weather snapshot.
 * @returns {Array<{id:string, label:string, time:number, icon:string, tone:string}>}
 */
export function buildSnaps(weather, { horizonHours = 24 } = {}) {
  if (!weather) return [];
  const now = Date.now();
  const hours = (weather.hourly || []).filter((h) => h.time > now).slice(0, horizonHours);
  const snaps = [];

  // Next sunrise within 24h.
  const sr = pickNextOf(weather.daily?.map((d) => d.sunrise), now, 36 * 3600_000);
  if (sr) snaps.push({ id: "sunrise", label: "Sunrise", time: sr, icon: ICON.sunrise, tone: "sun" });

  // Warmest / coldest in the horizon — only surface when the spread is big
  // enough to be interesting (>= 4°).
  let warm = null, cold = null;
  for (const h of hours) {
    if (warm == null || h.temp > warm.temp) warm = h;
    if (cold == null || h.temp < cold.temp) cold = h;
  }
  if (warm && cold && warm.temp - cold.temp >= 4) {
    snaps.push({
      id: "warmest", label: `Warmest ${Math.round(warm.temp)}°`,
      time: warm.time, icon: ICON.warm, tone: "warm",
    });
    snaps.push({
      id: "coldest", label: `Coldest ${Math.round(cold.temp)}°`,
      time: cold.time, icon: ICON.cold, tone: "cool",
    });
  }

  // Peak rain hour (if any precipitation).
  let peakRain = null;
  for (const h of hours) {
    const mm = Number(h.precip) || 0;
    if (mm > 0 && (!peakRain || mm > peakRain.mm)) peakRain = { time: h.time, mm };
  }
  if (peakRain && peakRain.mm >= 0.2) {
    snaps.push({
      id: "rain", label: `Peak ${peakRain.mm.toFixed(1)}mm`,
      time: peakRain.time, icon: ICON.rain, tone: "wet",
    });
  }

  // Next sunset within 24h.
  const ss = pickNextOf(weather.daily?.map((d) => d.sunset), now, 36 * 3600_000);
  if (ss) snaps.push({ id: "sunset", label: "Sunset", time: ss, icon: ICON.sunset, tone: "sun" });

  // Deduplicate by id (first wins) and keep stable chronological order by time.
  const seen = new Set();
  const unique = snaps.filter((s) => s.time != null && !seen.has(s.id) && (seen.add(s.id), true));
  unique.sort((a, b) => a.time - b.time);
  return unique;
}

function pickNextOf(series, now, horizon) {
  if (!Array.isArray(series)) return null;
  let best = null;
  for (const ts of series) {
    if (!ts || ts <= now) continue;
    if (ts > now + horizon) continue;
    if (!best || ts < best) best = ts;
  }
  return best;
}
