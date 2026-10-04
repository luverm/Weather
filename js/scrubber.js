// Time scrubber: a draggable timeline that shifts the clock offset.
//
// Range spans from real `now` to `now + RANGE_HOURS`. As the user drags,
// we update the clock and notify the app so it can resample weather data
// at the simulated time and re-apply to every scene + UI module.

import { clock } from "./clock.js";

// Mirror the comfort-strip palette so both views agree on what colour each
// temperature should carry.
function colorForTemp(t) {
  if (t == null) return "rgba(255,255,255,0.1)";
  const stops = [
    [-15, "#3a4d8f"], [-5, "#4a78c2"], [5, "#3da9a1"], [12, "#5cc77a"],
    [18, "#cdd86a"], [24, "#f0a557"], [30, "#e96a4d"], [36, "#a73838"],
  ];
  if (t <= stops[0][0]) return stops[0][1];
  if (t >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [lo, loC] = stops[i];
    const [hi, hiC] = stops[i + 1];
    if (t >= lo && t <= hi) return mixHex(loC, hiC, (t - lo) / (hi - lo));
  }
  return stops[stops.length - 1][1];
}
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 0xff) + (((pb >> 16) & 0xff) - ((pa >> 16) & 0xff)) * t);
  const g = Math.round(((pa >> 8) & 0xff) + (((pb >> 8) & 0xff) - ((pa >> 8) & 0xff)) * t);
  const bl = Math.round((pa & 0xff) + ((pb & 0xff) - (pa & 0xff)) * t);
  return `rgb(${r},${g},${bl})`;
}

const RANGE_HOURS = 24;

export class Scrubber {
  constructor({ trackEl, thumbEl, fillEl, timeEl, deltaEl, resetEl,
                sunriseEl, sunsetEl, appEl, onScrub, onCrossSunEvent }) {
    this.track = trackEl;
    this.thumb = thumbEl;
    this.fill = fillEl;
    this.timeEl = timeEl;
    this.deltaEl = deltaEl;
    this.resetEl = resetEl;
    this.sunriseEl = sunriseEl;
    this.sunsetEl = sunsetEl;
    this.appEl = appEl; // receives data-scrubbing attribute
    this.onScrub = onScrub;
    this.onCrossSunEvent = onCrossSunEvent;
    this.dragging = false;
    this.start = Date.now();
    this.sunrise = null;
    this.sunset = null;

    this._bind();
    // Keep the label updating while live (otherwise the clock would freeze
    // at the value it had when weather was last fetched).
    setInterval(() => { if (clock.isLive()) this._render(0); }, 30_000);
  }

  setBounds({ start, sunrise, sunset, hours }) {
    this.start = start || Date.now();
    this.sunrise = sunrise;
    this.sunset = sunset;
    this._placeMarker(this.sunriseEl, sunrise, "Sunrise");
    this._placeMarker(this.sunsetEl, sunset, "Sunset");
    this._applyTempGradient(hours);
    this._placeHourTicks();
    this._render(this._currentT());
  }

  // Light dashed tick marks every 3 hours across the track, with midnight /
  // noon getting a slightly stronger tick for easier day-boundary reading.
  _placeHourTicks() {
    if (!this.track) return;
    let g = this.track.querySelector(".scrubber-ticks");
    if (!g) {
      g = document.createElement("div");
      g.className = "scrubber-ticks";
      g.setAttribute("aria-hidden", "true");
      this.track.insertBefore(g, this.track.firstChild);
    }
    g.innerHTML = "";
    const left = this.start - 3600_000;
    const totalMs = RANGE_HOURS * 3600_000;
    for (let h = 0; h < RANGE_HOURS; h += 3) {
      const ts = left + h * 3600_000;
      const d = new Date(ts);
      const hourOfDay = d.getHours();
      const rel = h / RANGE_HOURS;
      const tick = document.createElement("span");
      tick.className = "scrubber-tick";
      if (hourOfDay === 0) tick.classList.add("major-midnight");
      else if (hourOfDay === 12) tick.classList.add("major-noon");
      tick.style.left = `${(rel * 100).toFixed(2)}%`;
      g.appendChild(tick);
    }
  }

  // Paint the track background as a horizontal gradient coloured by hourly
  // feels-like temperature across the 24h window, so the whole day's thermal
  // story is readable at a glance.
  _applyTempGradient(hours) {
    if (!this.track || !hours?.length) return;
    const totalMs = RANGE_HOURS * 3600_000;
    const left = this.start - 3600_000;
    const stops = [];
    for (const h of hours) {
      const rel = (h.time - left) / totalMs;
      if (rel < 0 || rel > 1) continue;
      const t = h.feelsLike ?? h.temp;
      stops.push(`${colorForTemp(t)} ${(rel * 100).toFixed(1)}%`);
    }
    if (stops.length < 2) return;
    this.track.style.setProperty(
      "--temp-gradient",
      `linear-gradient(90deg, ${stops.join(", ")})`
    );
  }

