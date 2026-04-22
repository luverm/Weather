// Live precipitation radar map.
//
// Data: RainViewer public API (https://www.rainviewer.com/api.html)
//   - 12 past frames at ~10-minute intervals (2h of history)
//   - 3 nowcast frames (next 30 min)
// Tiles: RainViewer's `tilecache` PNGs, layered over a dark CartoCDN basemap.
// Animation: per-frame Leaflet TileLayers stacked at opacity 0; we cross-fade
// between them to avoid the flicker of removing/adding layers.
//
// Depends on the global `L` from leaflet.js (loaded via CDN in index.html).

const WEATHER_MAPS_URL = "https://api.rainviewer.com/public/weather-maps.json";
const REFRESH_MS = 5 * 60 * 1000; // RainViewer updates every ~10 min; refresh half that.
const FRAME_MS = 500;             // How long each frame displays during playback.

export class RadarMap {
  constructor({ mapEl, playBtn, timeLabel, deltaLabel, frameTrack, fullscreenBtn, card }) {
    this.mapEl = mapEl;
    this.playBtn = playBtn;
    this.timeLabel = timeLabel;
    this.deltaLabel = deltaLabel;
    this.frameTrack = frameTrack;
    this.fullscreenBtn = fullscreenBtn;
    this.card = card;

    this.map = null;
    this.baseLayer = null;
    this.locationMarker = null;
    this.frames = [];        // [{ time, path, layer }]
    this.current = -1;       // index of current frame
    this.playing = true;
    this._timer = 0;
    this._refreshTimer = 0;
    this._host = "https://tilecache.rainviewer.com";
    this._ready = false;
    this._pendingCenter = null;
  }

  async init(center = [51.5, 0]) {
    if (!window.L) {
      console.warn("Leaflet not loaded — radar map disabled.");
      this.card?.setAttribute("data-unavailable", "true");
      return;
    }

    this.map = L.map(this.mapEl, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false, // avoid hijacking the page
      zoomSnap: 0.5,
      fadeAnimation: true,
    }).setView(center, 7);

