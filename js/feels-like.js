// Small helper: explain the delta between air temperature and "feels like".
//
// Returns null when the delta is trivial (< ~2°C), otherwise an object with
// { label, icon, tone, delta } describing the dominant driver so the UI can
// render a chip below the feels-like line.

export function feelsLikeBreakdown(w) {
  if (w == null) return null;
  const temp = w.temp;
  const feels = w.feelsLike;
  if (temp == null || feels == null) return null;

  const delta = feels - temp; // positive = feels warmer than air
  const abs = Math.abs(delta);
  if (abs < 1.6) return null;

  const humidity = w.humidity ?? null;
  const wind = w.windSpeed ?? 0;
  const uv = w.uv ?? 0;
  const cloud = w.cloudCover ?? null;

  // Ranked classifiers — first match wins.
  if (delta <= -1.6 && wind >= 12) {
    return chip("Wind chill", "wind", "cold", delta);
  }
  if (delta <= -1.6 && humidity != null && humidity >= 78 && temp <= 12) {
    return chip("Damp chill", "mist", "cold", delta);
  }
  if (delta >= 1.6 && humidity != null && humidity >= 62 && temp >= 22) {
    return chip("Muggy heat", "drop", "warm", delta);
  }
  if (delta >= 1.6 && uv >= 5 && (cloud == null || cloud < 45)) {
    return chip("Sun-boosted", "sun", "warm", delta);
  }
  if (delta <= -1.6 && temp <= 8) {
    return chip("Crisp air", "leaf", "cool", delta);
  }
  if (delta >= 1.6) {
    return chip("Runs warm", "spark", "warm", delta);
  }
  return chip("Runs cool", "cool", "cool", delta);
}

function chip(label, icon, tone, delta) {
  const rounded = Math.abs(delta) >= 5 ? Math.round(delta) : Math.round(delta * 10) / 10;
  const sign = delta > 0 ? "+" : "−";
  return { label, icon, tone, delta, deltaText: `${sign}${Math.abs(rounded)}°` };
}

// Format a daylight-change duration into "+Xm Ys longer" / "-Am Bs shorter".
// Returns null when the change is under 30 s (indistinguishable at UI grain).
export function daylightChange(dailyForecast) {
  if (!Array.isArray(dailyForecast) || dailyForecast.length < 2) return null;
  const today = dailyForecast[0];
  const next = dailyForecast[1];
  if (!today?.sunrise || !today?.sunset || !next?.sunrise || !next?.sunset) return null;
  const todayLen = today.sunset - today.sunrise;
  const nextLen = next.sunset - next.sunrise;
  const deltaMs = nextLen - todayLen;
  if (Math.abs(deltaMs) < 30_000) return null;
  const abs = Math.abs(deltaMs);
  const mins = Math.floor(abs / 60_000);
  const secs = Math.round((abs - mins * 60_000) / 1000);
  const parts = [];
  if (mins) parts.push(`${mins}m`);
  if (secs) parts.push(`${secs}s`);
  const magnitude = parts.join(" ") || "0s";
  const longer = deltaMs > 0;
  return {
    longer,
    magnitude,
    label: `${longer ? "+" : "−"}${magnitude} ${longer ? "longer" : "shorter"} tomorrow`,
  };
}
