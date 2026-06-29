// Estimate today's bright sunshine hours from hourly cloud cover.
// Open-Meteo doesn't expose a "sunshine_duration" field on the free tier,
// so we approximate: each daylight hour contributes (100 - cloud%)/100 hours.

export function estimateSunshineHours(weather, { now = Date.now() } = {}) {
  if (!weather?.hourly?.length) return null;
  const today = weather.daily?.[0];
  if (!today?.sunrise || !today?.sunset) return null;

  let total = 0;
  let remaining = 0;
  let samples = 0;
  for (const h of weather.hourly) {
    if (h.time < today.sunrise - 30 * 60_000) continue;
    if (h.time > today.sunset + 30 * 60_000) break;
    if (h.clouds == null) continue;
    samples += 1;
    const fraction = clamp01((100 - h.clouds) / 100);
    total += fraction;
    if (h.time >= now - 30 * 60_000) remaining += fraction;
  }
  if (!samples) return null;
  return {
    total: round1(total),
    remaining: round1(remaining),
    samples,
  };
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function round1(v) { return Math.round(v * 10) / 10; }
