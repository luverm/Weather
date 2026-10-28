// A heuristic aurora-watch score. Open-Meteo's free tier doesn't expose the
// Kp index, so this leans on local conditions that matter for *seeing* an
// aurora rather than predicting one: latitude band, clear sky, dark hours,
// and a moon that isn't washing the sky out.
//
// Returns null when the location is nowhere near the auroral oval; otherwise
// an object the UI can turn into a small chip.

export function auroraWatch({ lat, weather }) {
  if (lat == null || !weather) return null;
  const absLat = Math.abs(lat);
  // Auroral ovals typically sit between 60°–75° magnetic latitude. Below ~50°
  // geographic the odds plummet except in storm events; below ~45° we skip.
  if (absLat < 45) return null;

  const now = Date.now();
  const isNight = !nextIsDay(weather, now);
  // During summer at high latitudes it never gets dark enough — bail.
  if (!isNight && absLat < 65) return null;

  // Look at the sky quality over the next few dark hours.
  const sampled = (weather.hourly || []).slice(0, 8).filter((h) => !h.isDay);
  if (!sampled.length) return null;
  const avgCloud = sampled.reduce((s, h) => s + (h.cloud ?? 100), 0) / sampled.length;
  const skyGood = avgCloud < 50;
  const moonLit = weather.moon?.illum ?? 0;
  const moonHelps = moonLit < 0.55;

  // Base score 0..3 — stronger at higher latitudes, better with dark skies.
  let score = 0;
  if (absLat >= 55) score++;
  if (absLat >= 62) score++;
  if (absLat >= 68) score++;
  if (skyGood) score++;
  if (moonHelps) score++;

  // Below 2 means not worth surfacing a chip.
  if (score < 2) return null;

  let label = "Possible";
  if (score >= 4) label = "Likely";
  else if (score >= 3) label = "Favourable";

  const detail = `${Math.round(avgCloud)}% cloud · moon ${Math.round(moonLit * 100)}%`;

  return { label, detail, score, cloud: avgCloud, moonIllum: moonLit };
}

function nextIsDay(weather, ts) {
  const near = (weather.hourly || []).find((h) => Math.abs(h.time - ts) < 45 * 60_000);
  if (near) return !!near.isDay;
  // Fall back to the top-level isDay from current.
  return !!weather.isDay;
}
