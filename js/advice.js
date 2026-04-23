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
  if (t <= 8) return "Brisk — sweater plus a jacket.";
  if (t <= 14) return "Cool — a light jacket does the trick.";
  if (t <= 20) return "Mild and pleasant — a long sleeve is plenty.";
  if (t <= 26) {
    if (uv >= 6) return "Warm and sunny — sunscreen and a hat.";
    return "Comfortable tee-shirt weather.";
  }
  if (t <= 32) {
    if (uv >= 7) return "Hot with strong sun — hydrate and stay shaded.";
    return "Hot — loose layers, plenty of water.";
  }
  return "Extreme heat — avoid midday exposure, drink often.";
}
