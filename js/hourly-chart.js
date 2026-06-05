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
    this._drawNow();
    this._drawSuns();
    this.setCursor(null);
  }

  setSunEvents(daily) {
    this.daily = daily || [];
    this._drawSuns();
  }

  refresh() { this._draw(); this._drawNow(); this._drawSuns(); }
  tickNow() { this._drawNow(); }

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

    // Freezing-point reference line. Only drawn when 0°C is within the chart's
    // visible temperature range — keeps the chart clean in mild seasons.
    const freezeG = this.svg.querySelector("#chart-freeze");
    if (freezeG) {
      freezeG.innerHTML = "";
      if (tMin <= 0 && tMax >= 0) {
        const y = tToY(0);
        const SVG = "http://www.w3.org/2000/svg";
        const line = document.createElementNS(SVG, "line");
        line.setAttribute("x1", String(PAD_LEFT));
        line.setAttribute("x2", String(W - PAD_RIGHT));
        line.setAttribute("y1", y.toFixed(1));
        line.setAttribute("y2", y.toFixed(1));
        line.setAttribute("class", "freeze-line");
        freezeG.appendChild(line);
        const label = document.createElementNS(SVG, "text");
        label.setAttribute("x", String(W - PAD_RIGHT - 4));
        label.setAttribute("y", (y - 3).toFixed(1));
        label.setAttribute("text-anchor", "end");
        label.setAttribute("class", "freeze-label");
        label.textContent = this.getUnit() === "F" ? "freezing (32°F)" : "freezing (0°)";
        freezeG.appendChild(label);
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
    // Find peak hi/lo indices first so we can skip duplicating their labels.
    let hiIdx = 0, loIdx = 0;
    for (let i = 1; i < this.hours.length; i++) {
      if (this.hours[i].temp > this.hours[hiIdx].temp) hiIdx = i;
      if (this.hours[i].temp < this.hours[loIdx].temp) loIdx = i;
    }
    this.hours.forEach((h, i) => {
      if (i % labelStep !== 0) return;
      if (i === hiIdx || i === loIdx) return; // hi/lo own their own labels below
      const hh = this._hourOf(h.time);
      const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      txt.setAttribute("x", iToX(i).toFixed(1));
      txt.setAttribute("y", String(H - 4));
      txt.setAttribute("text-anchor", "middle");
      txt.textContent = `${hh}`;
      labG.appendChild(txt);
      // Temp label above point
      const tVal = unit === "F" ? h.temp * 9 / 5 + 32 : h.temp;
      const tTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      tTxt.setAttribute("x", iToX(i).toFixed(1));
      tTxt.setAttribute("y", (tToY(h.temp) - 8).toFixed(1));
      tTxt.setAttribute("text-anchor", "middle");
      tTxt.setAttribute("class", "temp-point");
      tTxt.textContent = `${Math.round(tVal)}°`;
      labG.appendChild(tTxt);
    });
    // Distinct hi/lo annotations. Only emit when they meaningfully diverge.
    if (hiIdx !== loIdx && Math.abs(this.hours[hiIdx].temp - this.hours[loIdx].temp) >= 3) {
      this._extremeLabel(labG, this.hours[hiIdx], iToX(hiIdx), tToY(this.hours[hiIdx].temp), "hi", unit);
      this._extremeLabel(labG, this.hours[loIdx], iToX(loIdx), tToY(this.hours[loIdx].temp), "lo", unit);
    }
  }

  _extremeLabel(parent, hour, x, y, kind, unit) {
    const SVG = "http://www.w3.org/2000/svg";
    const tVal = unit === "F" ? hour.temp * 9 / 5 + 32 : hour.temp;
    // Small dot marker on the line.
    const dot = document.createElementNS(SVG, "circle");
    dot.setAttribute("cx", x.toFixed(1));
    dot.setAttribute("cy", y.toFixed(1));
    dot.setAttribute("r", "2.8");
    dot.setAttribute("class", `temp-extreme-dot temp-extreme-${kind}`);
    parent.appendChild(dot);
    // Label sits above (hi) or below (lo) the line so they don't collide.
    const above = kind === "hi";
    const ty = above ? (y - 9) : (y + 14);
    const txt = document.createElementNS(SVG, "text");
    txt.setAttribute("x", x.toFixed(1));
    txt.setAttribute("y", ty.toFixed(1));
    txt.setAttribute("text-anchor", "middle");
    txt.setAttribute("class", `temp-extreme temp-extreme-${kind}`);
    txt.textContent = `${above ? "↑" : "↓"} ${Math.round(tVal)}°`;
    parent.appendChild(txt);
    // Time stamp under the hour cell.
    const tm = document.createElementNS(SVG, "text");
    tm.setAttribute("x", x.toFixed(1));
    tm.setAttribute("y", String(H - 4));
    tm.setAttribute("text-anchor", "middle");
    tm.setAttribute("class", "temp-extreme-time");
    tm.textContent = this._hourOf(hour.time);
    parent.appendChild(tm);
  }

  // Translate a timestamp to an X coordinate within the chart's hour range.
  // Returns null if the timestamp is outside the visible window.
  _xForTime(ts) {
    if (!ts || !this.hours.length) return null;
    const first = this.hours[0].time;
    const last = this.hours[this.hours.length - 1].time;
    if (ts < first || ts > last) return null;
    const innerW = W - PAD_LEFT - PAD_RIGHT;
    return PAD_LEFT + ((ts - first) / (last - first)) * innerW;
  }

  _drawSuns() {
    const g = this.svg.querySelector("#chart-suns");
    if (!g) return;
    g.innerHTML = "";
    const events = [];
    for (const d of (this.daily || [])) {
      if (d.sunrise) events.push({ ts: d.sunrise, kind: "rise" });
      if (d.sunset)  events.push({ ts: d.sunset,  kind: "set" });
    }
    const SVG = "http://www.w3.org/2000/svg";
    for (const ev of events) {
      const x = this._xForTime(ev.ts);
      if (x == null) continue;
      const top = PAD_TOP - 4;
      const bot = H - PAD_BOT + 2;
      const line = document.createElementNS(SVG, "line");
      line.setAttribute("x1", x.toFixed(1));
      line.setAttribute("x2", x.toFixed(1));
      line.setAttribute("y1", String(top));
      line.setAttribute("y2", String(bot));
      line.setAttribute("class", `sun-tick sun-tick-${ev.kind}`);
      g.appendChild(line);

      const glyph = document.createElementNS(SVG, "g");
      glyph.setAttribute("transform", `translate(${x.toFixed(1)},${(top - 1).toFixed(1)})`);
      glyph.setAttribute("class", `sun-glyph sun-glyph-${ev.kind}`);
      const dot = document.createElementNS(SVG, "circle");
      dot.setAttribute("cx", "0"); dot.setAttribute("cy", "0"); dot.setAttribute("r", "2.4");
      glyph.appendChild(dot);
      const arrow = document.createElementNS(SVG, "path");
      // Rise = up triangle, set = down triangle.
      arrow.setAttribute("d", ev.kind === "rise" ? "M -3 4 L 0 -1 L 3 4 Z" : "M -3 -4 L 0 1 L 3 -4 Z");
      glyph.appendChild(arrow);
      const t = document.createElementNS(SVG, "title");
      t.textContent = `${ev.kind === "rise" ? "Sunrise" : "Sunset"} ${this._formatHour(ev.ts)}`;
      glyph.appendChild(t);
      g.appendChild(glyph);
    }
  }

  _drawNow() {
    const g = this.svg.querySelector("#chart-now");
    if (!g) return;
    g.innerHTML = "";
    const x = this._xForTime(Date.now());
    if (x == null) return;
    const SVG = "http://www.w3.org/2000/svg";
    const line = document.createElementNS(SVG, "line");
    line.setAttribute("x1", x.toFixed(1));
    line.setAttribute("x2", x.toFixed(1));
    line.setAttribute("y1", String(PAD_TOP));
    line.setAttribute("y2", String(H - PAD_BOT + 2));
    line.setAttribute("class", "now-tick");
    g.appendChild(line);
    const tag = document.createElementNS(SVG, "g");
    tag.setAttribute("transform", `translate(${x.toFixed(1)},${PAD_TOP - 6})`);
    tag.setAttribute("class", "now-tag");
    const rect = document.createElementNS(SVG, "rect");
    rect.setAttribute("x", "-12"); rect.setAttribute("y", "-9");
    rect.setAttribute("width", "24"); rect.setAttribute("height", "11");
    rect.setAttribute("rx", "3");
    tag.appendChild(rect);
    const text = document.createElementNS(SVG, "text");
    text.setAttribute("x", "0"); text.setAttribute("y", "-1");
    text.setAttribute("text-anchor", "middle");
    text.textContent = "NOW";
    tag.appendChild(text);
    g.appendChild(tag);
  }
}
