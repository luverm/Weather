// Quantify "how pleasant is it to be outside right now" as a single 0-100
// score. Combines temperature comfort, mugginess, wind, precip, and UV
// severity into one number that's easy to scan against other cities.

export function computeComfortScore(weather) {
  if (!weather || weather.temp == null) return null;

  const feels = weather.feelsLike ?? weather.temp;
  const wind = weather.windSpeed ?? 0;
  const gust = weather.windGusts ?? wind;
  const dew = weather.dewPoint;
  const cond = weather.condition;
  const uv = weather.uv ?? 0;

  // Temperature: gaussian-ish bell peaking at 21°C of feels-like. ±15°
  // brings the contribution close to 0.
  const tempScore = Math.exp(-Math.pow((feels - 21) / 11, 2));

  // Mugginess: penalise high dewpoint (sticky), and very low (dry/dusty).
  let dewScore = 1;
  if (dew != null) {
    if (dew >= 24) dewScore = 0.1;
    else if (dew >= 21) dewScore = 0.35;
    else if (dew >= 18) dewScore = 0.6;
    else if (dew >= 13) dewScore = 0.85;
    else if (dew >= 0)  dewScore = 1;
    else if (dew >= -10) dewScore = 0.7;
    else dewScore = 0.4;
  }

  // Wind: gentle is fine; gusts past 30 km/h get unpleasant; 60+ is rough.
  const windScore = gust <= 12 ? 1
    : gust <= 25 ? 0.85
    : gust <= 40 ? 0.55
    : gust <= 60 ? 0.25
    : 0.05;

  // Precipitation type. The current condition tells us what's actually
  // happening *right now*; storms hit harder than drizzle.
  const condScore =
    cond === "storm" ? 0.05 :
    cond === "snow"  ? 0.35 :
    cond === "rain"  ? 0.4  :
    cond === "fog"   ? 0.75 :
    cond === "clouds" ? 0.95 :
    1;

  // UV: only meaningful when the sun is up.
  const uvScore = !weather.isDay ? 1
    : uv <= 5 ? 1
    : uv <= 7 ? 0.8
    : uv <= 9 ? 0.55
    : 0.3;

  // Weighted blend, then a multiplicative knock-down when any single critical
  // factor (wind, condition) is severe — otherwise weighted averaging is too
  // forgiving with 65 km/h gusts in a thunderstorm.
  const blended =
    tempScore * 0.32 +
    dewScore  * 0.18 +
    windScore * 0.18 +
    condScore * 0.22 +
    uvScore   * 0.10;
  const severity = Math.min(windScore + 0.3, condScore + 0.3, 1);
  const score = Math.round(Math.max(0, Math.min(1, blended * severity)) * 100);

  // Pick the largest offender to surface as the "weakest factor" hint.
  const factors = [
    { key: "temp",  score: tempScore, label: feels < 5 ? "cold" : feels > 30 ? "hot" : "off-ideal temp" },
    { key: "dew",   score: dewScore,  label: dew >= 18 ? "muggy" : dew != null && dew < -5 ? "dry air" : "humidity" },
    { key: "wind",  score: windScore, label: "windy" },
    { key: "cond",  score: condScore, label: cond === "storm" ? "thunder" : cond === "snow" ? "snow" : cond === "rain" ? "rain" : "fog" },
    { key: "uv",    score: uvScore,   label: "strong UV" },
  ].filter((f) => f.score < 0.85).sort((a, b) => a.score - b.score);
  const weakest = factors[0];

  const label =
    score >= 85 ? "Glorious" :
    score >= 70 ? "Pleasant" :
    score >= 55 ? "Decent"   :
    score >= 40 ? "Marginal" :
    score >= 25 ? "Rough"    :
    "Stay in";

  return { score, label, weakest: weakest?.label };
}
