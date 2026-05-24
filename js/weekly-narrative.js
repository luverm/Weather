// Synthesize a single-sentence headline summarising the next 7 days.
// Picks the dominant theme (mostly dry, wet stretch, hot weekend, etc.) and
// folds in a couple of supporting beats.

const DAY = 86_400_000;

export function weeklyNarrative(weather) {
  const days = weather?.daily?.slice(1, 7) || []; // exclude today (already focal)
  if (days.length < 4) return "";

  const wet = days.filter((d) => (d.pop ?? 0) >= 50 || (d.precip ?? 0) >= 2);
  const sunny = days.filter((d) => d.condition === "clear");
  const stormy = days.filter((d) => d.condition === "storm" || d.condition === "snow");
  const hot = days.filter((d) => (d.tempMax ?? -99) >= 28);
  const cold = days.filter((d) => (d.tempMax ?? 99) <= 5);

  const hi = avg(days.map((d) => d.tempMax));
  const lo = avg(days.map((d) => d.tempMin));

  const lead = pickLead({ wet, sunny, stormy, hot, cold, total: days.length, hi, lo });
  if (!lead) return "";

  const beats = [];
  // Weekend tone (Sat=6, Sun=0).
  const weekendDays = days.filter((d) => {
    const dow = new Date(d.time).getDay();
    return dow === 0 || dow === 6;
  });
  if (weekendDays.length) {
    const weHi = avg(weekendDays.map((d) => d.tempMax));
    const weWet = weekendDays.some((d) => (d.pop ?? 0) >= 50);
    if (weWet && !lead.includes("wet")) {
      beats.push("wet weekend");
    } else if (!weWet && hi != null && weHi != null && weHi >= hi + 2) {
      beats.push("warmer weekend");
    } else if (!weWet && hi != null && weHi != null && weHi <= hi - 2) {
      beats.push("cooler weekend");
    }
  }
  // Range note.
  if (hi != null && lo != null && hi - lo >= 12) {
    beats.push("big day/night swings");
  }

  const tail = beats.length ? ` — ${beats.slice(0, 2).join(" · ")}` : "";
  return `${lead}${tail}.`;
}

function pickLead({ wet, sunny, stormy, hot, cold, total, hi, lo }) {
  const hiR = hi == null ? "" : ` highs near ${Math.round(hi)}°`;
  if (stormy.length >= 2) return `Stormy week ahead${hiR}`;
  if (hot.length >= 3) return `Hot stretch coming${hiR}`;
  if (cold.length >= 3) return `Cold week ahead${hiR}`;
  if (wet.length >= Math.ceil(total * 0.66)) return `Wet stretch ahead${hiR}`;
  if (wet.length >= 2) return `Mixed week with rain${hiR}`;
  if (sunny.length >= Math.ceil(total * 0.66)) return `Sunny stretch${hiR}`;
  if (hi != null) return `Settled week${hiR}`;
  return null;
}

function avg(arr) {
  const xs = arr.filter((v) => v != null);
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
