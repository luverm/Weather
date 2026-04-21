// Snow scene: slow drifting flakes with depth parallax and cursor nudge.

import { prepCanvas } from "../animation-engine.js";
import { input } from "../input.js";

export class SnowScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.w = 0; this.h = 0;
    this.visible = false;
    this.flakes = [];
    this.intensity = 0;
    this.targetIntensity = 0;
    this.lowQuality = false;
  }

  resize(w, h, dpr) {
    this.w = w; this.h = h;
    prepCanvas(this.canvas, w, h, dpr);
    this._rebuild();
  }

  setWeather({ condition, windSpeed }) {
    this.targetIntensity = condition === "snow" ? 0.85 : 0;
    this.visible = this.targetIntensity > 0.01 || this.intensity > 0.01;
    this.wind = (windSpeed ?? 4) * 3;
  }

  onQualityChange(low) {
    this.lowQuality = low;
    this._rebuild();
  }

  _rebuild() {
    if (!this.w) return;
    const density = this.lowQuality ? 1 / 12000 : 1 / 6500;
    const count = Math.floor(this.w * this.h * density);
    this.flakes = Array.from({ length: count }, () => this._makeFlake(true));
  }

  _makeFlake(spread) {
    const depth = Math.random();
    return {
      x: Math.random() * this.w,
      y: spread ? Math.random() * this.h : -10,
      r: 1 + depth * 3,
      depth: 0.3 + depth * 0.7,
      vy: 25 + depth * 60,
      vx: 0,
      phase: Math.random() * Math.PI * 2,
      freq: 0.6 + Math.random() * 1.2,
      swayAmp: 10 + Math.random() * 30,
    };
  }

  update(dt, t) {
    this.intensity += (this.targetIntensity - this.intensity) * Math.min(1, dt * 1.2);
    if (this.intensity < 0.01) { this._draw(); return; }

    const active = this.intensity;
    const cursorNudge = input.active ? (input.vx * 0.02) : 0;

    for (const f of this.flakes) {
      f.y += f.vy * active * dt;
      // Lateral sway + wind + cursor nudge, scaled by depth so near flakes react more.
      f.x += (Math.sin(t * f.freq + f.phase) * f.swayAmp * dt) +
             (this.wind * f.depth * dt) +
             (cursorNudge * f.depth);
      if (f.y > this.h + 5) { Object.assign(f, this._makeFlake(false)); f.y = -5; }
      if (f.x > this.w + 10) f.x = -10;
      else if (f.x < -10) f.x = this.w + 10;
    }
    this._draw();
  }

  _draw() {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    if (this.intensity < 0.01) return;
    const a = this.intensity;
    for (const f of this.flakes) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * a * f.depth})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
