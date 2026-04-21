// Weather service: Open-Meteo (keyless, CORS-enabled) with local fallbacks.
//
// - Geocoding: open-meteo.com/geocoding-api
// - Forecast: api.open-meteo.com/v1/forecast
// - WMO codes -> internal condition enum.
// - Safe against network failures: returns a deterministic mock so the
//   experience never fully breaks.

const GEO = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST = "https://api.open-meteo.com/v1/forecast";

export const CONDITIONS = Object.freeze({
  CLEAR: "clear",
  CLOUDS: "clouds",
  RAIN: "rain",
  SNOW: "snow",
  STORM: "storm",
  FOG: "fog",
});

// Map WMO codes to our internal condition enum + human label.
// https://open-meteo.com/en/docs#weathervariables
function mapWmo(code) {
  if (code === 0) return { condition: CONDITIONS.CLEAR, label: "Clear sky" };
  if (code === 1) return { condition: CONDITIONS.CLEAR, label: "Mostly clear" };
  if (code === 2) return { condition: CONDITIONS.CLOUDS, label: "Partly cloudy" };
  if (code === 3) return { condition: CONDITIONS.CLOUDS, label: "Overcast" };
  if (code === 45 || code === 48) return { condition: CONDITIONS.FOG, label: "Fog" };
  if (code >= 51 && code <= 57) return { condition: CONDITIONS.RAIN, label: "Drizzle" };
  if (code >= 61 && code <= 67) return { condition: CONDITIONS.RAIN, label: "Rain" };
  if (code >= 71 && code <= 77) return { condition: CONDITIONS.SNOW, label: "Snow" };
  if (code >= 80 && code <= 82) return { condition: CONDITIONS.RAIN, label: "Rain showers" };
  if (code === 85 || code === 86) return { condition: CONDITIONS.SNOW, label: "Snow showers" };
  if (code >= 95) return { condition: CONDITIONS.STORM, label: "Thunderstorm" };
  return { condition: CONDITIONS.CLOUDS, label: "Cloudy" };
}

async function fetchJson(url, opts) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchCities(query) {
  if (!query || query.trim().length < 2) return [];
  const url = `${GEO}?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
  try {
    const data = await fetchJson(url);
    return (data.results || []).map((r) => ({
      id: `${r.latitude},${r.longitude}`,
      name: r.name,
      country: r.country,
      admin1: r.admin1,
      lat: r.latitude,
      lon: r.longitude,
      timezone: r.timezone,
    }));
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat, lon) {
  // Open-Meteo doesn't expose reverse geocoding, so approximate via a nearest
  // match from the search API using a coarse query.
  // This is best-effort; the UI falls back to "Current location" if it fails.
  const url = `${GEO}?name=${encodeURIComponent(`${lat.toFixed(2)},${lon.toFixed(2)}`)}&count=1`;
  try {
    const data = await fetchJson(url);
    if (data.results?.[0]) return data.results[0];
  } catch {}
  return null;
}

export async function getWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "is_day",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "pressure_msl",
    ].join(","),
    hourly: ["temperature_2m", "weather_code", "precipitation_probability"].join(","),
    daily: ["sunrise", "sunset", "uv_index_max"].join(","),
    timezone: "auto",
    forecast_days: 2,
  });
  const url = `${FORECAST}?${params.toString()}`;
  try {
    const data = await fetchJson(url);
    return normalize(data);
  } catch (err) {
    console.warn("Weather fetch failed, using mock", err);
    return mock(lat, lon);
  }
}

function normalize(d) {
  const c = d.current || {};
  const { condition, label } = mapWmo(c.weather_code);
  const daily = d.daily || {};
  const now = Date.now();

  // Build a 12-hour forecast starting from the next hour.
  const hourly = [];
  if (d.hourly?.time) {
    for (let i = 0; i < d.hourly.time.length && hourly.length < 12; i++) {
      const t = new Date(d.hourly.time[i]).getTime();
      if (t < now) continue;
      hourly.push({
        time: t,
        temp: d.hourly.temperature_2m[i],
        pop: d.hourly.precipitation_probability?.[i] ?? 0,
        ...mapWmo(d.hourly.weather_code[i]),
      });
    }
  }

  return {
    temp: c.temperature_2m,
    feelsLike: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    pressure: c.pressure_msl,
    windSpeed: c.wind_speed_10m,
    windDir: c.wind_direction_10m,
    isDay: !!c.is_day,
    condition,
    label,
    sunrise: daily.sunrise?.[0] ? new Date(daily.sunrise[0]).getTime() : null,
    sunset: daily.sunset?.[0] ? new Date(daily.sunset[0]).getTime() : null,
    uv: daily.uv_index_max?.[0] ?? null,
    timezone: d.timezone,
    hourly,
    fetchedAt: now,
  };
}

// Deterministic mock — used when the API is unreachable.
function mock(lat, lon) {
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 19;
  return {
    temp: 18, feelsLike: 17, humidity: 64, pressure: 1013,
    windSpeed: 9, windDir: 220, isDay,
    condition: CONDITIONS.CLOUDS, label: "Partly cloudy (offline)",
    sunrise: new Date().setHours(6, 30, 0, 0),
    sunset: new Date().setHours(19, 0, 0, 0),
    uv: 3,
    timezone: "UTC",
    hourly: Array.from({ length: 12 }, (_, i) => ({
      time: Date.now() + (i + 1) * 3600_000,
      temp: 18 + Math.sin(i / 2) * 3,
      pop: 20,
      condition: CONDITIONS.CLOUDS,
      label: "Cloudy",
    })),
    fetchedAt: Date.now(),
    offline: true,
  };
}

export function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 }
    );
  });
}
