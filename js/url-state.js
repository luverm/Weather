// URL-state helpers.
//
// The current location is mirrored in the URL hash so a tab can be reloaded,
// bookmarked, or shared and end up on the same place. Format:
//   #place=<name>|<lat>|<lon>|<country>|<admin1>|<countryCode>
// Country, admin1 and countryCode are optional. Coordinates are decimal with
// up to 4 fractional digits — enough for any city resolution.

const KEY = "place";

export function getPlaceFromUrl() {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#")) return null;
  // Manual parse: URLSearchParams would decode our %7C escapes before we get
  // a chance to split on the literal pipe delimiter.
  const prefix = `${KEY}=`;
  const segment = hash.slice(1).split("&").find((seg) => seg.startsWith(prefix));
  if (!segment) return null;
  const raw = segment.slice(prefix.length);
  if (!raw) return null;
  const parts = raw.split("|").map(decode);
  if (parts.length < 3) return null;
  const [name, latStr, lonStr, country = "", admin1 = "", countryCode = ""] = parts;
  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  if (!isFinite(lat) || !isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  if (!name || name.length > 80) return null;
  return {
    id: `${lat.toFixed(4)},${lon.toFixed(4)}`,
    name,
    country: country || undefined,
    countryCode: /^[A-Za-z]{2}$/.test(countryCode) ? countryCode.toUpperCase() : undefined,
    admin1: admin1 || undefined,
    lat,
    lon,
  };
}

export function setPlaceInUrl(place) {
  if (!place || place.lat == null || place.lon == null) return;
  const parts = [
    place.name || "",
    place.lat.toFixed(4),
    place.lon.toFixed(4),
    place.country || "",
    place.admin1 || "",
    place.countryCode || "",
  ].map(encode);
  // Trim trailing empty segments to keep the URL tidy.
  while (parts.length > 3 && parts[parts.length - 1] === "") parts.pop();
  const value = parts.join("|");
  const next = `#${KEY}=${value}`;
  if (window.location.hash === next) return;
  // Use replaceState so the back button stays sane between rapid city switches.
  try {
    history.replaceState(null, "", window.location.pathname + window.location.search + next);
  } catch {
    window.location.hash = next;
  }
}

export function onHashPlace(handler) {
  window.addEventListener("hashchange", () => {
    const p = getPlaceFromUrl();
    if (p) handler(p);
  });
}

export function shareUrl() {
  return window.location.href;
}

// Encode pipe and percent so the value is unambiguous; URLSearchParams takes
// care of the surrounding URL escaping.
function encode(s) {
  return String(s).replace(/%/g, "%25").replace(/\|/g, "%7C");
}
function decode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}
