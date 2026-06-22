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
      "is_day", "uv_index", "pressure_msl",
      "relative_humidity_2m", "cloud_cover",
    ].join(","),
    daily: [
      "sunrise", "sunset",
      "temperature_2m_max", "temperature_2m_min",
      "weather_code", "precipitation_sum", "precipitation_probability_max",
      "wind_speed_10m_max", "wind_gusts_10m_max", "uv_index_max",
    ].join(","),
    timezone: "auto",
    forecast_days: 7,
    past_days: 1,
    past_hours: 1,
    forecast_minutely_15: 8, // next 2h in 15-min buckets
  });
  const url = `${FORECAST}?${params.toString()}`;

  // Fire forecast + air quality in parallel — AQ is optional.
  const aqParams = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: [
      "us_aqi", "pm10", "pm2_5", "carbon_monoxide", "nitrogen_dioxide", "ozone",
      "alder_pollen", "birch_pollen", "grass_pollen", "mugwort_pollen",
      "olive_pollen", "ragweed_pollen",
    ].join(","),
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
        pressure: d.hourly.pressure_msl?.[i] ?? null,
        humidity: d.hourly.relative_humidity_2m?.[i] ?? null,
        cloudCover: d.hourly.cloud_cover?.[i] ?? null,
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

  // Today's sunrise/sunset live at the daily entry whose date matches today.
  const todayIdx = findTodayIndex(dailyForecast, now);
  const todaySunrise = dailyForecast[todayIdx]?.sunrise ?? null;
  const todaySunset = dailyForecast[todayIdx]?.sunset ?? null;
  const yIdx = todayIdx > 0 ? todayIdx - 1 : -1;
  const yesterdaySunrise = yIdx >= 0 ? dailyForecast[yIdx]?.sunrise : null;
  const yesterdaySunset = yIdx >= 0 ? dailyForecast[yIdx]?.sunset : null;
  const daylightDelta = computeDaylightDelta(
    todaySunrise, todaySunset, yesterdaySunrise, yesterdaySunset
  );

  // "vs yesterday at this hour" — uses raw d.hourly which still includes the
  // past_days:1 entries, since our trimmed `hourly` array drops them.
  const tempVsYesterday = computeTempVsYesterday(d.hourly, c.temperature_2m, now);

  // Predict the next sunset/sunrise color quality from cloud cover at the event.
  const sunsetQuality = predictSunEventQuality(
    d.hourly, dailyForecast, todayIdx, now
  );

  const stargazing = predictStargazing(d.hourly, dailyForecast, todayIdx, moon, now);

  return {
    temp: c.temperature_2m,
    feelsLike: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    pressure: c.pressure_msl,
    pressureTrend: computePressureTrend(d.hourly, now),
    windSpeed: c.wind_speed_10m,
    windGusts: c.wind_gusts_10m,
    windDir: c.wind_direction_10m,
    dewPoint: c.dew_point_2m,
    visibility: c.visibility, // meters
    cloudCover: c.cloud_cover, // %
    isDay: !!c.is_day,
    condition,
    label,
    sunrise: todaySunrise,
    sunset: todaySunset,
    yesterdaySunrise,
    yesterdaySunset,
    daylightDelta,
    tempVsYesterday,
    sunsetQuality,
    stargazing,
    uv: daily.uv_index_max?.[todayIdx] ?? null,
    uvPeak: findUvPeak(d.hourly),
    timezone: d.timezone,
    hourly,
    daily: dailyForecast.slice(todayIdx),
    nowcast,
    moon,
    airQuality: normalizeAq(aq),
    pollen: normalizePollen(aq),
    fetchedAt: now,
  };
}

function findTodayIndex(dailyForecast, now) {
  // The entry whose local mid-day (~sunrise + 6h) is closest to `now` is
  // "today" — robust against timezone parsing quirks for daily.time strings.
  // With past_days:1 + forecast_days:7 this usually resolves to index 1.
  let bestIdx = 0;
  let bestDelta = Infinity;
  for (let i = 0; i < dailyForecast.length; i++) {
    const sr = dailyForecast[i].sunrise;
    if (sr == null) continue;
    const delta = Math.abs(now - (sr + 6 * 3600_000));
    if (delta < bestDelta) { bestDelta = delta; bestIdx = i; }
  }
  return bestIdx;
}

