// Explain why the "feels like" temperature diverges from the actual air
// temperature. Returns { total, parts, note } where parts is a list of
// { key, label, delta, hint } contributions in °C.
//
// The values are approximations for a user-facing breakdown, not a
// replacement for the API's apparent_temperature — they only need to be
// directionally right and add up to roughly the observed delta.
//
// Formulas:
// - Wind chill (Environment Canada): valid T ≤ 10 °C, V ≥ 5 km/h.
//   T_wc = 13.12 + 0.6215·T − 11.37·V^0.16 + 0.3965·T·V^0.16
// - Humidex (Canadian): valid T ≥ 20 °C, dew point known.
//   H = T + 0.5555 · (e − 10)
//   e = 6.11 · exp( 5417.7530 · (1/273.16 − 1/(273.16 + Td)) )
// - Solar boost: rough estimate — sunny + high UV in daytime adds
//   perceived warmth; capped at +2 °C.

export function breakdownFeelsLike(w) {
  if (!w || w.temp == null) return null;
  const T = w.temp;
  const V = w.windSpeed ?? 0;
  const Td = w.dewPoint;
  const uv = w.uv;
  const cloud = w.cloudCover;
  const isDay = !!w.isDay;
  const parts = [];

  // Wind chill.
  if (T <= 10 && V >= 5) {
    const V16 = Math.pow(V, 0.16);
    const Twc = 13.12 + 0.6215 * T - 11.37 * V16 + 0.3965 * T * V16;
    const delta = Twc - T;
    if (delta <= -0.5) {
      parts.push({
        key: "wind",
        label: "Wind chill",
        delta,
        hint: `${Math.round(V)} km/h wind at ${Math.round(T)}°`,
      });
    }
  }

  // Humidex — feels warmer when humid.
  if (T >= 20 && Td != null) {
    const e = 6.11 * Math.exp(5417.753 * (1 / 273.16 - 1 / (273.16 + Td)));
    const H = T + 0.5555 * (e - 10);
    const delta = H - T;
    if (delta >= 0.5) {
      parts.push({
        key: "humidity",
        label: "Humidity",
        delta,
        hint: `dew point ${Math.round(Td)}°`,
      });
    }
  }

  // Solar radiation — small boost on sunny days.
  if (isDay && uv != null && uv >= 4 && (cloud == null || cloud < 40)) {
    const delta = Math.min(2, 0.4 * (uv - 3));
    if (delta >= 0.4) {
      parts.push({
        key: "sun",
        label: "Sun",
        delta,
        hint: `UV ${Math.round(uv)}${cloud != null ? `, ${Math.round(cloud)}% cloud` : ""}`,
      });
    }
  }

  // Evaporative cooling — when it's warm-ish and very dry, sweat evaporates
  // easily and takes edge off. Not a formal index, just a hint.
  if (T >= 22 && w.humidity != null && w.humidity < 30) {
    parts.push({
      key: "dry",
      label: "Dry air",
      delta: -1,
      hint: `${Math.round(w.humidity)}% humidity`,
    });
  }

  const total = parts.reduce((s, p) => s + p.delta, 0);
  const observed = (w.feelsLike ?? T) - T;

  let note;
  if (!parts.length) {
    note = Math.abs(observed) < 1
      ? "Nothing skewing it — feels much like the reading."
      : "Feels close to the air temperature.";
  } else if (Math.abs(observed) >= 5) {
    note = "Big gap between the reading and how it feels — dress for the felt side.";
  } else {
    note = null;
  }

  return { total, observed, parts, note };
}
