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

  setDaily(daily) {
    this.daily = daily || [];
    this._draw();
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
    const rawTMin = Math.min(...temps);
    const rawTMax = Math.max(...temps);
    let tMin = rawTMin, tMax = rawTMax;
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
    const hasFeels = this.hours.some((h) =>
      h.feelsLike != null && Math.abs(h.feelsLike - h.temp) >= 2
    );
    if (feelsLine) {
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

    // Feels-like divergence ribbon: fill between temp and feels lines for
    // runs where they disagree by ≥2°. Blue where feels cooler than temp
    // (wind chill), warm where feels hotter (heat index).
    const cold = this.svg.querySelector("#chart-feels-ribbon-cold");
    const hot = this.svg.querySelector("#chart-feels-ribbon-hot");
    if (cold && hot) {
      const buildRibbon = (predicate) => {
        let path = "";
        let run = [];
        const flush = () => {
          if (run.length < 2) { run = []; return; }
          const top = run.map((i) => {
            const v = this.hours[i].feelsLike ?? this.hours[i].temp;
            const t = this.hours[i].temp;
            return { x: iToX(i), y1: tToY(t), y2: tToY(v) };
          });
          let seg = "M" + top[0].x.toFixed(1) + "," + top[0].y1.toFixed(1);
          for (let k = 1; k < top.length; k++) {
            seg += " L" + top[k].x.toFixed(1) + "," + top[k].y1.toFixed(1);
          }
          for (let k = top.length - 1; k >= 0; k--) {
            seg += " L" + top[k].x.toFixed(1) + "," + top[k].y2.toFixed(1);
          }
          seg += " Z";
          path += (path ? " " : "") + seg;
          run = [];
        };
        for (let i = 0; i < this.hours.length; i++) {
          const h = this.hours[i];
          const d = (h.feelsLike ?? h.temp) - h.temp;
          if (predicate(d)) run.push(i);
          else flush();
        }
        flush();
        return path;
      };
      if (hasFeels) {
        cold.setAttribute("d", buildRibbon((d) => d <= -2));
        hot.setAttribute("d", buildRibbon((d) => d >= 2));
      } else {
        cold.setAttribute("d", "");
        hot.setAttribute("d", "");
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

    // Cloud-cover shading: soft gray rectangles proportional to total
    // cloud cover per hour. Sits *behind* the temp line so it reads as
    // background weather without clutter. Uses combined low+mid+high
    // when we have layered data, else the flat 0-100 field.
    const cloudsG = this.svg.querySelector("#chart-clouds");
    if (cloudsG) {
      cloudsG.innerHTML = "";
      const cellW = innerW / Math.max(1, this.hours.length - 1);
      for (let i = 0; i < this.hours.length; i++) {
        const h = this.hours[i];
        let cover = null;
        if (h.cloudLow != null || h.cloudMid != null || h.cloudHigh != null) {
          // Combine layers into an "effective opacity" — low clouds
          // are what actually block the sky visually, so weight them
          // higher than high cirrus.
          const l = h.cloudLow ?? 0, m = h.cloudMid ?? 0, hi = h.cloudHigh ?? 0;
          cover = Math.min(100, l * 0.9 + m * 0.6 + hi * 0.35);
        } else if (typeof h.cloudCover === "number") {
          cover = h.cloudCover;
        }
        if (cover == null || cover < 15) continue;
        const opacity = Math.min(0.22, (cover / 100) * 0.28);
        const cx = iToX(i);
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", (cx - cellW / 2).toFixed(1));
        rect.setAttribute("y", String(PAD_TOP));
        rect.setAttribute("width", cellW.toFixed(1));
        rect.setAttribute("height", String(innerH));
        rect.setAttribute("fill", "rgba(210, 220, 240, 1)");
        rect.setAttribute("opacity", opacity.toFixed(3));
        cloudsG.appendChild(rect);
      }
    }

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

    // Sunrise/sunset markers inside the visible window.
    const sunsG = this.svg.querySelector("#chart-suns");
    if (sunsG) {
      sunsG.innerHTML = "";
      const tStart = this.hours[0].time;
      const tEnd = this.hours[this.hours.length - 1].time;
      const totalMs = Math.max(1, tEnd - tStart);
      const tToXTime = (t) => PAD_LEFT + ((t - tStart) / totalMs) * innerW;
      const events = [];
      for (const d of (this.daily || [])) {
        if (d.sunrise && d.sunrise > tStart && d.sunrise < tEnd) {
          events.push({ ts: d.sunrise, kind: "rise" });
        }
        if (d.sunset && d.sunset > tStart && d.sunset < tEnd) {
          events.push({ ts: d.sunset, kind: "set" });
        }
      }
      for (const ev of events) {
        const x = tToXTime(ev.ts);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x.toFixed(1));
        line.setAttribute("x2", x.toFixed(1));
        line.setAttribute("y1", String(PAD_TOP - 4));
        line.setAttribute("y2", String(H - PAD_BOT + 2));
        line.setAttribute("class", `chart-sun-line chart-sun-${ev.kind}`);
        sunsG.appendChild(line);
        // Glyph: small arrow pointing up for rise, down for set.
        const g = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const y0 = PAD_TOP - 2;
        const arrow = ev.kind === "rise"
          ? `M ${(x - 3).toFixed(1)} ${(y0 + 4).toFixed(1)} L ${x.toFixed(1)} ${y0.toFixed(1)} L ${(x + 3).toFixed(1)} ${(y0 + 4).toFixed(1)}`
          : `M ${(x - 3).toFixed(1)} ${(y0 + 0).toFixed(1)} L ${x.toFixed(1)} ${(y0 + 4).toFixed(1)} L ${(x + 3).toFixed(1)} ${(y0 + 0).toFixed(1)}`;
        g.setAttribute("d", arrow);
        g.setAttribute("class", `chart-sun-glyph chart-sun-${ev.kind}`);
        sunsG.appendChild(g);
        // Time text below axis.
        const tx = document.createElementNS("http://www.w3.org/2000/svg", "text");
        tx.setAttribute("x", x.toFixed(1));
        tx.setAttribute("y", String(H - 14));
        tx.setAttribute("text-anchor", "middle");
        tx.setAttribute("class", `chart-sun-time chart-sun-${ev.kind}`);
        tx.textContent = this._formatHour(ev.ts);
        sunsG.appendChild(tx);
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

    // Extrema callouts: mark the visible-window high and low with small
    // dot + labeled chip so the peaks are readable at a glance. Only when
    // the range is wide enough that pointing them out is meaningful.
    const extG = this.svg.querySelector("#chart-extrema");
    if (extG) {
      extG.innerHTML = "";
      // Guard on the *raw* swing so a flat 24h doesn't get a lone "hi" pin
      // painted by the clamped view range.
      if (rawTMax - rawTMin >= 3) {
        let hiIdx = 0, loIdx = 0;
        for (let i = 1; i < this.hours.length; i++) {
          if (this.hours[i].temp > this.hours[hiIdx].temp) hiIdx = i;
          if (this.hours[i].temp < this.hours[loIdx].temp) loIdx = i;
        }
        const drawExtremum = (i, kind) => {
          const p = this.points[i];
          const val = this.hours[i].temp;
          const dispVal = unit === "F" ? val * 9 / 5 + 32 : val;
          const label = `${kind} ${Math.round(dispVal)}°`;
          const above = kind === "hi";
          const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          dot.setAttribute("cx", p.x.toFixed(1));
          dot.setAttribute("cy", p.y.toFixed(1));
          dot.setAttribute("r", "3");
          dot.setAttribute("class", `chart-extremum-dot chart-extremum-${kind}`);
          extG.appendChild(dot);
          const yText = above ? p.y - 12 : p.y + 16;
          // Nudge inside the plot area if it would clip.
          const clampedY = Math.max(PAD_TOP + 8, Math.min(H - PAD_BOT - 2, yText));
          const tx = document.createElementNS("http://www.w3.org/2000/svg", "text");
          // Nudge x away from the edge to avoid clipping.
          const nudgedX = Math.max(PAD_LEFT + 14, Math.min(W - PAD_RIGHT - 14, p.x));
          tx.setAttribute("x", nudgedX.toFixed(1));
          tx.setAttribute("y", clampedY.toFixed(1));
          tx.setAttribute("text-anchor", "middle");
          tx.setAttribute("class", `chart-extremum-label chart-extremum-${kind}`);
          tx.textContent = label;
          extG.appendChild(tx);
        };
        drawExtremum(hiIdx, "hi");
        // Avoid drawing lo on top of hi if they somehow ended up identical.
        if (loIdx !== hiIdx) drawExtremum(loIdx, "lo");
      }
    }

    // "Now" marker — a persistent thin vertical line at Date.now() within
    // the visible window. Distinct from the interactive cursor so users
    // always see where they are relative to the future forecast.
    const nowLine = this.svg.querySelector("#chart-now");
    if (nowLine) {
      const nowT = Date.now();
      const first = this.hours[0]?.time;
      const last = this.hours[this.hours.length - 1]?.time;
      if (first != null && last != null && nowT >= first && nowT <= last) {
        const totalMs = Math.max(1, last - first);
        const nx = PAD_LEFT + ((nowT - first) / totalMs) * innerW;
        nowLine.setAttribute("x1", nx.toFixed(1));
        nowLine.setAttribute("x2", nx.toFixed(1));
        nowLine.setAttribute("y1", String(PAD_TOP - 2));
        nowLine.setAttribute("y2", String(H - PAD_BOT + 2));
      } else {
        nowLine.setAttribute("x1", "-10");
        nowLine.setAttribute("x2", "-10");
      }
    }
  }
}
