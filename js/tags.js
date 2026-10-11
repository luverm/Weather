// Short "weather vibe" tags derived from the current state. Max 4.
// Each tag: { label, emoji, tone }  tone: "neutral" | "warm" | "cool" | "wet" | "sun" | "wind".

export function weatherTags(weather) {
  if (!weather) return [];
  const t = weather.temp;
  const wind = weather.windSpeed ?? 0;
  const humidity = weather.humidity ?? 50;
  const cloud = weather.cloudCover ?? null;
  const vis = weather.visibility != null ? weather.visibility / 1000 : null;
  const uv = weather.uv ?? 0;
  const pop0 = weather.hourly?.[0]?.pop ?? 0;
  const cond = weather.condition;

  const out = [];

  // Primary condition tag — one of these always.
  if (cond === "storm") out.push({ label: "Stormy", emoji: "⛈", tone: "wet" });
  else if (cond === "rain") out.push({ label: "Rainy", emoji: "🌧", tone: "wet" });
  else if (cond === "snow") out.push({ label: "Snowy", emoji: "🌨", tone: "cool" });
  else if (cond === "fog") out.push({ label: "Foggy", emoji: "🌫", tone: "neutral" });
  else if (cond === "clear") out.push({ label: weather.isDay ? "Sunny" : "Clear", emoji: weather.isDay ? "☀" : "✨", tone: "sun" });
  else if (cond === "clouds") out.push({ label: "Cloudy", emoji: "☁", tone: "neutral" });

  // Temperature tag.
  if (t != null) {
    if (t >= 32)      out.push({ label: "Hot",      emoji: "🔥", tone: "warm" });
    else if (t >= 25) out.push({ label: "Warm",     emoji: "🌡", tone: "warm" });
    else if (t <= -5) out.push({ label: "Freezing", emoji: "🥶", tone: "cool" });
    else if (t <= 5)  out.push({ label: "Cold",     emoji: "❄", tone: "cool" });
    else if (t <= 12) out.push({ label: "Cool",     emoji: "🧥", tone: "cool" });
  }

  // Wind tag.
  if (wind >= 40)      out.push({ label: "Windy",   emoji: "💨", tone: "wind" });
  else if (wind >= 20) out.push({ label: "Breezy",  emoji: "🍃", tone: "wind" });
  else if (wind < 3)   out.push({ label: "Calm",    emoji: "🧘", tone: "neutral" });

  // Humidity / dryness.
  if (humidity >= 80 && cond !== "rain" && cond !== "storm") {
    out.push({ label: "Humid", emoji: "💧", tone: "wet" });
  } else if (humidity <= 25) {
    out.push({ label: "Dry", emoji: "🏜", tone: "warm" });
  }

  // UV.
  if (uv >= 8) out.push({ label: "High UV", emoji: "🕶", tone: "sun" });

  // Visibility.
  if (vis != null && vis < 3 && cond !== "fog") {
    out.push({ label: "Hazy", emoji: "🌁", tone: "neutral" });
  }

  // Rain soon flag (next hour).
  if (pop0 >= 70 && cond !== "rain" && cond !== "storm") {
    out.push({ label: "Rain soon", emoji: "🌦", tone: "wet" });
  }

  // Overcast / clear skies.
  if (cloud != null) {
    if (cloud >= 92 && cond !== "rain" && cond !== "storm" && cond !== "snow") {
      out.push({ label: "Overcast", emoji: "☁", tone: "neutral" });
    } else if (cloud <= 15 && weather.isDay && cond === "clear") {
      out.push({ label: "Blue skies", emoji: "🌞", tone: "sun" });
    }
  }

  // De-dupe by label (temp tag and condition tag can both say "Cold" otherwise).
  const seen = new Set();
  const unique = [];
  for (const tag of out) {
    if (seen.has(tag.label)) continue;
    seen.add(tag.label);
    unique.push(tag);
    if (unique.length >= 4) break;
  }
  return unique;
}
