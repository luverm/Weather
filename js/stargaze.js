// Tonight's sky-clarity forecast.
//
// Looks at the upcoming night hours (after sunset, before next sunrise) and
// scores how clear the sky will be for naked-eye viewing. Inputs:
// - cloud cover at each night hour (lower = better)
// - precipitation (anything > drizzle wipes the score)
// - condition (storm/fog short-circuit)
// - moon illumination (less = darker, better for faint stars)
//
// Returns { score 0..100, label, tone, hours: { start, end, count, clear } }
// or null when no relevant night window is available.

const TONES = [
  [78, "Excellent", "clear"],
  [60, "Good",      "good"],
  [40, "Fair",      "fair"],
  [20, "Poor",      "poor"],
  [0,  "Cloudy",    "dim"],
];

export function tonightSkyClarity(weather, now = Date.now()) {
  if (!weather) return null;
  const window = pickNightWindow(weather, now);
  if (!window) return null;
  const hours = (weather.hourly || []).filter(
    (h) => h.time >= window.start && h.time <= window.end
  );
  if (!hours.length) return null;

  let cloudSum = 0, count = 0, clearCount = 0;
  let blocked = false;
  for (const h of hours) {
    if (h.condition === "storm" || h.condition === "fog" || (h.precip ?? 0) > 0.5) {
      blocked = true;
    }
    if (h.cloud != null) {
      cloudSum += h.cloud;
      count++;
      if (h.cloud <= 25) clearCount++;
    }
  }

  // If we have no cloud data at all for any night hour, bail rather than fake.
  if (count === 0) return null;

  const avgCloud = cloudSum / count;
  let score = clamp(100 - avgCloud, 0, 100);

  // Bonus: chunks of pristine sky.
  const clearFrac = clearCount / count;
  if (clearFrac >= 0.6) score = Math.min(100, score + 8);

  // Moon: a bright full moon washes the faintest stars out a touch.
  const illum = weather.moon?.illum ?? 0;
  if (illum >= 0.8) score -= 6;
  else if (illum <= 0.15) score += 4;

  if (blocked) score = Math.min(score, 30);
  score = Math.round(clamp(score, 0, 100));

  const bucket = TONES.find(([floor]) => score >= floor) || TONES[TONES.length - 1];
  const [, label, tone] = bucket;

  return {
    score,
    label,
    tone,
    avgCloud: Math.round(avgCloud),
    clearHours: clearCount,
    totalHours: count,
    blocked,
  };
}

// The "night window" runs from the next sunset (or current time, if already
// past sunset) to the following sunrise. Bounded to whatever hourly data we
// actually have.
function pickNightWindow(weather, now) {
  const days = weather.daily || [];
  if (!days.length) return null;
  let nextSunset = null;
  let followingSunrise = null;
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    if (d.sunset && d.sunset > now && nextSunset == null) {
      nextSunset = d.sunset;
      const nextDay = days[i + 1];
      followingSunrise = nextDay?.sunrise || null;
      break;
    }
  }
  // If we're already past today's sunset, the active night starts now and ends
  // at tomorrow's sunrise (which is days[1].sunrise — days[0].sunrise is past).
  if (nextSunset == null) {
    const todaySunset = days[0]?.sunset;
    const tomorrowSunrise = days[1]?.sunrise;
    if (todaySunset && todaySunset <= now && tomorrowSunrise && tomorrowSunrise > now) {
      return { start: now, end: tomorrowSunrise };
    }
    return null;
  }
  // The night is more than ~18h away — don't bother.
  if (nextSunset - now > 18 * 3600_000) return null;
  if (!followingSunrise) return { start: nextSunset, end: nextSunset + 8 * 3600_000 };
  return { start: nextSunset, end: followingSunrise };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
