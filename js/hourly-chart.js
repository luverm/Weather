// Interactive hourly chart: temperature line + precipitation probability bars.
// Fills the full 24-point domain, synced to the scrubber cursor.

const W = 600;
const H = 140;

// Rain-bar tint: cool blue at light drizzle, deep violet at >=5 mm/h.
function precipFill(t) {
  const stops = [
    [0,   { r: 154, g: 209, b: 255 }], // #9ad1ff
    [0.5, { r: 180, g: 174, b: 255 }],
    [1,   { r: 150, g: 100, b: 230 }],
  ];
  let [a, b] = [stops[0], stops[stops.length - 1]];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) { a = stops[i]; b = stops[i + 1]; break; }
  }
  const span = Math.max(0.001, b[0] - a[0]);
  const f = (t - a[0]) / span;
  const r = Math.round(a[1].r + (b[1].r - a[1].r) * f);
  const g = Math.round(a[1].g + (b[1].g - a[1].g) * f);
  const bl = Math.round(a[1].b + (b[1].b - a[1].b) * f);
  return `rgb(${r},${g},${bl})`;
}

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

  /** Set the daily list so sunrise/sunset tick marks can be drawn. */
  setDaily(daily) {
    this.daily = daily || [];
    this._drawSunMarkers();
  }

  /** Optional UV peak location — a gold spot sits at this time on the chart. */
  setUvPeak(peak) {
    this.uvPeak = peak || null;
    this._drawSunMarkers();
  }

  refresh() { this._draw(); this._drawSunMarkers(); }

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
    const mm = h.precip != null && h.precip >= 0.1
      ? ` · ${h.precip.toFixed(1)} mm`
      : "";
    this.popover.innerHTML =
      `<strong>${this._formatHour(h.time)}</strong> ${Math.round(t)}° ${feelsStr}<br>` +
      `<em>${h.pop}% precip${mm}${wind}${hum}</em>`;
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

    // Precipitation bars: height = probability (0..100%), fill tint = intensity.
    // Light drizzle stays cool blue; heavier mm per hour pushes toward
    // deep indigo so a rainy stretch's heavy hours stand out from its light ones.
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
      // Intensity tint from mm/h (0 → cool rain, 5+ → heavy violet).
      const mm = Math.max(0, h.precip || 0);
      const intensity = Math.min(1, mm / 5);
      r.setAttribute("fill", precipFill(intensity));
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

    // Keep the sun markers in sync with any re-draw (e.g. unit toggle).
    this._drawSunMarkers();
    this._drawExtremes();
    this._drawFreezeLine(tToY, tMin, tMax);

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
  }

  // Sunrise/sunset ticks across the hourly chart's time window. Rendered as
  // dashed verticals with a sun or moon glyph at the top rail so you can see
  // where the day begins and ends in context with the temperature curve.
  _drawSunMarkers() {
    const g = this.svg.querySelector("#chart-sun-markers");
    if (!g) return;
    g.innerHTML = "";
    if (!this.hours.length || !this.daily?.length) return;

    const first = this.hours[0].time;
    const last = this.hours[this.hours.length - 1].time;
    if (last <= first) return;
    const innerW = W - PAD_LEFT - PAD_RIGHT;
    const timeToX = (ts) =>
      PAD_LEFT + ((ts - first) / (last - first)) * innerW;

    const draw = (ts, kind) => {
      if (ts == null || ts < first || ts > last) return;
      const x = timeToX(ts);
      const ns = "http://www.w3.org/2000/svg";
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", x.toFixed(1));
      line.setAttribute("x2", x.toFixed(1));
      line.setAttribute("y1", "4");
      line.setAttribute("y2", String(H - PAD_BOT));
      line.setAttribute("class", `chart-sun-line ${kind}`);
      g.appendChild(line);

      // Glyph at top: a 10px disc for sunrise, outlined for sunset.
      const dot = document.createElementNS(ns, "circle");
      dot.setAttribute("cx", x.toFixed(1));
      dot.setAttribute("cy", "6");
      dot.setAttribute("r", "3.2");
      dot.setAttribute("class", `chart-sun-dot ${kind}`);
      g.appendChild(dot);
    };

    for (const d of this.daily) {
      draw(d.sunrise, "sunrise");
      draw(d.sunset, "sunset");
    }

    // UV peak marker — a filled dot higher up with a short tether to the
    // horizontal rail so it doesn't crowd the sunrise/sunset glyphs.
    if (this.uvPeak?.time != null && this.uvPeak.time >= first && this.uvPeak.time <= last) {
      const x = timeToX(this.uvPeak.time);
      const ns = "http://www.w3.org/2000/svg";
      const dot = document.createElementNS(ns, "circle");
      dot.setAttribute("cx", x.toFixed(1));
      dot.setAttribute("cy", "18");
      dot.setAttribute("r", "4");
      dot.setAttribute("class", "chart-uv-dot");
      const label = document.createElementNS(ns, "text");
      label.setAttribute("x", x.toFixed(1));
      label.setAttribute("y", "32");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", "chart-uv-label");
      label.textContent = "UV";
      g.appendChild(dot);
      g.appendChild(label);
    }
  }

  // Horizontal dashed line at 0°C — only drawn when freezing falls inside
  // the chart's y range. A tiny "0°" tag at the right edge keeps it legible.
  _drawFreezeLine(tToY, tMin, tMax) {
    const g = this.svg.querySelector("#chart-freeze");
    if (!g) return;
    g.innerHTML = "";
    if (!(tMin < 0 && tMax > 0)) return;
    const y = tToY(0);
    const unit = this.getUnit();
    const freezeTempDisplay = unit === "F" ? "32°" : "0°";
    const ns = "http://www.w3.org/2000/svg";
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", String(PAD_LEFT));
    line.setAttribute("x2", String(W - PAD_RIGHT));
    line.setAttribute("y1", y.toFixed(1));
    line.setAttribute("y2", y.toFixed(1));
    line.setAttribute("class", "chart-freeze-line");
    const label = document.createElementNS(ns, "text");
    label.setAttribute("x", String(W - PAD_RIGHT - 4));
    label.setAttribute("y", (y - 3).toFixed(1));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("class", "chart-freeze-label");
    label.textContent = freezeTempDisplay;
    g.appendChild(line);
    g.appendChild(label);
  }

  // Mark the hottest and coldest hour of the chart window with tiny labelled
  // arrows above the line. Only draws when the hi/lo differ by more than 2°,
  // so flat days stay uncluttered.
  _drawExtremes() {
    const g = this.svg.querySelector("#chart-extremes");
    if (!g) return;
    g.innerHTML = "";
    if (!this.hours.length || !this.points.length) return;
    let iHi = -1, iLo = -1;
    for (let i = 0; i < this.hours.length; i++) {
      const t = this.hours[i].temp;
      if (t == null) continue;
      if (iHi < 0 || t > this.hours[iHi].temp) iHi = i;
      if (iLo < 0 || t < this.hours[iLo].temp) iLo = i;
    }
    if (iHi < 0 || iLo < 0 || iHi === iLo) return;
    const spread = this.hours[iHi].temp - this.hours[iLo].temp;
    if (spread < 2) return;

    const unit = this.getUnit();
    const show = (v) => Math.round(unit === "F" ? v * 9 / 5 + 32 : v);
    const mark = (idx, kind) => {
      const p = this.points[idx];
      if (!p) return;
      const ns = "http://www.w3.org/2000/svg";
      const text = document.createElementNS(ns, "text");
      text.setAttribute("x", p.x.toFixed(1));
      text.setAttribute("y", (kind === "hi" ? p.y - 14 : p.y + 20).toFixed(1));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("class", `chart-extreme ${kind}`);
      text.textContent = `${kind === "hi" ? "▲" : "▼"} ${show(this.hours[idx].temp)}°`;
      g.appendChild(text);
    };
    mark(iHi, "hi");
    mark(iLo, "lo");
  }
}
