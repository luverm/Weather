// Small stateless unit helpers that read the user's preference from
// localStorage. Modules that don't own UI state (alerts, narrative,
// insights, activity, ...) use these so text they render honors the
// same wind-unit choice as the main metric card.

function windUnit() {
  try { return localStorage.getItem("aether:windUnit") || "kmh"; }
  catch { return "kmh"; }
}

export function convertWindKmh(kmh) {
  if (kmh == null) return null;
  const u = windUnit();
  if (u === "mph") return kmh * 0.621371;
  if (u === "ms") return kmh / 3.6;
  return kmh;
}

export function windUnitLabel() {
  const u = windUnit();
  if (u === "mph") return "mph";
  if (u === "ms") return "m/s";
  return "km/h";
}

export function fmtWindKmh(kmh) {
  if (kmh == null) return "—";
  return `${Math.round(convertWindKmh(kmh))} ${windUnitLabel()}`;
}
