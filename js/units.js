// Small unit-conversion module shared across the app so every string the
// user sees respects the °C/°F toggle stored in localStorage (aether:unit).

export function getUnit() {
  try { return localStorage.getItem("aether:unit") === "F" ? "F" : "C"; }
  catch { return "C"; }
}

export function convertTemp(c) {
  if (c == null) return c;
  return getUnit() === "F" ? c * 9 / 5 + 32 : c;
}

export function convertSpeed(kmh) {
  if (kmh == null) return kmh;
  return getUnit() === "F" ? kmh * 0.621371 : kmh;
}

export function speedUnit() {
  return getUnit() === "F" ? "mph" : "km/h";
}

export function fmtSpeed(kmh) {
  if (kmh == null) return "—";
  return `${Math.round(convertSpeed(kmh))} ${speedUnit()}`;
}
