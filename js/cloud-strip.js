// Compact 24-hour cloud-cover strip. Reads `cloudCover` (0..100) from each
// hourly entry and renders one gradient cell per hour, from clear-sky blue
// to overcast grey. Sits alongside the wind / UV / comfort strips so the
// full sky story is legible at a glance.

export class CloudStrip {
  constructor({ rootEl, onCellClick }) {
    this.root = rootEl;
    this.onCellClick = onCellClick;
    this.hours = [];
  }

  setHours(hours) {
    this.hours = (hours || []).slice(0, 24);
    this.render();
  }

  render() {
    if (!this.root) return;
    const usable = this.hours.filter((h) => h.cloudCover != null);
    if (!usable.length) {
      this.root.hidden = true;
      this.root.innerHTML = "";
      return;
    }
    this.root.hidden = false;

    const cells = this.hours.map((h, i) => {
      const cc = h.cloudCover;
      if (cc == null) return `<span class="cls-cell empty" data-i="${i}"></span>`;
      const norm = Math.max(0, Math.min(1, cc / 100));
      const label = cloudLabel(cc);
      const color = colorForCloud(cc, h.isDay);
      const tickHour = new Date(h.time).getHours();
      const showTick = tickHour % 6 === 0;
      const title = `${tickHour}:00 · ${Math.round(cc)}% cloud · ${label}`;
      return `
        <button class="cls-cell" data-i="${i}" data-ts="${h.time}"
                title="${title}"
                aria-label="Cloud cover at ${tickHour}:00 — ${label}, ${Math.round(cc)} percent"
                style="--c:${color};--o:${(0.35 + norm * 0.55).toFixed(2)}">
          <span class="cls-bar"></span>
          ${showTick ? `<span class="cls-tick">${tickHour.toString().padStart(2, "0")}</span>` : ""}
        </button>`;
    }).join("");
    this.root.innerHTML = cells;

    this.root.querySelectorAll(".cls-cell").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ts = parseInt(btn.dataset.ts, 10);
        if (ts) this.onCellClick?.(ts);
      });
    });
  }

  highlight(idx) {
    if (!this.root) return;
    this.root.querySelectorAll(".cls-cell").forEach((b) => b.classList.remove("active"));
    if (idx == null || idx < 0) return;
    const cell = this.root.querySelector(`.cls-cell[data-i="${idx}"]`);
    cell?.classList.add("active");
  }
}

function cloudLabel(cc) {
  if (cc < 12) return "Clear";
  if (cc < 30) return "Mostly clear";
  if (cc < 60) return "Partly cloudy";
  if (cc < 85) return "Mostly cloudy";
  return "Overcast";
}

// Clear (blue-ish) -> overcast (grey). Day tones warmer, night cooler.
function colorForCloud(cc, isDay) {
  const clear = isDay ? "#7fc2f0" : "#3a4d70";
  const overcast = isDay ? "#8a94a3" : "#4a5266";
  const t = Math.max(0, Math.min(1, cc / 100));
  return mixHex(clear, overcast, t);
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
