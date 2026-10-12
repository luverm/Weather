// Weekly temperature heatmap: 7 days × 24 hours.
// Groups extended hourly data by local day and renders a grid of cells
// coloured by temperature (cool blue → warm red), with a day/night overlay.
//
// Hovering a cell populates a popover with hour + temp + condition.

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export class WeekHeatmap {
  constructor({ rootEl, popoverEl, legendEl, modeBtns, onCellClick, getUnit }) {
    this.root = rootEl;
    this.popover = popoverEl;
    this.legend = legendEl;
    this.modeBtns = modeBtns || [];
    this.onCellClick = onCellClick || (() => {});
    this.getUnit = getUnit || (() => "C");
    this.hours = [];
    this.mode = localStorage.getItem("aether:heatmap-mode") || "temp";
    this.bindModeBtns();
    this.hidePopover = this.hidePopover.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.root.addEventListener("mouseleave", this.hidePopover);
    this.root.addEventListener("keydown", this.handleKeydown);
  }

  handleKeydown(e) {
    const cells = Array.from(this.root.querySelectorAll(".heatmap-cell:not(.empty)"));
    const current = document.activeElement;
    if (!cells.length || !current || !current.classList?.contains("heatmap-cell")) return;
    const idx = cells.indexOf(current);
    if (idx < 0) return;
    const cols = 24;
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    let next = idx;
    switch (e.key) {
      case "ArrowRight": next = idx + 1; break;
      case "ArrowLeft":  next = idx - 1; break;
      case "ArrowDown":  next = Math.min(cells.length - 1, idx + cols); break;
      case "ArrowUp":    next = Math.max(0, idx - cols); break;
      case "Home":       next = row * cols; break;
      case "End":        next = Math.min(cells.length - 1, row * cols + cols - 1); break;
      default: return;
    }
    e.preventDefault();
    e.stopPropagation();
    const target = cells[Math.max(0, Math.min(cells.length - 1, next))];
    if (target) {
      target.setAttribute("tabindex", "0");
      target.focus();
      // Reset tabindex on previous.
      if (current !== target) current.setAttribute("tabindex", "-1");
    }
  }

  bindModeBtns() {
    this.modeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.setMode(btn.dataset.mode);
      });
    });
    this.refreshModeBtns();
  }

  refreshModeBtns() {
    this.modeBtns.forEach((btn) => {
      btn.classList.toggle("on", btn.dataset.mode === this.mode);
      btn.setAttribute("aria-pressed", btn.dataset.mode === this.mode ? "true" : "false");
    });
  }

  setMode(mode) {
    if (!mode || mode === this.mode) return;
    this.mode = mode;
    try { localStorage.setItem("aether:heatmap-mode", mode); } catch { /* ignore */ }
    this.refreshModeBtns();
    this.render();
  }

  setHours(hours) {
    this.hours = Array.isArray(hours) ? hours : [];
    this.render();
  }

  setCursor(ts) {
    if (!this.root) return;
    this.root.querySelectorAll(".heatmap-cell.scrubbed").forEach((el) => el.classList.remove("scrubbed"));
    if (ts == null) return;
    const hourKey = ts - (ts % 3600_000);
    const cells = this.root.querySelectorAll(".heatmap-cell[data-hour-ts]");
    for (const cell of cells) {
      const cellTs = parseInt(cell.dataset.hourTs, 10);
      const cellHour = cellTs - (cellTs % 3600_000);
      if (cellHour === hourKey) {
        cell.classList.add("scrubbed");
        break;
      }
    }
  }

  render() {
    if (!this.root) return;
    this.root.innerHTML = "";
    this.hidePopover();
    if (!this.hours.length) {
      this.root.setAttribute("data-empty", "true");
      if (this.legend) this.legend.textContent = "No forecast";
      return;
    }
    this.root.removeAttribute("data-empty");

    // Group by local day. Keys are "YYYY-MM-DD" so the sort is lexicographic
    // and matches chronology regardless of timezone offsets.
    const buckets = new Map();
    for (const h of this.hours) {
      const d = new Date(h.time);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!buckets.has(key)) buckets.set(key, { date: d, rows: new Array(24).fill(null) });
      const slot = buckets.get(key);
      slot.rows[d.getHours()] = h;
    }
    // Pick 7 days starting with today — not the earliest bucket. If past
    // hours are present (from hourlyExtended's lookback) they end up in
    // today's row at their own hour slot, which is useful; but we don't
    // want yesterday eating a whole row.
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const sorted = Array.from(buckets.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
    const todayIdx = sorted.findIndex(([k]) => k >= todayKey);
    const days = (todayIdx >= 0 ? sorted.slice(todayIdx) : sorted).slice(0, 7);

    const field = this.mode;
    const values = [];
    for (const [, { rows }] of days) {
      for (const r of rows) if (r && r[field] != null) values.push(r[field]);
    }
    let vMin = Math.min(...values);
    let vMax = Math.max(...values);
    if (field === "pop") { vMin = 0; vMax = 100; }
    if (field === "wind") { vMin = Math.max(0, vMin); vMax = Math.max(vMax, vMin + 1); }
    if (vMin === vMax) vMax = vMin + 1;

    const unit = this.getUnit();
    const now = Date.now();
    const nowKey = now - (now % 3600_000);

    // Header row with hour labels. The grid's first column is the day label,
    // so hour labels start at column 2.
    const header = document.createElement("div");
    header.className = "heatmap-row heatmap-header";
    header.appendChild(spacerCell());
    for (let hr = 0; hr < 24; hr += 3) {
      const label = document.createElement("span");
      label.className = "heatmap-hour-label";
      label.style.gridColumn = `${hr + 2} / span 3`;
      label.textContent = `${hr}`;
      header.appendChild(label);
    }
    this.root.appendChild(header);

    let firstFocusable = null;
    for (const [, { date, rows }] of days) {
      const row = document.createElement("div");
      row.className = "heatmap-row";
      const dayLabel = document.createElement("span");
      dayLabel.className = "heatmap-day-label";
      const isToday = sameDay(date, new Date());
      dayLabel.textContent = isToday ? "Today" : DAY_LABELS[date.getDay()];
      dayLabel.title = date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
      if (isToday) dayLabel.classList.add("today");
      row.appendChild(dayLabel);

      for (let hr = 0; hr < 24; hr++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "heatmap-cell";
        cell.setAttribute("tabindex", "-1");
        if (!firstFocusable) {
          // Marked after we know the first non-empty cell exists below.
        }
        const h = rows[hr];
        if (!h) {
          cell.classList.add("empty");
        } else {
          const v = h[field];
          if (v == null) {
            cell.classList.add("empty");
          } else {
            const t = Math.max(0, Math.min(1, (v - vMin) / (vMax - vMin)));
            cell.style.background = colorFor(field, t);
            cell.classList.toggle("night", !h.isDay);
            cell.dataset.hourTs = String(h.time);
            const cellTs = h.time - (h.time % 3600_000);
            if (cellTs === nowKey) cell.classList.add("now");
            cell.addEventListener("mouseenter", () => this.showPopover(cell, h, date, hr));
            cell.addEventListener("focus", () => this.showPopover(cell, h, date, hr));
            cell.addEventListener("click", () => this.onCellClick(h.time));
            cell.setAttribute("aria-label", `${date.toLocaleDateString([], { weekday: "short" })} ${hr}:00 — ${h.label || ""}`);
            if (!firstFocusable) {
              firstFocusable = cell;
              cell.setAttribute("tabindex", "0");
            }
          }
        }
        row.appendChild(cell);
      }
      this.root.appendChild(row);
    }

    if (this.legend) {
      const low = formatValue(field, vMin, unit);
      const high = formatValue(field, vMax, unit);
      this.legend.innerHTML = `<span class="heatmap-legend-lo">${low}</span>
        <span class="heatmap-legend-bar" data-mode="${field}"></span>
        <span class="heatmap-legend-hi">${high}</span>`;
    }
  }

  showPopover(cell, h, date, hr) {
    if (!this.popover) return;
    const unit = this.getUnit();
    const temp = formatValue("temp", h.temp, unit);
    const pop = h.pop != null ? `${Math.round(h.pop)}%` : "—";
    const wind = h.wind != null ? `${Math.round(h.wind)} km/h` : "—";
    const dayLabel = date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    const hourLabel = `${String(hr).padStart(2, "0")}:00`;
    this.popover.innerHTML = `
      <strong>${dayLabel} · ${hourLabel}</strong>
      <span>${h.label || "—"}</span>
      <span class="heatmap-pop-row">
        <span>${temp}</span>
        <span>${pop} rain</span>
        <span>${wind}</span>
      </span>`;
    const rootBox = this.root.getBoundingClientRect();
    const cellBox = cell.getBoundingClientRect();
    const x = cellBox.left - rootBox.left + cellBox.width / 2;
    const y = cellBox.top - rootBox.top - 8;
    this.popover.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    this.popover.hidden = false;
  }

  hidePopover() {
    if (this.popover) this.popover.hidden = true;
  }
}

