// Dynamic tab identity: title and favicon track the current sampled weather,
// so the browser tab stays useful when it isn't the active one.
//
// The favicon is rendered inline as an SVG data URI — no network, no raster —
// and swapped in by replacing the `<link rel="icon">` href. The apple-touch
// icon is updated too so the home-screen install picks up a matching glyph.

const DEFAULT_TITLE = "Aether — Interactive Weather";

// Base pixel size the SVG is authored in. Browsers scale it to whatever tab
// size they need; 64 gives us room to breathe for a glyph + small badge.
const SIZE = 64;

// Palette per bucket for the backdrop ring. Keeps a readable favicon in both
// light and dark browser chromes.
const BG = {
  dawn:    "#f6b483",
  morning: "#9ad1ff",
  day:     "#7cc0ff",
  dusk:    "#eb7a63",
  night:   "#0b1020",
};

// Foreground glyph strokes per condition / day-ness. The glyphs are small,
// so each is a single-color flat SVG — no gradients, no filters.
function glyphFor(condition, isDay) {
  switch (condition) {
    case "clear":
      return isDay ? sun() : moon();
    case "clouds":
      return isDay ? sunCloud() : moonCloud();
    case "rain":
      return rain();
    case "snow":
      return snow();
    case "storm":
      return storm();
    case "fog":
      return fog();
    default:
      return isDay ? sun() : moon();
  }
}

function sun() {
  return (
    `<circle cx="32" cy="32" r="12" fill="#ffe6a1"/>` +
    `<g stroke="#ffe6a1" stroke-width="3.2" stroke-linecap="round">` +
      `<path d="M32 10v6M32 48v6M10 32h6M48 32h6M16 16l4 4M44 44l4 4M48 16l-4 4M20 44l-4 4"/>` +
    `</g>`
  );
}
function moon() {
  return (
    `<path d="M44 36a16 16 0 11-16-20 12 12 0 0016 20z" fill="#f0e6cb"/>`
  );
}
function sunCloud() {
  return (
    `<circle cx="24" cy="24" r="9" fill="#ffe6a1"/>` +
    `<path d="M22 44a9 9 0 010-18 11 11 0 0120 2 7 7 0 010 14 7 7 0 01-2 2z" fill="#eaf0ff" stroke="#cfd8ec" stroke-width="1.4"/>`
  );
}
function moonCloud() {
  return (
    `<path d="M30 22a10 10 0 00-10 12 10 10 0 0010-12z" fill="#f0e6cb"/>` +
    `<path d="M22 46a9 9 0 010-18 11 11 0 0120 2 7 7 0 010 14 7 7 0 01-2 2z" fill="#eaf0ff" stroke="#cfd8ec" stroke-width="1.4"/>`
  );
}
function rain() {
  return (
    `<path d="M22 36a9 9 0 010-18 11 11 0 0120 2 7 7 0 010 14 7 7 0 01-2 2z" fill="#eaf0ff" stroke="#cfd8ec" stroke-width="1.4"/>` +
    `<g stroke="#5aa7ff" stroke-width="3.2" stroke-linecap="round">` +
      `<path d="M22 44l-2 8M32 44l-2 8M42 44l-2 8"/>` +
    `</g>`
  );
}
function snow() {
  return (
    `<path d="M22 34a9 9 0 010-18 11 11 0 0120 2 7 7 0 010 14 7 7 0 01-2 2z" fill="#eaf0ff" stroke="#cfd8ec" stroke-width="1.4"/>` +
    `<g fill="#ffffff" font-family="sans-serif" font-size="14" text-anchor="middle">` +
      `<text x="22" y="52">❄</text><text x="34" y="54">❄</text><text x="46" y="52">❄</text>` +
    `</g>`
  );
}
function storm() {
  return (
    `<path d="M22 34a9 9 0 010-18 11 11 0 0120 2 7 7 0 010 14 7 7 0 01-2 2z" fill="#9aa0b4" stroke="#5a627a" stroke-width="1.4"/>` +
    `<path d="M30 36l-4 10h5l-2 8 9-12h-5l3-6z" fill="#ffd84a" stroke="#b58900" stroke-width="1.2" stroke-linejoin="round"/>`
  );
}
function fog() {
  return (
    `<g stroke="#dfe6f3" stroke-width="4" stroke-linecap="round">` +
      `<path d="M12 24h40M8 36h48M14 48h36"/>` +
    `</g>`
  );
}

/**
 * Build an inline SVG data URI for the favicon.
 * `bucket` picks the backdrop ring, condition+isDay picks the glyph.
 */
function faviconDataUri({ bucket, condition, isDay }) {
  const bg = BG[bucket] || BG.day;
  // A ring (not a full fill) keeps the glyph readable at 16×16.
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">` +
      `<rect width="${SIZE}" height="${SIZE}" rx="14" fill="${bg}"/>` +
      glyphFor(condition, isDay) +
    `</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

/** Human-friendly fragment, e.g. "19° · Clear sky — London". */
function titleFor({ tempC, label, placeName, unit }) {
  if (tempC == null || isNaN(tempC)) return DEFAULT_TITLE;
  const t = unit === "F" ? Math.round(tempC * 9 / 5 + 32) : Math.round(tempC);
  const parts = [`${t}°${unit || "C"}`];
  if (label) parts.push(label);
  const left = parts.join(" · ");
  return placeName ? `${left} — ${placeName}` : left;
}

export const tabIdentity = (() => {
  let lastTitle = "";
  let lastIcon = "";

  function iconLinks() {
    const links = Array.from(document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]'));
    return links;
  }

  function set({ sampled, bucket, placeName, unit }) {
    if (!sampled) return;
    const title = titleFor({
      tempC: sampled.temp,
      label: sampled.label,
      placeName,
      unit,
    });
    if (title !== lastTitle) {
      document.title = title;
      lastTitle = title;
    }
    const uri = faviconDataUri({
      bucket: bucket || (sampled.isDay ? "day" : "night"),
      condition: sampled.condition || "clear",
      isDay: !!sampled.isDay,
    });
    if (uri !== lastIcon) {
      iconLinks().forEach((link) => link.setAttribute("href", uri));
      lastIcon = uri;
    }
  }

  function reset() {
    if (lastTitle !== DEFAULT_TITLE) {
      document.title = DEFAULT_TITLE;
      lastTitle = DEFAULT_TITLE;
    }
  }

  return { set, reset };
})();
