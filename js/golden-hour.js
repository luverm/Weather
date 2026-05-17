// Golden-hour & blue-hour windows, derived purely from sunrise/sunset.
//
// The sun's vertical speed at the horizon falls off with latitude
// (~15°/hr · cos φ), so golden hour is a brief ~40 min near the equator
// but stretches well past an hour toward the poles. We model that instead
// of hard-coding a flat "one hour", which keeps the windows believable
// everywhere the app is used.
//
// Bands (solar elevation):
//   blue   : -8° … -4°
//   golden : -4° … +6°

function minutesPerDegree(lat) {
  const latRad = (Number(lat) || 0) * Math.PI / 180;
  const speed = 15 * Math.max(Math.cos(latRad), 0.15); // °/hour
  return Math.min(16, Math.max(3.5, 60 / speed));      // clamp to sane bounds
}

// Windows for a single day given its sunrise/sunset epochs.
function dayWindows(sunrise, sunset, mpd) {
  if (!sunrise || !sunset) return [];
  const m = mpd * 60_000;
  return [
    { kind: "blue",   phase: "am", start: sunrise - 8 * m, end: sunrise - 4 * m },
    { kind: "golden", phase: "am", start: sunrise - 4 * m, end: sunrise + 6 * m },
    { kind: "golden", phase: "pm", start: sunset  - 6 * m, end: sunset  + 4 * m },
    { kind: "blue",   phase: "pm", start: sunset  + 4 * m, end: sunset  + 8 * m },
  ];
}

export function goldenWindows(weather, lat) {
  if (!weather) return [];
  const mpd = minutesPerDegree(lat);
  const days = (weather.daily && weather.daily.length)
    ? weather.daily
    : [{ sunrise: weather.sunrise, sunset: weather.sunset }];
  const all = [];
  for (const d of days) all.push(...dayWindows(d.sunrise, d.sunset, mpd));
  return all.sort((a, b) => a.start - b.start);
}

// For each of golden / blue, return the window that is active now, or the
// next upcoming one. Each result carries an `active` flag and `ts` (the
// moment to scrub to — window start, or now if already active).
export function nextLightWindows(weather, lat, now = Date.now()) {
  const all = goldenWindows(weather, lat);
  const pick = (kind) => {
    const active = all.find((w) => w.kind === kind && now >= w.start && now <= w.end);
    if (active) return { ...active, active: true, ts: now };
    const upcoming = all.find((w) => w.kind === kind && w.start > now);
    return upcoming ? { ...upcoming, active: false, ts: upcoming.start } : null;
  };
  return { golden: pick("golden"), blue: pick("blue") };
}
