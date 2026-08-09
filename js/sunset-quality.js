// Predict whether the next sunrise/sunset is likely to produce vibrant sky
// colors. Uses a light heuristic on cloud cover, humidity and visibility
// around the event window — mid-level clouds catch light, low overcast
// smothers it, and totally clear skies fade fast.
//
// Returns null if we can't say anything useful.
//
//   {
//     kind: "sunrise" | "sunset",
//     score: 0..1,             // rough confidence in vibrancy
//     tone: "vibrant" | "warm" | "muted" | "gray",
//     headline: string,        // one-line UI copy
//     ts: number,              // ms epoch of the event
//   }

export function sunsetColorQuality(weather) {
  if (!weather) return null;
  const now = Date.now();

  // Pick the next event (sunrise or sunset) across the daily forecast.
  let evt = null;
  for (const d of weather.daily || []) {
    for (const [ts, kind] of [[d.sunrise, "sunrise"], [d.sunset, "sunset"]]) {
      if (!ts || ts <= now) continue;
      if (!evt || ts < evt.ts) evt = { ts, kind };
    }
  }
  if (!evt) return null;

  // Sample the hourly buckets closest to and just before/after the event.
  // Use a small window (±90 min) so we blend the two hours surrounding it.
  const window = 90 * 60_000;
  const nearby = (weather.hourly || []).filter(
    (h) => Math.abs(h.time - evt.ts) <= window
  );
  if (!nearby.length) return null;

  // Weight the sample nearest to the event most heavily.
  let weightSum = 0, humSum = 0, precipSum = 0, gustSum = 0;
  for (const h of nearby) {
    // Floor weight so a sample exactly at the window edge still contributes.
    const w = Math.max(0.05, 1 - Math.min(1, Math.abs(h.time - evt.ts) / window));
    weightSum += w;
    humSum += (h.humidity ?? weather.humidity ?? 60) * w;
    precipSum += (h.pop ?? 0) * w;
    gustSum += (h.gusts ?? weather.windGusts ?? 0) * w;
  }
  const humidity = humSum / weightSum;
  const pop = precipSum / weightSum;
  const gusts = gustSum / weightSum;

  // Cloud cover is only sampled as a scalar in "current"; blend it toward 50
  // as the event moves away in time so a very-current sample doesn't tell us
  // about an event 3 h from now.
  const eventInMin = (evt.ts - now) / 60_000;
  const cloudCover = weather.cloudCover != null
    ? blend(weather.cloudCover, 50, Math.min(1, eventInMin / 180))
    : 50;

  // Heuristic scoring — favours 30-70% cloud cover with dry, calm air.
  let score = 0;
  if (cloudCover >= 25 && cloudCover <= 70) {
    // Prime range for catching low-angle light.
    score += 0.55 * (1 - Math.abs(cloudCover - 50) / 30);
  } else if (cloudCover < 25) {
    // Mostly clear — pretty but fades fast.
    score += 0.35 * (cloudCover / 25);
  } else {
    // Overcast dampens colors.
    score += Math.max(0, 0.25 - (cloudCover - 70) / 100);
  }
  // Dry air keeps colors saturated; humid air scatters them into pastels.
  score += humidity < 55 ? 0.2 : humidity < 75 ? 0.1 : 0;
  // Rain in the window kills the show.
  if (pop > 40) score -= 0.25;
  // Very gusty conditions typically mean fast-moving clouds — that's fine —
  // but storm-level gusts hint at cover changing faster than we can predict.
  if (gusts > 40) score -= 0.05;

  score = Math.max(0, Math.min(1, score));

  let tone, headline;
  if (pop > 60) {
    tone = "gray";
    headline = evt.kind === "sunrise"
      ? "Rainy sunrise — colors washed out"
      : "Rain likely at sunset";
  } else if (score > 0.6) {
    tone = "vibrant";
    headline = evt.kind === "sunrise"
      ? "Fiery sunrise likely"
      : "Vibrant sunset expected";
  } else if (score > 0.4) {
    tone = "warm";
    headline = evt.kind === "sunrise"
      ? "Warm sunrise glow"
      : "Warm sunset glow";
  } else if (cloudCover > 80) {
    tone = "muted";
    headline = evt.kind === "sunrise"
      ? "Overcast — muted colors"
      : "Overcast — muted colors";
  } else {
    tone = "muted";
    headline = evt.kind === "sunrise"
      ? "Clear but subdued colors"
      : "Clear but subdued colors";
  }

  return { kind: evt.kind, ts: evt.ts, score, tone, headline };
}

function blend(a, b, t) { return a * (1 - t) + b * t; }
