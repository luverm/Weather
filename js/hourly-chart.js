// Interactive hourly chart: temperature line + precipitation probability bars.
// Fills the full 24-point domain, synced to the scrubber cursor.

const W = 600;
const H = 140;
const PAD_LEFT = 6;
const PAD_RIGHT = 6;
const PAD_TOP = 16;
const PAD_BOT = 22;

export class HourlyChart {
  constructor({ svgEl, hoverEl, popoverEl, onHoverHour, getUnit, getTimezone }) {
    this.svg = svgEl;
    this.hoverEl = hoverEl;
    this.popover = popoverEl;
    this.onHoverHour = onHoverHour;
    this.getUnit = getUnit || (() => "C");
    this.getTimezone = getTimezone || (() => null);
    this.hours = [];
    this.points = [];
    this._bind();
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

  _hourOf(ts) {
    const tz = this.getTimezone();
    if (tz && tz !== "auto") {
      try {
        const parts = new Intl.DateTimeFormat(undefined, {
          timeZone: tz, hour: "2-digit", hour12: false,
        }).formatToParts(new Date(ts));
        const h = parts.find((p) => p.type === "hour")?.value ?? "00";
        return h.padStart(2, "0");
      } catch { /* */ }
    }
    return new Date(ts).getHours().toString().padStart(2, "0");
  }

  setHours(hours) {
    this.hours = (hours || []).slice(0, 24);
    this._draw();
    this.setCursor(null);
  }

  refresh() { this._draw(); }

  setCursor(ts) {
    const cursor = this.svg.querySelector("#chart-cursor");
    const dot = this.svg.querySelector("#chart-dot");
    if (!ts || !this.points.length) {
      cursor.setAttribute("x1", "-10"); cursor.setAttribute("x2", "-10");
      dot.setAttribute("cx", "-10"); dot.setAttribute("cy", "-10");
      return;
    }
    // Find nearest point.
    let best = 0, bestDiff = Infinity;
    for (let i = 0; i < this.hours.length; i++) {
      const d = Math.abs(this.hours[i].time - ts);
      if (d < bestDiff) { bestDiff = d; best = i; }
    }
    const p = this.points[best];
    if (!p) return;
    cursor.setAttribute("x1", p.x); cursor.setAttribute("x2", p.x);
    dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y);
  }

