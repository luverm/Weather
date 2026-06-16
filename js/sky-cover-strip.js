// A horizontal 24-cell strip that visualizes cloud cover hour by hour.
// Clear sky (0%) renders as a warm blue, overcast (100%) as a muted grey.
// Sunrise / sunset cells get a small glyph so the day/night boundary is
// instantly readable. Each cell is clickable and scrubs to that hour.

export class SkyCoverStrip {
  constructor({ rootEl, onCellClick }) {
    this.root = rootEl;
    this.onCellClick = onCellClick;
    this.hours = [];
    this.sunrise = null;
    this.sunset = null;
  }

  setHours(hours, { sunrise, sunset } = {}) {
    this.hours = (hours || []).slice(0, 24);
    this.sunrise = sunrise ?? null;
    this.sunset = sunset ?? null;
    this.render();
  }

  render() {
    if (!this.root) return;
    if (!this.hours.length) {
      this.root.innerHTML = "";
      this.root.hidden = true;
      return;
    }
    this.root.hidden = false;

    const sunriseIdx = this._closestIdx(this.sunrise);
    const sunsetIdx = this._closestIdx(this.sunset);

    const cells = this.hours.map((h, i) => {
      const cover = clamp01((h.cloudCover ?? 50) / 100);
      const color = colorForCover(cover, !!h.isDay);
      const hourLabel = new Date(h.time).getHours();
      const tickLabel = hourLabel % 6 === 0 ? `${pad(hourLabel)}:00` : "";
      const cls = ["skystrip-cell"];
      let glyph = "";
      if (i === sunriseIdx) { cls.push("is-sunrise"); glyph = sunriseGlyph(); }
      else if (i === sunsetIdx) { cls.push("is-sunset"); glyph = sunsetGlyph(); }
      const coverPct = Math.round(cover * 100);
      return `
        <button class="${cls.join(" ")}" data-i="${i}" data-ts="${h.time}"
                title="${pad(hourLabel)}:00 · ${coverPct}% cloud cover"
                style="--c:${color}">
          <span class="skystrip-fill"></span>
          ${glyph}
          ${tickLabel ? `<span class="skystrip-tick">${tickLabel}</span>` : ""}
        </button>
      `;
    }).join("");
    this.root.innerHTML = cells;
    this.root.querySelectorAll(".skystrip-cell").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ts = parseInt(btn.dataset.ts, 10);
        if (ts) this.onCellClick?.(ts);
      });
    });
  }

  highlight(idx) {
    if (!this.root) return;
    this.root.querySelectorAll(".skystrip-cell").forEach((b) => b.classList.remove("active"));
    if (idx == null || idx < 0) return;
    const cell = this.root.querySelector(`.skystrip-cell[data-i="${idx}"]`);
    cell?.classList.add("active");
  }

  _closestIdx(ts) {
    if (!ts || !this.hours.length) return -1;
    let best = -1, bestDiff = Infinity;
    for (let i = 0; i < this.hours.length; i++) {
      const d = Math.abs(this.hours[i].time - ts);
      if (d < bestDiff) { bestDiff = d; best = i; }
    }
    // Only mark if the closest hour is within ~90 minutes — otherwise
    // sunrise/sunset is off the visible window.
    return bestDiff <= 90 * 60_000 ? best : -1;
  }
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function pad(n) { return n.toString().padStart(2, "0"); }

// Cloud cover -> color. Day cells fade from warm sky-blue (clear) to a soft
// neutral grey (overcast). Night cells use a deeper indigo, fading to slate.
function colorForCover(cover, isDay) {
  const day = [
    [0.0, [122, 184, 255]],
    [0.4, [168, 196, 220]],
    [0.8, [168, 174, 188]],
    [1.0, [148, 152, 162]],
  ];
  const night = [
    [0.0, [40, 60, 110]],
    [0.4, [62, 74, 112]],
    [0.8, [78, 84, 100]],
    [1.0, [66, 70, 84]],
  ];
  const stops = isDay ? day : night;
  for (let i = 0; i < stops.length - 1; i++) {
    const [lo, loC] = stops[i];
    const [hi, hiC] = stops[i + 1];
    if (cover >= lo && cover <= hi) {
      const frac = (cover - lo) / (hi - lo);
      const r = Math.round(loC[0] + (hiC[0] - loC[0]) * frac);
      const g = Math.round(loC[1] + (hiC[1] - loC[1]) * frac);
      const b = Math.round(loC[2] + (hiC[2] - loC[2]) * frac);
      return `rgb(${r},${g},${b})`;
    }
  }
  const last = stops[stops.length - 1][1];
  return `rgb(${last[0]},${last[1]},${last[2]})`;
}

function sunriseGlyph() {
  return `<svg class="skystrip-glyph" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="11" r="3" fill="#ffd07a"/>
    <path d="M3 14h10" stroke="#ffd07a" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M8 5l1.6 2.5L8 6.6 6.4 7.5z" fill="#ffd07a"/>
  </svg>`;
}

function sunsetGlyph() {
  return `<svg class="skystrip-glyph" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="11" r="3" fill="#ff9c7a"/>
    <path d="M3 14h10" stroke="#ff9c7a" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M8 8.4L6.4 5.9 8 6.8 9.6 5.9z" fill="#ff9c7a"/>
  </svg>`;
}
