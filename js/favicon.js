// Dynamic favicon that renders the current temperature. The browser caches
// aggressively, so we always set a fresh href that encodes the temperature
// value — swapping it to the same href would otherwise be a no-op.
//
// Three colour buckets echo the hero's warm/cool palette:
//   cold  (<= 5°C): blue
//   mild  (6..20°):  warm cream (matches the brand mark)
//   hot   (>= 21°):  orange
//
// Unit preference lives in localStorage like the rest of the app — we read
// it directly so this module stays zero-coupling to ui.js.

const ID = "favicon-dyn";

function paletteFor(celsius) {
  if (celsius == null || isNaN(celsius)) return { bg: "#0b1020", fg: "#fff1c9" };
  if (celsius <= 5) return { bg: "#132038", fg: "#9ad1ff" };
  if (celsius >= 21) return { bg: "#2a1618", fg: "#ffb196" };
  return { bg: "#1a1324", fg: "#fff1c9" };
}

function fmtDisplay(celsius, unit) {
  if (celsius == null || isNaN(celsius)) return "—";
  const display = unit === "F" ? celsius * 9 / 5 + 32 : celsius;
  return `${Math.round(display)}°`;
}

/**
 * Replace the current favicon with an SVG rendering of the given °C temp.
 * No-ops if the value hasn't changed since the last call.
 */
export function updateFavicon(celsius, unit = "C") {
  if (typeof document === "undefined") return;
  const text = fmtDisplay(celsius, unit);
  const key = `${text}|${unit}`;
  if (updateFavicon._last === key) return;
  updateFavicon._last = key;

  const { bg, fg } = paletteFor(celsius);
  // 64x64 SVG so retina browsers get sharp text; the text is sized to fill
  // the square with a 4px padding on each side.
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${bg}"/>
  <text x="32" y="42" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
        font-size="34" font-weight="600" text-anchor="middle"
        fill="${fg}" letter-spacing="-1">${escapeXml(text)}</text>
</svg>`;
  const href = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  let link = document.getElementById(ID);
  if (!link) {
    link = document.createElement("link");
    link.id = ID;
    link.rel = "icon";
    link.type = "image/svg+xml";
    document.head.appendChild(link);
    // Remove the stock static icon the HTML head already declared so the
    // browser doesn't flicker between the two.
    document.querySelectorAll("link[rel='icon']").forEach((other) => {
      if (other !== link) other.remove();
    });
  }
  link.href = href;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
