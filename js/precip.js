// Precipitation outlook: totals + a 7-day mini bar chart.
// Consumes the normalized weather object from weather-service.js.
//
// Returns:
//   {
//     next24: { total, hours, peakHour },
//     week:   { total, days, wettest },
//     dry: boolean,
//     headline: string,
//   }
// `total` values are in millimetres; `days`/`hours` carry raw data for the UI
// to size bars. Consumers get a rendered headline they can drop into a chip.

const DRY_THRESHOLD_MM = 0.4; // less than this over 7 days = practically dry

export function buildPrecipSummary(weather, { weekday } = {}) {
  if (!weather) return null;
  const hours = weather.hourly || [];
  const days = (weather.daily || []).slice(0, 7);
  if (!hours.length && !days.length) return null;

  const dow = weekday || ((t) => new Date(t).toLocaleDateString([], { weekday: "short" }));

  // Next 24h.
  const next24Hours = hours.slice(0, 24);
  const next24Total = round1(next24Hours.reduce((a, h) => a + (h.precip || 0), 0));
  let peakHour = null;
  for (const h of next24Hours) {
    const v = h.precip || 0;
    if (v > 0 && (!peakHour || v > peakHour.precip)) {
      peakHour = { time: h.time, precip: v, pop: h.pop };
    }
  }

  // 7-day totals per day.
  const perDay = days.map((d) => ({
    time: d.time,
    precip: Math.max(0, d.precip || 0),
    pop: d.pop || 0,
    label: dow(d.time || d.sunrise),
    condition: d.condition,
  }));
  const weekTotal = round1(perDay.reduce((a, d) => a + d.precip, 0));
  let wettest = null;
  for (const d of perDay) {
    if (d.precip > 0 && (!wettest || d.precip > wettest.precip)) wettest = d;
  }

  const dry = weekTotal < DRY_THRESHOLD_MM && next24Total < DRY_THRESHOLD_MM;

  return {
    next24: { total: next24Total, hours: next24Hours, peakHour },
    week: { total: weekTotal, days: perDay, wettest },
    dry,
    headline: buildHeadline({ next24Total, weekTotal, wettest, peakHour, dry }),
  };
}

function buildHeadline({ next24Total, weekTotal, wettest, peakHour, dry }) {
  if (dry) return "Dry outlook — no rain this week";
  if (next24Total >= 10) return `Heavy rain today — ${fmtMm(next24Total)} expected`;
  if (next24Total >= 2) return `${fmtMm(next24Total)} in the next 24 h`;
  if (peakHour) return `Light showers — peak ${fmtMm(peakHour.precip)}/h`;
  if (wettest) return `Driest today; ${wettest.label} looks wettest`;
  return `About ${fmtMm(weekTotal)} across the week`;
}

function round1(v) { return Math.round(v * 10) / 10; }

export function fmtMm(mm) {
  if (mm == null) return "—";
  if (mm >= 10) return `${Math.round(mm)} mm`;
  if (mm >= 1) return `${(Math.round(mm * 10) / 10).toFixed(1)} mm`;
  if (mm > 0) return `${(Math.round(mm * 100) / 100).toFixed(2)} mm`;
  return "0 mm";
}

// Map a daily precipitation total (mm) to a 0..1 intensity band used by the UI
// to colour bars. Anything above ~15mm reads as "heavy" and clamps.
export function precipIntensity(mm) {
  if (!mm || mm <= 0) return 0;
  return Math.min(1, mm / 15);
}