  _bind() {
    const toHourIndex = (evt) => {
      const rect = this.svg.getBoundingClientRect();
      const x = (evt.clientX - rect.left) / rect.width * W;
      let best = -1, bestDiff = Infinity;
      for (let i = 0; i < this.points.length; i++) {
        const d = Math.abs(this.points[i].x - x);
        if (d < bestDiff) { bestDiff = d; best = i; }
      }
      return best;
    };
    this.svg.addEventListener("pointermove", (e) => {
      if (!this.hours.length) return;
      const i = toHourIndex(e);
      if (i < 0) return;
      const h = this.hours[i];
      this._showHover(h);
      const p = this.points[i];
      const cursor = this.svg.querySelector("#chart-cursor");
      const dot = this.svg.querySelector("#chart-dot");
      cursor.setAttribute("x1", p.x); cursor.setAttribute("x2", p.x);
      dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y);
      this._positionPopover(p, h);
    });
    this.svg.addEventListener("pointerleave", () => {
      if (this.hoverEl) this.hoverEl.hidden = true;
      if (this.popover) {
        this.popover.classList.remove("show");
        this.popover.hidden = true;
      }
    });
    this.svg.addEventListener("click", (e) => {
      const i = toHourIndex(e);
      if (i < 0) return;
      this.onHoverHour?.(this.hours[i].time);
    });
  }

  _showHover(h) {
    if (!this.hoverEl) return;
    const unit = this.getUnit();
    const t = unit === "F" ? h.temp * 9 / 5 + 32 : h.temp;
    this.hoverEl.textContent = `${this._formatHour(h.time)} · ${Math.round(t)}° · ${h.pop}% chance`;
    this.hoverEl.hidden = false;
  }

  _positionPopover(point, h) {
    if (!this.popover) return;
    const rect = this.svg.getBoundingClientRect();
    const wrapRect = this.popover.parentElement.getBoundingClientRect();
    const sx = rect.width / 600;
    const sy = rect.height / 140;
    const pxX = (rect.left - wrapRect.left) + point.x * sx;
    const pxY = (rect.top - wrapRect.top) + point.y * sy;
    const unit = this.getUnit();
    const t = unit === "F" ? h.temp * 9 / 5 + 32 : h.temp;
    const feels = h.feelsLike != null
      ? (unit === "F" ? h.feelsLike * 9 / 5 + 32 : h.feelsLike)
      : null;
    const feelsStr = (feels != null && Math.abs(feels - t) >= 1)
      ? `<em>feels ${Math.round(feels)}°</em>` : "";
    const wind = h.wind != null ? ` · ${Math.round(h.wind)} km/h` : "";
    const hum = h.humidity != null ? ` · ${Math.round(h.humidity)}% rh` : "";
    this.popover.innerHTML =
      `<strong>${this._formatHour(h.time)}</strong> ${Math.round(t)}° ${feelsStr}<br>` +
      `<em>${h.pop}% precip${wind}${hum}</em>`;
    this.popover.style.left = `${pxX.toFixed(1)}px`;
    this.popover.style.top = `${pxY.toFixed(1)}px`;
    this.popover.hidden = false;
    // Next frame to allow transition.
    requestAnimationFrame(() => this.popover.classList.add("show"));
  }

  _draw() {
    if (!this.hours.length) return;
    const innerW = W - PAD_LEFT - PAD_RIGHT;
    const innerH = H - PAD_TOP - PAD_BOT;

    const temps = this.hours.map((h) => h.temp).filter((v) => v != null);
    let tMin = Math.min(...temps);
    let tMax = Math.max(...temps);
    if (tMax - tMin < 4) {
      const mid = (tMin + tMax) / 2;
      tMin = mid - 2; tMax = mid + 2;
    }
    const span = tMax - tMin;
    const tToY = (t) => PAD_TOP + innerH - ((t - tMin) / span) * innerH;
    const iToX = (i) => PAD_LEFT + (i / (this.hours.length - 1)) * innerW;

    this.points = this.hours.map((h, i) => ({ x: iToX(i), y: tToY(h.temp) }));

    // Temp line path
    let linePath = "";
    this.points.forEach((p, i) => {
      linePath += (i === 0 ? "M" : "L") + p.x.toFixed(1) + "," + p.y.toFixed(1) + " ";
    });
    // Fill path (closed to bottom)
    const lastX = this.points[this.points.length - 1].x;
    const firstX = this.points[0].x;
    const fillPath =
      linePath +
      `L${lastX.toFixed(1)},${(PAD_TOP + innerH).toFixed(1)} ` +
      `L${firstX.toFixed(1)},${(PAD_TOP + innerH).toFixed(1)} Z`;
    this.svg.querySelector("#chart-temp-line").setAttribute("d", linePath.trim());
    this.svg.querySelector("#chart-temp-fill").setAttribute("d", fillPath);

    // Gust dashed line — mapped onto the lower half of the plot so it
    // doesn't collide with the temperature line. Shows relative magnitude.
    const gustLine = this.svg.querySelector("#chart-gust-line");
    if (gustLine) {
      const gusts = this.hours.map((h) => h.gusts ?? h.wind).filter((v) => v != null);
      if (gusts.length) {
        const gMax = Math.max(20, ...gusts);
        // Gust line plotted in bottom 40% of chart, inverted.
        const gBot = PAD_TOP + innerH - 2;
        const gTop = PAD_TOP + innerH * 0.6;
        const gRange = gBot - gTop;
        let gPath = "";
        this.hours.forEach((h, i) => {
          const v = h.gusts ?? h.wind ?? 0;
          const y = gBot - (v / gMax) * gRange;
          gPath += (i === 0 ? "M" : "L") + iToX(i).toFixed(1) + "," + y.toFixed(1) + " ";
        });
        gustLine.setAttribute("d", gPath.trim());
      } else {
        gustLine.setAttribute("d", "");
      }
    }

    // Feels-like dashed line — only draw when it meaningfully diverges.
    const feelsLine = this.svg.querySelector("#chart-feels-line");
    if (feelsLine) {
      const hasFeels = this.hours.some((h) =>
        h.feelsLike != null && Math.abs(h.feelsLike - h.temp) >= 2
      );
      if (hasFeels) {
        let fPath = "";
        this.hours.forEach((h, i) => {
          const v = h.feelsLike ?? h.temp;
          fPath += (i === 0 ? "M" : "L") + iToX(i).toFixed(1) + "," + tToY(v).toFixed(1) + " ";
        });
        feelsLine.setAttribute("d", fPath.trim());
        feelsLine.setAttribute("opacity", "0.55");
      } else {
        feelsLine.setAttribute("d", "");
      }
    }

    // Precipitation probability bars (0-100% -> 0..12px height)
    const precipG = this.svg.querySelector("#chart-precip");
    precipG.innerHTML = "";
    const barW = Math.max(4, innerW / this.hours.length - 3);
    this.hours.forEach((h, i) => {
      const pop = Math.max(0, Math.min(100, h.pop || 0));
      if (pop < 5) return;
      const barH = (pop / 100) * 26;
      const x = iToX(i) - barW / 2;
      const y = H - PAD_BOT - barH + 4;
      const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      r.setAttribute("x", x.toFixed(1));
      r.setAttribute("y", y.toFixed(1));
      r.setAttribute("width", barW.toFixed(1));
      r.setAttribute("height", barH.toFixed(1));
      r.setAttribute("rx", "1.5");
      r.setAttribute("opacity", (0.35 + (pop / 100) * 0.55).toFixed(2));
      precipG.appendChild(r);
    });

    // Night shading: dim rectangles where !isDay
    const nightG = this.svg.querySelector("#chart-night");
    nightG.innerHTML = "";
    let runStart = null;
    for (let i = 0; i <= this.hours.length; i++) {
      const dark = i < this.hours.length && !this.hours[i].isDay;
      if (dark && runStart == null) runStart = i;
      if ((!dark || i === this.hours.length) && runStart != null) {
        const x1 = iToX(Math.max(0, runStart - 0.5));
        const x2 = iToX(Math.min(this.hours.length - 1, i - 0.5));
        const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        r.setAttribute("x", x1.toFixed(1));
        r.setAttribute("y", "0");
        r.setAttribute("width", Math.max(0, x2 - x1).toFixed(1));
        r.setAttribute("height", String(H));
        nightG.appendChild(r);
        runStart = null;
      }
    }

    // Labels: every ~3 hours
    const unit = this.getUnit();
    const labG = this.svg.querySelector("#chart-labels");
    labG.innerHTML = "";
    const labelStep = Math.max(3, Math.floor(this.hours.length / 8));

    // Pre-compute extreme indices so we can suppress overlapping per-3hr labels.
    const extremes = this._findExtremes();

    this.hours.forEach((h, i) => {
      if (i % labelStep !== 0) return;
      const hh = this._hourOf(h.time);
      const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      txt.setAttribute("x", iToX(i).toFixed(1));
      txt.setAttribute("y", String(H - 4));
      txt.setAttribute("text-anchor", "middle");
      txt.textContent = `${hh}`;
      labG.appendChild(txt);
      // Temp label above point — skip when an extremes pin lands on the same hour.
      if (i === extremes.hiIdx || i === extremes.loIdx) return;
      const tVal = unit === "F" ? h.temp * 9 / 5 + 32 : h.temp;
      const tTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      tTxt.setAttribute("x", iToX(i).toFixed(1));
      tTxt.setAttribute("y", (tToY(h.temp) - 8).toFixed(1));
      tTxt.setAttribute("text-anchor", "middle");
      tTxt.setAttribute("class", "temp-point");
      tTxt.textContent = `${Math.round(tVal)}°`;
      labG.appendChild(tTxt);
    });

    this._drawAnnotations(extremes, iToX, tToY);
  }

  // ---------- Annotations (hi/lo, peak precip, sunrise/sunset) ----------
  _findExtremes() {
    const out = { hiIdx: -1, loIdx: -1, popIdx: -1, sunrise: -1, sunset: -1 };
    if (!this.hours.length) return out;
    let hi = -Infinity, lo = Infinity, popMax = -1;
    for (let i = 0; i < this.hours.length; i++) {
      const h = this.hours[i];
      if (h.temp != null) {
        if (h.temp > hi) { hi = h.temp; out.hiIdx = i; }
        if (h.temp < lo) { lo = h.temp; out.loIdx = i; }
      }
      const pop = h.pop ?? 0;
      if (pop > popMax && pop >= 30) { popMax = pop; out.popIdx = i; }
      // Sun events from isDay transitions.
      if (i > 0) {
        const prev = !!this.hours[i - 1].isDay;
        const curr = !!h.isDay;
        if (!prev && curr && out.sunrise < 0) out.sunrise = i;
        if (prev && !curr && out.sunset < 0) out.sunset = i;
      }
    }
    // Hi == Lo: chart is essentially flat — skip both to avoid clutter.
    if (out.hiIdx === out.loIdx) { out.hiIdx = -1; out.loIdx = -1; }
    return out;
  }

  _drawAnnotations(ex, iToX, tToY) {
    const annG = this.svg.querySelector("#chart-annotations");
    if (!annG) return;
    annG.innerHTML = "";
    const unit = this.getUnit();
    const NS = "http://www.w3.org/2000/svg";

    const make = (tag, attrs, text) => {
      const el = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      if (text != null) el.textContent = text;
      return el;
    };

    // Sunrise / sunset vertical guides.
    const drawSunEvent = (idx, kind) => {
      if (idx < 0 || idx >= this.hours.length) return;
      const x = iToX(idx);
      const yTop = PAD_TOP - 2;
      const yBot = H - PAD_BOT;
      const cls = `chart-sun-line ${kind}`;
      annG.appendChild(make("line", {
        x1: x.toFixed(1), x2: x.toFixed(1),
        y1: yTop.toFixed(1), y2: yBot.toFixed(1),
        class: cls,
      }));
      annG.appendChild(make("text", {
        x: x.toFixed(1), y: (yTop + 7).toFixed(1),
        "text-anchor": "middle", class: `chart-sun-glyph ${kind}`,
      }, kind === "sunrise" ? "↑" : "↓"));
    };
    drawSunEvent(ex.sunrise, "sunrise");
    drawSunEvent(ex.sunset, "sunset");

    // Hi/Lo temp pins.
    const drawTempPin = (idx, kind) => {
      if (idx < 0) return;
      const h = this.hours[idx];
      if (h?.temp == null) return;
      const x = iToX(idx);
      const y = tToY(h.temp);
      const t = unit === "F" ? h.temp * 9 / 5 + 32 : h.temp;
      const isHi = kind === "hi";
      // Anchor label at the chart edge to avoid clipping when the
      // extreme falls at hour 0 or 23.
      let anchor = "middle";
      const innerW = W - PAD_LEFT - PAD_RIGHT;
      if (x < PAD_LEFT + 30) anchor = "start";
      else if (x > PAD_LEFT + innerW - 30) anchor = "end";
      // Flip pin inward when the extreme lies near the chart's top or
      // bottom edge so the label doesn't clip or overlap precip bars.
      const aboveOK = y - 18 >= PAD_TOP;
      const belowOK = y + 22 <= H - PAD_BOT - 2;
      const placeAbove = isHi ? aboveOK : !belowOK && aboveOK;
      // Triangle always points toward the temperature dot.
      let tri, yLabel;
      if (placeAbove) {
        const apexY = y - 3;
        const baseY = y - 8;
        tri = `M${x.toFixed(1)},${apexY.toFixed(1)} `
            + `L${(x - 3.2).toFixed(1)},${baseY.toFixed(1)} `
            + `L${(x + 3.2).toFixed(1)},${baseY.toFixed(1)} Z`;
        yLabel = y - 12;
      } else {
        const apexY = y + 3;
        const baseY = y + 8;
        tri = `M${x.toFixed(1)},${apexY.toFixed(1)} `
            + `L${(x - 3.2).toFixed(1)},${baseY.toFixed(1)} `
            + `L${(x + 3.2).toFixed(1)},${baseY.toFixed(1)} Z`;
        yLabel = y + 18;
      }
      annG.appendChild(make("path", { d: tri, class: `chart-pin-tri ${kind}` }));
      annG.appendChild(make("text", {
        x: x.toFixed(1), y: yLabel.toFixed(1),
        "text-anchor": anchor, class: `chart-pin-label ${kind}`,
      }, `${isHi ? "Hi" : "Lo"} ${Math.round(t)}°`));
    };
    drawTempPin(ex.hiIdx, "hi");
    drawTempPin(ex.loIdx, "lo");

    // Peak precipitation marker (rendered just above the bar).
    if (ex.popIdx >= 0) {
      const h = this.hours[ex.popIdx];
      const pop = Math.max(0, Math.min(100, h.pop || 0));
      const x = iToX(ex.popIdx);
      const barH = (pop / 100) * 26;
      const barTop = H - PAD_BOT - barH + 4;
      const yMark = barTop - 5;
      // Tiny teardrop glyph (Bezier rounded base + pointed top).
      annG.appendChild(make("path", {
        d: `M${x.toFixed(1)},${(yMark - 4).toFixed(1)} `
          + `C${(x - 2.6).toFixed(1)},${(yMark - 1).toFixed(1)} `
          + `${(x - 2.6).toFixed(1)},${(yMark + 2.4).toFixed(1)} `
          + `${x.toFixed(1)},${(yMark + 2.4).toFixed(1)} `
          + `C${(x + 2.6).toFixed(1)},${(yMark + 2.4).toFixed(1)} `
          + `${(x + 2.6).toFixed(1)},${(yMark - 1).toFixed(1)} `
          + `${x.toFixed(1)},${(yMark - 4).toFixed(1)} Z`,
        class: "chart-pin-drop",
      }));
      const innerW = W - PAD_LEFT - PAD_RIGHT;
      let anchor = "middle";
      if (x < PAD_LEFT + 22) anchor = "start";
      else if (x > PAD_LEFT + innerW - 22) anchor = "end";
      annG.appendChild(make("text", {
        x: x.toFixed(1), y: (yMark - 8).toFixed(1),
        "text-anchor": anchor, class: "chart-pin-label pop",
      }, `${Math.round(pop)}%`));
    }
  }
}
