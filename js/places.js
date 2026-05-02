// Saved locations persisted to localStorage.
//
// Each entry: { id, name, country, admin1, lat, lon, temp?, condition? }
// `temp` and `condition` are populated when that location is loaded so the
// chip strip can show a mini summary.

const KEY = "aether:places";
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
    const existing = read();
    const wasNew = !existing.some((p) => idFor(p) === id);
    const list = existing.filter((p) => idFor(p) !== id);
    list.unshift({
      id,
      name: place.name,
      country: place.country,
      admin1: place.admin1,
      lat: place.lat,
      lon: place.lon,
    });
    write(list);
    return wasNew;
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
  idFor,
};
