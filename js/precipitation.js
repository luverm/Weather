// Precipitation outlook: summarize upcoming rain from the hourly + daily
// forecasts. Returns null if there's effectively nothing to show, so the UI
// can hide the card and not clutter dry locations.

export function precipOutlook(weather) {
  const hourly = weather?.hourly || [];
  const daily = (weather?.daily || []).slice(0, 7);
  if (!daily.length) return null;

  const next24Total = hourly.slice(0, 24).reduce((s, h) => s + (h.precip || 0), 0);
  const next24MaxPop = hourly.slice(0, 24).reduce((m, h) => Math.max(m, h.pop || 0), 0);
  const next24Hours = hourly.slice(0, 24).filter((h) => (h.precip || 0) > 0.05).length;

  const weekTotal = daily.reduce((s, d) => s + (d.precip || 0), 0);
  const wettest = daily.reduce((best, d) => {
    if (!d) return best;
    return (!best || (d.precip ?? 0) > (best.precip ?? 0)) ? d : best;
  }, null);
  const dryDays = daily.filter((d) => (d.precip ?? 0) < 0.2 && (d.pop ?? 0) < 25).length;

  // Hide the whole card when there's basically no rain in the forecast.
  if (weekTotal < 0.5 && next24Total < 0.5 && next24MaxPop < 30) return null;

  // Headline reflects the sharper of today or the week.
  let headline, tone;
  if (next24Total >= 15) {
    headline = `Heavy rain — ${fmtMm(next24Total)} in 24h`;
    tone = "wet";
  } else if (next24Total >= 3) {
    headline = `Showers — ${fmtMm(next24Total)} in 24h`;
    tone = "wet";
  } else if (next24MaxPop >= 50 && next24Total >= 0.2) {
    headline = `Spotty rain — ${next24MaxPop}% chance`;
    tone = "mix";
  } else if (weekTotal >= 10) {
    headline = `Dry today — ${fmtMm(weekTotal)} this week`;
    tone = "mix";
  } else if (weekTotal >= 2) {
    headline = `Light week — ${fmtMm(weekTotal)} total`;
    tone = "dry";
  } else {
    headline = "Mostly dry stretch ahead";
    tone = "dry";
  }

  return {
    tone,
    headline,
    next24Total,
    next24MaxPop,
    next24Hours,
    weekTotal,
    dryDays,
    daily,
    wettest,
  };
}

function fmtMm(mm) {
  if (mm == null) return "—";
  if (mm < 0.1) return "0 mm";
  if (mm < 1) return `${mm.toFixed(1)} mm`;
  if (mm < 10) return `${mm.toFixed(1)} mm`;
  return `${Math.round(mm)} mm`;
}

// Format a short "wettest day" badge, e.g. "Thu · 8 mm".
export function wettestLabel(day, tz) {
  if (!day || day.precip == null) return null;
  const d = new Date(day.time);
  const name = d.toLocaleDateString(undefined, {
    weekday: "short",
    ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });
  return `${name} · ${fmtMm(day.precip)}`;
}
