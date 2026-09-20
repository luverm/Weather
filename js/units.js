// Unit conversions + display helpers so wind speed / temperature strings
// stay consistent whether they originate in ui.js, alerts.js, narrative.js
// or share/summary code.

export function windUnit() {
  return localStorage.getItem("aether:windUnit") || "kmh";
}

export function convertWind(kmh, unit = windUnit()) {
  if (kmh == null) return null;
  switch (unit) {
    case "mph": return kmh * 0.621371;
    case "ms":  return kmh / 3.6;
    case "kt":  return kmh * 0.539957;
    default:    return kmh; // kmh
  }
}

export function windUnitLabel(unit = windUnit()) {
  switch (unit) {
    case "mph": return "mph";
    case "ms":  return "m/s";
    case "kt":  return "kt";
    default:    return "km/h";
  }
}

/** Format a km/h wind value with the current unit, rounded appropriately. */
export function formatWind(kmh, { withUnit = true, precision } = {}) {
  if (kmh == null) return "—";
  const u = windUnit();
  const v = convertWind(kmh, u);
  const p = precision != null
    ? precision
    : (u === "ms" && v < 10 ? 1 : 0);
  const rounded = p > 0 ? v.toFixed(p) : Math.round(v);
  return withUnit ? `${rounded} ${windUnitLabel(u)}` : String(rounded);
}

// ---------- Pressure ----------
export function pressureUnit() {
  return localStorage.getItem("aether:pressureUnit") || "hpa";
}

export function convertPressure(hpa, unit = pressureUnit()) {
  if (hpa == null) return null;
  switch (unit) {
    case "inhg": return hpa * 0.02953;
    case "mmhg": return hpa * 0.750062;
    default:     return hpa; // hpa
  }
}

export function pressureUnitLabel(unit = pressureUnit()) {
  switch (unit) {
    case "inhg": return "inHg";
    case "mmhg": return "mmHg";
    default:     return "hPa";
  }
}

export function formatPressure(hpa, { withUnit = true } = {}) {
  if (hpa == null) return "—";
  const u = pressureUnit();
  const v = convertPressure(hpa, u);
  const rounded = u === "inhg" ? v.toFixed(2) : Math.round(v);
  return withUnit ? `${rounded} ${pressureUnitLabel(u)}` : String(rounded);
}
