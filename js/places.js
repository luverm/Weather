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
    const list = read().filter((p) => idFor(p) !== id);
    list.unshift({
      id,
      name: place.name,
      country: place.country,
      admin1: place.admin1,
      lat: place.lat,
      lon: place.lon,
      timezone: place.timezone,
    });
    write(list);
  },
  /** Local hour (0..23.99) for a saved place, timezone-aware with lon fallback. */
  localHour(place, now = Date.now()) {
    const tz = place?.timezone;
    if (tz && tz !== "auto") {
      try {
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: tz, hour: "numeric", minute: "numeric", hour12: false,
        }).formatToParts(new Date(now));
        const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "", 10);
        const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "", 10);
        if (!Number.isNaN(h)) return (h % 24) + (Number.isNaN(m) ? 0 : m / 60);
      } catch { /* fall through */ }
    }
    // Fallback: rough 15° = 1h from longitude.
    const d = new Date(now);
    const utc = d.getUTCHours() + d.getUTCMinutes() / 60;
    const lon = Number.isFinite(place?.lon) ? place.lon : 0;
    return ((utc + lon / 15) % 24 + 24) % 24;
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
