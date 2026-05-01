// Generate a tiny SVG favicon that reflects the current condition + day/night.
// Updates `<link rel="icon">` and the apple-touch-icon link in place.

const COLORS = {
  bg: "#0b1020",
  sun: "#fff1c9",
  moon: "#e0e6f5",
  cloud: "#cfd8e6",
  cloudDim: "#7a85a3",
  rain: "#9ad1ff",
  snow: "#ffffff",
  bolt: "#fff0b0",
};

function buildSvg(condition, isDay) {
  const sky = isDay ? "#1a3554" : "#080d1c";
  const orb = isDay
    ? `<circle cx="22" cy="22" r="9" fill="${COLORS.sun}"/>`
    : `<g><circle cx="22" cy="22" r="9" fill="${COLORS.moon}"/><circle cx="26" cy="20" r="7" fill="${sky}"/></g>`;
  let layers = "";
  switch (condition) {
    case "clear":
      layers = orb;
      break;
    case "clouds":
      layers = `${orb}<path d="M14 38a6 6 0 010-12 8 8 0 0115-2 6 6 0 0116 14H14z" fill="${COLORS.cloud}" opacity="0.92"/>`;
      break;
    case "rain":
      layers = `<path d="M14 32a6 6 0 010-12 8 8 0 0115-2 6 6 0 0116 14H14z" fill="${COLORS.cloudDim}"/>`
            + `<path d="M18 40l-2 6M28 40l-2 6M38 40l-2 6" stroke="${COLORS.rain}" stroke-width="3" stroke-linecap="round"/>`;
      break;
    case "snow":
      layers = `<path d="M14 32a6 6 0 010-12 8 8 0 0115-2 6 6 0 0116 14H14z" fill="${COLORS.cloudDim}"/>`
            + `<g fill="${COLORS.snow}"><circle cx="18" cy="44" r="2.4"/><circle cx="32" cy="46" r="2.4"/><circle cx="44" cy="44" r="2.4"/></g>`;
      break;
    case "storm":
      layers = `<path d="M14 30a6 6 0 010-12 8 8 0 0115-2 6 6 0 0116 14H14z" fill="${COLORS.cloudDim}"/>`
            + `<path d="M30 32 L24 44 L30 44 L26 56 L40 40 L34 40 L40 32 Z" fill="${COLORS.bolt}"/>`;
      break;
    case "fog":
      layers = `${orb}<g stroke="${COLORS.cloud}" stroke-width="4" stroke-linecap="round"><path d="M10 42h44"/><path d="M14 50h36"/></g>`;
      break;
    default:
      layers = orb;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">`
       + `<rect width="64" height="64" rx="14" fill="${sky}"/>`
       + layers
       + `</svg>`;
}

function dataUri(svg) {
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

export function setFavicon(condition, isDay) {
  if (!condition) return;
  const svg = buildSvg(condition, !!isDay);
  const uri = dataUri(svg);
  for (const sel of ['link[rel="icon"]', 'link[rel="apple-touch-icon"]']) {
    let link = document.querySelector(sel);
    if (!link) {
      link = document.createElement("link");
      link.rel = sel.match(/rel="([^"]+)"/)[1];
      document.head.appendChild(link);
    }
    link.href = uri;
    link.type = "image/svg+xml";
  }
}
