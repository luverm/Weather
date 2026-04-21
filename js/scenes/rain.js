// Rain scene: streaks + growing ripple rings where the cursor moves.
//
// A "virtual surface" is implied near y = h * 0.82; ripples are drawn as
// ellipses centered along that line. Streaks use additive blending for a
// bright-on-dark neon glow feel.

import { prepCanvas } from "../animation-engine.js";
import { input } from "../input.js";

export class RainScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.w = 0; this.h = 0;
    this.visible = false;
    this.drops = [];
    this.ripples = [];
    this.intensity = 0; // 0..1
    this.targetIntensity = 0;
    this.lowQuality = false;
    this.lastRippleAt = 0;
  }

  resize(w, h, dpr) {
    this.w = w; this.h = h;
    prepCanvas(this.canvas, w, h, dpr);
    this._rebuild();
  }

  setWeather({ condition, windSpeed }) {
    let t = 0;
    if (condition === "rain") t = 0.7;
    else if (condition === "storm") t = 1;
    this.targetIntensity = t;
    this.visible = t > 0.01 || this.intensity > 0.01;
    this.wind = Math.min(220, (windSpeed ?? 8) * 6);
  }

  onQualityChange(low) {
    this.lowQuality = low;
    this._rebuild();
  }

  _rebuild() {
    if (!this.w) return;
    const density = this.lowQuality ? 1 / 9000 : 1 / 4500;
    const count = Math.floor(this.w * this.h * density);
    this.drops = Array.from({ length: count }, () => this._makeDrop(true));
  }

  _makeDrop(spread) {
    const depth = Math.random();
    return {
      x: Math.random() * (this.w + 200) - 100,
      y: spread ? Math.random() * this.h : -Math.random() * this.h * 0.5,
      len: 10 + depth * 22,
      speed: 700 + depth * 500,
      depth,
      alpha: 0.25 + depth * 0.55,
    };
  }

  update(dt, t) {
    this.intensity += (this.targetIntensity - this.intensity) * Math.min(1, dt * 1.4);
    if (this.intensity < 0.01) { this._draw(); return; }

    const active = this.intensity;
    const wind = (this.wind ?? 0);

    // Update drops.
    for (const d of this.drops) {
      d.x += wind * d.depth * dt;
      d.y += d.speed * active * dt;
      if (d.y > this.h) {
        // Spawn a ripple occasionally when a drop hits the "surface".
        if (d.depth > 0.6 && Math.random() < 0.3) this._spawnRipple(d.x, this.h * 0.82 + (Math.random() - 0.5) * 40);
        Object.assign(d, this._makeDrop(false));
      } else if (d.x > this.w + 50) {
        d.x = -50;
      } else if (d.x < -100) {
        d.x = this.w + 50;
      }
    }

    // Cursor-driven ripples when the pointer is near the "surface".
    if (input.active && t - this.lastRippleAt > 0.08) {
      const surfaceY = this.h * 0.82;
      if (Math.abs(input.y - surfaceY) < 180 && Math.abs(input.vx) + Math.abs(input.vy) > 40) {
        this._spawnRipple(input.x, surfaceY, 0.9);
        this.lastRippleAt = t;
      }
    }

    // Update ripples.
    for (const r of this.ripples) {
      r.age += dt;
      r.radius += r.speed * dt;
    }
    this.ripples = this.ripples.filter((r) => r.age < r.life);

    this._draw();
  }

  _spawnRipple(x, y, strength = 1) {
    this.ripples.push({
      x, y,
      radius: 2,
      speed: 60 + Math.random() * 40,
      life: 1.4,
      age: 0,
      strength,
    });
    // Cap to avoid uncapped growth on idle surfaces.
    if (this.ripples.length > 40) this.ripples.shift();
  }

  _draw() {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    if (this.intensity < 0.01) return;

    const a = this.intensity;

    // --- Streaks ---
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";
    const windRatio = (this.wind ?? 0) / Math.max(1, 700);
    for (const d of this.drops) {
      const dx = windRatio * d.len;
      ctx.strokeStyle = `rgba(190, 215, 255, ${d.alpha * a})`;
      ctx.lineWidth = 0.8 + d.depth * 0.6;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - dx, d.y - d.len);
      ctx.stroke();
    }
    ctx.restore();

    // --- Ripples ---
    for (const r of this.ripples) {
      const t = r.age / r.life;
      const alpha = (1 - t) * 0.55 * a * r.strength;
      ctx.strokeStyle = `rgba(200, 220, 255, ${alpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      // Flattened ellipse — fake perspective for a "surface" ripple.
      ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
