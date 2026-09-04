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

function sorted(list) {
  // Pinned first (in original save order), then everything else.
  const pinned = list.filter((p) => p.pinned);
  const rest = list.filter((p) => !p.pinned);
  return pinned.concat(rest);
}

export const places = {
  all() { return sorted(read()); },
  add(place) {
    const id = idFor(place);
    const existing = read().find((p) => idFor(p) === id) || {};
    const list = read().filter((p) => idFor(p) !== id);
    list.unshift({
      id,
      name: place.name,
      country: place.country,
      admin1: place.admin1,
      lat: place.lat,
      lon: place.lon,
      pinned: existing.pinned || false,
      summaryAt: existing.summaryAt,
      temp: existing.temp,
      condition: existing.condition,
    });
    write(list);
  },
  remove(place) {
    const id = idFor(place);
    write(read().filter((p) => idFor(p) !== id));
  },
  togglePin(place) {
    const id = idFor(place);
    const list = read();
    const i = list.findIndex((p) => idFor(p) === id);
    if (i < 0) return false;
    list[i] = { ...list[i], pinned: !list[i].pinned };
    write(list);
    return !!list[i].pinned;
  },
  updateSummary(place, summary) {
    const id = idFor(place);
    const list = read();
    const i = list.findIndex((p) => idFor(p) === id);
    if (i < 0) return;
    list[i] = { ...list[i], ...summary, summaryAt: Date.now() };
    write(list);
  },
  isSaved(place) {
    const id = idFor(place);
    return read().some((p) => idFor(p) === id);
  },
  idFor,
};
