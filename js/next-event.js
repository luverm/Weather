// Round 26: pick the next weather event worth mentioning on the hero.
// Prefers the earliest of: rain-onset, dry-onset (rain stopping), notable
// temperature shift, sunrise/sunset. Returns null when nothing in the
// forecast beats "gentle drift" — the chip stays hidden then.

const RAIN_MM = 0.2;          // mm/h that reads as "actual rain"
const TEMP_SHIFT_C = 4;       // degrees change from now that counts
const MAX_HORIZON_MIN = 12 * 60;

export function pickNextEvent(w, now = Date.now()) {
  if (!w) return null;
  const events = [];

  // Rain onset / stop within the hourly window.
  const hrs = (w.hourly || []).filter((h) => h.time >= now && h.time <= now + MAX_HORIZON_MIN * 60_000);
  if (hrs.length) {
    const rainingNow = (w.hourly?.[0]?.precip ?? 0) >= RAIN_MM || (w.nowcast?.[0]?.precip ?? 0) >= 0.05;
    if (rainingNow) {
      const stopIdx = hrs.findIndex((h) => (h.precip ?? 0) < 0.05);
      if (stopIdx > 0) {
        events.push({
          kind: "rain-stop",
          time: hrs[stopIdx].time,
          icon: "☁️",
          text: `Rain eases by ${_short(hrs[stopIdx].time, w.timezone)}`,
        });
      }
    } else {
      const startIdx = hrs.findIndex((h) => (h.precip ?? 0) >= RAIN_MM);
      if (startIdx >= 0) {
        events.push({
          kind: "rain-start",
          time: hrs[startIdx].time,
          icon: "🌧️",
          text: `Rain arrives ${_relative(hrs[startIdx].time, now)}`,
        });
      }
    }

    // Notable temp shift from the current temperature.
    const nowTemp = w.temp;
    if (nowTemp != null) {
      let peak = null;
      for (const h of hrs) {
        if (h.temp == null) continue;
        if (!peak || Math.abs(h.temp - nowTemp) > Math.abs(peak.temp - nowTemp)) peak = h;
      }
      if (peak && Math.abs(peak.temp - nowTemp) >= TEMP_SHIFT_C) {
        const dir = peak.temp > nowTemp ? "Warms to" : "Cools to";
        events.push({
          kind: "temp-shift",
          time: peak.time,
          icon: peak.temp > nowTemp ? "🌡️" : "❄️",
          text: `${dir} ${Math.round(peak.temp)}° by ${_short(peak.time, w.timezone)}`,
        });
      }
    }
  }

  // Sunrise or sunset — cross-day capable.
  for (const d of (w.daily || []).slice(0, 2)) {
    for (const [ts, label, icon] of [
      [d.sunrise, "Sunrise", "🌅"],
      [d.sunset, "Sunset", "🌇"],
    ]) {
      if (ts && ts > now && ts <= now + MAX_HORIZON_MIN * 60_000) {
        events.push({
          kind: label.toLowerCase(),
          time: ts,
          icon,
          text: `${label} ${_relative(ts, now)}`,
        });
      }
    }
  }

  if (!events.length) return null;
  events.sort((a, b) => a.time - b.time);
  return events[0];
}

function _relative(ts, now) {
  const mins = Math.max(0, Math.round((ts - now) / 60_000));
  if (mins < 60) return `in ${mins} min`;
  const hrs = Math.round(mins / 60);
  return `in ${hrs} h`;
}

function _short(ts, tz) {
  if (!ts) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: tz && tz !== "auto" ? tz : undefined,
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date(ts));
  } catch {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
}
