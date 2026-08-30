// A single 0–100 "how nice is it right now?" score computed from live
// values only. Heuristic; deliberately punishes discomfort more than it
// rewards perfection so a clear 22 °C day scores in the low-90s rather
// than a saturated 100.

export function scoreWeather(w) {
  if (!w || w.temp == null) return null;
  let s = 100;

  // Temperature sweet-spot ~18–24 °C using feels-like when useful.
  const t = w.feelsLike ?? w.temp;
  if (t >= 18 && t <= 24) s -= 0;
  else if (t >= 14 && t <= 28) s -= 8;
  else if (t >= 8  && t <= 32) s -= 20;
  else if (t < 0 || t > 36) s -= 45;
  else s -= 32;

  // Precipitation happening now — direct hit.
  if (w.condition === "rain")  s -= 25;
  if (w.condition === "storm") s -= 45;
  if (w.condition === "snow")  s -= 18;
  if (w.condition === "fog")   s -= 12;

  // Wind
  const wind = w.windSpeed ?? 0;
  if (wind > 20) s -= Math.min(25, (wind - 20) * 1.2);
  const gust = w.windGusts ?? wind;
  if (gust > 40) s -= Math.min(20, (gust - 40) * 1.0);

  // Cloud cover — a fully overcast day loses some sparkle.
  if (w.cloudCover != null) {
    if (w.cloudCover > 85) s -= 10;
    else if (w.cloudCover > 60) s -= 5;
  }

  // UV extremes (skin discomfort).
  if (w.uv != null) {
    if (w.uv >= 10) s -= 8;
    else if (w.uv >= 8) s -= 4;
  }

  // Humidity discomfort when warm.
  if (t >= 20 && w.humidity >= 80) s -= 8;

  // Air quality if we have it.
  if (w.airQuality?.aqi != null) {
    const a = w.airQuality.aqi;
    if (a > 150) s -= 15;
    else if (a > 100) s -= 8;
    else if (a > 50) s -= 3;
  }

  return Math.max(1, Math.min(100, Math.round(s)));
}

export function scoreLabel(score) {
  if (score == null) return "";
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Nice";
  if (score >= 55) return "OK";
  if (score >= 35) return "Rough";
  return "Grim";
}

export function scoreColor(score) {
  if (score == null) return "var(--fg-dim)";
  if (score >= 85) return "#78d06a";
  if (score >= 70) return "#c7dc6a";
  if (score >= 55) return "#ffd36a";
  if (score >= 35) return "#ff9f5c";
  return "#ff6a6a";
}
