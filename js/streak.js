// Compute a short "condition streak" the app can pin above the peaks ribbon:
//   "Rain for the next 3 hours"
//   "Clear for the next 5 hours"
//   "Cloudy switching to rain around 15:00"
//
// The idea is to give an instantly readable "what happens between now and
// dinner" reading without asking the user to scan the whole hourly chart.

const WET_CONDITIONS = new Set(["rain", "storm", "snow"]);

// Human-readable word for the wettest sample in a run. Snow overrides rain
// when snow is present; storm rides with rain.
function precipWord(hours) {
  const hasSnow = hours.some((h) => h.condition === "snow");
  if (hasSnow) return "Snow";
  return "Rain";
}

function precipWordLower(hours) {
  return precipWord(hours).toLowerCase();
}

export function buildStreak(weather, { fmtTime } = {}) {
  const hours = (weather?.hourly || []).slice(0, 12);
  if (hours.length < 3) return null;

  const fmt = fmtTime || ((t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

  const isWet = (h) => WET_CONDITIONS.has(h.condition) || (h.pop ?? 0) >= 55 || (h.precip ?? 0) >= 0.4;

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
    const word = precipWord(hours.slice(0, spanHours));
    // Currently wet — how much longer does the rain hold?
    if (spanHours >= hours.length) {
      return {
        tone: "wet",
        headline: `${word} expected for the next several hours`,
      };
    }
    return {
      tone: "wet",
      headline: `${word} for ${hoursLabel(spanHours)} · easing around ${fmt(flipHour.time)}`,
      flipTs: flipHour.time,
    };
  }

  // Currently dry — do we get rain soon?
  if (flipHour) {
    // Only surface a "changing" line if the coming precip is meaningful, not
    // a 20%-chance blip.
    const meaningful = isWet(flipHour) && (
      (flipHour.pop ?? 0) >= 55 || (flipHour.precip ?? 0) >= 0.4 || WET_CONDITIONS.has(flipHour.condition)
    );
    if (meaningful) {
      const word = precipWordLower([flipHour]);
      return {
        tone: "warn",
        headline: `Dry now · ${word} likely around ${fmt(flipHour.time)}`,
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
