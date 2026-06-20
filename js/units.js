// Shared unit helpers. Today this covers wind speed; temperature still lives
// inside ui.js because every reader already has the active unit handy.

const WIND_ORDER = ["kmh", "mph", "ms", "kn"];
const WIND_FACTOR = {
  kmh: 1,
  mph: 0.621371,
  ms: 0.277778,
  kn: 0.539957,
};
const WIND_LABEL = {
  kmh: "km/h",
  mph: "mph",
  ms: "m/s",
  kn: "kn",
};

export function isWindUnit(u) { return WIND_ORDER.includes(u); }

export function nextWindUnit(unit) {
  const i = WIND_ORDER.indexOf(unit);
  return WIND_ORDER[(i + 1) % WIND_ORDER.length];
}

export function windUnitLabel(unit) { return WIND_LABEL[unit] ?? "km/h"; }

export function convertWind(kmh, unit) {
  if (kmh == null || isNaN(kmh)) return null;
  return kmh * (WIND_FACTOR[unit] ?? 1);
}

/** Compact value-only string ("12", "7.5"). */
export function fmtWindValue(kmh, unit) {
  const v = convertWind(kmh, unit);
  if (v == null) return "—";
  // m/s gets one decimal under 10 — its values are small and a bare integer
  // loses too much resolution (1.4 vs 1, 2.8 vs 3).
  if (unit === "ms" && v < 10) return v.toFixed(1);
  return String(Math.round(v));
}

/** "12 km/h" — value + label. */
export function fmtWind(kmh, unit) {
  if (kmh == null) return "—";
  return `${fmtWindValue(kmh, unit)} ${windUnitLabel(unit)}`;
}
