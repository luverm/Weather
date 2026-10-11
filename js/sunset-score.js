// Heuristic sunset-vibrancy score.
//
// A memorable sunset generally needs:
// - MID-level cloud cover: too clear is bland, too overcast kills the light
// - Dry upper air (low humidity): more scatter, fewer washed-out tones
// - Clean lower air (low PM2.5): hazy pollution dulls the colors
// - A clear horizon in the direction of the sun (approximated by current
//   cloud cover being < 90% near sunset time)
//
// We score each factor 0..1 and combine, returning a 0..100 score plus a
// human-friendly label and the sunset timestamp used.

export function sunsetScore(weather) {
  if (!weather) return null;
  const sunset = weather.sunset;
  if (!sunset) return null;

  const hourly = weather.hourly || [];
  // Find the hourly bucket closest to sunset.
  let bucket = null, bestDiff = Infinity;
  for (const h of hourly) {
    const diff = Math.abs(h.time - sunset);
    if (diff < bestDiff) { bestDiff = diff; bucket = h; }
  }
  // If sunset is too far outside the hourly series (e.g. tomorrow), bail.
  if (!bucket || bestDiff > 2.5 * 3600_000) return null;

  const cloud = bucket.cloudCover ?? weather.cloudCover;
  const humidity = bucket.humidity ?? weather.humidity;
  const aqi = weather.airQuality?.aqi;
  const pm25 = weather.airQuality?.pm25;

  // Cloud score: peak at 50%, falls off fast toward 0 or 100.
  let cloudScore = 0;
  if (cloud != null) {
    const dist = Math.abs(cloud - 50);
    cloudScore = Math.max(0, 1 - dist / 55);
    if (cloud > 92) cloudScore *= 0.25; // very overcast — mostly blocked
  }

  // Humidity score: ideal <55%, bad >85%.
  const humScore = humidity == null ? 0.5
    : clamp01(1 - Math.max(0, humidity - 55) / 40);

  // Air clarity score: use PM2.5 primarily, AQI as fallback.
  let airScore = 0.6;
  if (pm25 != null) airScore = clamp01(1 - pm25 / 30);
  else if (aqi != null) airScore = clamp01(1 - (aqi - 20) / 100);

  // Combine with weights.
  const score = Math.round(
    (cloudScore * 0.5 + humScore * 0.2 + airScore * 0.3) * 100
  );

  const label = score >= 75 ? "Spectacular"
    : score >= 55 ? "Vivid"
    : score >= 35 ? "Moderate"
    : "Muted";

  return {
    score,
    label,
    sunset,
    factors: {
      cloudCover: cloud, humidity, pm25,
      cloudScore, humScore, airScore,
    },
  };
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
