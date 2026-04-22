// Weather service: Open-Meteo (keyless, CORS-enabled) with local fallbacks.
//
// Endpoints used:
// - Geocoding:   https://geocoding-api.open-meteo.com/v1/search
// - Forecast:    https://api.open-meteo.com/v1/forecast
// - Air quality: https://air-quality-api.open-meteo.com/v1/air-quality
//
// WMO codes -> internal condition enum. Safe against network failures: returns
// a deterministic mock so the experience never fully breaks.

const GEO = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST = "https://api.open-meteo.com/v1/forecast";
const AIR_QUALITY = "https://air-quality-api.open-meteo.com/v1/air-quality";

export const CONDITIONS = Object.freeze({
  CLEAR: "clear",
  CLOUDS: "clouds",
  RAIN: "rain",
  SNOW: "snow",
  STORM: "storm",
  FOG: "fog",
});

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

export async function getWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: [
      "temperature_2m", "apparent_temperature", "relative_humidity_2m",
      "is_day", "precipitation", "weather_code",
      "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
      "pressure_msl", "dew_point_2m", "visibility", "cloud_cover",
    ].join(","),
    minutely_15: ["precipitation", "weather_code"].join(","),
    hourly: [
      "temperature_2m", "apparent_temperature", "weather_code",
      "precipitation_probability", "precipitation",
      "wind_speed_10m", "wind_gusts_10m",
      "is_day", "uv_index",
    ].join(","),
    daily: [
      "sunrise", "sunset",
      "temperature_2m_max", "temperature_2m_min",
      "weather_code", "precipitation_sum", "precipitation_probability_max",
      "wind_speed_10m_max", "wind_gusts_10m_max", "uv_index_max",
    ].join(","),
    timezone: "auto",
    forecast_days: 7,
    past_hours: 1,
    forecast_minutely_15: 8, // next 2h in 15-min buckets
  });
  const url = `${FORECAST}?${params.toString()}`;

  // Fire forecast + air quality in parallel — AQ is optional.
  const aqParams = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: ["us_aqi", "pm10", "pm2_5", "carbon_monoxide", "nitrogen_dioxide", "ozone"].join(","),
    hourly: ["european_aqi", "us_aqi"].join(","),
    timezone: "auto",
  });
  const aqUrl = `${AIR_QUALITY}?${aqParams.toString()}`;

  try {
    const [forecast, air] = await Promise.allSettled([fetchJson(url), fetchJson(aqUrl)]);
    if (forecast.status !== "fulfilled") throw forecast.reason;
    return normalize(forecast.value, air.status === "fulfilled" ? air.value : null);
  } catch (err) {
    console.warn("Weather fetch failed, using mock", err);
    return mock(lat, lon);
  }
}

function normalize(d, aq) {
  const c = d.current || {};
  const { condition, label } = mapWmo(c.weather_code);
  const daily = d.daily || {};
  const now = Date.now();

  // 24-hour hourly forecast starting from the next hour.
  const hourly = [];
  if (d.hourly?.time) {
    for (let i = 0; i < d.hourly.time.length && hourly.length < 24; i++) {
      const t = new Date(d.hourly.time[i]).getTime();
      if (t < now - 30 * 60 * 1000) continue; // allow slight past for scrubbing
      hourly.push({
        time: t,
        temp: d.hourly.temperature_2m[i],
        feelsLike: d.hourly.apparent_temperature?.[i],
        pop: d.hourly.precipitation_probability?.[i] ?? 0,
        precip: d.hourly.precipitation?.[i] ?? 0,
        wind: d.hourly.wind_speed_10m?.[i],
        gusts: d.hourly.wind_gusts_10m?.[i],
        isDay: !!d.hourly.is_day?.[i],
        uv: d.hourly.uv_index?.[i] ?? null,
        ...mapWmo(d.hourly.weather_code[i]),
      });
    }
  }

  // 7-day daily forecast.
  const dailyForecast = [];
  if (daily.time) {
    for (let i = 0; i < daily.time.length; i++) {
      const ts = new Date(daily.time[i]).getTime();
      dailyForecast.push({
        time: ts,
        tempMax: daily.temperature_2m_max?.[i],
        tempMin: daily.temperature_2m_min?.[i],
        precip: daily.precipitation_sum?.[i] ?? 0,
        pop: daily.precipitation_probability_max?.[i] ?? 0,
        windMax: daily.wind_speed_10m_max?.[i],
        gustsMax: daily.wind_gusts_10m_max?.[i],
        uvMax: daily.uv_index_max?.[i] ?? null,
        sunrise: daily.sunrise?.[i] ? new Date(daily.sunrise[i]).getTime() : null,
        sunset: daily.sunset?.[i] ? new Date(daily.sunset[i]).getTime() : null,
        ...mapWmo(daily.weather_code[i]),
      });
    }
  }

  // 15-min nowcast for the next ~2h — used for "rain in 12 min" banner.
  const nowcast = [];
  if (d.minutely_15?.time) {
    for (let i = 0; i < d.minutely_15.time.length; i++) {
      const ts = new Date(d.minutely_15.time[i]).getTime();
      if (ts < now - 15 * 60 * 1000) continue;
      nowcast.push({
        time: ts,
        precip: d.minutely_15.precipitation?.[i] ?? 0,
        code: d.minutely_15.weather_code?.[i],
      });
    }
  }

  // Moon phase is not in Open-Meteo's free tier — compute it locally.
  const moon = computeMoonPhase(new Date());

  return {
    temp: c.temperature_2m,
    feelsLike: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    pressure: c.pressure_msl,
    windSpeed: c.wind_speed_10m,
    windGusts: c.wind_gusts_10m,
    windDir: c.wind_direction_10m,
    dewPoint: c.dew_point_2m,
    visibility: c.visibility, // meters
    cloudCover: c.cloud_cover, // %
    isDay: !!c.is_day,
    condition,
    label,
    sunrise: daily.sunrise?.[0] ? new Date(daily.sunrise[0]).getTime() : null,
    sunset: daily.sunset?.[0] ? new Date(daily.sunset[0]).getTime() : null,
    uv: daily.uv_index_max?.[0] ?? null,
    uvPeak: findUvPeak(d.hourly),
    timezone: d.timezone,
    hourly,
    daily: dailyForecast,
    nowcast,
    moon,
    airQuality: normalizeAq(aq),
    fetchedAt: now,
  };
}

