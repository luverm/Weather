// Outfit suggestion: pick a compact "what to wear" chip from the current
// feels-like temperature, with modifier icons layered on for rain, strong
// wind, and intense UV. All thresholds are in metric units (°C, km/h).

const BASES = [
  { max: -10, icon: "🧥❄️", label: "Bundle up",      detail: "Heavy coat, hat, gloves" },
  { max:  -1, icon: "🧥",   label: "Winter coat",    detail: "Insulated layers" },
  { max:   7, icon: "🧣",   label: "Warm jacket",    detail: "Scarf helps" },
  { max:  13, icon: "🧥",   label: "Light jacket",   detail: "Layer underneath" },
  { max:  18, icon: "👕",   label: "Long sleeves",   detail: "Light knit works" },
  { max:  24, icon: "👕",   label: "T-shirt",        detail: "Breezy clothes" },
  { max:  29, icon: "🩳",   label: "Shorts & tee",   detail: "Hydrate often" },
  { max: 999, icon: "🥵",   label: "Beat the heat",  detail: "Light, loose, shaded" },
];

export function suggestOutfit(w) {
  if (!w || w.feelsLike == null) return null;
  const feels = w.feelsLike;
  const base = BASES.find((b) => feels < b.max) || BASES[BASES.length - 1];

  const mods = [];
  const nextHours = (w.hourly || []).slice(0, 6);
  const nextPop = nextHours.length
    ? Math.max(...nextHours.map((h) => h.pop ?? 0))
    : 0;
  const nextPrecip = nextHours.length
    ? Math.max(...nextHours.map((h) => h.precip ?? 0))
    : (w.precip ?? 0);

  if (nextPop >= 60 || nextPrecip >= 1) mods.push({ icon: "☂️", why: "rain likely" });
  if ((w.windSpeed ?? 0) >= 30 || (w.windGusts ?? 0) >= 45) mods.push({ icon: "💨", why: "gusty wind" });
  if ((w.uv ?? 0) >= 7) mods.push({ icon: "🕶️", why: "high UV" });
  if (feels <= 2 && (w.windSpeed ?? 0) >= 20) mods.push({ icon: "🧤", why: "wind chill bites" });

  const icon = base.icon + mods.map((m) => m.icon).join("");
  const detail = mods.length
    ? `${base.detail} · ${mods.map((m) => m.why).join(" · ")}`
    : base.detail;

  return { icon, label: base.label, detail };
}
