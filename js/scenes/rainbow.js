// Rainbow scene: a soft spectral arc that fades in when the sun catches rain.
//
// Triggered when the current/sampled condition is rain AND it is day AND
// cloud cover is partial enough that direct sunlight is plausible. We don't
// try to match the real anti-solar point — the arc rides the lower third of
// the viewport and sweeps upward, matching the sun scene's horizon glow.

import { prepCanvas } from "../animation-engine.js";

const BANDS = [
  { h: 0,   a: 0.42 }, // red
  { h: 24,  a: 0.42 }, // orange
  { h: 50,  a: 0.42 }, // yellow
  { h: 130, a: 0.42 }, // green
  { h: 205, a: 0.42 }, // blue
  { h: 240, a: 0.42 }, // indigo
  { h: 275, a: 0.42 }, // violet
];
const BAND_W = 6; // px per band at reference size

export class RainbowScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.w = 0; this.h = 0;
    this.visible = false;
    this.intensity = 0;
    this.targetIntensity = 0;
    this.phase = 0;
  }

  resize(w, h, dpr) {
    this.w = w; this.h = h;
    prepCanvas(this.canvas, w, h, dpr);
  }

  setWeather({ condition, isDay, cloudCover }) {
    // Rainbow likely when it's raining in daylight with partial cloud cover.
    const partial = cloudCover == null || (cloudCover > 15 && cloudCover < 85);
    const show = (condition === "rain") && isDay && partial;
    this.targetIntensity = show ? 1 : 0;
    this.visible = this.targetIntensity > 0.01 || this.intensity > 0.01;
  }

  update(dt) {
    const rate = this.targetIntensity > this.intensity ? 0.25 : 0.4;
    this.intensity += (this.targetIntensity - this.intensity) * Math.min(1, dt * rate * 4);
    this.phase += dt * 0.1;
    this._draw();
  }

  _draw() {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    if (this.intensity < 0.01) return;
    const a = this.intensity;

    // Arc center sits below the viewport; radius sweeps across the width.
    const cx = w * 0.5;
    const cy = h * 1.05;
    const outerR = Math.hypot(w * 0.55, h * 0.9);
    const innerR = outerR - BANDS.length * BAND_W - 2;

    // Soft shimmer: bands breathe a touch with phase.
    const breathe = 1 + Math.sin(this.phase * 2 * Math.PI) * 0.08;

    for (let i = 0; i < BANDS.length; i++) {
      const r = outerR - i * BAND_W * breathe;
      const b = BANDS[i];
      const grad = ctx.createRadialGradient(cx, cy, r - BAND_W, cx, cy, r);
      grad.addColorStop(0, `hsla(${b.h}, 90%, 72%, 0)`);
      grad.addColorStop(0.6, `hsla(${b.h}, 90%, 72%, ${b.a * a})`);
      grad.addColorStop(1, `hsla(${b.h}, 90%, 72%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI * 1.0, Math.PI * 2.0);
      ctx.arc(cx, cy, r - BAND_W * 1.2, Math.PI * 2.0, Math.PI * 1.0, true);
      ctx.closePath();
      ctx.fill();
    }
  }
}
