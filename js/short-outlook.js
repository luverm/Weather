// Short-horizon outlook: compare the current condition against the next 3h
// of hourly data and return one plain sentence describing the shift. Returns
// null when things are stable.

const ORDER = ["clear", "clouds", "fog", "rain", "snow", "storm"];
const idx = (c) => ORDER.indexOf(c);

export function shortOutlook(w) {
  const hours = (w?.hourly || []).slice(0, 4);
  if (hours.length < 3) return null;
  const nowCond = w.condition;
  const nowTemp = w.temp;
  const h3 = hours[2] ?? hours[hours.length - 1];
  const cond3 = h3?.condition;
  const temp3 = h3?.temp;

  // Precip transitions dominate.
  const nowWet = isWet(nowCond);
  const nextWet = hours.some((h) => isWet(h.condition));
  const lastWet = isWet(cond3);
  if (nowWet && !lastWet) return "Clearing within 3h";
  if (!nowWet && nextWet) {
    const firstWetIdx = hours.findIndex((h) => isWet(h.condition));
    return `${capLabel(hours[firstWetIdx].condition)} starting in ${firstWetIdx + 1}h`;
  }
  // Thickening or clearing clouds.
  const nI = idx(nowCond), fI = idx(cond3);
  if (nI >= 0 && fI >= 0 && fI > nI) return "Clouds thickening next few hours";
  if (nI > 0 && fI === 0) return "Clearing to sunshine ahead";
  // Temperature shift.
  if (nowTemp != null && temp3 != null) {
    const d = temp3 - nowTemp;
    if (d >= 4)  return "Noticeably warmer within 3h";
    if (d <= -4) return "Cooler within 3h";
  }
  return null;
}

function isWet(c) {
  return c === "rain" || c === "snow" || c === "storm";
}
function capLabel(c) {
  if (c === "rain") return "Rain";
  if (c === "snow") return "Snow";
  if (c === "storm") return "Thunder";
  return "Showers";
}
