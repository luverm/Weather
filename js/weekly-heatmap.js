// 7×24 heatmap of hourly conditions across the upcoming week. Toggle between
// temperature, precipitation chance and wind speed; each metric has its own
// palette and per-metric scale. Night cells are dimmed so the daylight rhythm
// stays visible. Click a cell to scrub.

const METRICS = {
  temp: {
    label: "Temp",
    pick: (h) => h.temp,
    unitConvert: (v, unit) => unit === "F" ? v * 9 / 5 + 32 : v,
    format: (v, unit) => v == null ? "—" : `${Math.round(unit === "F" ? v * 9 / 5 + 32 : v)}°`,
    color: colorForTemp,
    gradientStops: [
      "#3a4d8f", "#4a78c2", "#3da9a1", "#5cc77a", "#cdd86a", "#f0a557", "#e96a4d", "#a73838",
    ],
    scaleLabel: (lo, hi, unit) => [
      `${Math.round(unit === "F" ? lo * 9 / 5 + 32 : lo)}°`,
      `${Math.round(unit === "F" ? hi * 9 / 5 + 32 : hi)}°`,
    ],
  },
  rain: {
    label: "Rain",
    pick: (h) => h.pop ?? 0,
    format: (v) => v == null ? "—" : `${Math.round(v)}%`,
    color: colorForRain,
    gradientStops: ["#1a1f33", "#27435f", "#3e7cb1", "#67a8dd", "#a3c9f2"],
    scaleLabel: () => ["0%", "100%"],
    fixedDomain: [0, 100],
  },
  wind: {
    label: "Wind",
    pick: (h) => h.wind ?? null,
    format: (v) => v == null ? "—" : `${Math.round(v)} km/h`,
    color: colorForWind,
    gradientStops: ["#1f2436", "#3a577a", "#5a8eae", "#9bb1c4", "#d6c79a", "#c08a4f"],
    scaleLabel: (lo, hi) => [`${Math.round(lo)}`, `${Math.round(hi)} km/h`],
  },
};

export class WeeklyHeatmap {
  constructor({ rootEl, onCellClick, getUnit }) {
    this.root = rootEl;
    this.onCellClick = onCellClick;
    this.getUnit = getUnit || (() => "C");
    this.hours = [];
    this.metric = restoreMetric();
  }

  setHours(hoursExtended) {
    this.hours = hoursExtended || [];
    this.render();
  }

  setMetric(key) {
    if (!METRICS[key] || this.metric === key) return;
    this.metric = key;
    try { localStorage.setItem("aether:hmMetric", key); } catch { /* ignore */ }
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

    const byDay = new Map();
    for (const h of this.hours) {
      const d = new Date(h.time);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!byDay.has(key)) byDay.set(key, { date: d, hours: [] });
      byDay.get(key).hours.push(h);
    }
    const days = [...byDay.values()].slice(0, 7);
    if (!days.length) { this.root.hidden = true; return; }

    const metric = METRICS[this.metric];
    const values = this.hours.map(metric.pick).filter((v) => v != null);
    if (!values.length) { this.root.hidden = true; return; }
    let lo = Math.min(...values), hi = Math.max(...values);
    if (metric.fixedDomain) [lo, hi] = metric.fixedDomain;
    const span = Math.max(0.001, hi - lo);
    const unit = this.getUnit();

    const tabs = Object.entries(METRICS).map(([key, m]) =>
      `<button type="button" class="hm-tab" data-metric="${key}"${key === this.metric ? ' aria-pressed="true"' : ' aria-pressed="false"'}>${m.label}</button>`
    ).join("");

    const headTicks = Array.from({ length: 24 }, (_, h) => h);
    const headHtml = `
      <div class="hm-corner"></div>
      ${headTicks.map((h) => `<span class="hm-htick">${h % 6 === 0 ? pad(h) : ""}</span>`).join("")}
    `;

