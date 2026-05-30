// Explain why "feels like" differs from the actual temperature.
// We don't have direct access to the model's chill/heat-index inputs, but we
// can attribute the delta to wind (cooler than air) or humidity (warmer than
// air) with surprising accuracy at the rough magnitudes humans care about.
//
// Returns { label, cls } or null when the delta is too small to mention.

export function feelsLikeReason({ temp, feelsLike, windSpeed, humidity, dewPoint, isDay, uv }) {
  if (temp == null || feelsLike == null) return null;
  const delta = feelsLike - temp;
  const absDelta = Math.abs(delta);
  if (absDelta < 2) return null;

  const wind = windSpeed ?? 0;
  const rh = humidity ?? null;
  const dew = dewPoint ?? null;
  const rounded = Math.max(1, Math.round(absDelta));

  // Feels cooler than the air.
  if (delta < 0) {
    // Wind chill territory: cold air + any breeze.
    if (temp <= 12 && wind >= 8) {
      return { label: `Wind makes it feel ${rounded}° colder`, cls: "down" };
    }
    // Dry air evaporating sweat in hot weather can also drop feels-like a touch.
    if (temp >= 25 && rh != null && rh < 30) {
      return { label: `Dry air shaves ${rounded}° off the heat`, cls: "down" };
    }
    // Strong gust on a mild day.
    if (wind >= 25) {
      return { label: `Breezy — feels ${rounded}° cooler`, cls: "down" };
    }
    return { label: `Feels ${rounded}° cooler than the air`, cls: "down" };
  }

  // Feels warmer than the air.
  // Humidity-driven heat index.
  if (temp >= 20 && (dew != null ? dew >= 16 : (rh != null && rh >= 60))) {
    return { label: `Humidity adds ${rounded}° of heat`, cls: "up" };
  }
  // Strong sun on a still day can nudge perceived temp upward.
  if (isDay && (uv ?? 0) >= 5 && wind < 8) {
    return { label: `Strong sun — feels ${rounded}° warmer`, cls: "up" };
  }
  return { label: `Feels ${rounded}° warmer than the air`, cls: "up" };
}
