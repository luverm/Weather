// Compact 24-hour UV index strip: one bar per hour, coloured by UV band
// (low → moderate → high → very high → extreme) with a translucent bar
// scaled to the peak-of-day value. Complements the wind + comfort strips
// so a glance shows both wind and sunburn risk together.

export class UvStrip {
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
    const usable = this.hours.filter((h) => h.uv != null && h.uv > 0.05);
    if (!usable.length) {
      this.root.hidden = true;
      this.root.innerHTML = "";
      return;
    }
    this.root.hidden = false;
    const peak = Math.max(...usable.map((h) => h.uv), 3);

    const cells = this.hours.map((h, i) => {
      const uv = h.uv ?? 0;
      const isNight = uv < 0.05 || h.isDay === false;
      const norm = Math.max(0.04, Math.min(1, uv / peak));
      const color = colorForUv(uv);
      const tickHour = new Date(h.time).getHours();
      const showTick = tickHour % 6 === 0;
      const band = uvBand(uv);
      const cls = ["uvs-cell"];
      if (isNight) cls.push("night");
      const title = `${tickHour}:00 · UV ${uv.toFixed(1)} · ${band}`;
      return `
        <button class="${cls.join(" ")}" data-i="${i}" data-ts="${h.time}"
                title="${title}"
                aria-label="UV at ${tickHour}:00 — ${band}, index ${uv.toFixed(1)}"
                style="--c:${color};--h:${(norm * 100).toFixed(0)}%">
          <span class="uvs-bar"></span>
          ${showTick ? `<span class="uvs-tick">${tickHour.toString().padStart(2, "0")}</span>` : ""}
        </button>`;
    }).join("");
    this.root.innerHTML = cells;

    this.root.querySelectorAll(".uvs-cell").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ts = parseInt(btn.dataset.ts, 10);
        if (ts) this.onCellClick?.(ts);
      });
    });
  }

  highlight(idx) {
    if (!this.root) return;
    this.root.querySelectorAll(".uvs-cell").forEach((b) => b.classList.remove("active"));
    if (idx == null || idx < 0) return;
    const cell = this.root.querySelector(`.uvs-cell[data-i="${idx}"]`);
    cell?.classList.add("active");
  }
}

function uvBand(v) {
  if (v < 0.5) return "Night";
  if (v < 3) return "Low";
  if (v < 6) return "Moderate";
  if (v < 8) return "High";
  if (v < 11) return "Very high";
  return "Extreme";
}

function colorForUv(v) {
  const stops = [
    [0,  "#2d5a68"],   // pre-dawn / negligible
    [3,  "#57c26d"],   // low
    [6,  "#f0c968"],   // moderate
    [8,  "#f08a4a"],   // high
    [11, "#e05a4a"],   // very high
    [14, "#b64bd6"],   // extreme
  ];
  if (v <= stops[0][0]) return stops[0][1];
  if (v >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [lo, loC] = stops[i];
    const [hi, hiC] = stops[i + 1];
    if (v >= lo && v <= hi) {
      const frac = (v - lo) / (hi - lo);
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
