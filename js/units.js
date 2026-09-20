// Unit conversions + display helpers so wind speed / temperature strings
// stay consistent whether they originate in ui.js, alerts.js, narrative.js
// or share/summary code.

// ---------- Clock ----------
let _defaultTwelve = null;
function localeDefaultsToTwelve() {
  if (_defaultTwelve != null) return _defaultTwelve;
  try {
    _defaultTwelve = !!new Intl.DateTimeFormat(undefined, { hour: "numeric" })
      .resolvedOptions().hour12;
  } catch { _defaultTwelve = false; }
  return _defaultTwelve;
}
export function useTwelveHour() {
  const stored = localStorage.getItem("aether:clock12");
  if (stored != null) return stored === "1";
  return localeDefaultsToTwelve();
}

/** Format a timestamp as a short HH:MM (or h:mm am/pm) label. */
export function formatClock(ts, { withTz } = {}) {
  if (!ts) return "—";
  const twelve = useTwelveHour();
  const opts = {
    hour: twelve ? "numeric" : "2-digit",
    minute: "2-digit",
    hour12: twelve,
    ...(withTz ? { timeZone: withTz } : {}),
  };
  try {
    return new Intl.DateTimeFormat(undefined, opts).format(new Date(ts));
  } catch {
    const d = new Date(ts);
    return d.toLocaleTimeString([], opts);
  }
}

function localeIsUS() {
  try {
    const loc = new Intl.DateTimeFormat().resolvedOptions().locale || "";
    return /^en-US\b/i.test(loc);
  } catch { return false; }
}

export function windUnit() {
  const stored = localStorage.getItem("aether:windUnit");
  if (stored) return stored;
  return localeIsUS() ? "mph" : "kmh";
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
  const stored = localStorage.getItem("aether:pressureUnit");
  if (stored) return stored;
  return localeIsUS() ? "inhg" : "hpa";
}

export function defaultTempUnit() {
  return localeIsUS() ? "F" : "C";
}

export function tempUnit() {
  return localStorage.getItem("aether:unit") || defaultTempUnit();
}

export function convertTemp(c, unit = tempUnit()) {
  if (c == null) return null;
  return unit === "F" ? c * 9 / 5 + 32 : c;
}

export function formatTemp(c, { withUnit = true } = {}) {
  if (c == null) return "—";
  const u = tempUnit();
  const v = convertTemp(c, u);
  return withUnit ? `${Math.round(v)}°${u}` : `${Math.round(v)}°`;
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

// ---------- Distance ----------
export function distanceUnit() {
  const stored = localStorage.getItem("aether:distanceUnit");
  if (stored) return stored;
  return localeIsUS() ? "mi" : "km";
}

export function distanceUnitLabel(unit = distanceUnit()) {
  return unit === "mi" ? "mi" : "km";
}

/** Format a metre value as km/mi. */
export function formatDistance(meters, { withUnit = true } = {}) {
  if (meters == null) return "—";
  const u = distanceUnit();
  const v = u === "mi" ? meters / 1609.344 : meters / 1000;
  const rounded = v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
  return withUnit ? `${rounded} ${distanceUnitLabel(u)}` : String(rounded);
}