  /** Called when we externally reset to "now" (e.g. search selected). */
  sync() {
    this._render(this._currentT());
  }

  _currentT() {
    const offset = clock.offset();
    const totalMs = RANGE_HOURS * 3600_000;
    // Scrubber covers: [start - 1h, start + 23h]. Offset 0 sits at 1/24.
    const t = (offset + 3600_000) / totalMs;
    return Math.max(0, Math.min(1, t));
  }

  _placeMarker(el, ts, label) {
    if (!el || !ts) { if (el) el.style.display = "none"; return; }
    const totalMs = RANGE_HOURS * 3600_000;
    const rel = (ts - (this.start - 3600_000)) / totalMs;
    if (rel < 0 || rel > 1) { el.style.display = "none"; return; }
    el.style.display = "block";
    el.style.left = `${rel * 100}%`;
    el.setAttribute("data-label", label);
  }

  _bind() {
    const onDown = (e) => {
      this.dragging = true;
      this.appEl?.setAttribute("data-scrubbing", "true");
      this.track.setPointerCapture?.(e.pointerId);
      this._updateFromEvent(e);
    };
    const onMove = (e) => {
      if (!this.dragging) return;
      this._updateFromEvent(e);
    };
    const onUp = (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      this.track.releasePointerCapture?.(e.pointerId);
    };
    this.track.addEventListener("pointerdown", onDown);
    this.track.addEventListener("pointermove", onMove);
    this.track.addEventListener("pointerup", onUp);
    this.track.addEventListener("pointercancel", onUp);

    // Keyboard: arrow keys nudge by 1h, shift+arrow by 6h.
    this.track.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 6 : 1;
      let newOffset = clock.offset();
      if (e.key === "ArrowLeft") newOffset -= step * 3600_000;
      else if (e.key === "ArrowRight") newOffset += step * 3600_000;
      else if (e.key === "Home") newOffset = -3600_000;
      else if (e.key === "End") newOffset = (RANGE_HOURS - 1) * 3600_000;
      else return;
      e.preventDefault();
      this._setOffset(newOffset);
    });

    this.resetEl?.addEventListener("click", () => this.reset());
  }

  reset() {
    clock.setOffset(0);
    this.appEl?.setAttribute("data-scrubbing", "false");
    this._render(this._currentT());
    this.onScrub?.(0);
  }

  _updateFromEvent(e) {
    const r = this.track.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const totalMs = RANGE_HOURS * 3600_000;
    const offset = t * totalMs - 3600_000;
    this._setOffset(offset);
  }

  _setOffset(offset) {
    const prevNow = clock.now();
    clock.setOffset(offset);
    // Snap "close enough" to live — prevents 0.2 min drift when releasing.
    if (Math.abs(offset) < 5 * 60_000) clock.setOffset(0);
    const scrubbing = !clock.isLive();
    this.appEl?.setAttribute("data-scrubbing", scrubbing ? "true" : "false");
    this._render(this._currentT());
    this._maybeAnnounceCrossing(prevNow, clock.now());
    this.onScrub?.(clock.offset());
  }

  // Toast when the scrubber slides across sunrise or sunset — gives a
  // tangible beat for photographers planning around the golden hour and
  // makes the sky-scene handoff feel intentional.
  _maybeAnnounceCrossing(prev, next) {
    if (!this.appEl) return;
    const announce = (ts, label) => {
      if (!ts) return;
      const crossed = (prev < ts && next >= ts) || (prev > ts && next <= ts);
      if (crossed && this.onCrossSunEvent) this.onCrossSunEvent(label, ts);
    };
    announce(this.sunrise, "Sunrise");
    announce(this.sunset, "Sunset");
  }

  _render(t) {
    // Update CSS var for thumb + fill position.
    document.documentElement.style.setProperty("--scrub", t.toFixed(4));
    this.track.setAttribute("aria-valuenow", String(Math.round(t * 100)));

    const time = clock.now();
    const d = new Date(time);
    const label = d.toLocaleString(undefined, {
      weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
    });
    if (this.timeEl) this.timeEl.textContent = label;

    const offMin = Math.round(clock.offset() / 60_000);
    if (this.deltaEl) {
      if (!offMin) this.deltaEl.textContent = "live";
      else if (Math.abs(offMin) < 60) this.deltaEl.textContent = `${offMin > 0 ? "+" : ""}${offMin}m`;
      else {
        const h = Math.round(offMin / 60);
        this.deltaEl.textContent = `${h > 0 ? "+" : ""}${h}h`;
      }
    }
  }
}
