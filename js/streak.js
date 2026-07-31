// Compute a short "condition streak" the app can pin above the peaks ribbon:
//   "Rain for the next 3 hours"
//   "Clear for the next 5 hours"
//   "Cloudy switching to rain around 15:00"
//
// The idea is to give an instantly readable "what happens between now and
// dinner" reading without asking the user to scan the whole hourly chart.

const RAIN_CONDITIONS = new Set(["rain", "storm", "snow"]);

export function buildStreak(weather, { fmtTime } = {}) {
  const hours = (weather?.hourly || []).slice(0, 12);
  if (hours.length < 3) return null;

  const fmt = fmtTime || ((t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

  const isWet = (h) => RAIN_CONDITIONS.has(h.condition) || (h.pop ?? 0) >= 55 || (h.precip ?? 0) >= 0.4;

  const firstWet = isWet(hours[0]);
  let streakEnd = 0;
  for (let i = 0; i < hours.length; i++) {
    if (isWet(hours[i]) === firstWet) streakEnd = i;
    else break;
  }

  // How many hours the current wet/dry state holds.
  const spanHours = streakEnd + 1;
  // Time when the state flips (or null if it stays this way for the window).
  const flipHour = spanHours < hours.length ? hours[spanHours] : null;

  if (firstWet) {
    // Currently wet — how much longer does the rain hold?
    if (spanHours >= hours.length) {
      return {
        tone: "wet",
        headline: "Rain expected for the next several hours",
      };
    }
    return {
      tone: "wet",
      headline: `Rain for ${hoursLabel(spanHours)} · easing around ${fmt(flipHour.time)}`,
      flipTs: flipHour.time,
    };
  }

  // Currently dry — do we get rain soon?
  if (flipHour) {
    // Only surface a "changing" line if the coming rain is meaningful, not a
    // 20%-chance blip.
    const meaningful = isWet(flipHour) && (
      (flipHour.pop ?? 0) >= 55 || (flipHour.precip ?? 0) >= 0.4 || RAIN_CONDITIONS.has(flipHour.condition)
    );
    if (meaningful) {
      return {
        tone: "warn",
        headline: `Dry now · rain likely around ${fmt(flipHour.time)}`,
        flipTs: flipHour.time,
      };
    }
  }

  // No rain in the visible window.
  if (spanHours >= hours.length) {
    return { tone: "dry", headline: `Dry for the next ${hoursLabel(hours.length)}` };
  }
  return null;
}

function hoursLabel(n) {
  if (n <= 1) return "1 hour";
  return `${n} hours`;
}
