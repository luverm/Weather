// Compute photographer's golden hour + civil twilight windows for a day.
// We approximate: golden hour ≈ 4.5% of daylight (bounded 35–65 min);
// civil twilight ≈ 2.8% of daylight (bounded 25–45 min). Good enough for
// mid-latitudes without needing a full solar-elevation model.

const MIN = 60_000;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function goldenWindows(day) {
  if (!day?.sunrise || !day?.sunset) return null;
  const daylight = day.sunset - day.sunrise;
  if (daylight <= 0) return null;
  const gDur = clamp(daylight * 0.045, 35 * MIN, 65 * MIN);
  const tDur = clamp(daylight * 0.028, 25 * MIN, 45 * MIN);
  return {
    // Golden hour AM: from sunrise to sunrise + gDur.
    goldenAm: { start: day.sunrise, end: day.sunrise + gDur },
    // Golden hour PM: from sunset - gDur to sunset.
    goldenPm: { start: day.sunset - gDur, end: day.sunset },
    // Civil twilight before sunrise & after sunset.
    dawn: { start: day.sunrise - tDur, end: day.sunrise },
    dusk: { start: day.sunset, end: day.sunset + tDur },
  };
}

// Given the whole weather object and "now", find the next photo-worthy event
// (start of dawn / golden-am / golden-pm / dusk) within the coming ~18h.
// Returns { kind: "Dawn"|"Golden hour"|"Blue hour", ts, until } or null.
export function nextGoldenEvent(weather, now = Date.now()) {
  if (!weather?.daily?.length) return null;
  const events = [];
  for (const d of weather.daily) {
    const w = goldenWindows(d);
    if (!w) continue;
    events.push({ kind: "Dawn",        ts: w.dawn.start });
    events.push({ kind: "Golden hour", ts: w.goldenAm.start });
    events.push({ kind: "Golden hour", ts: w.goldenPm.start });
    events.push({ kind: "Blue hour",   ts: w.dusk.start });
  }
  events.sort((a, b) => a.ts - b.ts);
  const future = events.find((e) => e.ts - now > 30_000);
  return future || null;
}

// If the current moment is inside one of the four windows, return which one.
export function currentGoldenWindow(weather, now = Date.now()) {
  if (!weather?.daily?.length) return null;
  for (const d of weather.daily) {
    const w = goldenWindows(d);
    if (!w) continue;
    if (now >= w.dawn.start     && now < w.dawn.end)     return { kind: "Blue hour",   endsAt: w.dawn.end };
    if (now >= w.goldenAm.start && now < w.goldenAm.end) return { kind: "Golden hour", endsAt: w.goldenAm.end };
    if (now >= w.goldenPm.start && now < w.goldenPm.end) return { kind: "Golden hour", endsAt: w.goldenPm.end };
    if (now >= w.dusk.start     && now < w.dusk.end)     return { kind: "Blue hour",   endsAt: w.dusk.end };
  }
  return null;
}
