// Short "what to wear / do" prompt based on current conditions.
// Intentionally small and opinionated — one line, actionable.

export function advise(weather) {
  if (!weather) return "";
  const t = weather.feelsLike ?? weather.temp;
  const wind = weather.windSpeed ?? 0;
  const gust = weather.windGusts ?? wind;
  const uv = weather.uv ?? 0;
  const cond = weather.condition;
  const pop = weather.hourly?.[0]?.pop ?? 0;
  const nextRain = (weather.hourly || []).slice(0, 4)
    .find((h) => (h.pop ?? 0) >= 55 || (h.precip ?? 0) > 0.4);
  const partOfDay = pickPartOfDay(weather);

  if (cond === "storm") return "Thunderstorms — stay indoors and unplug sensitive gear.";
  if (cond === "snow") {
    if (t <= -5) return "Serious chill — layered thermals, beanie, and gloves.";
    return "Boots and a warm shell — watch for slick pavement.";
  }
  if (cond === "rain" || pop > 70) return "Grab an umbrella — rain is active.";
  if (nextRain) {
    const mins = Math.round((nextRain.time - Date.now()) / 60_000);
    if (mins > 0 && mins < 180) return `Rain likely in ~${mins >= 60 ? Math.round(mins / 60) + "h" : mins + "m"} — bring a light shell.`;
  }
  if (gust > 45) return "Blustery — anything loose will sail away.";
  if (t <= -10) return "Frostbite weather — cover exposed skin.";
  if (t <= 0) return "Freezing — heavy coat, scarf, gloves.";
  if (t <= 8) return `${partOfDay === "morning" ? "Chilly morning — " : "Brisk — "}sweater plus a jacket.`;
  if (t <= 14) return "Cool — a light jacket does the trick.";
  if (t <= 20) {
    if (partOfDay === "evening") return "Mild evening — great for a walk.";
    return "Mild and pleasant — a long sleeve is plenty.";
  }
  if (t <= 26) {
    if (uv >= 6) return "Warm and sunny — sunscreen and a hat.";
    if (partOfDay === "evening") return "Warm evening — patio weather.";
    return "Comfortable tee-shirt weather.";
  }
  if (t <= 32) {
    if (uv >= 7) return "Hot with strong sun — hydrate and stay shaded.";
    return "Hot — loose layers, plenty of water.";
  }
  return "Extreme heat — avoid midday exposure, drink often.";
}

// Rough part-of-day bucket using local hour relative to sunrise/sunset
// when available, plain clock hours otherwise.
function pickPartOfDay(w) {
  const now = Date.now();
  if (w.sunrise && w.sunset) {
    const morningEnd = w.sunrise + 3 * 3600_000;
    const eveningStart = w.sunset - 2 * 3600_000;
    if (now >= w.sunrise && now < morningEnd) return "morning";
    if (now >= eveningStart && now < w.sunset + 3600_000) return "evening";
    if (now < w.sunrise || now > w.sunset + 3600_000) return "night";
    return "day";
  }
  const h = new Date(now).getHours();
  if (h < 6) return "night";
  if (h < 10) return "morning";
  if (h < 18) return "day";
  if (h < 22) return "evening";
  return "night";
}
