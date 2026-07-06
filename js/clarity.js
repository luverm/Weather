// Synthesize cloud cover, visibility, and air quality into a single
// "how clear is the sky right now" indicator — good for photographers,
// stargazers, and pilots. Returns { tier, label, hint } or null.

const TIER_ORDER = ["excellent", "great", "good", "fair", "poor"];

function tierMin(...tiers) {
  let worst = "excellent";
  for (const t of tiers) {
    if (!t) continue;
    if (TIER_ORDER.indexOf(t) > TIER_ORDER.indexOf(worst)) worst = t;
  }
  return worst;
}

function cloudTier(cover) {
  if (cover == null) return null;
  if (cover < 15) return "excellent";
  if (cover < 40) return "great";
  if (cover < 65) return "good";
  if (cover < 85) return "fair";
  return "poor";
}

function visibilityTier(m) {
  if (m == null) return null;
  const km = m / 1000;
  if (km >= 20) return "excellent";
  if (km >= 10) return "great";
  if (km >= 6) return "good";
  if (km >= 3) return "fair";
  return "poor";
}

function aqiTier(aqi) {
  if (aqi == null) return null;
  if (aqi <= 40) return "excellent";
  if (aqi <= 80) return "great";
  if (aqi <= 120) return "good";
  if (aqi <= 160) return "fair";
  return "poor";
}

const LABELS = {
  excellent: "Crystal clear",
  great:     "Very clear",
  good:      "Clear",
  fair:      "Hazy",
  poor:      "Murky",
};

export function skyClarity(w) {
  if (!w) return null;
  const cloud = cloudTier(w.cloudCover);
  const vis   = visibilityTier(w.visibility);
  const aq    = aqiTier(w.airQuality?.aqi);
  if (!cloud && !vis && !aq) return null;
  const tier = tierMin(cloud, vis, aq);

  const bits = [];
  if (w.cloudCover != null) bits.push(`${Math.round(w.cloudCover)}% cloud`);
  if (w.visibility != null) bits.push(`${Math.round((w.visibility / 1000) * 10) / 10} km vis`);
  if (w.airQuality?.aqi != null) bits.push(`AQI ${Math.round(w.airQuality.aqi)}`);

  return {
    tier,
    label: LABELS[tier],
    hint: bits.join(" · "),
  };
}
