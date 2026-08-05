// Tonight's stargazing quality — a 0–5 star rating derived from
// moon illumination and forecast cloud cover during dark hours.
// Not a full astro model; a "should I bother going out tonight" hint.

// Pick the next stretch of night hours based on today's sunset and
// tomorrow's sunrise. Falls back to hours where isDay=false if the
// daily bounds are missing.
function nightHours(weather) {
  const hours = weather?.hourly || [];
  if (!hours.length) return [];
  const days = weather?.daily || [];
  const now = Date.now();
  // "Tonight" = the night starting at day[i]'s sunset, ending at day[i+1]'s
  // sunrise. Pick the day whose following-morning sunrise is still ahead of
  // "now" — that keeps us on today throughout the whole current night
  // (previous logic switched to tomorrow shortly after sunset, evaluating the
  // wrong night).
  const today = days.find((d, i) => {
    const next = days[i + 1];
    return d?.sunset && next?.sunrise && now < next.sunrise;
  }) || days.find((d) => d?.sunset && d?.sunrise) || null;
  const idx = today ? days.indexOf(today) : -1;
  const tomorrow = idx >= 0 ? days[idx + 1] : null;
  const nightStart = today?.sunset ?? null;
  const nightEnd = tomorrow?.sunrise ?? (today?.sunset ? today.sunset + 10 * 3600_000 : null);
  if (nightStart && nightEnd) {
    return hours.filter((h) => h.time >= nightStart && h.time <= nightEnd);
  }
  return hours.filter((h) => h.isDay === false);
}

export function stargazeScore(weather) {
  const nights = nightHours(weather);
  const cloudSamples = nights
    .map((h) => h.cloudCover)
    .filter((v) => Number.isFinite(v));
  const cloudAvg = cloudSamples.length
    ? cloudSamples.reduce((a, b) => a + b, 0) / cloudSamples.length
    : null;
  const moonIllum = clamp01(weather?.moon?.illum ?? 0);

  // Rate each factor 0..1, "1 = best for stars".
  // Clouds: 0% → 1.0, 90%+ → 0.
  const cloudRating = cloudAvg == null ? 0.5 : clamp01(1 - cloudAvg / 90);
  // Moon: 0% illum → 1.0, 100% (full) → 0.15 (never zero — you can still see bright stars).
  const moonRating = 1 - moonIllum * 0.85;
  // Overall = weighted (clouds dominate; a full moon under clear skies still
  // gives ~2 stars — enough to grab the tripod).
  const raw = cloudRating * 0.65 + moonRating * 0.35;
  const stars = Math.max(0, Math.min(5, Math.round(raw * 5 * 2) / 2));

  const reason = describe(cloudAvg, moonIllum, cloudSamples.length);
  const label = starLabel(stars);
  return {
    stars,        // 0..5 in 0.5 steps
    rating: raw,  // 0..1
    cloudAvg,     // % or null
    moonIllum,    // 0..1
    reason,
    label,
    haveData: cloudSamples.length > 0,
  };
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

function describe(cloudAvg, moonIllum, samples) {
  if (!samples) return "Not enough data yet.";
  const cloudPart =
    cloudAvg == null      ? "unknown clouds"
    : cloudAvg < 15       ? "clear sky"
    : cloudAvg < 40       ? "mostly clear"
    : cloudAvg < 65       ? "partly cloudy"
    : cloudAvg < 85       ? "cloudy"
    :                       "overcast";
  const moonPart =
    moonIllum < 0.15      ? "new moon"
    : moonIllum < 0.4     ? "thin moon"
    : moonIllum < 0.6     ? "half moon"
    : moonIllum < 0.85    ? "bright moon"
    :                       "full moon";
  return `${cloudPart}, ${moonPart}`;
}

function starLabel(stars) {
  if (stars >= 4.5) return "Excellent";
  if (stars >= 3.5) return "Great";
  if (stars >= 2.5) return "Fair";
  if (stars >= 1.5) return "Poor";
  return "Skip tonight";
}