// Rate "tonight"'s stargazing window from average cloud cover between the
// upcoming sunset and the next sunrise, with the moon phase mentioned for
// context. Returns null if we can't bracket the night with the available
// daily series.
function predictStargazing(hourly, dailyForecast, todayIdx, moon, now) {
  if (!hourly?.time || !hourly?.cloud_cover) return null;
  // Pick the sunset that begins tonight, plus the next sunrise after it.
  let sunset = null, sunrise = null;
  for (let i = todayIdx; i < Math.min(todayIdx + 3, dailyForecast.length); i++) {
    const d = dailyForecast[i];
    if (!sunset && d.sunset && d.sunset > now - 30 * 60_000) sunset = d.sunset;
    if (sunset && d.sunrise && d.sunrise > sunset) { sunrise = d.sunrise; break; }
  }
  if (!sunset || !sunrise || sunrise <= sunset) return null;

  // Average cloud cover across the night window (1h grace at each end so the
  // sample isn't dominated by twilight extremes).
  const winStart = sunset + 60 * 60_000;
  const winEnd = sunrise - 60 * 60_000;
  let total = 0, count = 0;
  for (let i = 0; i < hourly.time.length; i++) {
    const t = new Date(hourly.time[i]).getTime();
    if (t < winStart || t > winEnd) continue;
    const cc = hourly.cloud_cover[i];
    if (cc == null) continue;
    total += cc; count++;
  }
  if (!count) return null;
  const avg = total / count;

  let rating, label;
  if (avg < 15) { rating = "excellent"; label = "Excellent"; }
  else if (avg < 40) { rating = "good"; label = "Good"; }
  else if (avg < 70) { rating = "fair"; label = "Fair"; }
  else { rating = "poor"; label = "Poor"; }

  const moonPct = Math.round((moon?.illum ?? 0) * 100);
  const moonHint =
    moonPct >= 75 ? `bright ${moonPct}% moon` :
    moonPct >= 30 ? `${moonPct}% moon` :
    "dark sky";
  const cloudHint =
    avg < 15 ? "clear skies" :
    avg < 40 ? "mostly clear" :
    avg < 70 ? "partly cloudy" :
    "overcast";
  const summary = `${cloudHint} · ${moonHint}`;
  return { rating, label, summary, avgCloudCover: avg, moonIllum: moon?.illum ?? null };
}

// Classify the upcoming sun event's color quality from cloud cover (and a
// light humidity dampener). Returns { kind: "sunset"|"sunrise", time,
// rating: "vivid"|"soft"|"clear"|"muted"|"blocked", cloudCover, summary }.
function predictSunEventQuality(hourly, dailyForecast, todayIdx, now) {
  if (!hourly?.time || !hourly?.cloud_cover) return null;
  // Pick the next upcoming sunset or sunrise across the next ~36h.
  const events = [];
  for (let i = todayIdx; i < Math.min(todayIdx + 2, dailyForecast.length); i++) {
    const d = dailyForecast[i];
    if (d.sunset) events.push({ kind: "sunset", time: d.sunset });
    if (d.sunrise) events.push({ kind: "sunrise", time: d.sunrise });
  }
  const next = events
    .filter((e) => e.time > now - 5 * 60_000)
    .sort((a, b) => a.time - b.time)[0];
  if (!next) return null;

  // Find hourly entry closest to the event.
  let bestIdx = -1;
  let bestDiff = Infinity;
  for (let i = 0; i < hourly.time.length; i++) {
    const t = new Date(hourly.time[i]).getTime();
    const diff = Math.abs(t - next.time);
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
  }
  if (bestIdx < 0 || bestDiff > 90 * 60_000) return null;

  const cc = hourly.cloud_cover[bestIdx];
  const hum = hourly.relative_humidity_2m?.[bestIdx];
  if (cc == null) return null;

  // Cloud cover sweet-spot for vivid color: 30–65%.
  let rating;
  if (cc >= 30 && cc <= 65) rating = "vivid";
  else if (cc >= 10 && cc < 30) rating = "soft";
  else if (cc < 10) rating = "clear";
  else if (cc <= 85) rating = "muted";
  else rating = "blocked";

  // Very humid air saturates colors less — downgrade vivid → soft.
  if (rating === "vivid" && hum != null && hum > 85) rating = "soft";

  const verb = next.kind === "sunset" ? "Sunset" : "Sunrise";
  const summary =
    rating === "vivid" ? `Vivid ${verb.toLowerCase()} likely` :
    rating === "soft" ? `Soft ${verb.toLowerCase()} colors` :
    rating === "clear" ? `Clear ${verb.toLowerCase()} — minimal colors` :
    rating === "muted" ? `Muted ${verb.toLowerCase()}` :
    `${verb} blocked by cloud`;
  return { kind: next.kind, time: next.time, rating, cloudCover: cc, summary };
}

function computeTempVsYesterday(hourly, currentTemp, now) {
  if (!hourly?.time || !hourly?.temperature_2m || currentTemp == null) return null;
  const target = now - 24 * 3600_000;
  let bestIdx = -1;
  let bestDiff = Infinity;
  for (let i = 0; i < hourly.time.length; i++) {
    const t = new Date(hourly.time[i]).getTime();
    const diff = Math.abs(t - target);
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
  }
  // Bail if no entry is within 90 minutes of "24h ago".
  if (bestIdx < 0 || bestDiff > 90 * 60_000) return null;
  const yTemp = hourly.temperature_2m[bestIdx];
  if (yTemp == null) return null;
  return currentTemp - yTemp; // signed degrees Celsius
}

