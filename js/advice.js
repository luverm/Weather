// Short "what to wear / do" prompt based on current conditions.
// Intentionally small and opinionated — one line, actionable.

// Icon keys keep the SVG selection in ui.js decoupled from the message.
const A = (icon, text) => ({ icon, text });

export function advise(weather) {
  const r = adviseDetailed(weather);
  return r?.text || "";
}

export function adviseDetailed(weather) {
  if (!weather) return null;
  const t = weather.feelsLike ?? weather.temp;
  const wind = weather.windSpeed ?? 0;
  const gust = weather.windGusts ?? wind;
  const uv = weather.uv ?? 0;
  const cond = weather.condition;
  const pop = weather.hourly?.[0]?.pop ?? 0;
  const nextRain = (weather.hourly || []).slice(0, 4)
    .find((h) => (h.pop ?? 0) >= 55 || (h.precip ?? 0) > 0.4);

  if (cond === "storm") return A("storm", "Thunderstorms — stay indoors and unplug sensitive gear.");
  if (cond === "snow") {
    if (t <= -5) return A("snowflake", "Serious chill — layered thermals, beanie, and gloves.");
    return A("boots", "Boots and a warm shell — watch for slick pavement.");
  }
  if (cond === "rain" || pop > 70) return A("umbrella", "Grab an umbrella — rain is active.");
  if (nextRain) {
    const mins = Math.round((nextRain.time - Date.now()) / 60_000);
    if (mins > 0 && mins < 180) return A("umbrella", `Rain likely in ~${mins >= 60 ? Math.round(mins / 60) + "h" : mins + "m"} — bring a light shell.`);
  }
  if (gust > 45) return A("wind", "Blustery — anything loose will sail away.");
  if (t <= -10) return A("snowflake", "Frostbite weather — cover exposed skin.");
  if (t <= 0) return A("coat", "Freezing — heavy coat, scarf, gloves.");
  if (t <= 8) return A("jacket", "Brisk — sweater plus a jacket.");
  if (t <= 14) return A("jacket", "Cool — a light jacket does the trick.");
  if (t <= 20) return A("shirt", "Mild and pleasant — a long sleeve is plenty.");
  if (t <= 26) {
    if (uv >= 6) return A("sun", "Warm and sunny — sunscreen and a hat.");
    return A("shirt", "Comfortable tee-shirt weather.");
  }
  if (t <= 32) {
    if (uv >= 7) return A("sun", "Hot with strong sun — hydrate and stay shaded.");
    return A("water", "Hot — loose layers, plenty of water.");
  }
  return A("water", "Extreme heat — avoid midday exposure, drink often.");
}
