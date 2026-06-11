// Detect the next narratively interesting weather change.
// Returns { id, tone, icon, headline, detail, ts? } or null when truly nothing
// interesting is in the forecast (we don't surface a chip then).
//
// This complements (does not duplicate) the alerts strip (extremes) and the
// nowcast banner (sub-2h precip). It calls out *the next storyline beat*:
// rain starting/stopping, clearing, big temp/wind swings.

const PRECIP_CONDITIONS = new Set(["rain", "snow", "storm"]);

export function detectNextChange(weather) {
  if (!weather?.hourly?.length) return null;
  const now = Date.now();
  const hours = weather.hourly.filter((h) => h.time > now - 30 * 60_000).slice(0, 24);
  if (hours.length < 2) return null;

  const curWet = PRECIP_CONDITIONS.has(weather.condition);
  const nowcastSoon = (weather.nowcast || []).some(
    (n) => n.time > now && n.time - now < 60 * 60_000 && (n.precip ?? 0) > 0.1,
  );

  // 1. Precip ending (when we're wet now).
  if (curWet) {
    const dryAt = hours.find((h) => !PRECIP_CONDITIONS.has(h.condition) && (h.precip ?? 0) < 0.1);
    if (dryAt) {
      return {
        id: "precip-end",
        tone: "clear",
        icon: clearIcon(),
        headline: `Drying ${relative(dryAt.time, now)}`,
        detail: `Clearing by ${shortClock(dryAt.time)}`,
        ts: dryAt.time,
      };
    }
  }

  // 2. Precip starting (skip if nowcast banner already screams it).
  if (!curWet && !nowcastSoon) {
    const onset = hours.find(
      (h) => PRECIP_CONDITIONS.has(h.condition) || (h.precip ?? 0) >= 0.2,
    );
    if (onset) {
      const kind = onset.condition === "snow" ? "Snow" :
                   onset.condition === "storm" ? "Storms" : "Rain";
      const popPart = (onset.pop ?? 0) >= 30 ? ` · ${onset.pop}% chance` : "";
      return {
        id: "precip-onset",
        tone: "wet",
        icon: precipIcon(onset.condition),
        headline: `${kind} ${relative(onset.time, now)}`,
        detail: `From ${shortClock(onset.time)}${popPart}`,
        ts: onset.time,
      };
    }
  }

  // 3. Big temperature swing within 12h (≥ 6°C delta from now).
  const t0 = weather.temp;
  if (t0 != null) {
    let extreme = null;
    for (const h of hours.slice(0, 12)) {
      if (h.temp == null) continue;
      const d = h.temp - t0;
      if (!extreme || Math.abs(d) > Math.abs(extreme.delta)) extreme = { h, delta: d };
    }
    if (extreme && Math.abs(extreme.delta) >= 6) {
      const dir = extreme.delta > 0 ? "Warmer" : "Cooler";
      const sign = extreme.delta > 0 ? "+" : "";
      return {
        id: "temp-swing",
        tone: extreme.delta > 0 ? "warm" : "cool",
        icon: extreme.delta > 0 ? warmIcon() : coolIcon(),
        headline: `${dir} by ${shortClock(extreme.h.time)}`,
        detail: `${sign}${Math.round(extreme.delta)}° · ${Math.round(extreme.h.temp)}° at peak`,
        ts: extreme.h.time,
      };
    }
  }

  // 4. Wind picking up (peak gust ≥ 25 km/h above now AND ≥ 35 km/h absolute).
  const g0 = weather.windGusts ?? weather.windSpeed ?? 0;
  let peak = null;
  for (const h of hours.slice(0, 12)) {
    const g = h.gusts ?? h.wind ?? 0;
    if (!peak || g > peak.g) peak = { g, time: h.time };
  }
  if (peak && peak.g - g0 >= 25 && peak.g >= 35) {
    return {
      id: "wind-up",
      tone: "wind",
      icon: windIcon(),
      headline: `Winds pick up ${relative(peak.time, now)}`,
      detail: `Gusts to ${Math.round(peak.g)} km/h by ${shortClock(peak.time)}`,
      ts: peak.time,
    };
  }

  // 5. Clearing / clouding transitions (skip if precip handled it).
  if (weather.condition === "clouds" || weather.condition === "fog") {
    const clearAt = hours.find((h) => h.condition === "clear");
    if (clearAt && clearAt.time - now <= 12 * 3600_000) {
      return {
        id: "clearing",
        tone: "clear",
        icon: clearIcon(),
        headline: `Clearing ${relative(clearAt.time, now)}`,
        detail: `Sun returns near ${shortClock(clearAt.time)}`,
        ts: clearAt.time,
      };
    }
  } else if (weather.condition === "clear") {
    const cloudAt = hours.find((h) => h.condition === "clouds" || h.condition === "fog");
    if (cloudAt && cloudAt.time - now >= 60 * 60_000 && cloudAt.time - now <= 12 * 3600_000) {
      return {
        id: "clouding",
        tone: "cloud",
        icon: cloudsIcon(),
        headline: `Cloud rolls in ${relative(cloudAt.time, now)}`,
        detail: `Sun fades near ${shortClock(cloudAt.time)}`,
        ts: cloudAt.time,
      };
    }
  }

  // 6. Sunrise / sunset within 90 minutes — when nothing else is moving.
  for (const [ts, kind] of [[weather.sunrise, "Sunrise"], [weather.sunset, "Sunset"]]) {
    if (!ts) continue;
    const dt = ts - now;
    if (dt > 0 && dt <= 90 * 60_000) {
      return {
        id: kind === "Sunrise" ? "sunrise-near" : "sunset-near",
        tone: "sun",
        icon: kind === "Sunrise" ? sunRiseIcon() : sunSetIcon(),
        headline: `${kind} in ${Math.round(dt / 60_000)}m`,
        detail: `At ${shortClock(ts)}`,
        ts,
      };
    }
  }

  // 7. Fallback: explicitly call out a steady stretch.
  // If the nowcast banner is already announcing rain, hide the chip rather
  // than contradict it with "steady".
  if (nowcastSoon) return null;
  return {
    id: "steady",
    tone: "calm",
    icon: steadyIcon(),
    headline: "Steady through evening",
    detail: "No major change in the next 12 hours",
    ts: null,
  };
}

