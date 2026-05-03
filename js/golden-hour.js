// Compute the next "magic light" window — golden hour or blue hour — from
// the daily sunrise/sunset list. Used to surface a small chip on the sun card
// so photographers (and humans who like pretty light) know when to look up.
//
// Window definitions (simple, time-based; sufficient for UI purposes):
//   morning blue:   sunrise - 30 min  →  sunrise
//   morning golden: sunrise           →  sunrise + 30 min
//   evening golden: sunset  - 30 min  →  sunset
//   evening blue:   sunset            →  sunset  + 30 min

const MIN = 60_000;
const WINDOW_MIN = 30;

const KINDS = {
  "morning-blue":   { label: "Morning blue hour",   tone: "blue"   },
  "morning-golden": { label: "Morning golden hour", tone: "golden" },
  "evening-golden": { label: "Evening golden hour", tone: "golden" },
  "evening-blue":   { label: "Evening blue hour",   tone: "blue"   },
};

function windowsForDay(day) {
  const out = [];
  if (day?.sunrise) {
    out.push({ kind: "morning-blue",   start: day.sunrise - WINDOW_MIN * MIN, end: day.sunrise });
    out.push({ kind: "morning-golden", start: day.sunrise,                    end: day.sunrise + WINDOW_MIN * MIN });
  }
  if (day?.sunset) {
    out.push({ kind: "evening-golden", start: day.sunset - WINDOW_MIN * MIN, end: day.sunset });
    out.push({ kind: "evening-blue",   start: day.sunset,                    end: day.sunset + WINDOW_MIN * MIN });
  }
  return out;
}

// Returns the active window (if any) or the next upcoming one, looking up to
// ~3 days ahead. Each window is decorated with .label and .tone.
export function nextLightWindow(daily, now = Date.now()) {
  if (!Array.isArray(daily) || !daily.length) return null;
  const all = daily.flatMap(windowsForDay).sort((a, b) => a.start - b.start);

  const active = all.find((w) => now >= w.start && now < w.end);
  if (active) return decorate(active);

  const upcoming = all.find((w) => w.start > now);
  return upcoming ? decorate(upcoming) : null;
}

function decorate(w) {
  const meta = KINDS[w.kind] || { label: "Magic light", tone: "golden" };
  return { ...w, label: meta.label, tone: meta.tone };
}
