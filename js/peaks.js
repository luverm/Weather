// Computes today's notable moments — warmest / coolest / windiest / wettest /
// brightest hours — and returns them as points on a linear day timeline so the
// UI can drop them onto a horizontal ribbon.
//
// Only the next ~18 hours of hourly data are considered; a peak has to be
// meaningfully above the surrounding baseline to be listed.

const ICONS = {
  warm: "🔥",
  cool: "❄️",
  wind: "💨",
  rain: "🌂",
  uv: "☀️",
};

const COLORS = {
  warm: "#ff9c7a",
  cool: "#9ad1ff",
  wind: "#c7b4ff",
  rain: "#78c0f2",
  uv: "#ffd36a",
};

const LABELS = {
  warm: "Warmest",
  cool: "Coolest",
  wind: "Windiest",
  rain: "Wettest",
  uv: "Sunniest",
};

// Build the ribbon. Returns { start, end, items:[{kind, ts, valueText, frac, color, icon, label}] }
// or null when there isn't enough spread in the day to be interesting.
export function buildPeaks(weather, { unit = "C" } = {}) {
  const hours = (weather?.hourly || []).slice(0, 18);
  if (hours.length < 6) return null;

  const now = Date.now();
  // Timeline spans from "now (rounded down to the hour)" to the last hour we have.
  const start = Math.min(hours[0].time, now);
  const end = hours[hours.length - 1].time;
  const spanMs = Math.max(1, end - start);

  const items = [];

  // 1. Warmest & coolest hours by feels-like (fall back to temp).
  let warm = null, cool = null;
  for (const h of hours) {
    const t = h.feelsLike ?? h.temp;
    if (t == null) continue;
    if (!warm || t > warm.v) warm = { v: t, ts: h.time, rawTemp: h.temp };
    if (!cool || t < cool.v) cool = { v: t, ts: h.time, rawTemp: h.temp };
  }
  if (warm && cool && warm.v - cool.v >= 3) {
    items.push({
      kind: "warm",
      ts: warm.ts,
      valueText: fmtTemp(warm.rawTemp, unit),
    });
    items.push({
      kind: "cool",
      ts: cool.ts,
      valueText: fmtTemp(cool.rawTemp, unit),
    });
  }

  // 2. Windiest hour by gust (fall back to sustained wind). Only surface it
  //    when the peak actually stands out — a boring flat-wind day isn't a peak.
  let wind = null;
  for (const h of hours) {
    const g = h.gusts ?? h.wind;
    if (g == null) continue;
    if (!wind || g > wind.v) wind = { v: g, ts: h.time };
  }
  const meanWind = mean(hours.map((h) => h.gusts ?? h.wind).filter((v) => v != null));
  if (wind && wind.v >= 18 && wind.v - meanWind >= 4) {
    items.push({
      kind: "wind",
      ts: wind.ts,
      valueText: `${Math.round(wind.v)} km/h`,
    });
  }

  // 3. Wettest hour by precipitation (only when there is real precip in the window).
  let rain = null;
  for (const h of hours) {
    const p = h.precip ?? 0;
    if (!rain || p > rain.v) rain = { v: p, ts: h.time, pop: h.pop ?? 0 };
  }
  if (rain && rain.v >= 0.4) {
    items.push({
      kind: "rain",
      ts: rain.ts,
      valueText: `${rain.v >= 10 ? Math.round(rain.v) : rain.v.toFixed(1)} mm`,
    });
  } else {
    // If nothing wet, but rain probability spikes, still show it as a "chance" peak.
    let popPeak = null;
    for (const h of hours) {
      const p = h.pop ?? 0;
      if (!popPeak || p > popPeak.v) popPeak = { v: p, ts: h.time };
    }
    if (popPeak && popPeak.v >= 55) {
      items.push({
        kind: "rain",
        ts: popPeak.ts,
        valueText: `${popPeak.v}%`,
      });
    }
  }

  // 4. Brightest / UV peak. Skip after sunset.
  let uv = null;
  for (const h of hours) {
    if (h.uv == null) continue;
    if (!uv || h.uv > uv.v) uv = { v: h.uv, ts: h.time };
  }
  if (uv && uv.v >= 4) {
    items.push({
      kind: "uv",
      ts: uv.ts,
      valueText: `UV ${Math.round(uv.v)}`,
    });
  }

  if (items.length < 2) return null;

  // Compute fractional positions along the ribbon.
  for (const it of items) {
    it.frac = clamp01((it.ts - start) / spanMs);
    it.color = COLORS[it.kind];
    it.icon = ICONS[it.kind];
    it.label = LABELS[it.kind];
  }

  // Nudge dots that fall within 6% of each other so they don't overlap.
  items.sort((a, b) => a.frac - b.frac);
  const MIN_GAP = 0.07;
  for (let i = 1; i < items.length; i++) {
    if (items[i].frac - items[i - 1].frac < MIN_GAP) {
      items[i].frac = Math.min(1, items[i - 1].frac + MIN_GAP);
    }
  }

  return {
    start,
    end,
    nowFrac: clamp01((now - start) / spanMs),
    items,
  };
}

function fmtTemp(c, unit) {
  if (c == null) return "—";
  const v = unit === "F" ? c * 9 / 5 + 32 : c;
  return `${Math.round(v)}°`;
}

function mean(arr) {
  if (!arr.length) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
