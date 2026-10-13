// Keeps document.title and the browser-tab favicon in sync with the live
// weather. No network, no persistent state — purely cosmetic.

import { CONDITIONS } from "./weather-service.js";

const CONDITION_LABEL = {
  [CONDITIONS.CLEAR]: "Clear",
  [CONDITIONS.CLOUDS]: "Cloudy",
  [CONDITIONS.RAIN]: "Rain",
  [CONDITIONS.SNOW]: "Snow",
  [CONDITIONS.STORM]: "Storm",
  [CONDITIONS.FOG]: "Fog",
};

const BG = {
  clear_day: "#1b60c7",
  clear_night: "#0b1020",
  clouds: "#4b5c74",
  rain: "#28496b",
  snow: "#89a3c2",
  storm: "#2a1c3a",
  fog: "#6a7a90",
};
const FG = "#fff3d1";
const FG_DARK = "#1c2232";

function pickBg(condition, isDay) {
  if (condition === CONDITIONS.CLEAR) return isDay ? BG.clear_day : BG.clear_night;
  return BG[condition] || BG.clouds;
}

function pickFg(condition, isDay) {
  if (condition === CONDITIONS.SNOW) return FG_DARK;
  if (condition === CONDITIONS.FOG) return FG_DARK;
  return FG;
}

function iconMark(condition, isDay) {
  switch (condition) {
    case CONDITIONS.CLEAR:
      return isDay
        ? `<circle cx="46" cy="18" r="8" fill="#ffe6a2"/>`
        : `<path d="M46 10a9 9 0 11-9 9 7 7 0 009-9z" fill="#f5efd4"/>`;
    case CONDITIONS.CLOUDS:
      return `<path d="M18 26 Q22 16 32 18 Q38 10 46 16 Q54 16 52 26 Z" fill="rgba(255,255,255,0.78)"/>`;
    case CONDITIONS.RAIN:
      return `<path d="M18 22 Q24 12 34 14 Q44 12 46 24 Z" fill="rgba(255,255,255,0.72)"/>
              <path d="M24 28l-2 5M34 28l-2 5M42 28l-2 5" stroke="#9adfff" stroke-width="2" stroke-linecap="round"/>`;
    case CONDITIONS.SNOW:
      return `<path d="M18 22 Q24 12 34 14 Q44 12 46 24 Z" fill="rgba(255,255,255,0.92)"/>
              <circle cx="24" cy="32" r="1.8" fill="#fff"/><circle cx="34" cy="32" r="1.8" fill="#fff"/><circle cx="44" cy="32" r="1.8" fill="#fff"/>`;
    case CONDITIONS.STORM:
      return `<path d="M18 22 Q24 12 34 14 Q44 12 46 24 Z" fill="rgba(255,255,255,0.72)"/>
              <path d="M32 24l-5 9h6l-4 10 12-14h-6l4-5z" fill="#ffe066"/>`;
    case CONDITIONS.FOG:
      return `<path d="M12 20h40M14 28h36M18 36h32" stroke="rgba(255,255,255,0.85)" stroke-width="3" stroke-linecap="round"/>`;
    default:
      return "";
  }
}

function convertTemp(c, unit) {
  if (c == null || !Number.isFinite(c)) return null;
  return unit === "F" ? c * 9 / 5 + 32 : c;
}

function tempFontSize(sign) {
  if (sign.length >= 5) return 20;   // e.g., "-10°F"
  if (sign.length >= 4) return 24;
  return 28;
}

export function updateLiveTab(weather, place, unit = "C") {
  if (!weather || weather.temp == null) return;
  const tC = weather.temp;
  const t = Math.round(convertTemp(tC, unit));
  const name = place?.name || "Weather";
  const label = CONDITION_LABEL[weather.condition] || "";
  const parts = [`${t}°${unit}`];
  if (label) parts.push(label);
  parts.push(name);
  document.title = `${parts.join(" · ")} — Aether`;
  paintFavicon(weather, t, unit);
}

function paintFavicon(weather, t, unit) {
  const bg = pickBg(weather.condition, weather.isDay);
  const fg = pickFg(weather.condition, weather.isDay);
  const icon = iconMark(weather.condition, weather.isDay);
  const sign = Number.isFinite(t) ? `${t}°` : "—";
  const fontSize = tempFontSize(sign + unit);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
      <defs>
        <linearGradient id='bg' x1='0' x2='0' y1='0' y2='1'>
          <stop offset='0%' stop-color='${lighten(bg, 0.18)}'/>
          <stop offset='100%' stop-color='${bg}'/>
        </linearGradient>
      </defs>
      <rect width='64' height='64' rx='14' fill='url(#bg)'/>
      ${icon}
      <text x='32' y='56' text-anchor='middle' font-family='system-ui,-apple-system,Segoe UI,sans-serif' font-size='${fontSize}' font-weight='800' fill='${fg}' letter-spacing='-1'>${sign}</text>
    </svg>`;
  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

// Lighten a hex colour by `amt` (0..1) toward white — used for the vertical
// background gradient on the favicon.
function lighten(hex, amt) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const mix = (v) => {
    const n = parseInt(v, 16);
    return Math.round(n + (255 - n) * amt).toString(16).padStart(2, "0");
  };
  return `#${mix(m[1])}${mix(m[2])}${mix(m[3])}`;
}
