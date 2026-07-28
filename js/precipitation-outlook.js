// Round 22: 24h precipitation outlook.
// Distills hourly `precip` + `pop` into a headline (total mm expected),
// a timing chip ("starts in 2 h" / "peaks at 15:00"), and a cumulative
// accumulation area chart so a quick glance shows the shape of the wet
// window — front-loaded shower vs. steady soak vs. dry.

const AREA_W = 100;
const AREA_H = 32;

export function summarize(hours) {
  const h = (hours || []).slice(0, 24).filter((x) => x && x.time != null);
  if (h.length < 2) return null;

  let raw = 0;
  const cumulative = [];
  for (const p of h) {
    const mm = Math.max(0, p.precip ?? 0);
    raw += mm;
    cumulative.push({ time: p.time, mm: raw });
  }

  // Timing: first hour with >= 0.1 mm expected, and peak intensity hour.
  let firstIdx = -1;
  let peakIdx = -1;
  let peakMm = 0;
  for (let i = 0; i < h.length; i++) {
    const mm = Math.max(0, h[i].precip ?? 0);
    if (firstIdx < 0 && mm >= 0.1) firstIdx = i;
    if (mm > peakMm) { peakMm = mm; peakIdx = i; }
  }

  const dry = raw < 0.2 && peakMm < 0.1;
  return {
    total: raw,
    rawTotal: raw,
    dry,
    firstHour: firstIdx >= 0 ? h[firstIdx] : null,
    peakHour: peakIdx >= 0 && peakMm > 0 ? h[peakIdx] : null,
    peakMm,
    cumulative,
  };
}

export function buildAreaPath(cumulative) {
  if (!cumulative || cumulative.length < 2) return { line: "", fill: "" };
  const max = Math.max(0.4, ...cumulative.map((c) => c.mm));
  const n = cumulative.length;
  const stepX = AREA_W / (n - 1);
  const scaleY = (mm) => AREA_H - (mm / max) * (AREA_H - 2) - 1;
  let line = "";
  cumulative.forEach((c, i) => {
    const x = i * stepX;
    line += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + scaleY(c.mm).toFixed(1) + " ";
  });
  const fill =
    line +
    `L${AREA_W.toFixed(1)},${AREA_H.toFixed(1)} ` +
    `L0,${AREA_H.toFixed(1)} Z`;
  return { line: line.trim(), fill };
}

// Human-readable "starts in ..." string. Anchors to the hour bucket that
// crossed the drizzle threshold, so avoids "starts in 3 min" style noise.
export function relativeTime(ts, now = Date.now()) {
  if (!ts) return "";
  const diff = ts - now;
  const mins = Math.round(diff / 60_000);
  if (mins <= 0) return "now";
  if (mins < 60) return `in ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `in ${hrs} h`;
  return "later";
}

export function intensityLabel(mm) {
  if (mm <= 0) return null;
  if (mm < 0.5) return "trace";
  if (mm < 1) return "light";
  if (mm < 4) return "moderate";
  if (mm < 10) return "heavy";
  return "torrential";
}