function normalizeAq(aq) {
  if (!aq?.current) return null;
  const c = aq.current;
  return {
    aqi: c.us_aqi,
    pm25: c.pm2_5,
    pm10: c.pm10,
    o3: c.ozone,
    no2: c.nitrogen_dioxide,
    co: c.carbon_monoxide,
    label: aqiLabel(c.us_aqi),
  };
}

function aqiLabel(v) {
  if (v == null) return "—";
  if (v <= 50) return "Good";
  if (v <= 100) return "Moderate";
  if (v <= 150) return "Unhealthy for sensitive";
  if (v <= 200) return "Unhealthy";
  if (v <= 300) return "Very unhealthy";
  return "Hazardous";
}

function findUvPeak(hourly) {
  if (!hourly?.uv_index) return null;
  let peak = { t: null, v: -Infinity };
  for (let i = 0; i < hourly.uv_index.length; i++) {
    const v = hourly.uv_index[i];
    if (v > peak.v) peak = { t: new Date(hourly.time[i]).getTime(), v };
  }
  if (peak.t == null) return null;
  return { time: peak.t, value: peak.v };
}

// Conway's simplified moon-phase algorithm — accurate enough for UI glyphs.
// Returns { phase: 0..1, name: "Waxing crescent", illum: 0..1 }
function computeMoonPhase(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate() + date.getUTCHours() / 24;
  let r = year % 100;
  r %= 19;
  if (r > 9) r -= 19;
  r = (r * 11) % 30 + month + day;
  if (month < 3) r += 2;
  r -= (year < 2000 ? 4 : 8.3);
  r = ((r % 30) + 30) % 30; // 0..29.53
  const phase = r / 29.5305882;
  const illum = 0.5 * (1 - Math.cos(2 * Math.PI * phase));
  const name =
    phase < 0.03 || phase > 0.97 ? "New moon" :
    phase < 0.22 ? "Waxing crescent" :
    phase < 0.28 ? "First quarter" :
    phase < 0.47 ? "Waxing gibbous" :
    phase < 0.53 ? "Full moon" :
    phase < 0.72 ? "Waning gibbous" :
    phase < 0.78 ? "Last quarter" :
    "Waning crescent";
  return { phase, illum, name };
}

function mock(lat, lon) {
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 19;
  const now = Date.now();
  return {
    temp: 18, feelsLike: 17, humidity: 64, pressure: 1013,
    windSpeed: 9, windGusts: 14, windDir: 220,
    dewPoint: 11, visibility: 10000, cloudCover: 45,
    isDay, condition: CONDITIONS.CLOUDS, label: "Partly cloudy (offline)",
    sunrise: new Date().setHours(6, 30, 0, 0),
    sunset: new Date().setHours(19, 0, 0, 0),
    uv: 3,
    uvPeak: { time: new Date().setHours(13, 0, 0, 0), value: 5 },
    timezone: "UTC",
    hourly: Array.from({ length: 24 }, (_, i) => ({
      time: now + (i + 1) * 3600_000,
      temp: 18 + Math.sin(i / 2) * 3,
      feelsLike: 17 + Math.sin(i / 2) * 3,
      pop: 20, precip: 0,
      wind: 8 + Math.sin(i) * 3, gusts: 12 + Math.sin(i) * 4,
      isDay: (i + hour) % 24 >= 6 && (i + hour) % 24 < 19,
      uv: Math.max(0, Math.sin((i - 6) * Math.PI / 13) * 6),
      condition: CONDITIONS.CLOUDS, label: "Cloudy",
    })),
    daily: Array.from({ length: 7 }, (_, i) => ({
      time: now + i * 86400_000,
      tempMax: 20 + Math.sin(i) * 4,
      tempMin: 12 + Math.sin(i) * 3,
      precip: i % 3 === 0 ? 2.1 : 0,
      pop: i % 3 === 0 ? 65 : 15,
      windMax: 12, gustsMax: 20, uvMax: 5,
      sunrise: new Date().setHours(6, 30, 0, 0),
      sunset: new Date().setHours(19, 0, 0, 0),
      condition: CONDITIONS.CLOUDS, label: "Cloudy",
    })),
    nowcast: [],
    moon: computeMoonPhase(new Date()),
    airQuality: { aqi: 42, pm25: 8, pm10: 14, o3: 40, no2: 15, co: 0.2, label: "Good" },
    fetchedAt: now,
    offline: true,
  };
}

export function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("Geolocation not supported")); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 }
    );
  });
}
