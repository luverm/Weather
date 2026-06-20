// Shared unit helpers. Wind + pressure live here; temperature stays in ui.js
// because every reader already has the active unit handy.

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

// ---------- Pressure ----------
// Source unit is hPa (== mb).
const PRESSURE_ORDER = ["hPa", "inHg", "mmHg"];
const PRESSURE_FACTOR = { hPa: 1, inHg: 0.02953, mmHg: 0.75006 };
const PRESSURE_LABEL = { hPa: "hPa", inHg: "inHg", mmHg: "mmHg" };

export function isPressureUnit(u) { return PRESSURE_ORDER.includes(u); }

export function nextPressureUnit(unit) {
  const i = PRESSURE_ORDER.indexOf(unit);
  return PRESSURE_ORDER[(i + 1) % PRESSURE_ORDER.length];
}

export function pressureUnitLabel(unit) { return PRESSURE_LABEL[unit] ?? "hPa"; }

export function convertPressure(hPa, unit) {
  if (hPa == null || isNaN(hPa)) return null;
  return hPa * (PRESSURE_FACTOR[unit] ?? 1);
}

export function fmtPressureValue(hPa, unit) {
  const v = convertPressure(hPa, unit);
  if (v == null) return "—";
  // inHg is small (~30) and benefits from 2 decimals; mmHg gets 1.
  if (unit === "inHg") return v.toFixed(2);
  if (unit === "mmHg") return v.toFixed(1);
  return String(Math.round(v));
}
