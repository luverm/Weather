// Live tab title + favicon: the browser tab reflects the current city,
// temperature and condition so a glance at a pinned tab is enough.
//
// Call update() whenever weather or units change. The scrubbed-time
// variant adds an hourglass hint so a tab stuck on a future time is
// never confusing.

const EMOJI = {
  clear: "☀",
  clouds: "☁",
  rain: "🌧",
  snow: "❄",
  storm: "⛈",
  fog: "🌫",
};

const FAVICON_BG = {
  clear:  "#ffd27a",
  clouds: "#9fb4c9",
  rain:   "#6fa7d8",
  snow:   "#dbe6f3",
  storm:  "#7a79b6",
  fog:    "#b7bcc4",
};

const FAVICON_GLYPH = {
  // Minimal SVG inner that reads at 16x16. White strokes/fills on a
  // condition-tinted square so the tab bar always has contrast.
  clear:  `<circle cx="32" cy="32" r="14" fill="#fff6c7"/>`,
  clouds: `<path d="M20 40c-5 0-9-4-9-9s4-9 9-9c1-6 7-10 13-10 7 0 13 5 13 12 5 0 9 4 9 9s-4 7-9 7H20z" fill="#fff"/>`,
  rain:   `<path d="M20 34c-5 0-9-4-9-9s4-9 9-9c1-6 7-10 13-10 7 0 13 5 13 12 5 0 9 4 9 9s-4 7-9 7H20z" fill="#fff"/>
           <path d="M22 44l-3 8M34 44l-3 8M46 44l-3 8" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  snow:   `<path d="M20 34c-5 0-9-4-9-9s4-9 9-9c1-6 7-10 13-10 7 0 13 5 13 12 5 0 9 4 9 9s-4 7-9 7H20z" fill="#fff"/>
           <circle cx="22" cy="48" r="2" fill="#fff"/>
           <circle cx="34" cy="52" r="2" fill="#fff"/>
           <circle cx="46" cy="48" r="2" fill="#fff"/>`,
  storm:  `<path d="M20 30c-5 0-9-4-9-9s4-9 9-9c1-6 7-10 13-10 7 0 13 5 13 12 5 0 9 4 9 9s-4 7-9 7H20z" fill="#fff"/>
           <path d="M30 32l-6 14h8l-5 10 12-16h-7l5-8z" fill="#ffe066"/>`,
  fog:    `<path d="M8 24h48M8 36h40M12 48h44M14 60h40" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`,
};

const BASE_TITLE = "Aether — Interactive Weather";

let lastHref = null;
let linkEl = null;

function ensureLinkEl() {
  if (linkEl && document.head.contains(linkEl)) return linkEl;
  // Reuse any existing favicon <link rel="icon"> so we don't leak elements.
  linkEl = document.querySelector('link[rel="icon"]');
  if (!linkEl) {
    linkEl = document.createElement("link");
    linkEl.rel = "icon";
    document.head.appendChild(linkEl);
  }
  return linkEl;
}

function buildFaviconDataUri(condition, temp) {
  const bg = FAVICON_BG[condition] || FAVICON_BG.clouds;
  const glyph = FAVICON_GLYPH[condition] || FAVICON_GLYPH.clouds;
  const label = temp == null || !isFinite(temp) ? "" :
    `<text x="32" y="60" text-anchor="middle" font-family="system-ui, sans-serif"
            font-weight="700" font-size="22" fill="#0b1020"
            stroke="#fff" stroke-width="2" paint-order="stroke">${Math.round(temp)}°</text>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
       <rect width="64" height="64" rx="12" fill="${bg}"/>
       ${glyph}
       ${label}
     </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function setFavicon(condition, temp) {
  const href = buildFaviconDataUri(condition, temp);
  if (href === lastHref) return;
  lastHref = href;
  const link = ensureLinkEl();
  // Setting type helps Safari pick the SVG renderer.
  link.setAttribute("type", "image/svg+xml");
  link.setAttribute("href", href);
}

/**
 * Update the browser tab (title + favicon).
 * @param {object} opts
 * @param {object|null} opts.weather   normalized weather snapshot
 * @param {object|null} opts.place     { name, country, admin1 }
 * @param {string}      opts.unit      "c" | "f"
 * @param {boolean}     opts.scrubbing true when viewing a non-live time
 */
export function updateTabTitle({ weather, place, unit = "C", scrubbing = false } = {}) {
  if (!weather || weather.temp == null) {
    document.title = BASE_TITLE;
    setFavicon("clouds", null);
    return;
  }
  const useF = String(unit).toUpperCase() === "F";
  const t = useF ? (weather.temp * 9 / 5) + 32 : weather.temp;
  const condition = weather.condition || "clouds";
  const emoji = EMOJI[condition] || "·";
  const temp = `${Math.round(t)}°${useF ? "F" : ""}`;
  const name = place?.name || "";
  const prefix = scrubbing ? "⏳ " : "";
  const parts = [`${prefix}${emoji} ${temp}`, name, "Aether"].filter(Boolean);
  document.title = parts.join(" · ");
  setFavicon(condition, t);
}

/** Resets the tab to the base title + a neutral favicon. */
export function resetTabTitle() {
  document.title = BASE_TITLE;
  setFavicon("clouds", null);
}
