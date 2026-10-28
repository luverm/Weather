// Wind unit conversion + a formatter other modules can use so the whole UI
// honours the active choice. The source of truth is localStorage, written by
// ui.js whenever the user clicks the wind value or presses W.

export const WIND_UNITS = {
  kmh: { label: "km/h", from: (v) => v, round: (v) => Math.round(v) },
  mph: { label: "mph", from: (v) => v * 0.621371, round: (v) => Math.round(v) },
  ms:  { label: "m/s", from: (v) => v / 3.6, round: (v) => (v < 10 ? v.toFixed(1) : Math.round(v)) },
  kn:  { label: "kn",  from: (v) => v * 0.539957, round: (v) => Math.round(v) },
};
export const WIND_ORDER = ["kmh", "mph", "ms", "kn"];

export function activeWindUnit() {
  const stored = (typeof localStorage !== "undefined") && localStorage.getItem("aether:wind-unit");
  return WIND_UNITS[stored] || WIND_UNITS.kmh;
}

// Convert a km/h value to the active unit as a short "25 km/h" style string.
export function formatWind(kmh, { withUnit = true } = {}) {
  if (kmh == null) return "—";
  const u = activeWindUnit();
  const n = u.round(u.from(kmh));
  return withUnit ? `${n} ${u.label}` : `${n}`;
}
