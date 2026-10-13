// Keep the current location in the URL (?lat=…&lon=…&name=…) so a tab
// bookmark or shared link reopens Aether on the same city.
//
// The hash + path never change — only the query string — so GitHub Pages
// routing stays untouched.

function parseFloatSafe(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function readPlace() {
  const params = new URLSearchParams(window.location.search);
  const lat = parseFloatSafe(params.get("lat"));
  const lon = parseFloatSafe(params.get("lon"));
  if (lat == null || lon == null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const name = (params.get("name") || "").slice(0, 80) || "Shared location";
  const country = (params.get("country") || "").slice(0, 80) || undefined;
  const admin1 = (params.get("admin1") || "").slice(0, 80) || undefined;
  return { lat, lon, name, country, admin1 };
}

export function readUnitPreference() {
  const params = new URLSearchParams(window.location.search);
  const raw = (params.get("unit") || "").trim().toUpperCase();
  if (raw === "F" || raw === "FAHRENHEIT") return "F";
  if (raw === "C" || raw === "CELSIUS") return "C";
  return null;
}

export function writePlace(place) {
  if (!place || place.lat == null || place.lon == null) return;
  const url = new URL(window.location.href);
  url.searchParams.set("lat", place.lat.toFixed(4));
  url.searchParams.set("lon", place.lon.toFixed(4));
  if (place.name) url.searchParams.set("name", place.name);
  else url.searchParams.delete("name");
  if (place.country) url.searchParams.set("country", place.country);
  else url.searchParams.delete("country");
  if (place.admin1) url.searchParams.set("admin1", place.admin1);
  else url.searchParams.delete("admin1");
  try { history.replaceState(null, "", url); } catch { /* ignore */ }
}

export function shareUrlFor(place) {
  if (!place || place.lat == null || place.lon == null) {
    return window.location.href.split("?")[0];
  }
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("lat", place.lat.toFixed(4));
  url.searchParams.set("lon", place.lon.toFixed(4));
  if (place.name) url.searchParams.set("name", place.name);
  if (place.country) url.searchParams.set("country", place.country);
  if (place.admin1) url.searchParams.set("admin1", place.admin1);
  return url.toString();
}
