// Dynamic favicon: swap the browser-tab icon to reflect the live condition.
// Emits a small inline SVG data-URI so no external requests are needed.

const CONDITION_SVG = {
  "clear-day": `<circle cx='32' cy='32' r='16' fill='#ffd57a'/>
    <g stroke='#ffd57a' stroke-width='4' stroke-linecap='round'>
      <path d='M32 6v6M32 52v6M6 32h6M52 32h6M12 12l4 4M48 48l4 4M12 52l4-4M48 16l4-4'/>
    </g>`,
  "clear-night": `<path d='M42 40a18 18 0 1 1-22-24 14 14 0 0 0 22 24z' fill='#e6ecff'/>`,
  "clouds": `<path d='M18 40a10 10 0 0 1 0-20 14 14 0 0 1 26-4 10 10 0 0 1 4 24H18z'
             fill='#c9d5e6'/>`,
  "clouds-night": `<g>
    <path d='M46 30a13 13 0 1 1-16-18 10 10 0 0 0 16 18z' fill='#e6ecff' opacity='0.9'/>
    <path d='M14 46a8 8 0 0 1 0-16 12 12 0 0 1 22-4 8 8 0 0 1 4 20H14z' fill='#c9d5e6'/>
  </g>`,
  "rain": `<path d='M18 32a10 10 0 0 1 0-20 14 14 0 0 1 26-4 10 10 0 0 1 4 24H18z'
             fill='#8fb2d9'/>
    <g stroke='#5db6ff' stroke-width='4' stroke-linecap='round'>
      <path d='M22 44l-4 10M32 44l-4 10M42 44l-4 10'/>
    </g>`,
  "snow": `<path d='M18 32a10 10 0 0 1 0-20 14 14 0 0 1 26-4 10 10 0 0 1 4 24H18z'
             fill='#c9d5e6'/>
    <g stroke='#eaf3ff' stroke-width='3' stroke-linecap='round' fill='none'>
      <path d='M22 48v6M18 51h8M32 46v8M28 50h8M42 48v6M38 51h8'/>
    </g>`,
  "storm": `<path d='M18 32a10 10 0 0 1 0-20 14 14 0 0 1 26-4 10 10 0 0 1 4 24H18z'
             fill='#7a8299'/>
    <path d='M34 38l-8 12h6l-4 10 12-16h-8l4-6z' fill='#ffdc4a'/>`,
  "fog": `<g stroke='#c9d5e6' stroke-width='5' stroke-linecap='round'>
    <path d='M10 20h44M6 32h52M14 44h40M20 56h32'/>
  </g>`,
};

function svgFor(condition, isDay) {
  const key = pickKey(condition, isDay);
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
    <rect width='64' height='64' rx='14' fill='${isDay ? "#7cc0ff" : "#0b1020"}'/>
    ${CONDITION_SVG[key] || CONDITION_SVG["clouds"]}
  </svg>`;
}

function pickKey(condition, isDay) {
  if (condition === "clear") return isDay ? "clear-day" : "clear-night";
  if (condition === "clouds" && !isDay) return "clouds-night";
  return condition || "clouds";
}

let lastKey = null;

export function updateFavicon(condition, isDay = true) {
  const key = pickKey(condition, !!isDay);
  if (key === lastKey) return;
  lastKey = key;
  const svg = svgFor(condition, !!isDay);
  const url = `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}
