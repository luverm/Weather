// Compute a 0..100 'comfort' score blending feels-like temperature, humidity,
// wind, and UV. Returns { score, label, factors[] } where each factor reports
// its own contribution so the UI can highlight the dominant nuisance.

export function comfortScore(weather) {
  if (!weather) return null;
  const t = weather.feelsLike ?? weather.temp;
  if (t == null) return null;

  const factors = [];

  // Temperature comfort: ideal 18–22 °C, taper outside. Penalty caps at 60 pts.
  let tempPenalty = 0;
  if (t < 18) tempPenalty = Math.min(60, (18 - t) * 4);
  else if (t > 24) tempPenalty = Math.min(60, (t - 24) * 4.5);
  factors.push({
    key: "temp", label: tempLabel(t), penalty: tempPenalty,
  });

  // Humidity (only matters when warmer than ~16°C or quite cold).
  const rh = weather.humidity;
  let humPenalty = 0;
  if (rh != null) {
    if (t > 22) {
      if (rh >= 70) humPenalty = (rh - 70) * 0.8;
    } else if (t < 4) {
      if (rh >= 85) humPenalty = (rh - 85) * 0.6;
    }
    if (rh < 25 && t > 18) humPenalty += (25 - rh) * 0.4; // dry skin
  }
  factors.push({ key: "humidity", label: humidityLabel(rh, t), penalty: Math.min(25, humPenalty) });

  // Wind / gust.
  const w = weather.windGusts ?? weather.windSpeed ?? 0;
  let windPenalty = 0;
  if (w >= 25) windPenalty = (w - 25) * 1.2;
  if (w >= 40) windPenalty += (w - 40) * 0.8;
  factors.push({ key: "wind", label: windLabel(w), penalty: Math.min(35, windPenalty) });

  // UV (only counts while it's day).
  const uv = weather.uv ?? 0;
  let uvPenalty = 0;
  if (weather.isDay && uv >= 6) uvPenalty = (uv - 6) * 4;
  factors.push({ key: "uv", label: uvLabel(uv, weather.isDay), penalty: Math.min(20, uvPenalty) });

  // Precipitation in current condition.
  let precipPenalty = 0;
  if (weather.condition === "rain") precipPenalty = 18;
  else if (weather.condition === "snow") precipPenalty = 14;
  else if (weather.condition === "storm") precipPenalty = 28;
  else if (weather.condition === "fog") precipPenalty = 8;
  factors.push({ key: "precip", label: weather.label || "—", penalty: precipPenalty });

  const total = factors.reduce((s, f) => s + f.penalty, 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - total)));
  const label =
    score >= 82 ? "Idyllic" :
    score >= 68 ? "Pleasant" :
    score >= 52 ? "Tolerable" :
    score >= 36 ? "Challenging" :
    "Unfriendly";

  // Sort factors by penalty descending so the UI can show the worst ones first.
  factors.sort((a, b) => b.penalty - a.penalty);
  return { score, label, factors, dominant: factors[0]?.penalty > 5 ? factors[0] : null };
}

function tempLabel(t) {
  if (t < -10) return "Bitter cold";
  if (t < 0)   return "Freezing";
  if (t < 8)   return "Cold";
  if (t < 14)  return "Cool";
  if (t < 18)  return "Mild";
  if (t < 24)  return "Comfortable";
  if (t < 28)  return "Warm";
  if (t < 32)  return "Hot";
  return "Very hot";
}

function humidityLabel(rh, t) {
  if (rh == null) return "—";
  if (rh >= 85) return "Damp";
  if (rh >= 70) return t > 22 ? "Sticky" : "Humid";
  if (rh <= 25) return "Dry";
  return "Balanced";
}

function windLabel(w) {
  if (w < 12) return "Calm";
  if (w < 25) return "Breezy";
  if (w < 40) return "Windy";
  if (w < 60) return "Gusty";
  return "Stormy";
}

function uvLabel(v, isDay) {
  if (!isDay) return "Night";
  if (v < 3)  return "Mild UV";
  if (v < 6)  return "Moderate UV";
  if (v < 8)  return "Strong UV";
  if (v < 11) return "Intense UV";
  return "Extreme UV";
}
