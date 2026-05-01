// 24-cell wind direction + speed strip. Each cell is a tiny arrow rotated
// in the direction the wind is travelling toward (Open-Meteo's
// wind_direction_10m is in *meteorological* degrees — the direction the
// wind is *coming from* — so we render an arrow pointing the *opposite*
// way to match how surface winds visually flow).
//
// Speed colors the arrow stem. Hides when no usable wind direction data.

const ARROW_PATH = "M0,-7 L2.5,3 L0,1 L-2.5,3 Z";

export class WindStrip {
  constructor({ rootEl, getTimezone, onCellClick }) {
    this.root = rootEl;
    this.getTimezone = getTimezone || (() => null);
    this.onCellClick = onCellClick;
    this.hours = [];
  }

  setHours(hours) {
    this.hours = (hours || []).slice(0, 24);
    this._draw();
  }

  highlight(idx) {
    if (!this.root) return;
    this.root.querySelectorAll(".wind-cell").forEach((c, i) => {
      c.classList.toggle("active", i === idx);
    });
  }

  _draw() {
    if (!this.root) return;
    const usable = this.hours.filter((h) => h.windDir != null && h.wind != null);
    if (usable.length < 6) {
      this.root.hidden = true;
      this.root.innerHTML = "";
      return;
    }
    this.root.hidden = false;
    const peak = Math.max(10, ...this.hours.map((h) => h.wind ?? 0));
    const cells = this.hours.map((h, i) => {
      if (h.windDir == null) return `<div class="wind-cell empty"></div>`;
      // Wind comes FROM windDir, so an arrow showing flow direction points
      // the opposite way. Add 180°.
      const rot = ((h.windDir + 180) % 360);
      const intensity = Math.min(1, (h.wind ?? 0) / Math.max(peak, 20));
      // Color: low wind → fg-dim, high wind → warm/red
      const color = `hsl(${230 - intensity * 230}, ${40 + intensity * 50}%, ${65 - intensity * 15}%)`;
      const tip = `${this._formatHour(h.time)} · ${Math.round(h.wind ?? 0)} km/h ${cardinal(h.windDir)}`;
      return `
        <button type="button" class="wind-cell" data-ts="${h.time}" title="${tip}" aria-label="${tip}">
          <svg viewBox="-6 -8 12 16" aria-hidden="true">
            <g transform="rotate(${rot.toFixed(1)})">
              <path d="${ARROW_PATH}" fill="${color}" stroke="${color}" stroke-width="0.4" stroke-linejoin="round"/>
            </g>
          </svg>
        </button>
      `;
    }).join("");
    this.root.innerHTML = `
      <div class="wind-strip-head">
        <span class="wind-strip-title">Wind 24h</span>
        <span class="wind-strip-meta">peak ${Math.round(peak)} km/h</span>
      </div>
      <div class="wind-strip-grid">${cells}</div>
    `;
    this.root.querySelectorAll(".wind-cell[data-ts]").forEach((cell) => {
      cell.addEventListener("click", () => {
        const ts = parseInt(cell.dataset.ts, 10);
        if (ts && this.onCellClick) this.onCellClick(ts);
      });
    });
  }

  _formatHour(ts) {
    const tz = this.getTimezone();
    if (tz && tz !== "auto") {
      try {
        return new Intl.DateTimeFormat(undefined, {
          timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
        }).format(new Date(ts));
      } catch { /* */ }
    }
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }
}

function cardinal(deg) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const i = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return dirs[i];
}
