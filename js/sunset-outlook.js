// Predict a rough "how colorful will the sunset be" score by looking at
// the sky conditions near the upcoming sunset time.
//
// Vibrant sunsets need three things (folk-heuristic version):
//   1. Mid-level clouds to catch the low sun — 30–70 % cover is ideal.
//   2. A clear horizon so the light can reach those clouds — low precip,
//      no fog or storm.
//   3. Sufficient dry air aloft — humidity a rough proxy.
//
// Returns { score: 0..100, label, hint, at } where `at` is the sunset
// timestamp we predicted for, or null when there's no useful sunset in
// range (already past today's, no daily data, etc.).

const CATEGORIES = [
  { min: 78, label: "Fiery",     tone: "hot" },
  { min: 58, label: "Vibrant",   tone: "warm" },
  { min: 38, label: "Moderate",  tone: "mid" },
  { min: 18, label: "Muted",     tone: "cool" },
  { min: 0,  label: "Dull",      tone: "flat" },
];

export function predictSunsetOutlook(w) {
  if (!w?.daily?.length) return null;
  const now = Date.now();
  // Pick the next upcoming sunset (today's if still ahead, else tomorrow's).
  const upcoming = w.daily.find((d) => d.sunset && d.sunset > now);
  if (!upcoming) return null;
  const sunsetTs = upcoming.sunset;

  // Find the hourly entry nearest sunset for cloud cover + condition.
  const hours = w.hourly || [];
  let best = null;
  for (const h of hours) {
    if (!best || Math.abs(h.time - sunsetTs) < Math.abs(best.time - sunsetTs)) best = h;
  }
  // If the nearest hour is >2h away, fall back to the current snapshot.
  const useH = best && Math.abs(best.time - sunsetTs) < 2 * 3600_000 ? best : null;
  const cloudCover = useH?.cloudCover ?? w.cloudCover;
  const condition = useH?.condition ?? w.condition;
  const humidity = useH?.humidity ?? w.humidity;
  const pop = useH?.pop ?? 0;

  let score = 0;
  const hints = [];

  // Score 1: cloud cover sweet spot (30–70%).
  if (cloudCover != null) {
    if (cloudCover >= 35 && cloudCover <= 65) {
      score += 70;
      hints.push(`${Math.round(cloudCover)}% cloud`);
    } else if ((cloudCover >= 25 && cloudCover < 35) || (cloudCover > 65 && cloudCover <= 80)) {
      score += 50;
      hints.push(`${Math.round(cloudCover)}% cloud`);
    } else if (cloudCover > 80 && cloudCover <= 92) {
      score += 25;
      hints.push(`${Math.round(cloudCover)}% cloud`);
    } else if (cloudCover < 25 && cloudCover >= 10) {
      score += 35;
      hints.push(`${Math.round(cloudCover)}% cloud`);
    } else if (cloudCover > 92) {
      score += 5;
      hints.push("mostly overcast");
    } else {
      score += 25;
      hints.push("clear sky");
    }
  } else {
    score += 35;
  }

  // Score 2: horizon must not be blocked by precip / fog / storm.
  if (condition === "rain" || condition === "storm" || condition === "snow") {
    score = Math.min(score, 20);
    hints.push("precip at the horizon");
  } else if (condition === "fog") {
    score = Math.min(score, 15);
    hints.push("fog");
  }
  if (pop >= 60) {
    score = Math.min(score, 30);
  } else if (pop >= 30) {
    score = Math.max(0, score - 10);
  }

  // Score 3: humidity — dry air aloft helps saturate colors.
  if (humidity != null) {
    if (humidity <= 45) score = Math.min(100, score + 15);
    else if (humidity <= 60) score = Math.min(100, score + 5);
    else if (humidity > 85) score = Math.max(0, score - 8);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const cat = CATEGORIES.find((c) => score >= c.min) || CATEGORIES[CATEGORIES.length - 1];
  const hint = hints.slice(0, 2).join(" · ");
  return { score, label: cat.label, tone: cat.tone, at: sunsetTs, hint };
}