function computeDaylightDelta(sr1, ss1, sr0, ss0) {
  if (!sr1 || !ss1 || !sr0 || !ss0) return null;
  const today = ss1 - sr1;
  const yesterday = ss0 - sr0;
  return Math.round((today - yesterday) / 60_000); // signed minutes
}

function computePressureTrend(hourly, now) {
  if (!hourly?.time || !hourly?.pressure_msl) return null;
  // Find index at or just after "now" and 3h earlier.
  let nowIdx = -1;
  for (let i = 0; i < hourly.time.length; i++) {
    const t = new Date(hourly.time[i]).getTime();
    if (t >= now - 30 * 60_000) { nowIdx = i; break; }
  }
  if (nowIdx < 0) return null;
  const cur = hourly.pressure_msl[nowIdx];
  const pastIdx = Math.max(0, nowIdx - 3);
  const past = hourly.pressure_msl[pastIdx];
  if (cur == null || past == null) return null;
  const delta = cur - past;
  let direction = "steady";
  if (delta > 0.8) direction = "rising";
  else if (delta < -0.8) direction = "falling";
  return { delta, direction };
}

function normalizePollen(aq) {
  if (!aq?.current) return null;
  const c = aq.current;
  const items = [
    { key: "grass", label: "Grass", value: c.grass_pollen },
    { key: "tree", label: "Tree", value: maxDefined(c.alder_pollen, c.birch_pollen, c.olive_pollen) },
    { key: "weed", label: "Weed", value: maxDefined(c.mugwort_pollen, c.ragweed_pollen) },
  ].filter((x) => x.value != null);
  if (!items.length) return null;
  // Find dominant.
  const dominant = items.reduce((best, x) => (x.value > (best?.value ?? -1) ? x : best), null);
  return {
    items,
    dominant,
    overall: dominant,
    level: pollenLevel(dominant.value),
  };
}

function maxDefined(...values) {
  let best = null;
  for (const v of values) {
    if (v == null) continue;
    if (best == null || v > best) best = v;
  }
  return best;
}

function pollenLevel(v) {
  if (v == null) return "—";
  if (v < 0.5) return "Low";
  if (v < 5) return "Moderate";
  if (v < 20) return "High";
  return "Very high";
}

function normalizeAq(aq) {
  if (!aq?.current) return null;
  const c = aq.current;
  // Pull the next ~12h of hourly US AQI (preferred) or European AQI as
  // fallback so we can plot a mini trend in the UI.
  const trend = [];
  if (aq.hourly?.time) {
    const now = Date.now();
    const series = aq.hourly.us_aqi || aq.hourly.european_aqi || [];
    for (let i = 0; i < aq.hourly.time.length && trend.length < 12; i++) {
      const ts = new Date(aq.hourly.time[i]).getTime();
      if (ts < now - 30 * 60_000) continue;
      if (series[i] == null) continue;
      trend.push({ time: ts, aqi: series[i] });
    }
  }
  return {
    aqi: c.us_aqi,
    pm25: c.pm2_5,
    pm10: c.pm10,
    o3: c.ozone,
    no2: c.nitrogen_dioxide,
    co: c.carbon_monoxide,
    label: aqiLabel(c.us_aqi),
    trend,
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
  const now = Date.now();
  let peak = { t: null, v: -Infinity };
  for (let i = 0; i < hourly.uv_index.length; i++) {
    const t = new Date(hourly.time[i]).getTime();
    if (t < now) continue; // ignore past_days entries — peak should be upcoming
    const v = hourly.uv_index[i];
    if (v > peak.v) peak = { t, v };
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
      humidity: 60 + Math.sin(i / 3) * 12,
      cloudCover: 45 + Math.sin(i / 4) * 25,
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
    pollen: {
      items: [
        { key: "grass", label: "Grass", value: 1.2 },
        { key: "tree", label: "Tree", value: 3.4 },
        { key: "weed", label: "Weed", value: 0.1 },
      ],
      dominant: { key: "tree", label: "Tree", value: 3.4 },
      overall: { key: "tree", label: "Tree", value: 3.4 },
      level: "Moderate",
    },
    pressureTrend: { delta: -0.4, direction: "steady" },
    // Round 22+: cross-day deltas so the offline shell exercises the new chips.
    yesterdaySunrise: new Date(now - 86400_000).setHours(6, 32, 0, 0),
    yesterdaySunset: new Date(now - 86400_000).setHours(18, 58, 0, 0),
    daylightDelta: 4,
    tempVsYesterday: 1.5,
    sunsetQuality: {
      kind: "sunset",
      time: new Date().setHours(19, 0, 0, 0),
      rating: "soft",
      cloudCover: 45,
      summary: "Soft sunset colors",
    },
    stargazing: {
      rating: "fair",
      label: "Fair",
      summary: "partly cloudy · 35% moon",
      avgCloudCover: 45,
      moonIllum: 0.35,
    },
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
