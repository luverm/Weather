// Lightning scene: occasional white flashes during storms.
//
// A flash is a short-duration brightness curve with a brief multi-peak shape
// so it reads as a natural lightning strike rather than a plain fade.

import { prepCanvas } from "../animation-engine.js";

export class LightningScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.w = 0; this.h = 0;
    this.visible = false;
    this.active = false;
    this.nextStrikeAt = 0;
    this.flashes = [];
  }

  resize(w, h, dpr) {
    this.w = w; this.h = h;
    prepCanvas(this.canvas, w, h, dpr);
  }

  setWeather({ condition }) {
    this.active = condition === "storm";
    this.visible = this.active || this.flashes.length > 0;
    if (this.active && this.nextStrikeAt === 0) {
      this.nextStrikeAt = performance.now() / 1000 + 3 + Math.random() * 4;
    }
  }

  update(dt, t) {
    if (this.active && t > this.nextStrikeAt) {
      this._spawnFlash();
      this.nextStrikeAt = t + 3 + Math.random() * 7;
    }
    for (const f of this.flashes) f.age += dt;
    this.flashes = this.flashes.filter((f) => f.age < f.life);
    this.visible = this.active || this.flashes.length > 0;
    this._draw();
  }

  _spawnFlash() {
    // 2–3 sub-peaks so the strike feels layered, like real lightning.
    const peaks = 2 + Math.floor(Math.random() * 2);
    const life = 0.45 + Math.random() * 0.25;
    this.flashes.push({
      age: 0,
      life,
      peaks,
      seed: Math.random(),
      origin: { x: Math.random() * this.w, y: Math.random() * this.h * 0.35 },
    });
  }

  _intensityAt(flash) {
    const t = flash.age / flash.life;
    if (t >= 1) return 0;
    // Two-peak envelope: quick flash, short gap, second flash, exponential decay.
    let v = 0;
    for (let i = 0; i < flash.peaks; i++) {
      const peakT = 0.05 + (i / flash.peaks) * 0.35;
      const w = 0.08;
      v += Math.max(0, 1 - Math.abs(t - peakT) / w);
    }
    // Tail fade.
    v *= Math.exp(-t * 3);
    return Math.min(1, v);
  }

  _draw() {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    if (!this.flashes.length) return;
    for (const f of this.flashes) {
      const v = this._intensityAt(f);
      if (v <= 0) continue;
      // Fullscreen white wash.
      ctx.fillStyle = `rgba(240, 245, 255, ${0.55 * v})`;
      ctx.fillRect(0, 0, w, h);
      // Localized "strike" gradient for directionality.
      const r = Math.max(w, h) * 0.8;
      const g = ctx.createRadialGradient(f.origin.x, f.origin.y, 0, f.origin.x, f.origin.y, r);
      g.addColorStop(0, `rgba(255, 255, 255, ${0.7 * v})`);
      g.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
