// Compact 24-hour wind timeline: one arrow per hour pointing "to" the wind's
// direction, sized/coloured by speed. Complements the "now" wind compass by
// showing how wind evolves through the day. Each arrow is clickable.

export class WindTimeline {
  constructor({ rootEl, onCellClick, getUnit }) {
    this.root = rootEl;
    this.onCellClick = onCellClick;
    this.getUnit = getUnit || (() => "kmh");
    this.hours = [];
  }

  setHours(hours) {
    this.hours = (hours || []).slice(0, 24);
    this.render();
  }

  render() {
    if (!this.root) return;
    const usable = this.hours.filter((h) => h.wind != null);
    if (!usable.length) {
      this.root.hidden = true;
      this.root.innerHTML = "";
      return;
    }
    this.root.hidden = false;

    const speeds = usable.map((h) => h.wind);
    const gusts = usable.map((h) => h.gusts ?? h.wind);
    const vMin = Math.min(...speeds);
    const vMax = Math.max(...gusts);
    const span = Math.max(6, vMax - vMin);

    // Meteorological convention: `windDir` is the direction the wind is
    // coming FROM. To render an arrow that shows where it's going TO we add
    // 180°. The SVG arrow's base points up (0°).
    const cells = this.hours.map((h, i) => {
      if (h.wind == null) {
        return `<span class="wtl-cell wtl-empty" data-i="${i}"></span>`;
      }
      const dir = ((h.windDir ?? 0) + 180) % 360;
      const norm = Math.max(0, Math.min(1, (h.wind - vMin) / span));
      const gustBoost = h.gusts != null && h.gusts - h.wind > 8;
      const color = colorForWind(h.wind);
      const tickHour = new Date(h.time).getHours();
      const showTick = tickHour % 6 === 0;
      const label = fmtLabel(h, this.getUnit());
      return `
        <button class="wtl-cell" data-i="${i}" data-ts="${h.time}"
                title="${tickHour}:00 · ${label}"
                style="--dir:${dir}deg;--w:${(0.35 + norm * 0.65).toFixed(2)};--c:${color}"
                aria-label="Wind at ${tickHour}:00 — ${label}">
          <svg class="wtl-arrow ${gustBoost ? "gusty" : ""}" viewBox="-8 -12 16 24" aria-hidden="true">
            <path d="M0 -10 L4 4 L0 1 L-4 4 Z" fill="currentColor"/>
          </svg>
          ${showTick ? `<span class="wtl-tick">${tickHour.toString().padStart(2, "0")}</span>` : ""}
        </button>`;
    }).join("");
    this.root.innerHTML = cells;

    this.root.querySelectorAll(".wtl-cell").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ts = parseInt(btn.dataset.ts, 10);
        if (ts) this.onCellClick?.(ts);
      });
    });
  }

  highlight(idx) {
    if (!this.root) return;
    this.root.querySelectorAll(".wtl-cell").forEach((b) => b.classList.remove("active"));
    if (idx == null || idx < 0) return;
    const cell = this.root.querySelector(`.wtl-cell[data-i="${idx}"]`);
    cell?.classList.add("active");
  }
}

function fmtLabel(h, unit) {
  const speed = h.wind;
  const gusts = h.gusts;
  const dir = h.windDir;
  const compass = dir != null ? dirCompass(dir) : "";
  const isMph = unit === "mph";
  const conv = (v) => v == null ? "—" : Math.round(isMph ? v * 0.621371 : v);
  const suffix = isMph ? "mph" : "km/h";
  const gs = gusts != null && gusts - speed > 2 ? ` · gust ${conv(gusts)}` : "";
  return `${compass} ${conv(speed)} ${suffix}${gs}`.trim();
}

function dirCompass(deg) {
  const names = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return names[Math.round(((deg % 360) / 22.5)) % 16];
}

// Wind speed (km/h) -> gradient color, keyed loosely to Beaufort.
function colorForWind(v) {
  const stops = [
    [0,   "#93c8ff"],  // calm
    [12,  "#7ab8f5"],  // light breeze
    [24,  "#65a7ea"],  // moderate breeze
    [38,  "#f0c968"],  // fresh
    [55,  "#f08a4a"],  // strong
    [75,  "#e05a4a"],  // gale
    [100, "#c73838"],  // storm
  ];
  if (v <= stops[0][0]) return stops[0][1];
  if (v >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [lo, loC] = stops[i];
    const [hi, hiC] = stops[i + 1];
    if (v >= lo && v <= hi) {
      const frac = (v - lo) / (hi - lo);
      return mixHex(loC, hiC, frac);
    }
  }
  return stops[stops.length - 1][1];
}

function mixHex(a, b, t) {
  const ax = parseInt(a.slice(1), 16);
  const bx = parseInt(b.slice(1), 16);
  const ar = (ax >> 16) & 0xff, ag = (ax >> 8) & 0xff, ab = ax & 0xff;
  const br = (bx >> 16) & 0xff, bg = (bx >> 8) & 0xff, bb = bx & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}
