// Time scrubber: a draggable timeline that shifts the clock offset.
//
// Range spans from real `now` to `now + RANGE_HOURS`. As the user drags,
// we update the clock and notify the app so it can resample weather data
// at the simulated time and re-apply to every scene + UI module.

import { clock } from "./clock.js";

const RANGE_HOURS = 24;

export class Scrubber {
  constructor({ trackEl, thumbEl, fillEl, timeEl, deltaEl, resetEl, playEl,
                sunriseEl, sunsetEl, appEl, onScrub }) {
    this.track = trackEl;
    this.thumb = thumbEl;
    this.fill = fillEl;
    this.timeEl = timeEl;
    this.deltaEl = deltaEl;
    this.resetEl = resetEl;
    this.playEl = playEl;
    this.sunriseEl = sunriseEl;
    this.sunsetEl = sunsetEl;
    this.appEl = appEl; // receives data-scrubbing attribute
    this.onScrub = onScrub;
    this.dragging = false;
    this.playing = false;
    this._playTimer = null;
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
    this._render(this._currentT());
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
      // Stop playback the moment the user grabs the slider.
      if (this.playing) this.pause();
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
    this.playEl?.addEventListener("click", () => this.toggleplay());

    // Pause auto-play when the tab loses focus so it doesn't run hidden.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.playing) this.pause();
    });
  }

  toggleplay() {
    if (this.playing) this.pause();
    else this.play();
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    if (this.playEl) {
      this.playEl.dataset.playing = "true";
      this.playEl.setAttribute("aria-label", "Pause time-lapse");
    }
    this.appEl?.setAttribute("data-scrubbing", "true");
    // Advance ~12 simulated minutes per real-time tick (200ms) — a full 24h
    // pass takes about 8 seconds.
    const STEP_MIN = 12;
    const TICK_MS = 200;
    const MAX_OFFSET = (RANGE_HOURS - 1) * 3600_000;
    this._playTimer = setInterval(() => {
      let next = clock.offset() + STEP_MIN * 60_000;
      if (next > MAX_OFFSET) {
        // Loop back to live so the experience feels continuous.
        next = -3600_000;
      }
      this._setOffset(next);
    }, TICK_MS);
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    if (this.playEl) {
      this.playEl.dataset.playing = "false";
      this.playEl.setAttribute("aria-label", "Play time-lapse");
    }
    if (this._playTimer) { clearInterval(this._playTimer); this._playTimer = null; }
  }

  reset() {
    if (this.playing) this.pause();
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
    clock.setOffset(offset);
    // Snap "close enough" to live — prevents 0.2 min drift when releasing.
    if (Math.abs(offset) < 5 * 60_000) clock.setOffset(0);
    const scrubbing = !clock.isLive();
    this.appEl?.setAttribute("data-scrubbing", scrubbing ? "true" : "false");
    this._render(this._currentT());
    this.onScrub?.(clock.offset());
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
