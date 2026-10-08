// Time scrubber: a draggable timeline that shifts the clock offset.
//
// Range spans from real `now` to `now + RANGE_HOURS`. As the user drags,
// we update the clock and notify the app so it can resample weather data
// at the simulated time and re-apply to every scene + UI module.

import { clock } from "./clock.js";

const RANGE_HOURS = 24;

export class Scrubber {
  constructor({ trackEl, thumbEl, fillEl, timeEl, deltaEl, resetEl,
                sunriseEl, sunsetEl, appEl, onScrub }) {
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
    this.dragging = false;
    this.start = Date.now();
    this.sunrise = null;
    this.sunset = null;

    this._bind();
    // Keep the label updating while live (otherwise the clock would freeze
    // at the value it had when weather was last fetched).
    setInterval(() => { if (clock.isLive()) this._render(0); }, 30_000);
  }

  setBounds({ start, sunrise, sunset }) {
    this.start = start || Date.now();
    this.sunrise = sunrise;
    this.sunset = sunset;
    this._placeMarker(this.sunriseEl, sunrise, "Sunrise");
    this._placeMarker(this.sunsetEl, sunset, "Sunset");
    this._bindMarker(this.sunriseEl, sunrise);
    this._bindMarker(this.sunsetEl, sunset);
    this._render(this._currentT());
  }

  _bindMarker(el, ts) {
    if (!el || !ts) return;
    el.style.cursor = "pointer";
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    const jump = (e) => {
      e.stopPropagation();
      e.preventDefault();
      this._setOffset(ts - Date.now());
    };
    // Replace any previous handler by cloning.
    const clean = el.cloneNode(true);
    el.replaceWith(clean);
    if (el === this.sunriseEl) this.sunriseEl = clean;
    else this.sunsetEl = clean;
    clean.addEventListener("click", jump);
    clean.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") jump(e);
    });
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
    // Include the clock time in the tooltip so hovering teaches when it is.
    const d = new Date(ts);
    const timeStr = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    el.setAttribute("title", `${label} at ${timeStr} — click to jump`);
    el.setAttribute("aria-label", `Jump to ${label.toLowerCase()} at ${timeStr}`);
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

    // Hover tooltip — show what time the pointer corresponds to, even
    // without dragging. Fine-pointer only (mouse) so it doesn't fight touch.
    const canHover = window.matchMedia?.("(hover: hover)").matches ?? true;
    if (canHover) {
      this.track.addEventListener("pointerenter", (e) => {
        if (e.pointerType === "touch") return;
        this._updateHoverTitle(e);
      });
      this.track.addEventListener("pointermove", (e) => {
        if (this.dragging || e.pointerType === "touch") return;
        this._updateHoverTitle(e);
      });
      this.track.addEventListener("pointerleave", () => {
        this.track.removeAttribute("title");
      });
    }

    // Keyboard: arrow keys nudge by 1h, shift+arrow by 6h.
    // PageUp/PageDown also jump by 6h for one-handed scrolling.
    this.track.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 6 : 1;
      let newOffset = clock.offset();
      if (e.key === "ArrowLeft") newOffset -= step * 3600_000;
      else if (e.key === "ArrowRight") newOffset += step * 3600_000;
      else if (e.key === "PageDown") newOffset += 6 * 3600_000;
      else if (e.key === "PageUp") newOffset -= 6 * 3600_000;
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
    try { navigator.vibrate?.(10); } catch { /* best-effort */ }
  }

  _updateHoverTitle(e) {
    const r = this.track.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const totalMs = RANGE_HOURS * 3600_000;
    const offset = t * totalMs - 3600_000;
    const ts = Date.now() + offset;
    const d = new Date(ts);
    const label = d.toLocaleString(undefined, {
      weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
    });
    this.track.title = label;
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
    const curNow = clock.now();
    const scrubbing = !clock.isLive();
    this.appEl?.setAttribute("data-scrubbing", scrubbing ? "true" : "false");
    this._render(this._currentT());
    this.onScrub?.(clock.offset());

    // Haptic ping when the scrub crosses sunrise or sunset — makes dragging
    // feel like you can feel the horizon as you cross it.
    const crossed = (ts) =>
      ts && ((prevNow < ts && curNow >= ts) || (prevNow > ts && curNow <= ts));
    if (crossed(this.sunrise) || crossed(this.sunset)) {
      try { navigator.vibrate?.(12); } catch { /* best-effort */ }
    }
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
    this.track.setAttribute("aria-valuetext", `Simulated time ${label}`);
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
