// Suggest what to wear based on the sampled conditions.
//
// Uses "feels-like" as the primary signal for temperature, then modifies
// for wind (chill), humidity + heat (sticky), UV (shade), and precip
// (waterproof). Returns { icons, label, hint } where `icons` is a short
// string of emoji suggestions, `label` is the main line, and `hint` is
// the small secondary line.

const KMH_TO_MS = 1000 / 3600;

function tempTier(t) {
  if (t == null) return null;
  if (t <= -5) return "freezing";
  if (t <= 3) return "cold";
  if (t <= 10) return "chilly";
  if (t <= 17) return "cool";
  if (t <= 23) return "mild";
  if (t <= 29) return "warm";
  return "hot";
}

const TIER_LABEL = {
  freezing: { icons: "🧥🧣🧤🎿", label: "Layer up hard", hint: "Insulated coat, gloves, hat." },
  cold:     { icons: "🧥🧣🧤",   label: "Winter coat", hint: "Scarf and gloves help." },
  chilly:   { icons: "🧥🧢",     label: "Warm jacket", hint: "A beanie doesn't hurt." },
  cool:     { icons: "🧥",       label: "Light jacket", hint: "Long sleeves underneath." },
  mild:     { icons: "👕",       label: "T-shirt weather", hint: "Bring a layer for later." },
  warm:     { icons: "👕🩳",     label: "Light and breezy", hint: "Cool colors, short sleeves." },
  hot:      { icons: "👕🩳🕶️",   label: "Stay cool", hint: "Loose fabrics, stay hydrated." },
};

export function suggestOutfit(w) {
  if (!w) return null;
  const feels = w.feelsLike ?? w.temp;
  const tier = tempTier(feels);
  if (!tier) return null;
  const base = { ...TIER_LABEL[tier] };
  const notes = [];

  const wind = w.windSpeed;
  const gusts = w.windGusts;
  const gustBoost = gusts != null && gusts >= 40;
  if (wind != null && wind >= 25) {
    notes.push("windproof shell");
    base.icons += "💨";
  } else if (gustBoost) {
    notes.push(`gusts to ${Math.round(gusts)} km/h`);
  }

  const humid = w.humidity != null && w.humidity >= 75 && feels >= 20;
  if (humid) notes.push("breathable fabric");

  const wet = ["rain", "storm", "snow"].includes(w.condition);
  if (wet) {
    base.icons += w.condition === "snow" ? "❄️" : "🌂";
    notes.unshift(w.condition === "snow" ? "waterproof boots" : "umbrella / waterproof");
  }

  const uvPeak = w.uvPeak?.value ?? w.uv;
  if (uvPeak != null && uvPeak >= 6 && (w.isDay ?? true)) {
    base.icons += "🕶️";
    if (!notes.includes("SPF + shades")) notes.push("SPF + shades");
  }

  // Cold + wind chill amplification.
  if (feels <= 5 && wind != null && wind >= 15) {
    notes.push("wind chill — extra layer");
  }

  return {
    tier,
    icons: base.icons,
    label: base.label,
    hint: notes.length ? notes.join(" · ") : base.hint,
    feels,
  };
}
