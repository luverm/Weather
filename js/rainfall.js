// Rainfall outlook summary. Aggregates the existing hourly + daily precip data
// into a single card-ready snapshot. Returns null when there's nothing
// interesting to show (so the UI can hide the card cleanly).

const HEAVY_MM = 4;      // per-hour threshold for "heavy"
const MODERATE_MM = 1;   // per-hour threshold for "moderate"

export function buildRainfall(weather) {
  if (!weather) return null;
  const hourly = weather.hourly || [];
  const daily = weather.daily || [];
  if (!hourly.length && !daily.length) return null;

  const now = Date.now();
  const next24 = hourly.filter((h) => h.time >= now - 30 * 60_000).slice(0, 24);
  const next6h = next24.slice(0, 6).reduce((s, h) => s + (h.precip || 0), 0);

  // Today/tomorrow totals: prefer the daily forecast (calendar days) when
  // available; otherwise approximate by summing hourly buckets per local day.
  const today = daily[0]?.precip ?? sumHoursForDay(hourly, 0);
  const tomorrow = daily[1]?.precip ?? sumHoursForDay(hourly, 1);

  // Peak hour within the next 24h.
  let peak = null;
  for (const h of next24) {
    if (h.precip == null) continue;
    if (!peak || h.precip > peak.precip) peak = h;
  }

  // Hide the card if there's essentially no rain in any window we'd display.
  const totalSoon = (today || 0) + (tomorrow || 0) + next6h;
  if (totalSoon < 0.1 && (!peak || peak.precip < 0.05)) return null;

  const level = classify(peak?.precip ?? 0, today ?? 0);
  const narrative = buildNarrative({ today, tomorrow, peak, next6h, next24 });

  return {
    today: today ?? 0,
    tomorrow: tomorrow ?? 0,
    next6h,
    peak,
    hours: next24,
    level: level.label,
    levelClass: level.cls,
    narrative,
  };
}

function sumHoursForDay(hourly, dayOffset) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + dayOffset);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  let sum = 0;
  for (const h of hourly) {
    if (h.time >= start.getTime() && h.time < end.getTime()) sum += h.precip || 0;
  }
  return sum;
}

function classify(peakPrecip, todayTotal) {
  if (peakPrecip >= HEAVY_MM || todayTotal >= 15) return { label: "Heavy", cls: "up" };
  if (peakPrecip >= MODERATE_MM || todayTotal >= 5) return { label: "Moderate", cls: "flat" };
  if (peakPrecip > 0.1 || todayTotal > 0.5) return { label: "Light", cls: "down" };
  return { label: "Dry", cls: "down" };
}

function buildNarrative({ today, tomorrow, peak, next6h, next24 }) {
  const round = (v) => (v >= 10 ? Math.round(v) : (Math.round(v * 10) / 10));
  // Find the contiguous wet window around the peak so we can say "rain
  // through 8 pm" rather than just naming the single wettest hour.
  if (peak && peak.precip >= 0.1) {
    const peakIdx = next24.findIndex((h) => h.time === peak.time);
    if (peakIdx >= 0) {
      let endIdx = peakIdx;
      for (let i = peakIdx + 1; i < next24.length; i++) {
        if ((next24[i].precip || 0) >= 0.1) endIdx = i; else break;
      }
      // First dry hour after the wet streak; falls back to the last wet
      // hour if the streak runs to the end of the window.
      const dryHour = next24[endIdx + 1] ?? next24[endIdx];
      if (endIdx > peakIdx + 1) {
        return `Peak ${round(peak.precip)} mm at ${fmtClock(peak.time)}, easing by ${fmtClock(dryHour.time)}.`;
      }
      return `Peak ${round(peak.precip)} mm around ${fmtClock(peak.time)}.`;
    }
  }
  if (next6h > 0.2) return `About ${round(next6h)} mm in the next 6 hours.`;
  if (tomorrow > today + 1) return `Quiet today — wetter tomorrow (${round(tomorrow)} mm).`;
  if (today >= 5) return `Wet day — ${round(today)} mm expected.`;
  if (today > 0.5) return `Light passing showers — ${round(today)} mm today.`;
  return "Mostly dry — just a trace expected.";
}

function fmtClock(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "numeric" });
  } catch {
    const d = new Date(ts);
    return `${d.getHours()}:00`;
  }
}