    const rowsHtml = days.map((day) => {
      const cells = new Array(24).fill(null);
      for (const h of day.hours) cells[new Date(h.time).getHours()] = h;
      const label = formatDayLabel(day.date);
      const cellHtml = cells.map((h, hr) => {
        if (!h) {
          return `<span class="hm-cell hm-empty" style="--c:rgba(255,255,255,0.03)"></span>`;
        }
        const raw = metric.pick(h);
        const color = metric.color(raw, lo, hi, span);
        const display = metric.format(raw, unit);
        const dayDim = h.isDay === false ? "0.55" : "1";
        const isNow = Math.abs(h.time - Date.now()) < 30 * 60_000;
        // Tiny direction arrow when the wind metric is active.
        let inner = "";
        if (this.metric === "wind" && h.windDir != null && (h.wind ?? 0) >= 6) {
          inner = `<span class="hm-arrow" style="transform:rotate(${(h.windDir + 180) % 360}deg)" aria-hidden="true">↑</span>`;
        }
        return `
          <button class="hm-cell${isNow ? " hm-now" : ""}" data-ts="${h.time}"
                  title="${label} ${pad(hr)}:00 · ${display}"
                  style="--c:${color}; --d:${dayDim}">${inner}</button>
        `;
      }).join("");
      return `
        <span class="hm-label">${escape(label)}</span>
        ${cellHtml}
      `;
    }).join("");

    const [loLabel, hiLabel] = metric.scaleLabel(lo, hi, unit);
    const gradient = `linear-gradient(90deg, ${metric.gradientStops.join(", ")})`;

    this.root.innerHTML = `
      <div class="hm-toolbar" role="tablist" aria-label="Heatmap metric">${tabs}</div>
      <div class="hm-grid">
        ${headHtml}
        ${rowsHtml}
      </div>
      <div class="hm-scale">
        <span>${loLabel}</span>
        <span class="hm-gradient" aria-hidden="true" style="background:${gradient}"></span>
        <span>${hiLabel}</span>
      </div>
    `;

    this.root.querySelectorAll(".hm-cell[data-ts]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ts = parseInt(btn.dataset.ts, 10);
        if (ts) this.onCellClick?.(ts);
      });
    });
    this.root.querySelectorAll(".hm-tab").forEach((btn) => {
      btn.addEventListener("click", () => this.setMetric(btn.dataset.metric));
    });
  }
}

function restoreMetric() {
  try {
    const saved = localStorage.getItem("aether:hmMetric");
    if (saved && METRICS[saved]) return saved;
  } catch { /* ignore */ }
  return "temp";
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
    [-15, "#3a4d8f"], [-5, "#4a78c2"], [5, "#3da9a1"], [12, "#5cc77a"],
    [18, "#cdd86a"], [24, "#f0a557"], [30, "#e96a4d"], [36, "#a73838"],
  ];
  return interpStops(stops, t);
}

function colorForRain(pop) {
  if (pop == null) return "rgba(255,255,255,0.05)";
  const stops = [
    [0, "#1a1f33"], [10, "#22324a"], [30, "#27435f"],
    [55, "#3e7cb1"], [80, "#67a8dd"], [100, "#a3c9f2"],
  ];
  return interpStops(stops, pop);
}

function colorForWind(w, lo, hi) {
  if (w == null) return "rgba(255,255,255,0.05)";
  // Map domain into 0..50 km/h for visual stability across regions.
  const cap = Math.max(20, Math.min(60, hi));
  const stops = [
    [0,  "#1f2436"],
    [cap * 0.2, "#3a577a"],
    [cap * 0.4, "#5a8eae"],
    [cap * 0.6, "#9bb1c4"],
    [cap * 0.8, "#d6c79a"],
    [cap,       "#c08a4f"],
  ];
  return interpStops(stops, w);
}

function interpStops(stops, v) {
  if (v <= stops[0][0]) return stops[0][1];
  if (v >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [lo, loC] = stops[i];
    const [hi, hiC] = stops[i + 1];
    if (v >= lo && v <= hi) {
      const frac = (v - lo) / Math.max(0.0001, hi - lo);
      return mixColor(loC, hiC, frac);
    }
  }
  return stops[stops.length - 1][1];
}

function mixColor(a, b, t) {
  const ax = parseInt(a.slice(1), 16);
  const bx = parseInt(b.slice(1), 16);
  const ar = (ax >> 16) & 0xff, ag = (ax >> 8) & 0xff, ab = ax & 0xff;
  const br = (bx >> 16) & 0xff, bg = (bx >> 8) & 0xff, bb = bx & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}
