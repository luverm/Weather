// Dynamic favicon: redraws the browser-tab icon to match the current weather
// bucket + condition. Keeps it readable at 16/32 px by using bold shapes and
// one dominant hue.

const link = (() => {
  let node = document.querySelector('link[rel="icon"]');
  if (!node) {
    node = document.createElement("link");
    node.rel = "icon";
    document.head.appendChild(node);
  }
  return node;
})();

const touch = document.querySelector('link[rel="apple-touch-icon"]');

const TONES = {
  night:   { bg: "#0b1020", fg: "#e9ecff" },
  dawn:    { bg: "#2a1c2d", fg: "#ffdfb0" },
  morning: { bg: "#7cc0ff", fg: "#1a2440" },
  day:     { bg: "#7cc0ff", fg: "#1a2440" },
  dusk:    { bg: "#3a1c33", fg: "#ffd8aa" },
};

// Build an SVG for a given condition + bucket. All geometry is designed in a
// 64×64 viewBox so it reads cleanly when the browser downsamples to 16/32 px.
function iconSvg(condition, bucket) {
  const isNight = bucket === "night";
  const tone = TONES[bucket] || TONES.day;
  const bg = tone.bg;
  const fg = tone.fg;
  const sun = "#ffd680";
  const moon = "#e9ecff";
  const cloud = isNight ? "#c7d0e6" : "#ffffff";
  const drop = "#8cc8ff";
  const flake = "#e6f1ff";
  const bolt = "#ffdc5c";
  const fogC = "#d7deef";

  // Common "orb" (sun or moon) in the top-left area.
  const orb = isNight
    ? // Crescent moon: full disc minus an offset disc.
      `<defs><mask id="m"><rect width="64" height="64" fill="#fff"/>
        <circle cx="30" cy="22" r="14" fill="#000"/></mask></defs>
       <circle cx="24" cy="22" r="14" fill="${moon}" mask="url(#m)"/>`
    : // Sun with 8 rays.
      `<g stroke="${sun}" stroke-width="3" stroke-linecap="round">
         <line x1="24" y1="4"  x2="24" y2="10"/>
         <line x1="24" y1="34" x2="24" y2="40"/>
         <line x1="4"  y1="22" x2="10" y2="22"/>
         <line x1="38" y1="22" x2="44" y2="22"/>
         <line x1="10" y1="8"  x2="14" y2="12"/>
         <line x1="34" y1="32" x2="38" y2="36"/>
         <line x1="38" y1="8"  x2="34" y2="12"/>
         <line x1="14" y1="32" x2="10" y2="36"/>
       </g>
       <circle cx="24" cy="22" r="10" fill="${sun}"/>`;

  // Cloud silhouette used for cloudy/rain/snow/storm variants.
  // Light backgrounds get a soft rim so the white cloud still reads.
  const lightBg = bucket === "day" || bucket === "morning";
  const cloudShape = `
    <path d="M18 44 Q10 44 10 36 Q10 28 20 28 Q22 20 32 20 Q44 20 44 32
             Q54 32 54 42 Q54 50 46 50 L20 50 Q18 48 18 44 Z"
          fill="${cloud}"${lightBg ? ' stroke="rgba(26,36,64,0.35)" stroke-width="1.5"' : ""} />
  `;

  let body = "";
  if (condition === "fog") {
    body = `
      ${orb}
      <g stroke="${fogC}" stroke-width="5" stroke-linecap="round" opacity="0.95">
        <line x1="6"  y1="40" x2="58" y2="40"/>
        <line x1="10" y1="50" x2="54" y2="50"/>
        <line x1="6"  y1="58" x2="52" y2="58"/>
      </g>`;
  } else if (condition === "clouds") {
    body = `${orb}${cloudShape}`;
  } else if (condition === "rain") {
    body = `
      ${cloudShape}
      <g fill="${drop}">
        <path d="M22 56 q-3 4 0 6 q3 -2 0 -6 z"/>
        <path d="M32 58 q-3 4 0 6 q3 -2 0 -6 z"/>
        <path d="M42 56 q-3 4 0 6 q3 -2 0 -6 z"/>
      </g>`;
  } else if (condition === "snow") {
    body = `
      ${cloudShape}
      <g stroke="${flake}" stroke-width="2" stroke-linecap="round">
        <g transform="translate(22 58)">
          <line x1="-4" y1="0" x2="4" y2="0"/>
          <line x1="0" y1="-4" x2="0" y2="4"/>
          <line x1="-3" y1="-3" x2="3" y2="3"/>
          <line x1="-3" y1="3" x2="3" y2="-3"/>
        </g>
        <g transform="translate(42 58)">
          <line x1="-4" y1="0" x2="4" y2="0"/>
          <line x1="0" y1="-4" x2="0" y2="4"/>
        </g>
      </g>`;
  } else if (condition === "storm") {
    body = `
      ${cloudShape}
      <path d="M32 46 L24 58 L31 58 L26 64 L40 54 L33 54 L38 46 Z"
            fill="${bolt}" stroke="${bg}" stroke-width="1.2"/>`;
  } else {
    // clear
    body = isNight
      ? `${orb}
         <g fill="${moon}">
           <circle cx="48" cy="12" r="1.2"/>
           <circle cx="56" cy="22" r="1.5"/>
           <circle cx="52" cy="40" r="1.1"/>
           <circle cx="42" cy="54" r="1.3"/>
           <circle cx="12" cy="54" r="1.1"/>
         </g>`
      : orb;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="14" ry="14" fill="${bg}"/>
    ${body}
  </svg>`;
}

// Larger 180×180 tile for iOS "add to home screen". Reuses the same artwork
// but scales + adds a small temperature badge in the bottom-right corner.
function touchSvg(condition, bucket, tempText) {
  const inner = iconSvg(condition, bucket)
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>$/, "");
  const badge = tempText
    ? `<g transform="translate(100 100) scale(2.4)">
         <rect x="22" y="42" rx="4" ry="4" width="22" height="12" fill="rgba(0,0,0,0.55)"/>
         <text x="33" y="51" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif"
               font-size="8" font-weight="700" fill="#fff">${tempText}</text>
       </g>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
    <g transform="translate(10 10) scale(2.5)">${inner}</g>
    ${badge}
  </svg>`;
}

function dataUri(svg) {
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

let last = "";

export const favicon = {
  // Update the <link rel="icon"> and apple-touch-icon to reflect weather state.
  // Idempotent per (condition, bucket, tempText).
  set({ condition, bucket, tempText } = {}) {
    if (!condition) return;
    const key = `${condition}|${bucket}|${tempText || ""}`;
    if (key === last) return;
    last = key;

    link.setAttribute("type", "image/svg+xml");
    link.setAttribute("href", dataUri(iconSvg(condition, bucket)));
    if (touch) touch.setAttribute("href", dataUri(touchSvg(condition, bucket, tempText)));
  },
};
