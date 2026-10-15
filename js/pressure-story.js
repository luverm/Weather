// Translate pressure, trend, and current condition into a one-line
// forecaster-style narrative. Returns null if there's nothing useful to say.

export function pressureStory(w) {
  if (!w?.pressure || !w?.pressureTrend) return null;
  const p = w.pressure;
  const { direction, delta } = w.pressureTrend;
  const isWet = w.condition === "rain" || w.condition === "storm" || w.condition === "snow";

  // Classify absolute pressure.
  const low = p < 1005;
  const high = p > 1020;
  const rate = Math.abs(delta);
  const fast = rate >= 2.5;
  const steady = rate < 0.8;

  // Falling pressure cues worsening weather.
  if (direction === "falling") {
    if (low && fast) return "Pressure dropping fast — storms likely";
    if (low)          return "Low & falling — unsettled turn";
    if (fast)         return "Falling fast — weather turning";
    if (steady)       return "Easing lower — more cloud ahead";
    return "Falling — showers possible later";
  }
  // Rising pressure signals clearing / stable weather.
  if (direction === "rising") {
    if (high && fast) return "Climbing fast — clearing & cooler";
    if (fast)         return "Rising sharply — skies clearing";
    if (isWet)        return "Rising — rain tapering off";
    if (high)         return "High & rising — settled stretch";
    return "Rising — turning fairer";
  }
  // Steady.
  if (low)  return "Steady but low — unsettled stays";
  if (high) return "High & steady — fair weather holds";
  return "Steady — current conditions hold";
}
