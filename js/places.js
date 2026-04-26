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
  // Keep pinned items first, in their relative order, then unpinned.
  const pinned = list.filter((p) => p.pinned);
  const rest = list.filter((p) => !p.pinned);
  const out = [...pinned, ...rest].slice(0, MAX);
  try { localStorage.setItem(KEY, JSON.stringify(out)); } catch {}
}

function idFor(place) {
  return place.id || `${place.lat?.toFixed?.(3)},${place.lon?.toFixed?.(3)}`;
}

export const places = {
  all() { return read(); },
  add(place) {
    const id = idFor(place);
    const existing = read();
    const prev = existing.find((p) => idFor(p) === id);
    const filtered = existing.filter((p) => idFor(p) !== id);
    const entry = {
      id,
      name: place.name,
      country: place.country,
      admin1: place.admin1,
      lat: place.lat,
      lon: place.lon,
      pinned: prev?.pinned || false,
    };
    if (entry.pinned) {
      // Pinned: keep at the top of the pinned group (first overall).
      filtered.unshift(entry);
    } else {
      // Unpinned: insert just after the last pinned entry.
      const firstUnpinnedIdx = filtered.findIndex((p) => !p.pinned);
      const insertAt = firstUnpinnedIdx === -1 ? filtered.length : firstUnpinnedIdx;
      filtered.splice(insertAt, 0, entry);
    }
    write(filtered);
  },
  togglePin(place) {
    const id = idFor(place);
    const list = read();
    const i = list.findIndex((p) => idFor(p) === id);
    if (i < 0) return;
    list[i] = { ...list[i], pinned: !list[i].pinned };
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
    list[i] = { ...list[i], ...summary, updatedAt: Date.now() };
    write(list);
  },
  isSaved(place) {
    const id = idFor(place);
    return read().some((p) => idFor(p) === id);
  },
  reorder(orderedIds) {
    const list = read();
    const byId = new Map(list.map((p) => [idFor(p), p]));
    const reordered = [];
    for (const id of orderedIds) {
      const p = byId.get(id);
      if (p) { reordered.push(p); byId.delete(id); }
    }
    // Append anything that wasn't covered (shouldn't normally happen).
    for (const p of byId.values()) reordered.push(p);
    // write() will normalize pinned-first ordering.
    write(reordered);
  },
  idFor,
};
