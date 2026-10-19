// Round 22: synthesize a "vs yesterday" one-liner for the hero chip.
// Reads from w.yesterday + the sampled "now" temperature + today's daily entry.

function hhmm(ms, tz) {
  const d = new Date(ms);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit", hour12: false,
    ...(tz && tz !== "auto" ? { timeZone: tz } : {}),
  });
}

function dur(ms) {
  const total = Math.abs(Math.round(ms / 60_000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

// Convert a °C delta to the active unit (°F spans 1.8× a °C span, no offset).
function deltaInUnit(deltaC, unit) {
  if (deltaC == null) return null;
  return unit === "F" ? deltaC * 9 / 5 : deltaC;
}

// Convert an absolute °C temperature to the active display unit.
function tempInUnit(tempC, unit) {
  if (tempC == null) return null;
  return unit === "F" ? tempC * 9 / 5 + 32 : tempC;
}

export function yesterdaySummary(weather, { unit = "C", currentTemp = null } = {}) {
  const y = weather?.yesterday;
  if (!y) return null;
  const today = weather?.daily?.[0];

  // Compare the live temp (or the cached delta if the caller didn't pass
  // one) against the same hour yesterday.
  let dTemp = null;
  if (currentTemp != null && y.tempAtNow != null) {
    dTemp = deltaInUnit(currentTemp - y.tempAtNow, unit);
  } else if (y.deltaNow != null) {
    dTemp = deltaInUnit(y.deltaNow, unit);
  }

  // Daylight delta (today - yesterday) in milliseconds.
  const todayDaylight = (today?.sunrise && today?.sunset) ? (today.sunset - today.sunrise) : null;
  const dDaylight = (todayDaylight != null && y.daylight != null) ? todayDaylight - y.daylight : null;

  // Max-temp delta.
  let dMax = null;
  if (today?.tempMax != null && y.tempMax != null) {
    dMax = deltaInUnit(today.tempMax - y.tempMax, unit);
  }

  // Pick the headline: live now-vs-then if we have it, else max-vs-max.
  let headline = "";
  let direction = "flat";
  if (dTemp != null) {
    const r = Math.round(dTemp);
    if (r > 0) { headline = `${r}° warmer than yesterday`; direction = "up"; }
    else if (r < 0) { headline = `${Math.abs(r)}° cooler than yesterday`; direction = "down"; }
    else { headline = `Same temp as yesterday`; direction = "flat"; }
  } else if (dMax != null) {
    const r = Math.round(dMax);
    if (r > 0) { headline = `High ${r}° warmer than yesterday`; direction = "up"; }
    else if (r < 0) { headline = `High ${Math.abs(r)}° cooler than yesterday`; direction = "down"; }
    else { headline = `Same high as yesterday`; direction = "flat"; }
  } else {
    return null;
  }

  const detail = [];
  if (dDaylight != null && Math.abs(dDaylight) >= 60_000) {
    detail.push(dDaylight > 0
      ? `${dur(dDaylight)} more daylight`
      : `${dur(dDaylight)} less daylight`);
  }
  if (dMax != null && dTemp != null) {
    const r = Math.round(dMax);
    if (r > 0) detail.push(`high +${r}°`);
    else if (r < 0) detail.push(`high ${r}°`);
  }

  const tz = weather.timezone;
  const tooltip = [
    y.tempAtNow != null ? `Yesterday at this hour: ${Math.round(tempInUnit(y.tempAtNow, unit))}°${unit}` : null,
    y.tempMax != null && y.tempMin != null
      ? `Yesterday: ${Math.round(tempInUnit(y.tempMax, unit))}° / ${Math.round(tempInUnit(y.tempMin, unit))}°`
      : null,
    y.sunrise && y.sunset
      ? `Daylight: ${hhmm(y.sunrise, tz)} → ${hhmm(y.sunset, tz)}`
      : null,
  ].filter(Boolean).join("\n");

  return {
    headline,
    detail: detail.join(" · "),
    direction,
    tooltip,
  };
}
