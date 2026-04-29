// 24-hour sky-cover ribbon. Each cell maps cloud coverage % to a colored bar:
// clear → warm gold, partly cloudy → muted, overcast → cool grey. Bar height
// rises with cloudiness so the next day's sunshine windows are obvious at a
// glance. Cells share the comfort-strip rhythm (hour ticks every 6h) and are
// clickable to scrub. Day/night toned by the hour's `isDay` flag.

export class SkyRibbon {
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
    const usable = this.hours.filter((h) => h.cloud != null);
    if (!usable.length) {
      this.root.innerHTML = "";
      this.root.hidden = true;
      return;
    }
    this.root.hidden = false;

    const cells = this.hours.map((h, i) => {
      const cloud = clamp(h.cloud ?? 0, 0, 100);
      const color = colorForCover(cloud, h.isDay);
      // Bar height: 22% for fully clear → 100% for fully overcast.
      const height = 22 + (cloud / 100) * 78;
      const tickHour = new Date(h.time).getHours();
      const showTick = tickHour % 6 === 0;
      const tickLabel = showTick ? `${tickHour.toString().padStart(2, "0")}:00` : "";
      return `
        <button class="sky-cell ${h.isDay ? "" : "is-night"}" data-i="${i}" data-ts="${h.time}"
                title="${tickHour}:00 · ${cloud}% cloud cover"
                style="--c:${color};--h:${height}%">
          <span class="sky-bar"></span>
          ${showTick ? `<span class="sky-tick">${tickLabel}</span>` : ""}
        </button>
      `;
    }).join("");
    this.root.innerHTML = cells;

    this.root.querySelectorAll(".sky-cell").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ts = parseInt(btn.dataset.ts, 10);
        if (ts) this.onCellClick?.(ts);
      });
    });
  }

  highlight(idx) {
    if (!this.root) return;
    this.root.querySelectorAll(".sky-cell").forEach((b) => b.classList.remove("active"));
    if (idx == null || idx < 0) return;
    const cell = this.root.querySelector(`.sky-cell[data-i="${idx}"]`);
    cell?.classList.add("active");
  }
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Cloud cover % → color. Day cells lean warm/gold for clear sky. Night cells
// lean blue-violet for clear, fading to neutral grey at full overcast.
function colorForCover(cover, isDay) {
  const t = cover / 100;
  if (isDay) {
    // 0% → sun gold, 50% → soft straw, 100% → cool grey.
    if (t <= 0.5) return mix("#ffd76b", "#cdbe9d", t * 2);
    return mix("#cdbe9d", "#7d8597", (t - 0.5) * 2);
  }
  // Night: 0% → starry indigo, 100% → muted slate.
  if (t <= 0.5) return mix("#6f86c4", "#5d6c8a", t * 2);
  return mix("#5d6c8a", "#3a4150", (t - 0.5) * 2);
}

function mix(a, b, t) {
  const ax = parseInt(a.slice(1), 16);
  const bx = parseInt(b.slice(1), 16);
  const ar = (ax >> 16) & 0xff, ag = (ax >> 8) & 0xff, ab = ax & 0xff;
  const br = (bx >> 16) & 0xff, bg = (bx >> 8) & 0xff, bb = bx & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}
