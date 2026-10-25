// Rain outlook: summarise the next 24 hours of precipitation into a single card.
// Returns null when nothing worth surfacing is on the way.

export function buildRainOutlook(weather, { fmtTime } = {}) {
  const hours = (weather?.hourly || []).slice(0, 24);
  if (hours.length < 4) return null;

  let totalMm = 0;
  let maxPop = 0;
  let maxPopHour = null;
  let firstRainHour = null;
  let wettestHour = null;
  for (const h of hours) {
    const pop = h.pop ?? 0;
    const mm = h.precip ?? 0;
    totalMm += mm;
    if (pop > maxPop) { maxPop = pop; maxPopHour = h; }
    if (!wettestHour || mm > (wettestHour.precip ?? 0)) wettestHour = h;
    if (!firstRainHour && (pop >= 55 || mm > 0.3)) firstRainHour = h;
  }

  // Nothing to show.
  if (totalMm < 0.1 && maxPop < 20) return null;

  // Find the longest dry window (consecutive hours with pop < 25 and mm < 0.1).
  let bestDry = null;
  let runStart = null;
  for (let i = 0; i <= hours.length; i++) {
    const h = hours[i];
    const dry = h && (h.pop ?? 0) < 25 && (h.precip ?? 0) < 0.1;
    if (dry && runStart == null) runStart = i;
    if ((!dry || i === hours.length) && runStart != null) {
      const length = i - runStart;
      if (length >= 2 && (!bestDry || length > bestDry.length)) {
        bestDry = {
          length,
          start: hours[runStart].time,
          end: hours[Math.min(hours.length - 1, i - 1)].time,
        };
      }
      runStart = null;
    }
  }

  const fmt = fmtTime || ((t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  const bars = hours.map((h) => ({
    time: h.time,
    pop: h.pop ?? 0,
    precip: h.precip ?? 0,
  }));

  let headline;
  if (firstRainHour) {
    const mins = Math.round((firstRainHour.time - Date.now()) / 60_000);
    const when = mins <= 15 ? "now" :
      mins < 60 ? `in ${mins}m` :
      `at ${fmt(firstRainHour.time)}`;
    headline = `Rain ${when}`;
  } else if (maxPop >= 40) {
    headline = `Possible showers · peak ${maxPop}%`;
  } else {
    headline = `Dry · peak ${maxPop}% chance`;
  }

  let subtitle;
  if (bestDry && bestDry.length >= 3) {
    subtitle = `Driest window ${fmt(bestDry.start)} – ${fmt(bestDry.end)}`;
  } else if (wettestHour && (wettestHour.precip ?? 0) > 0.3) {
    subtitle = `Heaviest ${fmt(wettestHour.time)} · ${wettestHour.precip.toFixed(1)} mm`;
  } else if (maxPopHour) {
    subtitle = `Peak chance ${fmt(maxPopHour.time)}`;
  } else {
    subtitle = "No notable rain in the outlook";
  }

  return {
    totalMm,
    maxPop,
    bars,
    headline,
    subtitle,
  };
}
