// Golden hour + blue hour windows.
//
// Golden hour ≈ 1h after sunrise and 1h before sunset (photographer's rule).
// Blue hour   ≈ 30m before sunrise and 30m after sunset (civil-twilight approx).
// These approximations are location-agnostic enough for a UI cue; a fully
// accurate solar-elevation model would need latitude + day-of-year, which is
// overkill for a "look up now" affordance.

const H = 3600_000;
const M30 = 30 * 60_000;

// Pick the sun pair whose window is most relevant to `now` — the current
// day if we're inside it, otherwise the soonest upcoming day.
function pickSunPair(w, now) {
  const days = w?.daily || [];
  if (days.length) {
    // Prefer a day whose sunset is in the future.
    const future = days
      .filter((d) => d.sunrise && d.sunset && d.sunset >= now - 60 * 60_000)
      .sort((a, b) => a.sunrise - b.sunrise)[0];
    if (future) return { sunrise: future.sunrise, sunset: future.sunset };
  }
  return { sunrise: w?.sunrise, sunset: w?.sunset };
}

export function goldenHourWindows(w, now = Date.now()) {
  const { sunrise, sunset } = pickSunPair(w, now);
  if (!sunrise || !sunset) return null;

  const morning     = { start: sunrise,       end: sunrise + H };
  const evening     = { start: sunset - H,    end: sunset };
  const blueMorning = { start: sunrise - M30, end: sunrise };
  const blueEvening = { start: sunset,        end: sunset + M30 };

  const inRange = (r) => now >= r.start && now < r.end;
  let active = null;
  let minutesLeft = 0;
  if (inRange(blueMorning))      { active = "blueMorning"; minutesLeft = Math.round((blueMorning.end - now) / 60_000); }
  else if (inRange(morning))     { active = "morning";     minutesLeft = Math.round((morning.end - now) / 60_000); }
  else if (inRange(evening))     { active = "evening";     minutesLeft = Math.round((evening.end - now) / 60_000); }
  else if (inRange(blueEvening)) { active = "blueEvening"; minutesLeft = Math.round((blueEvening.end - now) / 60_000); }

  // Soonest upcoming window (any kind).
  const upcoming = [
    { kind: "blueMorning", ts: blueMorning.start },
    { kind: "morning",     ts: morning.start },
    { kind: "evening",     ts: evening.start },
    { kind: "blueEvening", ts: blueEvening.start },
  ]
    .filter((x) => x.ts > now)
    .sort((a, b) => a.ts - b.ts);

  const next = upcoming.length
    ? { kind: upcoming[0].kind, ts: upcoming[0].ts, minutes: Math.round((upcoming[0].ts - now) / 60_000) }
    : null;

  return { morning, evening, blueMorning, blueEvening, active, minutesLeft, next, sunrise, sunset };
}

export function goldenHourKindLabel(kind) {
  if (kind === "morning") return "Golden hour";
  if (kind === "evening") return "Golden hour";
  if (kind === "blueMorning") return "Blue hour";
  if (kind === "blueEvening") return "Blue hour";
  return "Golden hour";
}

// Returns { label, status, minutes, text } when we should override the plain
// sunrise/sunset countdown with a golden/blue-hour cue, or null otherwise.
export function goldenHourCue(w, now = Date.now()) {
  const g = goldenHourWindows(w, now);
  if (!g) return null;
  if (g.active) {
    return {
      kind: g.active,
      label: goldenHourKindLabel(g.active),
      status: "now",
      minutes: g.minutesLeft,
      text: `now · ${g.minutesLeft}m left`,
    };
  }
  if (g.next && g.next.minutes <= 90) {
    return {
      kind: g.next.kind,
      label: goldenHourKindLabel(g.next.kind),
      status: "soon",
      minutes: g.next.minutes,
      text: `in ${formatMinutes(g.next.minutes)}`,
    };
  }
  return null;
}

function formatMinutes(m) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h}h ${mm}m` : `${h}h`;
}
