// Round-trips the active place through window.location.hash so a specific
// city can be linked, bookmarked, or restored with the browser back button.
//
// Hash format:  #lat,lon,Name%20Here[,Country]
// - lat / lon are decimal, up to 4 fractional digits
// - name and country are URI-encoded (spaces become %20)
//
// Both are optional; missing values fall back to a generic label.

const HASH_RE = /^#(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,([^,]+))?(?:,([^,]+))?$/;

function trim(n) {
  return Math.round(n * 10000) / 10000;
}

export function parseHash(hash = window.location.hash) {
  const m = HASH_RE.exec(hash || "");
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lon = parseFloat(m[2]);
  if (!isFinite(lat) || !isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  let name, country;
  try { name = m[3] ? decodeURIComponent(m[3]) : undefined; } catch { /* ignore */ }
  try { country = m[4] ? decodeURIComponent(m[4]) : undefined; } catch { /* ignore */ }
  return {
    lat,
    lon,
    name: name || "Pinned location",
    country: country || undefined,
    id: `${trim(lat)},${trim(lon)}`,
  };
}

export function buildHash(place) {
  if (!place || place.lat == null || place.lon == null) return "";
  const parts = [trim(place.lat), trim(place.lon)];
  if (place.name) parts.push(encodeURIComponent(place.name));
  if (place.country) parts.push(encodeURIComponent(place.country));
  return "#" + parts.join(",");
}

export function currentAbsoluteUrl(place) {
  const hash = buildHash(place);
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${hash}`;
}

/**
 * Attach URL sync to the app.
 *   - When a new place loads: replace the hash so back-button history stays
 *     minimal, and push a new entry only when the place actually changed.
 *   - When the user navigates back/forward: notify via onNavigate.
 */
export function installUrlSync({ onNavigate }) {
  let lastId = null;

  const update = (place, { push = false } = {}) => {
    if (!place) return;
    const hash = buildHash(place);
    if (!hash) return;
    const id = `${trim(place.lat)},${trim(place.lon)}`;
    if (window.location.hash === hash) { lastId = id; return; }
    const url = window.location.pathname + window.location.search + hash;
    if (push && lastId && lastId !== id) {
      history.pushState({ place }, "", url);
    } else {
      history.replaceState({ place }, "", url);
    }
    lastId = id;
    if (place.name) document.title = `${place.name} · Aether`;
  };

  window.addEventListener("popstate", () => {
    const place = parseHash();
    if (place && onNavigate) onNavigate(place);
  });

  return { update, initial: () => parseHash() };
}
