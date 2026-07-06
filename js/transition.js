// Detect the next major weather transition from the hourly forecast.
// A "transition" is the first hour where the condition category changes in
// a way that matters — clear ↔ cloudy is soft; anything into or out of
// rain/snow/storm is major.

const RANKS = { clear: 0, clouds: 1, fog: 2, rain: 3, snow: 4, storm: 5 };

function severity(cond) { return RANKS[cond] ?? 1; }

function labelFor(from, to) {
  if (to === "rain")  return "Rain arrives";
  if (to === "snow")  return "Snow arrives";
  if (to === "storm") return "Storms arrive";
  if (to === "fog")   return "Fog rolls in";
  if (from === "rain" || from === "snow" || from === "storm") {
    if (to === "clear") return "Clearing";
    if (to === "clouds") return "Rain lets up";
  }
  if (from === "clouds" && to === "clear") return "Skies clearing";
  if (from === "clear" && to === "clouds") return "Clouds moving in";
  return null;
}

/**
 * Look up to `horizonHours` ahead and return the first meaningful shift,
 * or null if the pattern is steady.
 * Returns { time, from, to, label, icon }.
 */
export function nextTransition(weather, horizonHours = 12) {
  const hrs = weather?.hourly || [];
  if (hrs.length < 2) return null;
  const now = Date.now();
  const currentCondition = weather?.condition;
  let baseline = currentCondition;
  let baselineSeverity = severity(baseline);
  for (const h of hrs) {
    if (h.time < now) continue;
    if (h.time > now + horizonHours * 3600_000) break;
    if (!h.condition) continue;
    const label = labelFor(baseline, h.condition);
    // Trigger only when severity changes meaningfully OR label matches a
    // predefined transition; avoids "clouds→clear" noise every few hours.
    const changed = Math.abs(severity(h.condition) - baselineSeverity) >= 2
                 || label != null;
    if (h.condition !== baseline && changed) {
      return {
        time: h.time,
        from: baseline,
        to: h.condition,
        label: label || `${h.label || h.condition}`,
      };
    }
  }
  return null;
}
