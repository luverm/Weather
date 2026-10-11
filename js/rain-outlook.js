// Short-horizon precipitation outlook. Summarizes the next-24h hourly
// forecast into a single chip: how much rain total, when it's heaviest,
// and the longest dry window.

export function rainOutlook(weather) {
  const hours = (weather?.hourly || []).slice(0, 24);
  if (hours.length < 2) return null;

  let total = 0;
  let heaviest = { time: null, precip: 0, pop: 0 };
  for (const h of hours) {
    const p = h.precip ?? 0;
    total += p;
    if (p > heaviest.precip) heaviest = { time: h.time, precip: p, pop: h.pop ?? 0 };
  }

  // Longest run of consecutive hours with <0.2 mm AND <40% pop.
  let bestStart = null, bestLen = 0;
  let curStart = null, curLen = 0;
  for (const h of hours) {
    const dry = (h.precip ?? 0) < 0.2 && (h.pop ?? 0) < 40;
    if (dry) {
      if (curStart == null) curStart = h.time;
      curLen += 1;
      if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
    } else {
      curStart = null;
      curLen = 0;
    }
  }

  const anyRain = total > 0.1 || hours.some((h) => (h.pop ?? 0) >= 40);
  if (!anyRain && bestLen >= 12) {
    return {
      tone: "dry",
      total: 0,
      heaviest: null,
      dryWindow: null, // skip the obvious "dry everywhere" window
      headline: "Dry outlook",
      detail: "No rain expected in the next 24 h",
    };
  }

  const headline = total >= 0.1
    ? `${total.toFixed(total >= 10 ? 0 : 1)} mm · next 24 h`
    : "Trace rain next 24 h";
  const parts = [];
  if (heaviest.time && heaviest.precip >= 0.1) {
    parts.push(`heaviest ${fmtHour(heaviest.time)} (${heaviest.precip.toFixed(1)} mm)`);
  }
  if (bestLen >= 3 && bestStart) {
    const end = bestStart + bestLen * 3600_000;
    parts.push(`dry window ${fmtHour(bestStart)}–${fmtHour(end)}`);
  }

  return {
    tone: total >= 5 ? "wet" : total >= 0.5 ? "showers" : "light",
    total,
    heaviest: heaviest.time ? heaviest : null,
    dryWindow: bestLen >= 3 ? { start: bestStart, hours: bestLen } : null,
    headline,
    detail: parts.join(" · ") || "Scattered chances",
  };
}

function fmtHour(ts) {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  return `${hh}:00`;
}
