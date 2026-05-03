// Surface the next "magic light" window so photographers (and humans who
// like pretty light) know when to look up. Time-based — close enough for UI.

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

// Returns the active window (if any) or the next upcoming one, decorated
// with .label and .tone.
export function nextLightWindow(daily, now = Date.now()) {
  if (!Array.isArray(daily) || !daily.length) return null;
  const all = daily.flatMap(windowsForDay).sort((a, b) => a.start - b.start);
  const pick = all.find((w) => now >= w.start && now < w.end)
            ?? all.find((w) => w.start > now);
  return pick ? { ...pick, ...KINDS[pick.kind] } : null;
}
