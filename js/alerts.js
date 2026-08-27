// Synthesize high-impact weather alerts from the existing forecast data.
// Open-Meteo's free tier doesn't expose government NWS-style alerts, so we
// derive them locally. Each alert is { id, severity, title, detail, ts? }.
// `ts` lets the UI scrub to the exact moment of the alert when clicked.

export function buildAlerts(weather) {
  if (!weather) return [];
  const out = [];
  const hours = (weather.hourly || []).slice(0, 24);
  const today = (weather.daily || [])[0];
  const tomorrow = (weather.daily || [])[1];

  // ---- Heat ----
  const hottest = hottestHour(hours);
  if (hottest && hottest.t >= 35) {
    out.push({
      id: "severe-heat",
      severity: "danger",
      title: "Severe heat",
      detail: `Up to ${Math.round(hottest.t)}° at ${shortClock(hottest.ts)} — hydrate, avoid sun.`,
      ts: hottest.ts,
    });
  } else if (hottest && hottest.t >= 30) {
    out.push({
      id: "heat",
      severity: "warn",
      title: "Heat advisory",
      detail: `Peaks near ${Math.round(hottest.t)}° around ${shortClock(hottest.ts)}.`,
      ts: hottest.ts,
    });
  }

  // ---- Frost / freeze ----
  const coldest = coldestNight(weather);
  if (coldest && coldest.t <= -5) {
    out.push({
      id: "hard-freeze",
      severity: "danger",
      title: "Hard freeze tonight",
      detail: `Lows near ${Math.round(coldest.t)}° — bring plants in, drip pipes.`,
      ts: coldest.ts,
    });
  } else if (coldest && coldest.t <= 2) {
    out.push({
      id: "frost",
      severity: "warn",
      title: "Frost overnight",
      detail: `Drops to ${Math.round(coldest.t)}° around ${shortClock(coldest.ts)}.`,
      ts: coldest.ts,
    });
  }

  // ---- Wind / gusts ----
  const gust = peakGust(hours);
  if (gust && gust.v >= 75) {
    out.push({
      id: "storm-wind",
      severity: "danger",
      title: "Damaging wind",
      detail: `Gusts to ${Math.round(gust.v)} km/h near ${shortClock(gust.ts)}.`,
      ts: gust.ts,
    });
  } else if (gust && gust.v >= 50) {
    out.push({
      id: "gale",
      severity: "warn",
      title: "Gale-force gusts",
      detail: `Up to ${Math.round(gust.v)} km/h around ${shortClock(gust.ts)}.`,
      ts: gust.ts,
    });
  }

  // ---- Rain accumulation ----
  const rainy = wettestRunningWindow(hours, 6);
  const dayTotal = today?.precip ?? 0;
  if (rainy && rainy.sum >= 25) {
    out.push({
      id: "heavy-rain",
      severity: "danger",
      title: "Heavy rainfall",
      detail: `${rainy.sum.toFixed(0)} mm expected over 6h from ${shortClock(rainy.start)}.`,
      ts: rainy.start,
    });
  } else if (rainy && rainy.sum >= 10) {
    out.push({
      id: "soaking-rain",
      severity: "warn",
      title: "Soaking rain",
      detail: `~${rainy.sum.toFixed(0)} mm over 6h from ${shortClock(rainy.start)}.`,
      ts: rainy.start,
    });
  } else if (dayTotal >= 15) {
    out.push({
      id: "wet-day",
      severity: "info",
      title: "Wet day ahead",
      detail: `${dayTotal.toFixed(0)} mm forecast in total.`,
    });
  }

  // ---- Snow ----
  const snowHour = hours.find((h) => h.condition === "snow");
  if (snowHour) {
    out.push({
      id: "snow",
      severity: "info",
      title: "Snow in forecast",
      detail: `Starts around ${shortClock(snowHour.time)}.`,
      ts: snowHour.time,
    });
  }

  // ---- Thunder ----
  const stormHour = hours.find((h) => h.condition === "storm");
  if (stormHour) {
    out.push({
      id: "thunder",
      severity: "warn",
      title: "Thunderstorms",
      detail: `Possible around ${shortClock(stormHour.time)}.`,
      ts: stormHour.time,
    });
  }

  // ---- Fog ----
  if (weather.visibility != null && weather.visibility < 500) {
    out.push({
      id: "fog",
      severity: "warn",
      title: "Dense fog",
      detail: `Visibility under ${Math.round(weather.visibility)} m right now.`,
    });
  }

  // ---- Multi-day heat wave / cold snap from the daily outlook ----
  const spell = detectSpell(weather.daily || []);
  if (spell) out.push(spell);

  // ---- Rain outlook: next rain if dry now, or dry break if raining now ----
  // Uses precipitation probability + measured precip over the visible 24h.
  const rainOutlook = rainOutlookAlert(hours);
  if (rainOutlook) out.push(rainOutlook);

  // ---- UV (only if not already mentioned by heat) ----
  if (!out.some((a) => a.id === "severe-heat" || a.id === "heat")
      && weather.uvPeak?.value >= 9) {
    out.push({
      id: "uv",
      severity: "warn",
      title: "Extreme UV",
      detail: `UV index ${Math.round(weather.uvPeak.value)} at ${shortClock(weather.uvPeak.time)}.`,
      ts: weather.uvPeak.time,
    });
  }

  // De-dupe (if a daily heat triggers heat AND severe-heat, keep the worst).
  const SEV = { danger: 3, warn: 2, info: 1 };
  return dedupe(out)
    .sort((a, b) => (SEV[b.severity] ?? 0) - (SEV[a.severity] ?? 0))
    .slice(0, 5);
}

