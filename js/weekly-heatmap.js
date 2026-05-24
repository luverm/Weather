// 7×24 heatmap of hourly temperatures across the upcoming week. Each row is a
// local day; each column is an hour (0–23). Cell colour maps to temperature
// using the same palette as the comfort strip; cell opacity dims for night
// hours so the daylight pattern is legible at a glance.
//
// Click a cell to scrub to that timestamp.

export class WeeklyHeatmap {
  constructor({ rootEl, onCellClick, getUnit }) {
    this.root = rootEl;
    this.onCellClick = onCellClick;
    this.getUnit = getUnit || (() => "C");
    this.hours = [];
  }

  setHours(hoursExtended) {
    this.hours = hoursExtended || [];
    this.render();
  }

  render() {
    if (!this.root) return;
    if (this.hours.length < 24) {
      this.root.hidden = true;
      this.root.innerHTML = "";
      return;
    }
    this.root.hidden = false;

    // Group by local-day key.
    const byDay = new Map();
    for (const h of this.hours) {
      const d = new Date(h.time);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!byDay.has(key)) byDay.set(key, { date: d, hours: [] });
      byDay.get(key).hours.push(h);
    }
    const days = [...byDay.values()].slice(0, 7);
    if (!days.length) { this.root.hidden = true; return; }

    // Global temp bounds for shared colour scale.
    const temps = this.hours.map((h) => h.temp).filter((v) => v != null);
    if (!temps.length) { this.root.hidden = true; return; }
    const tMin = Math.min(...temps);
    const tMax = Math.max(...temps);
    const span = Math.max(2, tMax - tMin);
    const unit = this.getUnit();

    // Build header row of hour ticks (every 6h).
    const headTicks = Array.from({ length: 24 }, (_, h) => h);
    const headHtml = `
      <div class="hm-corner"></div>
      ${headTicks.map((h) => `<span class="hm-htick" data-h="${h}">${h % 6 === 0 ? pad(h) : ""}</span>`).join("")}
    `;

    const rowsHtml = days.map((day) => {
      const cells = new Array(24).fill(null);
      for (const h of day.hours) cells[new Date(h.time).getHours()] = h;
      const label = formatDayLabel(day.date);
      const cellHtml = cells.map((h, hr) => {
        if (!h) {
          return `<span class="hm-cell hm-empty" style="--c:rgba(255,255,255,0.03)"></span>`;
        }
        const color = colorForTemp(h.temp);
        const display = h.temp == null ? "—" : Math.round(unit === "F" ? h.temp * 9 / 5 + 32 : h.temp) + "°";
        const dayDim = h.isDay === false ? "0.55" : "1";
        return `
          <button class="hm-cell" data-ts="${h.time}"
                  title="${label} ${pad(hr)}:00 · ${display}${h.pop ? ` · ${h.pop}%` : ""}"
                  style="--c:${color}; --d:${dayDim}"></button>
        `;
      }).join("");
      return `
        <span class="hm-label">${escape(label)}</span>
        ${cellHtml}
      `;
    }).join("");

    this.root.innerHTML = `
      <div class="hm-grid">
        ${headHtml}
        ${rowsHtml}
      </div>
      <div class="hm-scale">
        <span>${Math.round(unit === "F" ? tMin * 9 / 5 + 32 : tMin)}°</span>
        <span class="hm-gradient" aria-hidden="true"></span>
        <span>${Math.round(unit === "F" ? tMax * 9 / 5 + 32 : tMax)}°</span>
      </div>
    `;

    this.root.querySelectorAll(".hm-cell[data-ts]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ts = parseInt(btn.dataset.ts, 10);
        if (ts) this.onCellClick?.(ts);
      });
    });
  }
}

function pad(n) { return n.toString().padStart(2, "0"); }
function escape(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function formatDayLabel(d) {
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "Tom";
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function colorForTemp(t) {
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