// ---------- helpers ----------
function shortClock(ts) {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function relative(ts, now) {
  const mins = Math.max(0, Math.round((ts - now) / 60_000));
  if (mins < 60) return `in ${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 6) return m ? `in ${h}h ${m}m` : `in ${h}h`;
  return `in ${h}h`;
}

// ---------- icons (kept inline so the module is self-contained) ----------
const STROKE = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';

function precipIcon(condition) {
  if (condition === "snow") {
    return `<svg viewBox="0 0 24 24"><path d="M7 14a4 4 0 010-8 5 5 0 019.9-1A4 4 0 0117 14H7z" ${STROKE}/><path d="M9 18v2M12 17v3M15 18v2" ${STROKE}/></svg>`;
  }
  if (condition === "storm") {
    return `<svg viewBox="0 0 24 24"><path d="M7 13a4 4 0 010-8 5 5 0 019.9-1A4 4 0 0117 13H7z" ${STROKE}/><path d="M12 13l-2 4h3l-2 4" ${STROKE}/></svg>`;
  }
  return `<svg viewBox="0 0 24 24"><path d="M7 14a4 4 0 010-8 5 5 0 019.9-1A4 4 0 0117 14H7z" ${STROKE}/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2" ${STROKE}/></svg>`;
}
function clearIcon() {
  return `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" ${STROKE}/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" ${STROKE}/></svg>`;
}
function cloudsIcon() {
  return `<svg viewBox="0 0 24 24"><path d="M7 17a4 4 0 010-8 5 5 0 019.9-1A4 4 0 0117 17H7z" ${STROKE}/></svg>`;
}
function warmIcon() {
  return `<svg viewBox="0 0 24 24"><path d="M10 14V4a2 2 0 014 0v10" ${STROKE}/><circle cx="12" cy="17" r="3" ${STROKE}/><path d="M16 4l4 -2M16 8l4 0" ${STROKE}/></svg>`;
}
function coolIcon() {
  return `<svg viewBox="0 0 24 24"><path d="M10 14V4a2 2 0 014 0v10" ${STROKE}/><circle cx="12" cy="17" r="3" ${STROKE}/><path d="M4 6l2 0M4 10l2 0M4 14l2 0" ${STROKE}/></svg>`;
}
function windIcon() {
  return `<svg viewBox="0 0 24 24"><path d="M3 8h11a3 3 0 100-6M3 16h15a3 3 0 110 6M3 12h7" ${STROKE}/></svg>`;
}
function sunRiseIcon() {
  return `<svg viewBox="0 0 24 24"><path d="M5 18h14M12 13V4M8 8l4-4 4 4M3 22h18" ${STROKE}/></svg>`;
}
function sunSetIcon() {
  return `<svg viewBox="0 0 24 24"><path d="M5 18h14M12 4v9M8 9l4 4 4-4M3 22h18" ${STROKE}/></svg>`;
}
function steadyIcon() {
  return `<svg viewBox="0 0 24 24"><path d="M4 12h6l2-3 2 6 2-3h4" ${STROKE}/></svg>`;
}
