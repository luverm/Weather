// Synthesise the next notable upcoming change in the forecast, so the user
// can see at-a-glance what to expect without scrubbing the timeline.
// Returns { icon, headline, detail, ts } or null when nothing stands out.

export function nextChange(weather) {
  if (!weather?.hourly?.length) return null;
  const now = Date.now();
  const future = weather.hourly.filter((h) => h.time >= now - 5 * 60_000);
  if (future.length < 2) return null;

  const candidates = [];

  // ---- Rain starting (pop crosses 50% within 6h) ----
  const startsRain = future.slice(0, 7).find((h, i, arr) => {
    if (i === 0) return false;
    return (arr[i - 1].pop ?? 0) < 50 && (h.pop ?? 0) >= 50;
  });
  if (startsRain) {
    candidates.push({
      priority: 90,
      ts: startsRain.time,
      icon: "rain",
      headline: `Rain likely in ${etaLabel(startsRain.time, now)}`,
      detail: `${Math.round(startsRain.pop)}% chance from ${shortClock(startsRain.time, weather.timezone)}`,
    });
  }

  // ---- Rain stopping (pop drops below 30% after wet hour within 6h) ----
  const stopsRain = future.slice(0, 7).find((h, i, arr) => {
    if (i === 0) return false;
    return (arr[i - 1].pop ?? 0) >= 50 && (h.pop ?? 0) < 30;
  });
  if (stopsRain) {
    candidates.push({
      priority: 80,
      ts: stopsRain.time,
      icon: "sun-break",
      headline: `Rain easing by ${shortClock(stopsRain.time, weather.timezone)}`,
      detail: `Drops to ${Math.round(stopsRain.pop)}% chance`,
    });
  }

  // ---- Sunrise/sunset in <2h ----
  const sun = nextSunEvent(weather, now);
  if (sun && sun.in <= 130 * 60_000) {
    candidates.push({
      priority: 70,
      ts: sun.ts,
      icon: sun.kind,
      headline: `${capitalize(sun.kind)} in ${etaLabel(sun.ts, now)}`,
      detail: `at ${shortClock(sun.ts, weather.timezone)}`,
    });
  }

  // ---- Temperature swing (>4°C within next 8h) ----
  const swing = biggestSwing(future.slice(0, 9));
  if (swing && Math.abs(swing.delta) >= 4) {
    const verb = swing.delta > 0 ? "Warming" : "Cooling";
    candidates.push({
      priority: 60,
      ts: swing.ts,
      icon: swing.delta > 0 ? "warmer" : "cooler",
      headline: `${verb} ${Math.abs(Math.round(swing.delta))}° by ${shortClock(swing.ts, weather.timezone)}`,
      detail: `from ${Math.round(swing.from)}° to ${Math.round(swing.to)}°`,
    });
  }

  // ---- Wind picking up (>30 km/h within 6h) ----
  const breezy = future.slice(0, 7).find((h, i, arr) => {
    if (i === 0) return false;
    return (arr[i - 1].wind ?? 0) < 25 && (h.wind ?? 0) >= 30;
  });
  if (breezy) {
    candidates.push({
      priority: 50,
      ts: breezy.time,
      icon: "wind",
      headline: `Wind picking up to ${Math.round(breezy.wind)} km/h`,
      detail: `by ${shortClock(breezy.time, weather.timezone)}`,
    });
  }

  // ---- Peak temperature today (if it hasn't been reached) ----
  const peak = future.slice(0, 12).reduce((best, h) =>
    !best || h.temp > best.temp ? h : best, null);
  if (peak && peak.time > now + 60 * 60_000 && peak.temp - (weather.temp ?? peak.temp) >= 2) {
    candidates.push({
      priority: 30,
      ts: peak.time,
      icon: "peak",
      headline: `Warmest ${Math.round(peak.temp)}° at ${shortClock(peak.time, weather.timezone)}`,
      detail: `${etaLabel(peak.time, now)} away`,
    });
  }

  if (!candidates.length) return null;

  // Pick the most urgent + highest-priority candidate.
  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.ts - b.ts;
  });
  return candidates[0];
}

function nextSunEvent(weather, now) {
  const events = [];
  for (const d of (weather.daily || [])) {
    if (d.sunrise && d.sunrise > now) events.push({ ts: d.sunrise, kind: "sunrise" });
    if (d.sunset && d.sunset > now) events.push({ ts: d.sunset, kind: "sunset" });
  }
  events.sort((a, b) => a.ts - b.ts);
  if (!events.length) return null;
  return { ...events[0], in: events[0].ts - now };
}

function biggestSwing(hours) {
  if (hours.length < 2) return null;
  const start = hours[0].temp;
  let best = null;
  for (let i = 1; i < hours.length; i++) {
    const delta = hours[i].temp - start;
    if (!best || Math.abs(delta) > Math.abs(best.delta)) {
      best = { delta, from: start, to: hours[i].temp, ts: hours[i].time };
    }
  }
  return best;
}

function etaLabel(ts, now) {
  const mins = Math.max(1, Math.round((ts - now) / 60_000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function shortClock(ts, tz) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: tz && tz !== "auto" ? tz : undefined,
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date(ts));
  } catch {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export const nextChangeIconSVG = {
  rain: '<svg viewBox="0 0 24 24"><path d="M7 14a4 4 0 010-8 5 5 0 019.9-1A4 4 0 0117 14H7z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  "sun-break": '<svg viewBox="0 0 24 24"><circle cx="12" cy="11" r="4" fill="currentColor"/><path d="M12 3v2M12 17v2M3 11h2M19 11h2M5.5 4.5l1.4 1.4M17 16l1.5 1.5M5.5 17.5l1.4-1.4M17 6l1.5-1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  sunrise: '<svg viewBox="0 0 24 24"><path d="M3 18h18M12 4v6M8 8l4-4 4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M6 18a6 6 0 1112 0" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>',
  sunset: '<svg viewBox="0 0 24 24"><path d="M3 18h18M12 10V4M8 8l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M6 18a6 6 0 1112 0" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>',
  warmer: '<svg viewBox="0 0 24 24"><path d="M10 4a2 2 0 014 0v10a4 4 0 11-4 0V4z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="17" r="2" fill="currentColor"/></svg>',
  cooler: '<svg viewBox="0 0 24 24"><path d="M12 3v18M5 7l14 10M5 17L19 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  wind: '<svg viewBox="0 0 24 24"><path d="M4 9h12a3 3 0 100-6M4 15h16a3 3 0 110 6M4 12h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>',
  peak: '<svg viewBox="0 0 24 24"><path d="M4 20l6-10 4 6 6-12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
};
