// Approximate solar position (altitude, shadow length) for a given location
// and time. Accurate to within ~1° for the purpose we need (narrative + UV
// context in the UI), without needing a full ephemeris.
//
// References: NOAA Solar Position Calculator formulas, simplified.

export function solarAltitudeDeg({ lat, lon, time = Date.now() }) {
  if (lat == null || lon == null) return null;
  const date = new Date(time);
  // Day of year (0..365).
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = date.getTime() - start;
  const doy = Math.floor(diff / 86_400_000);
  // Fractional year (radians).
  const gamma = ((2 * Math.PI) / 365) * (doy - 1 + (date.getUTCHours() - 12) / 24);
  // Solar declination (radians).
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148  * Math.sin(3 * gamma);
  // Equation of time (minutes).
  const eqtime = 229.18 * (
    0.000075 +
    0.001868 * Math.cos(gamma) -
    0.032077 * Math.sin(gamma) -
    0.014615 * Math.cos(2 * gamma) -
    0.040849 * Math.sin(2 * gamma)
  );
  // True solar time (minutes).
  const minUtc = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const tst = minUtc + eqtime + 4 * lon;
  // Hour angle (degrees, -180..180).
  const ha = (tst / 4) - 180;
  const haRad = (ha * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  // Solar zenith (radians).
  const cosZenith = Math.sin(latRad) * Math.sin(decl) + Math.cos(latRad) * Math.cos(decl) * Math.cos(haRad);
  const zenith = Math.acos(Math.max(-1, Math.min(1, cosZenith)));
  const altitudeDeg = 90 - (zenith * 180) / Math.PI;
  return altitudeDeg;
}

// Shadow length as a multiple of the object's height: cot(altitude).
export function shadowRatio(altitudeDeg) {
  if (altitudeDeg == null || altitudeDeg <= 0) return null;
  const rad = (altitudeDeg * Math.PI) / 180;
  return 1 / Math.tan(rad);
}

export function describeShadow(ratio) {
  if (ratio == null) return "Sun below horizon";
  if (ratio < 0.5) return "Shadows are shorter than you";
  if (ratio < 1) return "Shadows about half your height";
  if (ratio < 1.5) return `Shadows ${ratio.toFixed(1)}× your height`;
  if (ratio < 3) return `Shadows ${ratio.toFixed(1)}× your height (low sun)`;
  if (ratio < 6) return `Long shadows (${ratio.toFixed(1)}× your height)`;
  return "Very long shadows — sun near horizon";
}
