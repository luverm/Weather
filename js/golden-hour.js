// Golden hour + blue hour computation.
//
// Approximated by time offsets from sunrise/sunset (accurate enough for
// mid-latitudes; degrades gracefully near the poles where the definitions
// stop being meaningful anyway):
//
//   Golden hour: 60 min after sunrise  &  60 min before sunset
//   Blue hour:   30 min before sunrise &  30 min after sunset
//
// Given a weather payload with `daily[]` entries carrying sunrise/sunset
// millis, returns `{ state, kind, endsAt?, startsAt? }` where:
//   state = "in"      -> we're currently inside a golden/blue window
//   state = "next"    -> next window is upcoming
//   state = "none"    -> polar / unknown; nothing to show
//   kind  = "golden" | "blue"

const GOLDEN_MS = 60 * 60 * 1000;
const BLUE_MS = 30 * 60 * 1000;

function windowsFor(day) {
  const out = [];
  if (day?.sunrise) {
    out.push({ kind: "blue",   start: day.sunrise - BLUE_MS,   end: day.sunrise,             tag: "dawn" });
    out.push({ kind: "golden", start: day.sunrise,             end: day.sunrise + GOLDEN_MS, tag: "dawn" });
  }
  if (day?.sunset) {
    out.push({ kind: "golden", start: day.sunset - GOLDEN_MS,  end: day.sunset,              tag: "dusk" });
    out.push({ kind: "blue",   start: day.sunset,              end: day.sunset + BLUE_MS,    tag: "dusk" });
  }
  return out;
}

export function computeGoldenHour(weather, now = Date.now()) {
  const days = Array.isArray(weather?.daily) ? weather.daily : [];
  if (!days.length) return { state: "none" };
  const windows = days.flatMap(windowsFor).sort((a, b) => a.start - b.start);
  if (!windows.length) return { state: "none" };

  const current = windows.find((w) => now >= w.start && now < w.end);
  if (current) {
    return { state: "in", kind: current.kind, tag: current.tag, endsAt: current.end };
  }
  const next = windows.find((w) => w.start > now);
  if (!next) return { state: "none" };
  return { state: "next", kind: next.kind, tag: next.tag, startsAt: next.start, endsAt: next.end };
}

export function formatDuration(ms) {
  const mins = Math.max(0, Math.round(ms / 60_000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// Renders the chip into the given container.
export function renderGoldenHour(container, weather) {
  if (!container) return;
  const info = computeGoldenHour(weather);
  if (info.state === "none") {
    container.hidden = true;
    container.textContent = "";
    return;
  }
  const isGolden = info.kind === "golden";
  const isDawn = info.tag === "dawn";
  container.hidden = false;
  container.dataset.kind = info.kind;
  container.dataset.state = info.state;

  const swatch = document.createElement("span");
  swatch.className = "golden-hour-swatch";
  swatch.setAttribute("aria-hidden", "true");

  const primary = document.createElement("strong");
  const secondary = document.createElement("span");
  secondary.className = "golden-hour-sub";

  const now = Date.now();
  const kindLabel = isGolden ? "Golden hour" : "Blue hour";
  if (info.state === "in") {
    primary.textContent = kindLabel;
    secondary.textContent = `ends in ${formatDuration(info.endsAt - now)}`;
  } else {
    primary.textContent = `${kindLabel} in ${formatDuration(info.startsAt - now)}`;
    // Anchor the sub-label to the nearby solar event that defines this window.
    let anchor;
    if (isGolden) anchor = isDawn ? "after sunrise" : "before sunset";
    else          anchor = isDawn ? "before sunrise" : "after sunset";
    secondary.textContent = anchor;
  }

  container.replaceChildren(swatch, primary, secondary);
}
