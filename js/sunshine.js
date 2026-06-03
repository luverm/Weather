// Summarise "how sunny is the rest of today" from hourly cloud cover.
// Returns { percent, label, peakWindow: { start, end, avg } | null,
//   nextSunnyHour: ts | null, points: [{time, cover}] } or null if data missing.
//
// A point is considered "sunny" when cloud cover < 30 % during daylight hours.
// "Partly" is 30–70 %, "Overcast" is >=70 %.

const SUNNY_MAX = 30;

export function computeSunshine(weather) {
  const hours = weather?.hourly || [];
  if (!hours.length) return null;

  // Use the next ~14 daylight hours (capped by available data).
  const now = Date.now();
  const horizonEnd = now + 14 * 3600_000;
  const daySlice = hours.filter((h) =>
    h.time >= now - 30 * 60_000 &&
    h.time <= horizonEnd &&
    h.cloudCover != null
  );
  if (daySlice.length < 3) return null;

  const daylight = daySlice.filter((h) => h.isDay);
  if (daylight.length < 2) {
    // Mostly nighttime ahead — fall back to "next sunny hour" only.
    const nextSunny = hours.find((h) => h.isDay && (h.cloudCover ?? 100) < SUNNY_MAX);
    return {
      percent: null,
      label: "Sun's down",
      peakWindow: null,
      nextSunnyHour: nextSunny?.time || null,
      points: daySlice.slice(0, 14).map((h) => ({ time: h.time, cover: h.cloudCover })),
    };
  }

  const sunnyHours = daylight.filter((h) => h.cloudCover < SUNNY_MAX).length;
  const percent = Math.round((sunnyHours / daylight.length) * 100);
  const label =
    percent >= 75 ? "Mostly sunny" :
    percent >= 45 ? "Some sun" :
    percent >= 20 ? "Mostly cloudy" :
    "Overcast";

  // Longest contiguous sunny window (daylight hours w/ cloudCover < SUNNY_MAX).
  let bestStart = null, bestEnd = null, bestLen = 0;
  let curStart = null, curLen = 0;
  for (const h of daylight) {
    if (h.cloudCover < SUNNY_MAX) {
      if (curStart == null) curStart = h.time;
      curLen += 1;
      if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; bestEnd = h.time; }
    } else {
      curStart = null; curLen = 0;
    }
  }
  const peakWindow = bestLen >= 2
    ? { start: bestStart, end: bestEnd + 3600_000, hours: bestLen }
    : null;

  const nextSunnyHour = !peakWindow
    ? (daylight.find((h) => h.cloudCover < 50)?.time || null)
    : null;

  return {
    percent,
    label,
    peakWindow,
    nextSunnyHour,
    points: daySlice.slice(0, 14).map((h) => ({ time: h.time, cover: h.cloudCover })),
  };
}

// Build an SVG path for a 14-point cloud-cover sparkline.
// Returns { line, fill } as path "d" attribute strings; viewBox "0 0 100 24".
export function sparklinePaths(points) {
  if (!points?.length) return { line: "", fill: "" };
  const w = 100, h = 24;
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const ys = points.map((p) => {
    const cover = Math.max(0, Math.min(100, p.cover ?? 0));
    // Invert: 0 % cover -> top of chart (sunny), 100 % -> bottom.
    return h - (cover / 100) * h;
  });
  let line = "";
  let fill = `M0 ${h.toFixed(2)} `;
  ys.forEach((y, i) => {
    const x = (i * step).toFixed(2);
    line += `${i === 0 ? "M" : "L"}${x} ${y.toFixed(2)} `;
    fill += `L${x} ${y.toFixed(2)} `;
  });
  fill += `L${w.toFixed(2)} ${h.toFixed(2)} Z`;
  return { line: line.trim(), fill: fill.trim() };
}
