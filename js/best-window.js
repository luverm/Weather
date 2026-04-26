// Find the best ~3-hour window for outdoor activity in the next 24 hours.
// Scores each hour by: dryness, comfortable temperature, gentle wind, low UV
// (during day), good visibility. Slides a 3-hour window and returns the
// highest-scoring contiguous block, plus the runner-up (so the user can see a
// fallback if the top one already started).

export function findBestWindow(weather, { windowSize = 3 } = {}) {
  if (!weather?.hourly?.length) return null;
  const now = Date.now();
  const hours = weather.hourly.filter((h) => h.time >= now - 30 * 60_000).slice(0, 24);
  if (hours.length < windowSize) return null;

  // Per-hour score (0..1).
  const scores = hours.map((h) => scoreHour(h));

  // Sliding-window average.
  let best = null;
  for (let i = 0; i + windowSize <= scores.length; i++) {
    let s = 0;
    for (let j = 0; j < windowSize; j++) s += scores[i + j];
    s /= windowSize;
    const slice = hours.slice(i, i + windowSize);
    if (!best || s > best.score) {
      best = {
        score: s,
        start: slice[0].time,
        end: slice[slice.length - 1].time + 3600_000,
        hours: slice,
        reason: dominantReason(slice),
      };
    }
  }
  if (!best || best.score < 0.45) return null;
  return best;
}

function scoreHour(h) {
  let s = 1;

  // Precip — strongest negative signal.
  const pop = h.pop ?? 0;
  s *= 1 - Math.min(1, pop / 100) * 0.8;
  const precip = h.precip ?? 0;
  if (precip > 0.5) s *= Math.max(0.2, 1 - precip / 5);

  // Temperature comfort — ideal 14–24 °C, taper outside that.
  const t = h.feelsLike ?? h.temp;
  if (t != null) {
    if (t < 0) s *= 0.4;
    else if (t < 8) s *= 0.6 + (t / 8) * 0.3;
    else if (t > 30) s *= Math.max(0.3, 1 - (t - 30) / 12);
    else if (t > 26) s *= 0.85;
  }

  // Wind/gust.
  const g = h.gusts ?? h.wind ?? 0;
  if (g >= 50) s *= 0.4;
  else if (g >= 35) s *= 0.65;
  else if (g >= 25) s *= 0.85;

  // UV during day.
  if (h.isDay && h.uv != null) {
    if (h.uv >= 11) s *= 0.55;
    else if (h.uv >= 8) s *= 0.8;
  }

  // Daylight bonus — slight preference for daylit hours.
  if (h.isDay) s *= 1.06;
  else s *= 0.92;

  // Bad conditions blanket penalty.
  if (h.condition === "storm") s *= 0.2;
  else if (h.condition === "snow") s *= 0.5;
  else if (h.condition === "fog") s *= 0.7;
  else if (h.condition === "rain") s *= 0.5;

  return Math.max(0, Math.min(1, s));
}

function dominantReason(slice) {
  const avgT = slice.reduce((s, h) => s + (h.feelsLike ?? h.temp ?? 0), 0) / slice.length;
  const maxPop = Math.max(...slice.map((h) => h.pop ?? 0));
  const maxGust = Math.max(...slice.map((h) => h.gusts ?? h.wind ?? 0));
  const anyDay = slice.some((h) => h.isDay);
  const conditions = slice.map((h) => h.condition);
  const allClear = conditions.every((c) => c === "clear");
  const partly = conditions.includes("clouds") && conditions.includes("clear");

  if (maxPop <= 10 && allClear) return "Dry & clear";
  if (maxPop <= 20 && partly) return "Mostly dry";
  if (maxPop <= 30) return "Light cloud, low rain risk";
  if (avgT >= 18 && avgT <= 24 && maxGust < 25) return "Comfortable & calm";
  if (anyDay) return "Best of the day";
  return "Calmer stretch";
}

export function fmtWindow(win, { fmtTime, weekday } = {}) {
  if (!win) return null;
  const fmt = fmtTime || ((t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  const start = fmt(win.start);
  // Show end as 1h after the last hour's start.
  const end = fmt(win.end);
  const day = weekday ? weekday(win.start) : "";
  // If the window starts later today, just show times. If it's tomorrow, prefix.
  const startDay = new Date(win.start).getDate();
  const todayDay = new Date().getDate();
  const prefix = startDay !== todayDay && day ? `${day} · ` : "";
  return `${prefix}${start}–${end}`;
}