function hottestHour(hours) {
  let best = null;
  for (const h of hours) {
    if (h.temp == null) continue;
    if (!best || h.temp > best.t) best = { t: h.temp, ts: h.time };
  }
  return best;
}

function coldestNight(weather) {
  // Look at today's overnight + tomorrow's overnight from hourly data.
  const hours = (weather.hourly || []).slice(0, 24);
  let best = null;
  for (const h of hours) {
    if (h.temp == null) continue;
    if (h.isDay) continue;
    if (!best || h.temp < best.t) best = { t: h.temp, ts: h.time };
  }
  // Fallback: today's daily min.
  if (!best && weather.daily?.[0]?.tempMin != null) {
    best = { t: weather.daily[0].tempMin, ts: weather.daily[0].sunrise };
  }
  return best;
}

function peakGust(hours) {
  let best = null;
  for (const h of hours) {
    const g = h.gusts ?? h.wind ?? 0;
    if (g == null) continue;
    if (!best || g > best.v) best = { v: g, ts: h.time };
  }
  return best;
}

function wettestRunningWindow(hours, span) {
  if (hours.length < span) return null;
  let best = null;
  for (let i = 0; i + span <= hours.length; i++) {
    let sum = 0;
    for (let k = 0; k < span; k++) sum += hours[i + k].precip ?? 0;
    if (!best || sum > best.sum) {
      best = { sum, start: hours[i].time, end: hours[i + span - 1].time };
    }
  }
  return best;
}

// Look for 3+ consecutive days above/below temperature thresholds and
// synthesize a single alert for the streak. Heat wave gets priority
// over cold snap when both trigger somehow.
function detectSpell(days) {
  if (days.length < 3) return null;
  const runs = (predicate) => {
    let best = 0, cur = 0, startIdx = 0, bestStart = -1;
    for (let i = 0; i < days.length; i++) {
      if (predicate(days[i])) {
        if (cur === 0) startIdx = i;
        cur += 1;
        if (cur > best) { best = cur; bestStart = startIdx; }
      } else {
        cur = 0;
      }
    }
    return { length: best, start: bestStart };
  };
  const heat = runs((d) => d.tempMax != null && d.tempMax >= 30);
  const cold = runs((d) => d.tempMax != null && d.tempMax <= 5);
  if (heat.length >= 3) {
    return {
      id: "heat-wave",
      severity: "warn",
      title: `Heat wave · ${heat.length} days`,
      detail: `Highs stay at or above 30° starting ${dayName(days[heat.start].time)}.`,
      ts: days[heat.start].sunrise || days[heat.start].time,
    };
  }
  if (cold.length >= 3) {
    return {
      id: "cold-snap",
      severity: "warn",
      title: `Cold snap · ${cold.length} days`,
      detail: `Highs stay at or below 5° starting ${dayName(days[cold.start].time)}.`,
      ts: days[cold.start].sunrise || days[cold.start].time,
    };
  }
  return null;
}

function dayName(ts) {
  return new Date(ts).toLocaleDateString([], { weekday: "short" });
}

function rainOutlookAlert(hours) {
  if (!hours?.length) return null;
  const now = Date.now();
  const wet = (h) => (h.precip ?? 0) >= 0.3 || (h.pop ?? 0) >= 60;
  // Are we in a wet spell right now? (nearest hour within the next 60 min)
  const upcoming = hours.filter((h) => h.time >= now - 30 * 60_000);
  if (!upcoming.length) return null;
  const first = upcoming[0];
  const inWet = wet(first);
  const inHours = (t) => Math.max(0, Math.round((t - now) / 3600_000));

  if (inWet) {
    // Find first upcoming hour that flips dry, within 12h.
    for (let i = 1; i < upcoming.length && i < 12; i++) {
      if (!wet(upcoming[i])) {
        const t = upcoming[i].time;
        return {
          id: "dry-break",
          severity: "info",
          title: `Dry break in ${inHours(t)}h`,
          detail: `Rain eases around ${shortClock(t)}.`,
          ts: t,
        };
      }
    }
    return null; // wet all through the window — no useful "break"
  }
  // Currently dry: find next wet hour within 12h.
  for (let i = 0; i < upcoming.length && i < 12; i++) {
    if (wet(upcoming[i])) {
      const t = upcoming[i].time;
      const h = inHours(t);
      if (h < 1) return null; // handled by nowcast banner
      return {
        id: "next-rain",
        severity: "info",
        title: `Rain expected in ${h}h`,
        detail: `Starts around ${shortClock(t)} (${upcoming[i].pop ?? 0}% chance).`,
        ts: t,
      };
    }
  }
  return null;
}

function shortClock(ts) {
  if (!ts) return "later";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function dedupe(items) {
  // Drop "wet-day" if "soaking-rain" or "heavy-rain" present, and "heat"
  // if "severe-heat" present, and "frost" if "hard-freeze" present.
  const ids = new Set(items.map((x) => x.id));
  const drop = new Set();
  if (ids.has("severe-heat")) drop.add("heat");
  if (ids.has("hard-freeze")) drop.add("frost");
  if (ids.has("heavy-rain") || ids.has("soaking-rain")) drop.add("wet-day");
  // If a heavier rain alert is present, don't repeat "next-rain".
  if (ids.has("heavy-rain") || ids.has("soaking-rain") || ids.has("wet-day")) drop.add("next-rain");
  // The multi-day spell alerts supersede the single-hour extremes.
  if (ids.has("heat-wave")) drop.add("heat");
  if (ids.has("cold-snap")) drop.add("frost");
  return items.filter((x) => !drop.has(x.id));
}
