// Saved locations persisted to localStorage.
//
// Each entry: { id, name, country, admin1, lat, lon, temp?, condition? }
// `temp` and `condition` are populated when that location is loaded so the
// chip strip can show a mini summary.

const KEY = "aether:places";
const DEFAULT_KEY = "aether:default-place";
const MAX = 8;

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}
function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); } catch {}
}

function idFor(place) {
  return place.id || `${place.lat?.toFixed?.(3)},${place.lon?.toFixed?.(3)}`;
}

export const places = {
  all() { return read(); },
  add(place) {
    const id = idFor(place);
    const list = read().filter((p) => idFor(p) !== id);
    list.unshift({
      id,
      name: place.name,
      country: place.country,
      countryCode: place.countryCode || place.country_code,
      admin1: place.admin1,
      lat: place.lat,
      lon: place.lon,
      elevation: place.elevation,
    });
    write(list);
  },
  remove(place) {
    const id = idFor(place);
    write(read().filter((p) => idFor(p) !== id));
  },
  updateSummary(place, summary) {
    const id = idFor(place);
    const list = read();
    const i = list.findIndex((p) => idFor(p) === id);
    if (i < 0) return;
    list[i] = { ...list[i], ...summary };
    write(list);
  },
  isSaved(place) {
    const id = idFor(place);
    return read().some((p) => idFor(p) === id);
  },
  getDefaultId() {
    try { return localStorage.getItem(DEFAULT_KEY); } catch { return null; }
  },
  getDefault() {
    const id = this.getDefaultId();
    if (!id) return null;
    return read().find((p) => idFor(p) === id) || null;
  },
  setDefault(place) {
    try {
      if (!place) localStorage.removeItem(DEFAULT_KEY);
      else localStorage.setItem(DEFAULT_KEY, idFor(place));
    } catch { /* ignore */ }
  },
  isDefault(place) {
    return this.getDefaultId() === idFor(place);
  },
  idFor,
};
