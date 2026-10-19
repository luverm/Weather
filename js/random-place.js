// Round 41: a curated set of interesting places the "surprise me" shortcut
// can pick from. Spread across hemispheres and climates so each press is
// likely to produce a different-feeling sky.

export const NOTABLE_PLACES = Object.freeze([
  { id: "r-reyk",   name: "Reykjavík",      country: "Iceland",         lat: 64.1466, lon: -21.9426 },
  { id: "r-tokyo",  name: "Tokyo",          country: "Japan",           lat: 35.6895, lon: 139.6917 },
  { id: "r-nyc",    name: "New York",       country: "United States",   lat: 40.7128, lon: -74.0060 },
  { id: "r-sydney", name: "Sydney",         country: "Australia",       lat: -33.8688, lon: 151.2093 },
  { id: "r-cape",   name: "Cape Town",      country: "South Africa",    lat: -33.9249, lon: 18.4241 },
  { id: "r-marr",   name: "Marrakech",      country: "Morocco",         lat: 31.6295, lon: -7.9811 },
  { id: "r-rio",    name: "Rio de Janeiro", country: "Brazil",          lat: -22.9068, lon: -43.1729 },
  { id: "r-edin",   name: "Edinburgh",      country: "United Kingdom",  lat: 55.9533, lon: -3.1883 },
  { id: "r-honl",   name: "Honolulu",       country: "United States",   lat: 21.3069, lon: -157.8583 },
  { id: "r-cusco",  name: "Cusco",          country: "Peru",            lat: -13.5319, lon: -71.9675 },
  { id: "r-ushua",  name: "Ushuaia",        country: "Argentina",       lat: -54.8019, lon: -68.3030 },
  { id: "r-mump",   name: "Longyearbyen",   country: "Svalbard",        lat: 78.2232, lon: 15.6267 },
  { id: "r-dubai",  name: "Dubai",          country: "UAE",             lat: 25.2048, lon: 55.2708 },
  { id: "r-nairo",  name: "Nairobi",        country: "Kenya",           lat: -1.2921, lon: 36.8219 },
  { id: "r-ulaan",  name: "Ulaanbaatar",    country: "Mongolia",        lat: 47.8864, lon: 106.9057 },
  { id: "r-queen",  name: "Queenstown",     country: "New Zealand",     lat: -45.0312, lon: 168.6626 },
  { id: "r-isla",   name: "Isla de Pascua", country: "Chile",           lat: -27.1127, lon: -109.3497 },
  { id: "r-tromso", name: "Tromsø",         country: "Norway",          lat: 69.6492, lon: 18.9553 },
  { id: "r-sing",   name: "Singapore",      country: "Singapore",       lat: 1.3521,  lon: 103.8198 },
  { id: "r-vanc",   name: "Vancouver",      country: "Canada",          lat: 49.2827, lon: -123.1207 },
]);

export function randomNotablePlace(exceptId) {
  const pool = NOTABLE_PLACES.filter((p) => p.id !== exceptId);
  return pool[Math.floor(Math.random() * pool.length)];
}
