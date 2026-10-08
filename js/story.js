// Build a short "next few hours" summary — chattier than one-line advice.
// Returns a string like:
//   "Dry and comfortable through evening."
//   "Showers rolling in around 3pm, clearing by 6pm."
//   "Temperature holding steady; breezy by sunset."

export function tellStory(weather, { nowFn = () => Date.now() } = {}) {
  if (!weather?.hourly?.length) return "";
  const now = nowFn();
  const hours = weather.hourly.filter((h) => h.time >= now - 30 * 60_000).slice(0, 8);
  if (hours.length < 2) return "";

  const parts = [];

  // --- 1. Precipitation story ---
  const rainOnset = hours.find((h) => (h.pop ?? 0) >= 55 || (h.precip ?? 0) >= 0.3);
  const everDry = hours.every((h, i) => i < 2 ? true : (h.pop ?? 0) < 20);
  if (!rainOnset && everDry) {
    parts.push("Dry stretch ahead");
  } else if (rainOnset) {
    const mins = Math.round((rainOnset.time - now) / 60_000);
    const whenStr = describeWhen(rainOnset.time, now, weather.timezone);
    const kind = rainOnset.condition === "snow" ? "Snow" :
                 rainOnset.condition === "storm" ? "Storms" :
                 "Rain";
    const after = hours.slice(hours.indexOf(rainOnset) + 1);
    const clearIdx = after.findIndex((h) => (h.pop ?? 0) < 25);
    if (clearIdx >= 0 && clearIdx < 5) {
      const clearTs = after[clearIdx].time;
      const clearWhen = describeWhen(clearTs, now, weather.timezone);
      parts.push(`${kind} ${mins <= 15 ? "arriving now" : `around ${whenStr}`}, clearing by ${clearWhen}`);
    } else {
      parts.push(`${kind} ${mins <= 15 ? "starting shortly" : `around ${whenStr}`}`);
    }
  }

  // --- 2. Temperature trajectory ---
  const temps = hours.map((h) => h.temp).filter((v) => v != null);
  if (temps.length >= 3) {
    const first = temps[0];
    const peak = Math.max(...temps);
    const trough = Math.min(...temps);
    const last = temps[temps.length - 1];
    const span = peak - trough;
    if (span < 2) {
      parts.push("temperatures holding steady");
    } else if (last - first >= 3) {
      parts.push(`warming to ${Math.round(peak)}°`);
    } else if (first - last >= 3) {
      parts.push(`cooling to ${Math.round(last)}°`);
    } else if (span >= 4) {
      parts.push(`peaking near ${Math.round(peak)}°`);
    }
  }

  // --- 3. Wind story (only when notable) ---
  const winds = hours.map((h) => h.wind ?? 0);
  const peakWind = Math.max(...winds);
  const peakWindIdx = winds.indexOf(peakWind);
  if (peakWind >= 25) {
    const when = describeWhen(hours[peakWindIdx].time, now, weather.timezone);
    const prefix = peakWind >= 50 ? "fierce winds" : peakWind >= 35 ? "gusty" : "breezy";
    parts.push(`${prefix} near ${when}`);
  }

  if (!parts.length) return "";

  // Capitalize first word and end with a period.
  const sentence = parts.join(", ").replace(/^./, (c) => c.toUpperCase());
  return sentence + ".";
}

function describeWhen(ts, now, tz) {
  const diffMin = Math.round((ts - now) / 60_000);
  if (diffMin <= 15) return "now";
  if (diffMin < 90) return `in ${diffMin} min`;
  // Format as a clock time in the location's timezone.
  try {
    if (tz && tz !== "auto") {
      return new Intl.DateTimeFormat(undefined, {
        timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true,
      }).format(new Date(ts)).toLowerCase().replace(/\s/g, "");
    }
  } catch { /* fall through */ }
  const d = new Date(ts);
  const h = d.getHours();
  const ap = h >= 12 ? "pm" : "am";
  const h12 = ((h + 11) % 12) + 1;
  const m = d.getMinutes();
  return m === 0 ? `${h12}${ap}` : `${h12}:${m.toString().padStart(2, "0")}${ap}`;
}
