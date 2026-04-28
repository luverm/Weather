// A compact 24-cell strip showing the upcoming day's feels-like temperature
// with a rain-probability overlay. Each cell is clickable to scrub.

export class ComfortStrip {
  constructor({ rootEl, onCellClick, getUnit }) {
    this.root = rootEl;
    this.onCellClick = onCellClick;
    this.getUnit = getUnit || (() => "C");
    this.hours = [];
  }

  setHours(hours) {
    this.hours = (hours || []).slice(0, 24);
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
    const unit = this.getUnit();
    // Min/max across the displayed range for crisp colors.
    const temps = this.hours.map((h) => h.feelsLike ?? h.temp).filter((v) => v != null);
    const tMin = Math.min(...temps);
    const tMax = Math.max(...temps);
    const span = Math.max(4, tMax - tMin);

    const cells = this.hours.map((h, i) => {
      const t = h.feelsLike ?? h.temp;
      const color = colorForFeels(t);
      const rainOpacity = clamp01((h.pop ?? 0) / 100) * 0.85;
      const display = t == null ? "—" : Math.round(unit === "F" ? t * 9 / 5 + 32 : t) + "°";
      const tickHour = new Date(h.time).getHours();
      const showTick = tickHour % 6 === 0;
      const tickLabel = showTick ? `${tickHour.toString().padStart(2, "0")}:00` : "";
      return `
        <button class="cstrip-cell" data-i="${i}" data-ts="${h.time}"
                title="${tickHour}:00 · ${display} feels · ${h.pop ?? 0}% rain"
                style="--c:${color}">
          <span class="cstrip-bar" style="--rain:${rainOpacity}"></span>
          ${showTick ? `<span class="cstrip-tick">${tickLabel}</span>` : ""}
        </button>
      `;
    }).join("");
    this.root.innerHTML = cells;

    this.root.querySelectorAll(".cstrip-cell").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ts = parseInt(btn.dataset.ts, 10);
        if (ts) this.onCellClick?.(ts);
      });
    });
  }

  highlight(idx) {
    if (!this.root) return;
    this.root.querySelectorAll(".cstrip-cell").forEach((b) => b.classList.remove("active"));
    if (idx == null || idx < 0) return;
    const cell = this.root.querySelector(`.cstrip-cell[data-i="${idx}"]`);
    cell?.classList.add("active");
  }
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

// Feels-like temperature -> CSS color. Inspired by classic isotherm palettes:
// cold = deep blue, cool = teal, comfy = green, warm = amber, hot = red.
function colorForFeels(t) {
  if (t == null) return "rgba(255,255,255,0.06)";
  const stops = [
    [-15, "#3a4d8f"],
    [-5,  "#4a78c2"],
    [5,   "#3da9a1"],
    [12,  "#5cc77a"],
    [18,  "#cdd86a"],
    [24,  "#f0a557"],
    [30,  "#e96a4d"],
    [36,  "#a73838"],
  ];
  if (t <= stops[0][0]) return stops[0][1];
  if (t >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [lo, loC] = stops[i];
    const [hi, hiC] = stops[i + 1];
    if (t >= lo && t <= hi) {
      const frac = (t - lo) / (hi - lo);
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
