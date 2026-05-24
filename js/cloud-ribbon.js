// Hourly cloud-cover ribbon. Each of the next 24 hours is a vertical band whose
// colour depth maps to cloud cover (0 % → transparent blue, 100 % → opaque grey).
// Night hours pick up a deeper navy tint so the ribbon also reads as a quick
// "when is it day?" map.

export class CloudRibbon {
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

    const html = this.hours.map((h, i) => {
      const cc = clamp(h.cloudCover ?? 0, 0, 100);
      const opacity = (0.18 + (cc / 100) * 0.72).toFixed(2);
      const night = h.isDay === false;
      const base = night ? "30, 36, 56" : "200, 210, 225";
      const tick = new Date(h.time).getHours();
      const showTick = tick % 6 === 0;
      return `
        <button class="cribbon-cell" data-i="${i}" data-ts="${h.time}"
                title="${tick}:00 · ${Math.round(cc)}% cloud${night ? " (night)" : ""}"
                style="--base:${base};--alpha:${opacity}">
          ${showTick ? `<span class="cribbon-tick">${pad(tick)}</span>` : ""}
        </button>
      `;
    }).join("");

    this.root.innerHTML = html;
    this.root.querySelectorAll(".cribbon-cell").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ts = parseInt(btn.dataset.ts, 10);
        if (ts) this.onCellClick?.(ts);
      });
    });
  }

  highlight(idx) {
    if (!this.root) return;
    this.root.querySelectorAll(".cribbon-cell").forEach((b) => b.classList.remove("active"));
    if (idx == null || idx < 0) return;
    this.root.querySelector(`.cribbon-cell[data-i="${idx}"]`)?.classList.add("active");
  }
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function pad(n) { return n.toString().padStart(2, "0"); }
