// Time scrubber: a draggable timeline that shifts the clock offset.
//
// Range spans from real `now` to `now + RANGE_HOURS`. As the user drags,
// we update the clock and notify the app so it can resample weather data
// at the simulated time and re-apply to every scene + UI module.

import { clock } from "./clock.js";

const RANGE_HOURS = 24;

export class Scrubber {
  constructor({ trackEl, thumbEl, fillEl, timeEl, deltaEl, resetEl,
                sunriseEl, sunsetEl, jumpsEl, appEl, onScrub,
                getTimezone }) {
    this.track = trackEl;
    this.thumb = thumbEl;
    this.fill = fillEl;
    this.timeEl = timeEl;
    this.deltaEl = deltaEl;
    this.resetEl = resetEl;
    this.sunriseEl = sunriseEl;
    this.sunsetEl = sunsetEl;
    this.jumpsEl = jumpsEl;
    this.appEl = appEl; // receives data-scrubbing attribute
    this.onScrub = onScrub;
    this.getTimezone = getTimezone || (() => null);
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
    this._renderJumps();
    this._render(this._currentT());
  }

  // Pick a handful of named moments in the next 24h — sunrise, noon, sunset,
  // midnight. Only emit the ones that fall inside the scrubber's range so the
  // chips don't send the clock out of bounds.
  _renderJumps() {
    if (!this.jumpsEl) return;
    const now = Date.now();
    const lo = this.start - 3600_000;
    const hi = this.start + 23 * 3600_000;
    const items = [];
    const push = (label, ts) => {
      if (ts == null || ts < lo || ts > hi) return;
      // Dedupe close hits (within 20 min of a chip already queued).
      if (items.some((x) => Math.abs(x.ts - ts) < 20 * 60_000)) return;
      items.push({ label, ts });
    };
    if (this.sunrise) push("Sunrise", this.sunrise);
    // Noon / midnight anchored to the LOCATION's timezone — the chart's hour
    // labels and sunrise/sunset use that timezone, so landing on the city's
    // noon (not the viewer's) is what the chips should do. nextLocalHour
    // walks forward 24h at a time until the moment lands inside the scrubber
    // window.
    const tz = this.getTimezone();
    push("Noon", nextLocalHour(now, 12, tz, lo, hi));
    if (this.sunset) push("Sunset", this.sunset);
    push("Midnight", nextLocalHour(now, 0, tz, lo, hi, true));
    items.sort((a, b) => a.ts - b.ts);
    if (!items.length) { this.jumpsEl.hidden = true; this.jumpsEl.innerHTML = ""; return; }
    this.jumpsEl.hidden = false;
    this.jumpsEl.innerHTML = items.map((it) =>
      `<button class="scrub-jump" type="button" data-ts="${it.ts}">${it.label}</button>`
    ).join("");
    this.jumpsEl.querySelectorAll(".scrub-jump").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ts = parseInt(btn.dataset.ts, 10);
        if (!isFinite(ts)) return;
        this._setOffset(ts - Date.now());
      });
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

// Find the next instant at `hour`:00 in the given IANA timezone that falls in
// [lo, hi]. If `preferTomorrow`, prefer the second match (skips a near-now
// hit — useful for "Midnight" since it means the midnight ahead, not the one
// that just happened). Falls back to viewer-local when tz is missing.
function nextLocalHour(now, hour, tz, lo, hi, preferTomorrow = false) {
  const candidates = [];
  for (let dayOff = 0; dayOff <= 2; dayOff++) {
    const base = now + dayOff * 86400_000;
    const ts = atLocalHour(base, hour, tz);
    if (ts != null) candidates.push(ts);
  }
  const inWindow = candidates.filter((t) => t >= lo && t <= hi && t > now - 15 * 60_000);
  if (!inWindow.length) return null;
  return preferTomorrow && inWindow.length > 1 ? inWindow[1] : inWindow[0];
}

// Returns the timestamp of hour:00 on the date that `baseTs` lands on in the
// given IANA timezone. Falls back to viewer-local when tz is missing.
function atLocalHour(baseTs, hour, tz) {
  if (!tz || tz === "auto") {
    const d = new Date(baseTs);
    d.setHours(hour, 0, 0, 0);
    return d.getTime();
  }
  try {
    const guess = new Date(baseTs);
    // Two passes: snap the viewer-local date, then correct for the tz hour.
    guess.setHours(hour, 0, 0, 0);
    const tzHour = parseInt(new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, hour: "2-digit", hour12: false,
    }).format(guess), 10);
    const diffHours = ((hour - tzHour + 36) % 24) - 12;
    return guess.getTime() + diffHours * 3600_000;
  } catch {
    const d = new Date(baseTs);
    d.setHours(hour, 0, 0, 0);
    return d.getTime();
  }
}