    // Dark base map — matches our palette. CartoCDN is free for non-commercial.
    this.baseLayer = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
      { subdomains: "abcd", maxZoom: 19, crossOrigin: true }
    ).addTo(this.map);

    // Light labels on top for readability.
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
      { subdomains: "abcd", maxZoom: 19, pane: "shadowPane" }
    ).addTo(this.map);

    // Re-allow scroll-zoom once the user interacts (tap/click focuses map).
    this.mapEl.addEventListener("pointerdown", () => this.map.scrollWheelZoom.enable());
    this.mapEl.addEventListener("pointerleave", () => this.map.scrollWheelZoom.disable());

    this._bindControls();
    await this._load();
    this._ready = true;

    if (this._pendingCenter) {
      this.setCenter(...this._pendingCenter);
      this._pendingCenter = null;
    }
    this._schedulePlayback();
    this._refreshTimer = setInterval(() => this._load().catch(() => {}), REFRESH_MS);
  }

  setCenter(lat, lon, label) {
    if (!this.map) { this._pendingCenter = [lat, lon, label]; return; }
    this.map.setView([lat, lon], 7, { animate: true });
    if (this.locationMarker) this.locationMarker.remove();
    // A simple circle marker — subtle, matches theme.
    this.locationMarker = L.circleMarker([lat, lon], {
      radius: 6,
      color: "#9ad1ff",
      weight: 2,
      fillColor: "#9ad1ff",
      fillOpacity: 0.8,
      className: "radar-pin",
    }).addTo(this.map);
    if (label) this.locationMarker.bindTooltip(label, { permanent: false, direction: "top" });
  }

  /** Fit the map to a pre-sized container (call after layout changes). */
  invalidateSize() {
    this.map?.invalidateSize();
  }

  destroy() {
    clearTimeout(this._timer);
    clearInterval(this._refreshTimer);
    this.map?.remove();
    this.map = null;
  }

  // ---------- Frame loading ----------

  async _load() {
    const res = await fetch(WEATHER_MAPS_URL);
    if (!res.ok) throw new Error("RainViewer fetch failed");
    const data = await res.json();
    this._host = data.host || this._host;

    const past = data.radar?.past || [];
    const nowcast = data.radar?.nowcast || [];
    const all = [...past, ...nowcast];

    // Remove old frame layers no longer present (matched by timestamp).
    const keep = new Set(all.map((f) => f.time));
    for (const old of this.frames) {
      if (!keep.has(old.time) && old.layer) {
        old.layer.setOpacity(0);
        old.layer.remove();
      }
    }

    const existing = new Map(this.frames.map((f) => [f.time, f]));
    this.frames = all.map((f) => existing.get(f.time) || {
      time: f.time,
      path: f.path,
      layer: null,
    });

    // Seed the visible frame to "latest past" on first load.
    if (this.current < 0 || this.current >= this.frames.length) {
      this.current = past.length ? past.length - 1 : 0;
    }
    // Create tile layers lazily per frame so we don't hammer the network.
    this._ensureFrameLayer(this.current);
    this._renderTrack();
    this._showFrame(this.current);
  }

  _ensureFrameLayer(index) {
    const f = this.frames[index];
    if (!f || f.layer) return;
    // Color scheme 2 = "universal blue to red"; smooth=1; show snow=1.
    const url = `${this._host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`;
    const layer = L.tileLayer(url, {
      opacity: 0,
      zIndex: 10,
      maxZoom: 12,
      crossOrigin: true,
      attribution: '<a href="https://rainviewer.com">RainViewer</a>',
    });
    layer.addTo(this.map);
    f.layer = layer;
  }

  _showFrame(index) {
    if (!this.frames.length) return;
    index = Math.max(0, Math.min(this.frames.length - 1, index));
    this.current = index;

    // Pre-create neighbors so the next step is instant.
    this._ensureFrameLayer(index);
    this._ensureFrameLayer(Math.min(this.frames.length - 1, index + 1));

    // Cross-fade: only the current frame is visible.
    for (let i = 0; i < this.frames.length; i++) {
      const f = this.frames[i];
      if (!f.layer) continue;
      f.layer.setOpacity(i === index ? 0.7 : 0);
    }

    // Labels.
    const f = this.frames[index];
    const t = f.time * 1000;
    const d = new Date(t);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    if (this.timeLabel) this.timeLabel.textContent = `${hh}:${mm}`;
    if (this.deltaLabel) {
      const offMin = Math.round((t - Date.now()) / 60_000);
      this.deltaLabel.textContent = offMin === 0
        ? "now"
        : offMin > 0 ? `+${offMin}m` : `${offMin}m`;
      this.deltaLabel.classList.toggle("future", offMin > 0);
    }
    this._updateTrack(index);
  }

  _renderTrack() {
    if (!this.frameTrack || !this.frames.length) return;
    this.frameTrack.innerHTML = "";
    this.frames.forEach((f, i) => {
      const tick = document.createElement("button");
      tick.type = "button";
      const isFuture = f.time * 1000 > Date.now();
      tick.className = `radar-tick ${isFuture ? "future" : ""}`;
      tick.setAttribute("aria-label", new Date(f.time * 1000).toLocaleTimeString());
      tick.addEventListener("click", () => {
        this._showFrame(i);
        this._pause();
      });
      this.frameTrack.appendChild(tick);
    });
    this._updateTrack(this.current);
  }

  _updateTrack(index) {
    if (!this.frameTrack) return;
    const ticks = this.frameTrack.querySelectorAll(".radar-tick");
    ticks.forEach((t, i) => t.classList.toggle("active", i === index));
  }

  // ---------- Playback ----------

  _bindControls() {
    this.playBtn?.addEventListener("click", () => this.playing ? this._pause() : this._play());
    this.fullscreenBtn?.addEventListener("click", () => this.toggleFullscreen());

    // Keyboard: left/right scrub frames, space toggles play.
    this.mapEl.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { this._pause(); this._showFrame(this.current - 1); e.preventDefault(); }
      else if (e.key === "ArrowRight") { this._pause(); this._showFrame(this.current + 1); e.preventDefault(); }
      else if (e.code === "Space") { this.playing ? this._pause() : this._play(); e.preventDefault(); }
    });
  }

  _schedulePlayback() {
    clearTimeout(this._timer);
    if (!this.playing || !this.frames.length) return;
    this._timer = setTimeout(() => {
      const next = (this.current + 1) % this.frames.length;
      // Pause briefly on the latest frame so the loop feels less jittery.
      const isLast = next === 0;
      this._showFrame(next);
      this._timer = setTimeout(() => this._schedulePlayback(), isLast ? FRAME_MS * 2 : FRAME_MS);
    }, FRAME_MS);
  }

  _play() {
    this.playing = true;
    this.playBtn?.setAttribute("data-playing", "true");
    this._schedulePlayback();
  }

  _pause() {
    this.playing = false;
    this.playBtn?.setAttribute("data-playing", "false");
    clearTimeout(this._timer);
  }

  toggleFullscreen() {
    if (!this.card) return;
    const now = this.card.getAttribute("data-fullscreen") === "true";
    this.card.setAttribute("data-fullscreen", now ? "false" : "true");
    // Delay so the layout transition finishes before we fix the tile sizing.
    setTimeout(() => this.invalidateSize(), 320);
  }
}
