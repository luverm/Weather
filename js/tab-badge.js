// Live browser-tab badge: dynamic SVG favicon that shows the current condition
// plus a small temperature chip, and a matching document title. Users can then
// see the weather at a glance from a stack of open tabs.
//
// The favicon is regenerated on every weather change and swapped in via a
// fresh <link rel="icon"> element (Safari and Firefox both skip repaint if
// only the `href` attribute changes).

const CONDITION_COLORS = {
  clear:  { bg: "#0b1020", fg: "#ffd86a", accent: "#ffb14a" },
  clouds: { bg: "#1a2340", fg: "#d4e0f5", accent: "#a4b6d8" },
  rain:   { bg: "#0f1e2c", fg: "#7fc3ff", accent: "#4a90d9" },
  snow:   { bg: "#182a3a", fg: "#e8f2ff", accent: "#c9dcef" },
  storm:  { bg: "#231835", fg: "#c8a3ff", accent: "#8a6bd8" },
  fog:    { bg: "#1e2530", fg: "#b8bfc9", accent: "#8a94a3" },
};

function iconPath(condition) {
  // Simple, chunky glyphs that read well at 16×16.
  switch (condition) {
    case "clear":
      return {
        // Big central sun
        shapes: `<circle cx="32" cy="32" r="14" fill="${'currentColor'}"/>` +
                `<g stroke="currentColor" stroke-width="4" stroke-linecap="round">` +
                `<line x1="32" y1="6" x2="32" y2="14"/>` +
                `<line x1="32" y1="50" x2="32" y2="58"/>` +
                `<line x1="6"  y1="32" x2="14" y2="32"/>` +
                `<line x1="50" y1="32" x2="58" y2="32"/>` +
                `<line x1="13" y1="13" x2="19" y2="19"/>` +
                `<line x1="45" y1="45" x2="51" y2="51"/>` +
                `<line x1="13" y1="51" x2="19" y2="45"/>` +
                `<line x1="45" y1="19" x2="51" y2="13"/>` +
                `</g>`,
      };
    case "clouds":
      return {
        shapes: `<path d="M18 40a10 10 0 010-20 12 12 0 0122-4 10 10 0 016 24H18z" fill="currentColor"/>`,
      };
    case "rain":
      return {
        shapes: `<path d="M18 34a10 10 0 010-20 12 12 0 0122-4 10 10 0 016 24H18z" fill="currentColor"/>` +
                `<g stroke="currentColor" stroke-width="4" stroke-linecap="round">` +
                `<line x1="20" y1="42" x2="16" y2="54"/>` +
                `<line x1="32" y1="42" x2="28" y2="54"/>` +
                `<line x1="44" y1="42" x2="40" y2="54"/>` +
                `</g>`,
      };
    case "snow":
      return {
        shapes: `<path d="M18 34a10 10 0 010-20 12 12 0 0122-4 10 10 0 016 24H18z" fill="currentColor"/>` +
                `<g fill="currentColor">` +
                `<circle cx="20" cy="48" r="3"/>` +
                `<circle cx="32" cy="52" r="3"/>` +
                `<circle cx="44" cy="48" r="3"/>` +
                `</g>`,
      };
    case "storm":
      return {
        shapes: `<path d="M18 32a10 10 0 010-20 12 12 0 0122-4 10 10 0 016 24H18z" fill="currentColor"/>` +
                `<path d="M30 34l-6 12h6l-4 12 12-16h-7l4-8z" fill="#ffd86a" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`,
      };
    case "fog":
      return {
        shapes: `<g stroke="currentColor" stroke-width="6" stroke-linecap="round">` +
                `<line x1="8"  y1="22" x2="56" y2="22"/>` +
                `<line x1="14" y1="34" x2="50" y2="34"/>` +
                `<line x1="8"  y1="46" x2="56" y2="46"/>` +
                `</g>`,
      };
    default:
      return { shapes: `<circle cx="32" cy="32" r="16" fill="currentColor"/>` };
  }
}

function svgFor(condition, tempLabel, isDay = true) {
  const c = CONDITION_COLORS[condition] || CONDITION_COLORS.clouds;
  const { shapes } = iconPath(condition);
  const tempText = tempLabel != null ? String(tempLabel) : "";
  // Night flip: darker bg for the night variant of clear so the crescent reads.
  const bg = condition === "clear" && !isDay ? "#0b1020" : c.bg;
  const fg = condition === "clear" && !isDay ? "#dbe6ff" : c.fg;
  const glyph = condition === "clear" && !isDay ? crescentGlyph() : shapes;

  // Temperature badge is a rounded pill in the bottom-right so it stays
  // legible even at 16×16 (the badge is the same tone as the accent).
  const len = tempText.length;
  const badgeWidth = len >= 4 ? 40 : len >= 3 ? 32 : 24;
  const badgeX = 64 - badgeWidth - 2;
  const badgeY = 64 - 20 - 2;
  const fontSize = len >= 4 ? 12 : len >= 3 ? 14 : 15;

  const badge = tempText
    ? `<g>
         <rect x="${badgeX}" y="${badgeY}" rx="8" ry="8" width="${badgeWidth}" height="20" fill="${c.accent}" stroke="${bg}" stroke-width="2"/>
         <text x="${badgeX + badgeWidth / 2}" y="${badgeY + 15}" text-anchor="middle" font-family="-apple-system, Segoe UI, Roboto, sans-serif" font-weight="700" font-size="${fontSize}" fill="${bg}">${escapeXml(tempText)}</text>
       </g>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="12" ry="12" fill="${bg}"/>
    <g color="${fg}">${glyph}</g>
    ${badge}
  </svg>`;
}

function crescentGlyph() {
  return `<circle cx="32" cy="32" r="18" fill="currentColor"/>` +
         `<circle cx="40" cy="26" r="16" fill="#0b1020"/>`;
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => (
    { "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]
  ));
}

let currentHref = null;
function setFavicon(svg) {
  const href = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  if (href === currentHref) return;
  currentHref = href;
  document.querySelectorAll('link[rel~="icon"]').forEach((n) => n.remove());
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = href;
  document.head.appendChild(link);
}

const BASE_TITLE = "Aether — Interactive Weather";
function setTitle({ temp, placeName }) {
  if (temp == null) { document.title = BASE_TITLE; return; }
  const tempStr = `${Math.round(temp)}°`;
  const parts = [tempStr];
  if (placeName) parts.push(placeName);
  document.title = `${parts.join(" · ")} — Aether`;
}

export function updateTabBadge({ condition, temp, isDay, placeName, label, unit }) {
  const displayTemp = temp == null ? null : (unit === "F" ? temp * 9 / 5 + 32 : temp);
  const tempLabel = displayTemp == null ? null : `${Math.round(displayTemp)}°`;
  const svg = svgFor(condition || "clouds", tempLabel, isDay !== false);
  setFavicon(svg);
  setTitle({ temp: displayTemp, placeName });
}

export function resetTabBadge() {
  document.title = BASE_TITLE;
}
