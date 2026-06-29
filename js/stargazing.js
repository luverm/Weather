// Sky tonight — derives a stargazing quality score and a best viewing window
// from the existing forecast. We score each hour from sunset to next sunrise
// based on cloud cover, humidity, and moon illumination, then pick the
// longest contiguous run of "good" hours as the best window.

const GOOD_THRESHOLD = 0.62;

export function skyTonight(weather, { now = Date.now() } = {}) {
  if (!weather) return null;
  const win = findRelevantWindow(weather, now);
  if (!win) return null;
  const { sunset, sunrise } = win;

  // Effective viewing window: from now (if we're already in the night) onward.
  const winStart = Math.max(now, sunset);
  const winEnd = sunrise;
  if (winEnd - winStart < 30 * 60_000) return null;

  const hours = (weather.hourly || []).filter(
    (h) => h.time >= winStart - 30 * 60_000 && h.time <= winEnd + 30 * 60_000 && !h.isDay
  );
  if (!hours.length) return null;

  const illum = weather.moon?.illum ?? 0.5;
  const scored = hours.map((h) => ({
    time: h.time,
    clouds: h.clouds,
    humidity: h.humidity,
    score: hourScore(h, illum),
  }));

  const overall = avg(scored.map((s) => s.score));
  const window = longestGoodRun(scored, GOOD_THRESHOLD);
  const cloudSamples = scored.map((s) => s.clouds).filter((v) => v != null);
  const avgClouds = cloudSamples.length ? avg(cloudSamples) : null;

  return {
    overall: Math.round(overall * 100),
    label: labelFor(overall),
    tone: toneFor(overall),
    avgClouds: avgClouds != null ? Math.round(avgClouds) : null,
    moonIllum: illum,
    window: window ? { start: window.start, end: window.end } : null,
    windowStart: winStart,
    windowEnd: winEnd,
  };
}

function hourScore(h, illum) {
  // Cloud cover is the biggest factor for naked-eye stargazing.
  const cloudScore = h.clouds != null ? clamp01((100 - h.clouds) / 100) : 0.5;
  // Drier air = less haze. Treat <40% as ideal, >85% as poor.
  const humScore = h.humidity != null
    ? clamp01((90 - h.humidity) / 60)
    : 0.5;
  // Bright moon washes out faint stars. Penalize only mildly because the moon
  // itself is also worth looking at.
  const moonScore = clamp01(1 - illum * 0.7);
  // Slightly penalize precipitation hours.
  const precipScore = h.precip > 0.05 ? 0.2 : 1;
  return (
    0.55 * cloudScore +
    0.20 * humScore +
    0.15 * moonScore +
    0.10 * precipScore
  );
}

function longestGoodRun(scored, threshold) {
  let best = null, current = null;
  for (let i = 0; i < scored.length; i++) {
    const s = scored[i];
    if (s.score >= threshold) {
      if (!current) current = { start: s.time, end: s.time, len: 1 };
      else {
        current.end = s.time;
        current.len += 1;
      }
      if (!best || current.len > best.len) best = { ...current };
    } else {
      current = null;
    }
  }
  // Push the end one hour forward so the window covers the trailing hour
  // (each hour represents the start of a 60-min period).
  if (best) best.end += 60 * 60_000;
  return best;
}

// Find the nearest upcoming nighttime window. If we're already inside a night
// (between an earlier sunset and an upcoming sunrise), use that one; otherwise
// use tonight's sunset and tomorrow's sunrise.
function findRelevantWindow(weather, now) {
  const daily = weather.daily || [];
  for (let i = 0; i < daily.length; i++) {
    const sunrise = daily[i]?.sunrise;
    if (sunrise == null) continue;
    if (sunrise <= now) continue;
    // The night ending at this sunrise started at the previous evening's sunset.
    const prevSunset = i > 0 ? daily[i - 1]?.sunset : null;
    if (prevSunset != null) return { sunset: prevSunset, sunrise };
    // No earlier sunset known — we're already inside the night.
    return { sunset: now, sunrise };
  }
  return null;
}

function labelFor(score) {
  if (score >= 0.78) return "Excellent";
  if (score >= 0.62) return "Good";
  if (score >= 0.45) return "Fair";
  if (score >= 0.28) return "Poor";
  return "Cloudy out";
}

function toneFor(score) {
  if (score >= 0.78) return "great";
  if (score >= 0.62) return "good";
  if (score >= 0.45) return "fair";
  return "poor";
}

function avg(arr) {
  if (!arr.length) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
