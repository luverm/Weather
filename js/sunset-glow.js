// Predicts sunrise/sunset "glow" quality from cloud-cover fractions around
// the horizon time. The physics: warm low-angle light travels a long path
// through the atmosphere and gets scattered; mid- and high-altitude clouds
// catch and reflect that light for vivid pinks/oranges, while a thick low
// deck simply blocks it. A perfectly clear sky produces subtle pastel tones,
// not the vivid banners photographers chase.
//
// Tiers:
//   vivid  — mid+high clouds present, low deck sparse
//   clean  — clear skies, gentle pastel horizon
//   muted  — heavy overcast or thick low cloud blocking colour
//   hazy   — fog/mist softens everything
//
// The function is defensive: if hourly cloud fields aren't available it
// falls back to a coarser total-cloud heuristic; if there's nothing to work
// with it returns null and the UI hides the chip.

const HORIZON_WINDOW_MS = 90 * 60 * 1000; // ±90 min around sunrise/sunset

export function predictGlow(weather, anchorTs) {
  if (!weather?.hourly?.length || !anchorTs) return null;

  // Find hourly entries near the horizon; average their cloud fields so a
  // single spike hour doesn't distort the reading.
  const nearby = weather.hourly.filter((h) => Math.abs(h.time - anchorTs) <= HORIZON_WINDOW_MS);
  if (!nearby.length) return null;

  const avg = (key) => {
    const vals = nearby.map((h) => h[key]).filter((v) => v != null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const low = avg("cloudLow");
  const mid = avg("cloudMid");
  const high = avg("cloudHigh");
  const total = avg("cloud") ?? weather.cloudCover ?? null;

  // Fog/haze wins over everything else.
  const foggy = nearby.some((h) => h.condition === "fog");
  if (foggy) {
    return tier("hazy", "Hazy glow", "Fog softens the horizon into pastel");
  }

  // Fall back to total-cloud only if we have no altitude split.
  if (mid == null && high == null && low == null) {
    if (total == null) return null;
    if (total < 20) return tier("clean", "Clean glow", "Clear skies — subtle pastel colour");
    if (total < 60) return tier("vivid", "Vivid glow", "Scattered clouds catch the light");
    return tier("muted", "Muted glow", "Heavy cloud cover blocks the colour");
  }

  const lowVal = low ?? 0;
  const midVal = mid ?? 0;
  const highVal = high ?? 0;
  const canvas = Math.max(midVal, highVal);

  // A thick low deck blocks direct light from reaching the higher clouds.
  if (lowVal >= 65) {
    return tier("muted", "Muted glow", "Low cloud deck blocks the horizon");
  }

  // Overcast at all altitudes — no gaps for warm light to punch through.
  if (midVal > 85 && highVal > 60) {
    return tier("muted", "Muted glow", "Overcast dampens colour");
  }

  // Sweet spot: broken mid/high canvas, clean low sky.
  if (canvas >= 25 && canvas <= 85 && lowVal < 45) {
    const strong = canvas >= 45 && canvas <= 75 && lowVal < 30;
    return tier(
      "vivid",
      strong ? "Vivid glow" : "Warm glow",
      strong ? "Mid-level clouds should light up in colour"
             : "A little cloud will catch the sun's warmth",
    );
  }

  // Very clear at every altitude — clean but not dramatic.
  if (canvas < 20 && lowVal < 20) {
    return tier("clean", "Clean glow", "Clear skies — soft pastel horizon");
  }

  // Everything else lands in "muted" (partial low deck, or all-mid overcast).
  return tier("muted", "Muted glow", "Cloud layers wash out the colour");
}

function tier(id, label, hint) {
  return { tier: id, label, hint };
}
