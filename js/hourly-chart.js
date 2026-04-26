// Interactive hourly chart: temperature line + precipitation probability bars.
// Fills the full 24-point domain, synced to the scrubber cursor.

const W = 600;
const H = 140;
const PAD_LEFT = 6;
const PAD_RIGHT = 6;
const PAD_TOP = 16;
const PAD_BOT = 22;

export class HourlyChart {
  constructor({ svgEl, hoverEl, popoverEl, onHoverHour, getUnit, getWindUnit, getTimezone, getTime12 }) {
    this.svg = svgEl;
    this.hoverEl = hoverEl;
    this.popover = popoverEl;
    this.onHoverHour = onHoverHour;
    this.getUnit = getUnit || (() => "C");
    this.getWindUnit = getWindUnit || (() => "kmh");
    this.getTimezone = getTimezone || (() => null);
    this.getTime12 = getTime12 || (() => false);
    this.hours = [];
    this.points = [];
    this._bind();
    setInterval(() => this._drawNowMarker(), 60_000);
  }

  _formatHour(ts) {
    const tz = this.getTimezone();
    const hour12 = this.getTime12();
    if (tz && tz !== "auto") {
      try {
        return new Intl.DateTimeFormat(undefined, {
          timeZone: tz, hour: hour12 ? "numeric" : "2-digit",
          minute: "2-digit", hour12,
        }).format(new Date(ts));
      } catch { /* */ }
    }
    const d = new Date(ts);
    if (hour12) {
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
    }
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
    this._drawBestWindow();
    this._drawSunEvents();
    this._drawNowMarker();
    this.setCursor(null);
  }

  /** Show a soft band marking the optimal outdoor window. */
  setBestWindow(win) {
    this._bestWindow = win || null;
    this._drawBestWindow();
  }

  /** Pass an array of { time, kind: "sunrise"|"sunset" } markers. */
  setSunEvents(events) {
    this._sunEvents = events || [];
    this._drawSunEvents();
  }

