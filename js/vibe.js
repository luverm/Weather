// Compute an "outdoor vibe" 0..100 score for either a single hour or a
// whole day. The hourly variant powers the hero pill; the daily variant
// powers the per-day dots on the 7-day forecast.
//
// Both functions also return a `tier` ("good" | "mid" | "low") and a
// short `note` describing the weakest component so the UI can explain
// *why* the number isn't perfect.

function tempComfort(t) {
  if (t == null) return 60;
  const d = Math.abs(t - 19);
  return Math.max(0, 100 - d * 4);
}

function windComfort(kmh) {
  if (kmh == null) return 80;
  if (kmh <= 10) return 100;
  return Math.max(0, 100 - (kmh - 10) * 3);
}

function precipComfort(pop, mm) {
  return Math.max(0, 100 - (pop ?? 0) * 0.6 - Math.min(60, (mm ?? 0) * 30));
}

function uvComfort(uv) {
  if (uv == null) return 90;
  if (uv < 6) return 100;
  if (uv < 8) return 75;
  if (uv < 11) return 45;
  return 20;
}

function aqComfort(aqi) {
  if (aqi == null) return 80;
  if (aqi <= 50) return 100;
  if (aqi <= 100) return 80;
  if (aqi <= 150) return 55;
  if (aqi <= 200) return 30;
  return 10;
}

function tier(score) {
  return score >= 70 ? "good" : score >= 40 ? "mid" : "low";
}

function pickWeakest(parts) {
  return parts.reduce((acc, p) => (p.v < acc.v ? p : acc), parts[0]);
}

/**
 * Score a single hourly snapshot, optionally including the live air-quality
 * reading (AQ is per-location, not per-hour, so the caller passes it in).
 */
export function hourlyVibe(h, { aqi } = {}) {
  if (!h || h.temp == null) return null;
  const t = h.feelsLike ?? h.temp;
  const tC = tempComfort(t);
  const wC = windComfort(h.wind ?? h.windSpeed);
  const pC = precipComfort(h.pop, h.precip);
  const uC = uvComfort(h.uv);
  const aC = aqComfort(aqi);
  const score = Math.round(tC * 0.32 + wC * 0.16 + pC * 0.26 + uC * 0.12 + aC * 0.14);
  const parts = [
    { k: "temp", v: tC, why: t < 5 ? "chilly" : t > 28 ? "hot" : null },
    { k: "wind", v: wC, why: (h.wind ?? 0) > 25 ? "blustery" : (h.wind ?? 0) > 15 ? "breezy" : null },
    { k: "rain", v: pC, why: (h.pop ?? 0) >= 50 ? "wet" : null },
    { k: "uv",   v: uC, why: (h.uv ?? 0) >= 8 ? "high UV" : null },
    { k: "aq",   v: aC, why: aqi != null && aqi > 100 ? "poor air" : null },
  ];
  const weakest = pickWeakest(parts);
  return {
    score,
    tier: tier(score),
    note: (weakest.v < 60 && weakest.why) || "",
  };
}

/**
 * Score a daily aggregate (used for forecast days beyond the hourly horizon).
 * Uses the warmer end of the temperature range as the comfort target since
 * people are most likely outside during the day's peak.
 */
export function dailyVibe(d) {
  if (!d || d.tempMax == null) return null;
  // Daytime midpoint biased toward the high.
  const midT = d.tempMin != null ? d.tempMin * 0.35 + d.tempMax * 0.65 : d.tempMax;
  const tC = tempComfort(midT);
  const wC = windComfort(d.windMax);
  const pC = precipComfort(d.pop, d.precip);
  const uC = uvComfort(d.uvMax);
  // Daily aggregates don't carry AQ — assume neutral.
  const aC = 80;
  const score = Math.round(tC * 0.34 + wC * 0.16 + pC * 0.30 + uC * 0.12 + aC * 0.08);
  const parts = [
    { k: "temp", v: tC, why: midT < 5 ? "cold" : midT > 28 ? "hot" : null },
    { k: "wind", v: wC, why: (d.windMax ?? 0) > 30 ? "windy" : null },
    { k: "rain", v: pC, why: (d.pop ?? 0) >= 50 ? "wet" : null },
    { k: "uv",   v: uC, why: (d.uvMax ?? 0) >= 8 ? "high UV" : null },
  ];
  const weakest = pickWeakest(parts);
  return {
    score,
    tier: tier(score),
    note: (weakest.v < 60 && weakest.why) || "",
  };
}
