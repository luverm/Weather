// Live-updates the browser tab so an open Aether tab is instantly identifiable
// among many:
//   - title:   "24° · Reykjavík — Aether"
//   - favicon: an SVG glyph reflecting the current condition + day/night.
//
// Called from applyScene whenever the weather sample changes.

const DEFAULT_TITLE = "Aether — Interactive Weather";
const DEFAULT_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='18' fill='%23fff1c9'/%3E%3C/svg%3E";

let lastSignature = "";
let iconLink = null;

function findIcon() {
  if (iconLink && iconLink.isConnected) return iconLink;
  iconLink = document.querySelector('link[rel="icon"]');
  if (!iconLink) {
    iconLink = document.createElement("link");
    iconLink.rel = "icon";
    document.head.appendChild(iconLink);
  }
  return iconLink;
}

export function updateTabDecoration({ temp, condition, isDay, unit = "C", placeName } = {}) {
  const t = temp;
  const converted = unit === "F" && t != null ? t * 9 / 5 + 32 : t;
  const tempStr = converted == null ? "—" : `${Math.round(converted)}°`;
  const title = placeName
    ? `${tempStr} · ${placeName} — Aether`
    : DEFAULT_TITLE;

  // Guard against needless writes so devtools console isn't flooded.
  const sig = `${tempStr}|${placeName || ""}|${condition || ""}|${isDay ? 1 : 0}|${unit}`;
  if (sig === lastSignature) return;
  lastSignature = sig;

  document.title = title;

  const icon = findIcon();
  icon.type = "image/svg+xml";
  icon.href = buildFaviconDataUri(condition, !!isDay, tempStr);
}

export function resetTabDecoration() {
  lastSignature = "";
  document.title = DEFAULT_TITLE;
  const icon = findIcon();
  icon.type = "image/svg+xml";
  icon.href = DEFAULT_ICON;
}

// ---- SVG glyph library ----
// A tiny 64x64 favicon: circular colored background (day/night) + a condition
// glyph in the foreground. Kept as inline SVG so it can encode to a data URI.

function buildFaviconDataUri(condition, isDay, tempStr) {
  const bg = isDay
    ? { top: "#4aa4ff", bot: "#89c6ff" }
    : { top: "#0e1735", bot: "#1a2650" };
  const glyph = glyphFor(condition, isDay);
  // Small tint stripe at the bottom carrying the current temperature reading.
  const label = tempStr && tempStr !== "—" ? tempStr : "";
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="${bg.top}"/>
      <stop offset="1" stop-color="${bg.bot}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="64" height="64" rx="14" fill="url(#g)"/>
  ${glyph}
  ${label ? `<text x="32" y="60" text-anchor="middle" font-family="system-ui,Arial,sans-serif" font-size="13" font-weight="700" fill="#fff" opacity="0.92">${label}</text>` : ""}
</svg>`.replace(/\s+/g, " ").trim();
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function glyphFor(condition, isDay) {
  switch (condition) {
    case "clear":
      return isDay ? SUN_GLYPH : MOON_GLYPH;
    case "clouds":
      return isDay ? SUN_CLOUD_GLYPH : MOON_CLOUD_GLYPH;
    case "rain":
      return RAIN_GLYPH;
    case "snow":
      return SNOW_GLYPH;
    case "storm":
      return STORM_GLYPH;
    case "fog":
      return FOG_GLYPH;
    default:
      return isDay ? SUN_GLYPH : MOON_GLYPH;
  }
}

const SUN_GLYPH = `
  <g transform="translate(32 26)">
    <circle r="10" fill="#ffe08a"/>
    <g stroke="#ffe08a" stroke-width="2.5" stroke-linecap="round">
      <line x1="0" y1="-16" x2="0" y2="-19"/>
      <line x1="0" y1="16" x2="0" y2="19"/>
      <line x1="-16" y1="0" x2="-19" y2="0"/>
      <line x1="16" y1="0" x2="19" y2="0"/>
      <line x1="-11" y1="-11" x2="-13" y2="-13"/>
      <line x1="11" y1="11" x2="13" y2="13"/>
      <line x1="-11" y1="11" x2="-13" y2="13"/>
      <line x1="11" y1="-11" x2="13" y2="-13"/>
    </g>
  </g>`;

const MOON_GLYPH = `
  <path d="M40 12 A18 18 0 1 0 52 34 A14 14 0 0 1 40 12 Z" fill="#f0e6cb"/>
  <circle cx="46" cy="16" r="1.2" fill="#ffffff" opacity="0.9"/>
  <circle cx="54" cy="22" r="0.9" fill="#ffffff" opacity="0.8"/>`;

const SUN_CLOUD_GLYPH = `
  <g transform="translate(20 18)">
    <circle r="7" fill="#ffe08a"/>
  </g>
  <path d="M18 34 a8 8 0 0 1 10 -7 a10 10 0 0 1 18 4 a6 6 0 0 1 -1 12 H20 a6 6 0 0 1 -2 -9 Z"
        fill="#ffffff" opacity="0.95"/>`;

const MOON_CLOUD_GLYPH = `
  <path d="M42 12 A14 14 0 1 0 50 28 A11 11 0 0 1 42 12 Z" fill="#f0e6cb"/>
  <path d="M14 40 a8 8 0 0 1 12 -6 a10 10 0 0 1 18 4 a6 6 0 0 1 -1 12 H16 a6 6 0 0 1 -2 -10 Z"
        fill="#ffffff" opacity="0.95"/>`;

const RAIN_GLYPH = `
  <path d="M14 30 a8 8 0 0 1 12 -6 a10 10 0 0 1 18 4 a6 6 0 0 1 -1 12 H16 a6 6 0 0 1 -2 -10 Z"
        fill="#ffffff" opacity="0.95"/>
  <g stroke="#7cc0ff" stroke-width="2.4" stroke-linecap="round">
    <line x1="22" y1="46" x2="20" y2="52"/>
    <line x1="32" y1="46" x2="30" y2="52"/>
    <line x1="42" y1="46" x2="40" y2="52"/>
  </g>`;

const SNOW_GLYPH = `
  <path d="M14 30 a8 8 0 0 1 12 -6 a10 10 0 0 1 18 4 a6 6 0 0 1 -1 12 H16 a6 6 0 0 1 -2 -10 Z"
        fill="#ffffff" opacity="0.95"/>
  <g fill="#dff1ff" font-family="system-ui,Arial" font-size="10" font-weight="700">
    <text x="22" y="52">*</text>
    <text x="32" y="52">*</text>
    <text x="42" y="52">*</text>
  </g>`;

const STORM_GLYPH = `
  <path d="M14 30 a8 8 0 0 1 12 -6 a10 10 0 0 1 18 4 a6 6 0 0 1 -1 12 H16 a6 6 0 0 1 -2 -10 Z"
        fill="#8894b0" opacity="0.95"/>
  <path d="M30 40 L26 50 H32 L28 60 L38 46 H32 L36 40 Z" fill="#ffe066"/>`;

const FOG_GLYPH = `
  <g stroke="#e6ecf5" stroke-width="3.6" stroke-linecap="round">
    <line x1="12" y1="26" x2="52" y2="26"/>
    <line x1="16" y1="36" x2="48" y2="36"/>
    <line x1="10" y1="46" x2="54" y2="46"/>
  </g>`;