  refresh() {
    this._draw();
    this._drawBestWindow();
    this._drawSunEvents();
    this._drawNowMarker();
  }

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
    const windUnit = this.getWindUnit();
    const windKmh = h.wind ?? null;
    const windVal = windKmh != null
      ? (windUnit === "mph" ? windKmh * 0.62137119 : windKmh)
      : null;
    const wind = windVal != null ? ` · ${Math.round(windVal)} ${windUnit === "mph" ? "mph" : "km/h"}` : "";
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
    this.hours.forEach((h, i) => {
      if (i % labelStep !== 0) return;
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
    this._drawExtremes(tToY, iToX);
  }

  _drawExtremes(tToY, iToX) {
    const g = this.svg.querySelector("#chart-extremes");
    if (!g) return;
    g.innerHTML = "";
    if (!this.hours.length) return;
    let hi = null, lo = null;
    this.hours.forEach((h, i) => {
      if (h.temp == null) return;
      if (hi == null || h.temp > hi.t) hi = { t: h.temp, i, time: h.time };
      if (lo == null || h.temp < lo.t) lo = { t: h.temp, i, time: h.time };
    });
    if (!hi || !lo || hi.i === lo.i) return;
    const unit = this.getUnit();
    const conv = (t) => unit === "F" ? t * 9 / 5 + 32 : t;
    const mark = (e, kind) => {
      const x = iToX(e.i);
      const y = tToY(e.t);
      const above = kind === "hi";
      const dy = above ? -14 : 16;
      const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      txt.setAttribute("x", x.toFixed(1));
      txt.setAttribute("y", (y + dy).toFixed(1));
      txt.setAttribute("text-anchor", "middle");
      txt.setAttribute("class", `extreme-label ${kind}`);
      txt.textContent = `${kind === "hi" ? "▲" : "▼"} ${Math.round(conv(e.t))}°`;
      g.appendChild(txt);
    };
    mark(hi, "hi");
    mark(lo, "lo");
  }

  _drawNowMarker() {
    const ring = this.svg.querySelector("#chart-now-ring");
    const dot = this.svg.querySelector("#chart-now-dot");
    if (!ring || !dot || !this.hours.length || !this.points.length) return;
    const now = Date.now();
    // Linear-interpolate position along the points based on the closest hour.
    let i = 0;
    while (i < this.hours.length && this.hours[i].time < now) i++;
    let x, y;
    if (i === 0) {
      x = this.points[0].x; y = this.points[0].y;
    } else if (i >= this.hours.length) {
      const p = this.points[this.points.length - 1];
      x = p.x; y = p.y;
    } else {
      const t0 = this.hours[i - 1].time, t1 = this.hours[i].time;
      const f = (now - t0) / Math.max(1, t1 - t0);
      x = this.points[i - 1].x + (this.points[i].x - this.points[i - 1].x) * f;
      y = this.points[i - 1].y + (this.points[i].y - this.points[i - 1].y) * f;
    }
    ring.setAttribute("cx", x.toFixed(1));
    ring.setAttribute("cy", y.toFixed(1));
    dot.setAttribute("cx", x.toFixed(1));
    dot.setAttribute("cy", y.toFixed(1));
  }

  _drawSunEvents() {
    const g = this.svg.querySelector("#chart-sun-events");
    if (!g) return;
    g.innerHTML = "";
    if (!this._sunEvents?.length || !this.hours.length) return;
    const innerW = W - PAD_LEFT - PAD_RIGHT;
    const startTs = this.hours[0].time;
    const endTs = this.hours[this.hours.length - 1].time + 3600_000;
    if (endTs <= startTs) return;
    for (const ev of this._sunEvents) {
      if (ev.time < startTs || ev.time > endTs) continue;
      const frac = (ev.time - startTs) / (endTs - startTs);
      const x = PAD_LEFT + frac * innerW;
      const isRise = ev.kind === "sunrise";
      // Vertical line.
      const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
      ln.setAttribute("x1", x.toFixed(1));
      ln.setAttribute("x2", x.toFixed(1));
      ln.setAttribute("y1", String(PAD_TOP - 2));
      ln.setAttribute("y2", String(H - PAD_BOT));
      ln.setAttribute("class", isRise ? "sun-marker rise" : "sun-marker set");
      g.appendChild(ln);
      // Tiny sun glyph at the top of the line.
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", x.toFixed(1));
      dot.setAttribute("cy", String(PAD_TOP - 2));
      dot.setAttribute("r", "2.4");
      dot.setAttribute("class", isRise ? "sun-marker-dot rise" : "sun-marker-dot set");
      g.appendChild(dot);
    }
  }

  _drawBestWindow() {
    const g = this.svg.querySelector("#chart-best-window");
    if (!g) return;
    g.innerHTML = "";
    if (!this._bestWindow || !this.points.length) return;
    const win = this._bestWindow;
    // Find indices of hours that fall inside the window.
    let firstIdx = -1, lastIdx = -1;
    for (let i = 0; i < this.hours.length; i++) {
      const t = this.hours[i].time;
      if (t >= win.start - 30 * 60_000 && t < win.end - 30 * 60_000) {
        if (firstIdx === -1) firstIdx = i;
        lastIdx = i;
      }
    }
    if (firstIdx === -1 || lastIdx === -1) return;
    const innerW = W - PAD_LEFT - PAD_RIGHT;
    // Half-step left/right so the band sits between hour points.
    const halfStep = innerW / (this.hours.length - 1) / 2;
    const x1 = Math.max(PAD_LEFT, this.points[firstIdx].x - halfStep);
    const x2 = Math.min(W - PAD_RIGHT, this.points[lastIdx].x + halfStep);
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x1.toFixed(1));
    rect.setAttribute("y", String(PAD_TOP));
    rect.setAttribute("width", Math.max(0, x2 - x1).toFixed(1));
    rect.setAttribute("height", String(H - PAD_TOP - PAD_BOT));
    rect.setAttribute("rx", "3");
    rect.setAttribute("class", "bw-band");
    g.appendChild(rect);
    // A small label at the top edge so users notice it.
    const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    txt.setAttribute("x", ((x1 + x2) / 2).toFixed(1));
    txt.setAttribute("y", String(PAD_TOP + 8));
    txt.setAttribute("text-anchor", "middle");
    txt.setAttribute("class", "bw-band-label");
    txt.textContent = "Best window";
    g.appendChild(txt);
  }
}
