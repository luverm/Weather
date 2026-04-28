// Build a quick "weekend snapshot" from the 7-day forecast.
// Returns { sat, sun, headline, summary, ts } or null if the upcoming
// weekend isn't covered (we look at days 0..7).

const ICONS = {
  clear: "☀",
  clouds: "⛅",
  rain: "🌧",
  storm: "⛈",
  snow: "🌨",
  fog: "🌫",
};

export function weekendSnapshot(weather, opts = {}) {
  const days = (weather?.daily) || [];
  if (!days.length) return null;
  const tz = opts.timezone || weather?.timezone;

  const dow = (ts) => {
    if (!tz || tz === "auto") return new Date(ts).getDay();
    // Use Intl to get day-of-week in the location's timezone.
    try {
      const wk = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(new Date(ts));
      return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(wk);
    } catch {
      return new Date(ts).getDay();
    }
  };

  const sat = days.find((d) => dow(d.time) === 6);
  const sun = days.find((d) => dow(d.time) === 0 && d.time > (sat?.time ?? 0));

  // If neither is in range, bail.
  if (!sat && !sun) return null;

  const both = [sat, sun].filter(Boolean);
  const hi = Math.max(...both.map((d) => d.tempMax ?? -Infinity));
  const lo = Math.min(...both.map((d) => d.tempMin ?? Infinity));
  const totalRain = both.reduce((acc, d) => acc + (d.precip ?? 0), 0);
  const maxPop = Math.max(...both.map((d) => d.pop ?? 0));
  const conds = both.map((d) => d.condition);
  const dominant = pickDominantCondition(conds);

  const summary = headlineFor({ hi, lo, totalRain, maxPop, dominant });

  return {
    sat, sun, hi, lo, totalRain, maxPop, dominant,
    headline: summary.headline,
    tone: summary.tone, // "good" / "ok" / "bad"
    iconSat: sat ? (ICONS[sat.condition] || "•") : "",
    iconSun: sun ? (ICONS[sun.condition] || "•") : "",
    ts: sat?.sunrise || sat?.time || sun?.sunrise || sun?.time,
  };
}

function pickDominantCondition(conds) {
  const counts = {};
  for (const c of conds) counts[c] = (counts[c] || 0) + 1;
  let best = "clouds", n = 0;
  for (const k of Object.keys(counts)) if (counts[k] > n) { best = k; n = counts[k]; }
  return best;
}

function headlineFor({ hi, lo, totalRain, maxPop, dominant }) {
  if (hi == null || !isFinite(hi)) return { headline: "Weekend ahead", tone: "ok" };
  // Decide tone first.
  if (totalRain >= 8 || maxPop >= 70 || dominant === "storm") {
    return { headline: rainPhrase(totalRain, maxPop), tone: "bad" };
  }
  if (dominant === "snow") {
    return { headline: "Snow expected — bundle up", tone: "bad" };
  }
  // One nice day + one wet day = honest "mixed".
  if ((totalRain >= 4 || maxPop >= 50) && dominant !== "rain") {
    return { headline: "One nice, one wet", tone: "ok" };
  }
  if (dominant === "fog") {
    return { headline: "Foggy weekend", tone: "ok" };
  }
  if (dominant === "clear" && hi >= 20 && hi <= 28) {
    return { headline: "Sunny weekend — make plans!", tone: "good" };
  }
  if (dominant === "clear" && hi > 28) {
    return { headline: "Hot, sunny weekend", tone: "good" };
  }
  if (dominant === "clear" && hi < 12) {
    return { headline: "Crisp & sunny", tone: "good" };
  }
  if (dominant === "clouds" && totalRain < 2) {
    return { headline: "Cloudy but mostly dry", tone: "ok" };
  }
  return { headline: "Mixed weekend", tone: "ok" };
}

function rainPhrase(total, pop) {
  if (total >= 25) return "Wet weekend — pack an umbrella";
  if (total >= 8) return `Rainy spells — ${Math.round(total)} mm expected`;
  if (pop >= 70) return "Showers likely on/off";
  return "Rain in the forecast";
}
