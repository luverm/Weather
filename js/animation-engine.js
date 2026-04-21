// Central animation engine: one RAF loop drives every scene.
//
// Design notes:
// - A single RAF loop avoids N independent loops competing for the frame budget.
// - Scenes implement `update(dt, t)` and `resize(w, h, dpr)`.
// - FPS is sampled continuously; sustained low FPS flips a "low quality" flag
//   that scenes may read to halve their particle counts.
// - DPR is clamped to 2 to avoid pathological fill rates on retina screens.

export class AnimationEngine {
  constructor() {
    this.scenes = new Map();
    this.running = false;
    this.last = 0;
    this.fps = 60;
    this.fpsEMA = 60;
    this.lowQualityStreak = 0;
    this.lowQuality = false;
    this._raf = 0;
  }

  add(name, scene) {
    this.scenes.set(name, scene);
    if (this._width && scene.resize) scene.resize(this._width, this._height, this._dpr);
    return scene;
  }

  get(name) { return this.scenes.get(name); }

  remove(name) {
    const s = this.scenes.get(name);
    if (s && s.destroy) s.destroy();
    this.scenes.delete(name);
  }

  setVisible(name, visible) {
    const s = this.scenes.get(name);
    if (s) s.visible = visible;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const tick = (now) => {
      if (!this.running) return;
      // Cap dt so tab-switches don't fling particles across the screen.
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;

      // FPS with exponential moving average for stable quality decisions.
      const instantFps = 1 / Math.max(0.001, dt);
      this.fpsEMA = this.fpsEMA * 0.92 + instantFps * 0.08;
      this.fps = this.fpsEMA;
      this._evaluateQuality();

      for (const scene of this.scenes.values()) {
        if (scene.visible === false) continue;
        scene.lowQuality = this.lowQuality;
        scene.update(dt, now / 1000);
      }
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  _evaluateQuality() {
    if (this.fps < 48) this.lowQualityStreak++;
    else this.lowQualityStreak = Math.max(0, this.lowQualityStreak - 1);

    // 2 s of bad frames -> degrade; 4 s of good frames -> restore.
    if (!this.lowQuality && this.lowQualityStreak > 120) {
      this.lowQuality = true;
      for (const s of this.scenes.values()) s.onQualityChange?.(true);
    } else if (this.lowQuality && this.lowQualityStreak === 0) {
      // Only restore after a sustained period.
      if (this.fpsEMA > 56) {
        this.lowQuality = false;
        for (const s of this.scenes.values()) s.onQualityChange?.(false);
      }
    }
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this._width = window.innerWidth;
    this._height = window.innerHeight;
    this._dpr = dpr;
    for (const scene of this.scenes.values()) scene.resize?.(this._width, this._height, dpr);
  }
}

// Utility every scene uses to set up its canvas consistently.
export function prepCanvas(canvas, w, h, dpr) {
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}
