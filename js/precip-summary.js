// Build a short summary of expected precipitation across the hourly forecast.
// The UI uses this to render a chip under the chart header: "4.2 mm · wettest 3-5pm".

export function precipSummary(weather) {
  const hours = (weather?.hourly || []).slice(0, 24);
  if (hours.length < 2) return null;

  let total = 0;
  let rainyHours = 0;
  let wettest = { v: 0, i: -1 };
  for (let i = 0; i < hours.length; i++) {
    const p = Math.max(0, hours[i].precip || 0);
    total += p;
    if (p >= 0.1) rainyHours++;
    if (p > wettest.v) wettest = { v: p, i };
  }
  if (total < 0.2 && rainyHours === 0) return null;

  // Find a contiguous "wettest window" of 2–4 hours around the peak.
  let wStart = wettest.i, wEnd = wettest.i;
  const peakVal = wettest.v;
  const threshold = Math.max(0.1, peakVal * 0.4);
  while (wStart > 0 && (hours[wStart - 1].precip || 0) >= threshold) wStart--;
  while (wEnd < hours.length - 1 && (hours[wEnd + 1].precip || 0) >= threshold) wEnd++;
  // Cap at 4 hours wide centred on peak.
  if (wEnd - wStart > 4) {
    wStart = Math.max(0, wettest.i - 2);
    wEnd = Math.min(hours.length - 1, wettest.i + 2);
  }

  // Classify precipitation type by looking at any snow conditions in the window.
  const windowSlice = hours.slice(wStart, wEnd + 1);
  const isSnow = windowSlice.some((h) => h.condition === "snow");

  return {
    totalMm: total,
    rainyHours,
    peakMm: peakVal,
    peakTime: hours[wettest.i].time,
    windowStart: hours[wStart].time,
    windowEnd: hours[wEnd].time,
    kind: isSnow ? "snow" : "rain",
  };
}
