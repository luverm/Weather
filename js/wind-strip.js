// Renders a strip of 24 small wind arrows under the hourly chart.
// Arrow angle = direction the wind is blowing TO (so an "arrow of wind").
// Opacity scales with speed so a calm hour sits back and a gale pops.

export class WindStrip {
  constructor({ rootEl, onCellClick }) {
    this.root = rootEl;
    this.onCellClick = onCellClick;
    this.hours = [];
    if (this.root) this.root.innerHTML = "";
  }

  setHours(hours) {
    if (!this.root) return;
    this.hours = (hours || []).slice(0, 24);
    if (!this.hours.length || this.hours.every((h) => h.windDir == null)) {
      this.root.hidden = true;
      return;
    }
    this.root.hidden = false;
    const maxWind = Math.max(5, ...this.hours.map((h) => h.wind || 0));
    this.root.innerHTML = this.hours.map((h, i) => {
      const dir = h.windDir ?? 0;
      const wind = h.wind ?? 0;
      // 0.25 at calm, 1 at the strip's maximum.
      const opacity = 0.25 + Math.min(0.75, (wind / maxWind) * 0.75);
      const scale = 0.75 + Math.min(0.5, (wind / maxWind) * 0.5);
      const hour = new Date(h.time).getHours().toString().padStart(2, "0");
      const label = `${hour}:00 · wind ${Math.round(wind)} km/h from ${compass(dir)}`;
      // Draw an arrow pointing in the wind's "to" direction: wind blows FROM dir,
      // so the arrow points to (dir + 180). SVG 0° is "up", so angle = dir + 180.
      const arrowAngle = (dir + 180) % 360;
      return `
        <button class="wind-cell" type="button" data-i="${i}"
                data-ts="${h.time}" title="${escapeAttr(label)}"
                aria-label="${escapeAttr(label)}">
          <svg viewBox="-10 -10 20 20" style="transform: rotate(${arrowAngle}deg) scale(${scale.toFixed(2)}); opacity:${opacity.toFixed(2)}">
            <path d="M0 -7 L4 4 L0 2 L-4 4 Z" fill="currentColor"/>
          </svg>
        </button>`;
    }).join("");
    this.root.querySelectorAll(".wind-cell").forEach((cell) => {
      cell.addEventListener("click", () => {
        const ts = parseInt(cell.dataset.ts, 10);
        if (ts) this.onCellClick?.(ts);
      });
    });
  }

  highlight(idx) {
    if (!this.root) return;
    this.root.querySelectorAll(".wind-cell").forEach((cell, i) => {
      cell.classList.toggle("active", i === idx);
    });
  }
}

function compass(deg) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const i = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return dirs[i];
}

function escapeAttr(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
