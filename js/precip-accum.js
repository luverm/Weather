// Cumulative precipitation strip: shows running total mm over the next 24h
// as a small area chart, plus a "≈ X mm by HH:00" headline. Hides itself
// when there's no meaningful precipitation in the window.

const W = 600;
const H = 30;
const PAD_X = 6;
const PAD_TOP = 4;
const PAD_BOT = 6;

export class PrecipAccum {
  constructor({ rootEl, getTimezone, getUnit }) {
    this.root = rootEl;
    this.getTimezone = getTimezone || (() => null);
    this.getUnit = getUnit || (() => "C");
    this.hours = [];
    if (this.root) this._scaffold();
  }

  _scaffold() {
    this.root.innerHTML = `
      <div class="precip-accum-head">
        <span class="precip-accum-title">Rainfall</span>
        <span class="precip-accum-total" id="precip-accum-total">—</span>
      </div>
      <svg class="precip-accum-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="precip-accum-fill-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#9ad1ff" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="#9ad1ff" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path class="precip-accum-fill" fill="url(#precip-accum-fill-grad)"></path>
        <path class="precip-accum-line" fill="none" stroke="#9ad1ff" stroke-width="1.4"
              stroke-linejoin="round" stroke-linecap="round"></path>
        <g class="precip-accum-ticks"></g>
      </svg>
    `;
    this.svg = this.root.querySelector("svg");
    this.fill = this.root.querySelector(".precip-accum-fill");
    this.line = this.root.querySelector(".precip-accum-line");
    this.ticks = this.root.querySelector(".precip-accum-ticks");
    this.total = this.root.querySelector("#precip-accum-total");
  }

  setHours(hours) {
    this.hours = (hours || []).slice(0, 24);
    this._draw();
  }

  _draw() {
    if (!this.root || !this.hours.length) {
      if (this.root) this.root.hidden = true;
      return;
    }
    // Build cumulative series.
    let total = 0;
    const cum = this.hours.map((h) => {
      total += Math.max(0, h.precip ?? 0);
      return total;
    });
    if (total < 0.6) {
      this.root.hidden = true;
      return;
    }
    this.root.hidden = false;

    const innerW = W - PAD_X * 2;
    const innerH = H - PAD_TOP - PAD_BOT;
    const max = Math.max(total, 1);
    const iToX = (i) => PAD_X + (i / (cum.length - 1)) * innerW;
    const vToY = (v) => PAD_TOP + innerH - (v / max) * innerH;

    let line = "";
    cum.forEach((v, i) => {
      line += (i === 0 ? "M" : "L") + iToX(i).toFixed(1) + "," + vToY(v).toFixed(1) + " ";
    });
    const fill = line + `L${iToX(cum.length - 1).toFixed(1)},${(PAD_TOP + innerH).toFixed(1)} `
                      + `L${iToX(0).toFixed(1)},${(PAD_TOP + innerH).toFixed(1)} Z`;
    this.line.setAttribute("d", line.trim());
    this.fill.setAttribute("d", fill);

    // A tick mark at the moment we cross 50% of the eventual total — tells
    // the user roughly when the bulk arrives.
    this.ticks.innerHTML = "";
    const midThreshold = total * 0.5;
    const midIdx = cum.findIndex((v) => v >= midThreshold);
    if (midIdx > 0) {
      const tx = iToX(midIdx);
      const NS = "http://www.w3.org/2000/svg";
      const tk = document.createElementNS(NS, "line");
      tk.setAttribute("x1", tx.toFixed(1));
      tk.setAttribute("x2", tx.toFixed(1));
      tk.setAttribute("y1", String(PAD_TOP));
      tk.setAttribute("y2", String(H - PAD_BOT));
      tk.setAttribute("class", "precip-accum-mid");
      this.ticks.appendChild(tk);
    }

    // Headline label: "≈ 12 mm by 18:00".
    const lastHour = this.hours[this.hours.length - 1]?.time;
    const hh = lastHour ? this._formatHour(lastHour) : "";
    const totalStr = total >= 10 ? Math.round(total) : total.toFixed(1);
    const halfHour = midIdx > 0 ? this._formatHour(this.hours[midIdx].time) : null;
    const halfStr = halfHour ? ` · half by ${halfHour}` : "";
    this.total.textContent = `≈ ${totalStr} mm by ${hh}${halfStr}`;
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
