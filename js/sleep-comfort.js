// Estimate how comfortable tonight will be for sleeping. Pulls the median
// overnight temperature/humidity/wind from the hourly series and bins them
// into a 1–5 comfort score with a short narrative.

const TIERS = [
  { min: 85, key: "ideal",  label: "Ideal",        tone: "ok"   },
  { min: 65, key: "good",   label: "Comfortable",  tone: "ok"   },
  { min: 45, key: "fair",   label: "Fair",         tone: "warn" },
  { min: 25, key: "rough",  label: "Restless",     tone: "warn" },
  { min: 0,  key: "tough",  label: "Tough",        tone: "bad"  },
];

export function sleepComfort(weather) {
  if (!weather) return null;
  const overnight = collectOvernight(weather);
  if (!overnight.length) return null;

  const t = median(overnight.map((h) => h.temp));
  const h = median(overnight.map((h) => h.humidity).filter((v) => v != null));
  const w = median(overnight.map((h) => h.wind ?? h.windSpeed).filter((v) => v != null));

  // Temperature is the dominant factor.
  let score = tempScore(t);
  // Humidity > 75 makes a warm room oppressive.
  if (h != null && h >= 75 && t != null && t >= 20) score -= 10;
  // Cold + dry is fine; cold + windy is harsher.
  if (w != null && w >= 25) score -= 5;
  if (w != null && w >= 40) score -= 10;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const tier = TIERS.find((x) => score >= x.min) || TIERS[TIERS.length - 1];
  return {
    score,
    tier: tier.key,
    label: tier.label,
    tone: tier.tone,
    detail: buildDetail(t, h, w),
    overnightLow: Math.min(...overnight.map((x) => x.temp).filter((v) => v != null)),
    overnightHigh: Math.max(...overnight.map((x) => x.temp).filter((v) => v != null)),
  };
}

function collectOvernight(weather) {
  // Use hourlyExtended if available so a midday view still sees tonight.
  const hours = weather.hourlyExtended?.length ? weather.hourlyExtended : (weather.hourly || []);
  const now = Date.now();
  // Today's sunset → tomorrow's sunrise window (fall back to 21:00–06:00).
  const today = weather.daily?.[0];
  const tomorrow = weather.daily?.[1];
  let start = today?.sunset, end = tomorrow?.sunrise;
  if (!start) start = endOfTodayAt(21);
  if (!end) end = endOfTodayAt(6) + 24 * 3600_000;
  if (end <= now) {
    // Bedtime has already passed tonight — look at tomorrow night.
    const d2 = weather.daily?.[1];
    const d3 = weather.daily?.[2];
    start = d2?.sunset ?? start + 24 * 3600_000;
    end = d3?.sunrise ?? end + 24 * 3600_000;
  }
  return hours.filter((h) => h.time >= start && h.time <= end);
}

function endOfTodayAt(hour) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

function tempScore(t) {
  if (t == null) return 50;
  // Peak 17°C; ±2° still 100, falls off ~8 points/°.
  const ideal = 17;
  const slack = 2;
  const dist = Math.max(0, Math.abs(t - ideal) - slack);
  return Math.max(0, 100 - dist * 8);
}

function median(arr) {
  const xs = arr.filter((v) => v != null).slice().sort((a, b) => a - b);
  if (!xs.length) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}

function buildDetail(t, h, w) {
  const bits = [];
  if (t != null) bits.push(`${Math.round(t)}°`);
  if (h != null && h >= 70) bits.push(`${Math.round(h)}% RH`);
  if (w != null && w >= 25) bits.push(`wind ${Math.round(w)} km/h`);
  if (!bits.length && t != null) bits.push(`${Math.round(t)}° overnight`);
  return bits.join(" · ");
}