function spacerCell() {
  const el = document.createElement("span");
  el.className = "heatmap-day-label spacer";
  el.setAttribute("aria-hidden", "true");
  return el;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function colorFor(field, t) {
  if (field === "pop") {
    // Blue scale — stronger blues as rain chance rises.
    const alpha = 0.08 + t * 0.75;
    return `hsla(${210 - t * 30}, 85%, ${65 - t * 20}%, ${alpha})`;
  }
  if (field === "wind") {
    // Teal → amber.
    const h = 190 - t * 150;
    return `hsla(${h}, 80%, ${60 - t * 10}%, ${0.18 + t * 0.65})`;
  }
  // temperature: deep blue → amber → red.
  // Clamp hue through cold (220) → mid (40) → hot (0).
  let hue;
  if (t < 0.5) hue = 220 - t * 2 * 180;
  else hue = 40 - (t - 0.5) * 2 * 40;
  const light = 55 - Math.abs(t - 0.5) * 20;
  return `hsla(${hue}, 85%, ${light}%, ${0.75})`;
}

function formatValue(field, v, unit) {
  if (v == null || isNaN(v)) return "—";
  if (field === "temp") {
    const t = unit === "F" ? v * 9 / 5 + 32 : v;
    return `${Math.round(t)}°${unit}`;
  }
  if (field === "pop") return `${Math.round(v)}%`;
  if (field === "wind") return `${Math.round(v)} km/h`;
  return `${Math.round(v)}`;
}
