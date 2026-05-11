// 7-day precipitation outlook — totals, wettest day, and a smart headline.
// Pure data transform; UI rendering lives in ui.js.

export function buildPrecipOutlook(weather, { weekday } = {}) {
  const days = (weather?.daily) || [];
  if (days.length < 2) return null;

  // Normalize each day: mm, pop, kind (rain vs snow vs mixed).
  const series = days.map((d, i) => {
    const mm = Math.max(0, d.precip ?? 0);
    const pop = Math.max(0, Math.min(100, d.pop ?? 0));
    const kind = inferKind(d.condition, d.tempMax, d.tempMin);
    return {
      i,
      time: d.time,
      mm,
      pop,
      kind,
      condition: d.condition,
      label: i === 0 ? "Today" : (weekday ? weekday(d.time) : shortWeekday(d.time)),
    };
  });

  const total = series.reduce((s, d) => s + d.mm, 0);
  const peak = series.reduce((b, d) => (b == null || d.mm > b.mm) ? d : b, null);
  const peakIsSignificant = peak && peak.mm >= 0.5;
  const wetDays = series.filter((d) => d.mm >= 1).length;
  const dryDays = series.length - wetDays;
  const maxMm = Math.max(0.5, ...series.map((d) => d.mm));
  // Headline tone: dry / mixed / wet.
  const tone =
    total < 1 ? "dry" :
    total < 8 ? "ok" :
    total < 25 ? "wet" : "very-wet";

  const headline = buildHeadline({ total, peak, peakIsSignificant, wetDays, dryDays, series });

  return {
    series,
    total,             // mm total over the window
    peak,              // {label, mm, kind, time} or null
    peakIsSignificant,
    wetDays,
    dryDays,
    maxMm,             // for bar scaling
    headline,
    tone,
  };
}

function shortWeekday(ts) {
  return new Date(ts).toLocaleDateString(undefined, { weekday: "short" });
}

function inferKind(condition, tMax, tMin) {
  if (condition === "snow") return "snow";
  if (condition === "storm") return "storm";
  // Borderline cold rain — treat as sleet/mixed if avg < 2°C.
  if (condition === "rain" && tMax != null && tMin != null && (tMax + tMin) / 2 < 2) {
    return "mixed";
  }
  return "rain";
}

function buildHeadline({ total, peak, peakIsSignificant, wetDays, series }) {
  if (total < 0.5) return "Dry week ahead";
  if (!peakIsSignificant) return "Mostly dry — trace amounts only";
  const peakLabel = peak?.label || "later";
  const peakMm = peak ? Math.round(peak.mm * 10) / 10 : 0;
  const kindWord = peak?.kind === "snow" ? "snow"
                 : peak?.kind === "storm" ? "downpour"
                 : peak?.kind === "mixed" ? "sleet"
                 : "rain";
  // First wet day in the next 3 — "Rain returns Thursday"
  const firstWet = series.find((d) => d.mm >= 1);
  if (total >= 25) {
    return `${cap(kindWord)}y week · ${Math.round(total)} mm total`;
  }
  if (wetDays >= 4) {
    return `${wetDays} wet days — wettest on ${peakLabel}`;
  }
  if (firstWet && firstWet.i <= 2 && firstWet === peak) {
    return `${cap(kindWord)} on ${peakLabel} · ${peakMm} mm`;
  }
  if (peakMm >= 5) {
    return `Wettest on ${peakLabel} · ${peakMm} mm`;
  }
  return `Light ${kindWord} on ${peakLabel}`;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
