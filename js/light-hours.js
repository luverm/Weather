// Computes the four "magic light" windows around a day's sunrise/sunset:
// blue hour (dawn), golden hour (dawn), golden hour (dusk), blue hour (dusk).
//
// The exact durations depend on solar altitude at a given latitude, but the
// classic photographer's rule of thumb — golden ≈ 40 min, blue ≈ 25 min at
// mid-latitudes — is close enough for a UI hint. We scale by |cos(lat)| so
// higher-latitude days (shallower sun angle) stretch the windows longer.

function scaledDurations(lat) {
  const cos = Math.max(0.28, Math.cos(Math.abs((lat ?? 0) * Math.PI / 180)));
  const goldenMin = Math.min(90, 40 / cos);
  const blueMin = Math.min(55, 25 / cos);
  return { golden: goldenMin * 60_000, blue: blueMin * 60_000 };
}

export function computeLightHours(sunrise, sunset, lat) {
  if (!sunrise || !sunset || sunset <= sunrise) return null;
  const { golden, blue } = scaledDurations(lat);
  // Cap window edges so short-day (or polar) situations don't overlap wildly.
  const dayLen = sunset - sunrise;
  const g = Math.min(golden, dayLen * 0.35);
  const b = Math.min(blue, dayLen * 0.2);
  return {
    windows: [
      { key: "blueAm",   label: "Blue hour",   phase: "dawn", tone: "blue",   start: sunrise - b, end: sunrise },
      { key: "goldenAm", label: "Golden hour", phase: "dawn", tone: "golden", start: sunrise,     end: sunrise + g },
      { key: "goldenPm", label: "Golden hour", phase: "dusk", tone: "golden", start: sunset - g,  end: sunset },
      { key: "bluePm",   label: "Blue hour",   phase: "dusk", tone: "blue",   start: sunset,      end: sunset + b },
    ],
  };
}

export function nextLightWindow(light, now = Date.now()) {
  if (!light?.windows) return null;
  const active = light.windows.find((w) => now >= w.start && now <= w.end);
  if (active) return { ...active, active: true, msUntil: 0, msRemaining: active.end - now };
  const next = light.windows.filter((w) => w.start > now).sort((a, b) => a.start - b.start)[0];
  if (!next) return null;
  return { ...next, active: false, msUntil: next.start - now, msRemaining: 0 };
}
