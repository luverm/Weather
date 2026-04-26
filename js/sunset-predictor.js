// Predict the colour quality of sunrise / sunset from cloud cover and humidity.
// The classic "vivid sunset" recipe: mid-altitude clouds (40–80% cover) catch
// red/orange light, while overcast (>90%) blocks the show entirely and clear
// skies (<10%) are pretty but unspectacular.
//
// Returns { event: "sunrise"|"sunset", time, score: 0..1, label, detail } or
// null if there's no upcoming sunrise/sunset in the next ~14 hours.

export function predictNextHorizonShow(weather) {
  if (!weather?.hourly?.length || !weather.daily?.length) return null;
  const now = Date.now();
  const horizon = now + 14 * 3600_000;

  // Find the next sunrise or sunset within the lookahead.
  let next = null;
  for (const d of weather.daily) {
    for (const [ts, kind] of [[d.sunrise, "sunrise"], [d.sunset, "sunset"]]) {
      if (!ts) continue;
      if (ts < now - 30 * 60_000) continue; // already happened
      if (ts > horizon) continue;
      if (!next || ts < next.ts) next = { ts, kind };
    }
  }
  if (!next) return null;

  // Sample cloud cover at the hour bracketing the event.
  const sample = nearestHour(weather.hourly, next.ts);
  if (!sample) return null;

  // Look at the hour just before and after too so we can detect "scattered"
  // versus "thickening" cloud, which affects the show.
  const before = nearestHour(weather.hourly, next.ts - 3600_000);
  const after  = nearestHour(weather.hourly, next.ts + 3600_000);

  const cc = sample.cloudCover ?? 50;
  const ccBefore = before?.cloudCover ?? cc;
  const ccAfter = after?.cloudCover ?? cc;
  const avg = (cc + ccBefore + ccAfter) / 3;
  const visibilityKm = sample.visibility != null ? sample.visibility / 1000 : 12;
  const humidity = sample.humidity ?? 60;

  // Score peaks around 50–70% cloud cover.
  // Map cc 0..100 → score using a tent function centred at 60%.
  const ccScore = Math.max(0, 1 - Math.abs(avg - 60) / 50);
  // Visibility & humidity tweaks.
  let s = ccScore;
  if (visibilityKm < 6) s *= 0.6; // hazy air dulls colour
  if (humidity > 92) s *= 0.7;    // very damp air saturates everything grey

  // If the actual sunrise/sunset hour itself is fully overcast we cap.
  if (cc >= 95) s = Math.min(s, 0.18);
  if (cc <= 5 && avg <= 12) s = Math.min(s, 0.5); // bald-clear -> nice but flat

  s = Math.max(0, Math.min(1, s));

  let label;
  if (s >= 0.78) label = "Vivid";
  else if (s >= 0.55) label = "Colourful";
  else if (s >= 0.35) label = "Subtle";
  else if (cc >= 90) label = "Hidden";
  else label = "Pale";

  let detail;
  if (label === "Hidden") detail = "Overcast — colours muted";
  else if (label === "Vivid") detail = "Mid-cloud catches the light";
  else if (label === "Colourful") detail = "Some cloud to colour the sky";
  else if (label === "Subtle") detail = humidity > 80 ? "Hazy palette" : "Modest colour";
  else detail = cc <= 10 ? "Clear & even" : "Thin colour expected";

  return {
    event: next.kind,
    time: next.ts,
    score: s,
    label,
    detail,
    cloudCover: Math.round(avg),
  };
}

function nearestHour(hours, ts) {
  let best = null, bestDiff = Infinity;
  for (const h of hours) {
    const d = Math.abs(h.time - ts);
    if (d < bestDiff) { bestDiff = d; best = h; }
  }
  if (best && bestDiff <= 90 * 60_000) return best;
  return null;
}
