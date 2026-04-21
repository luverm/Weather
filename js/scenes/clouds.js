// Cloud scene: soft, drifting procedural blobs.
//
// Each cloud is a cluster of overlapping radial gradients. They drift based
// on wind speed/direction; the cursor adds a small parallax offset.

import { prepCanvas } from "../animation-engine.js";
import { input } from "../input.js";

export class CloudsScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.w = 0; this.h = 0;
    this.visible = true;
    this.clouds = [];
    this.target = { count: 6, alpha: 0.3, tint: [255, 255, 255] };
    this.windX = 12; // px/s
    this.windY = 0;
    this.lowQuality = false;
  }

  resize(w, h, dpr) {
    this.w = w; this.h = h;
    prepCanvas(this.canvas, w, h, dpr);
    this._ensureCloudCount();
  }

  setWeather({ condition, bucket, windSpeed, windDir }) {
    // Convert wind to pixel velocity. Clamp so extreme winds don't become silly.
    const speed = Math.min(40, (windSpeed ?? 5)) * 0.9; // km/h -> px/s feel
    const dir = ((windDir ?? 220) - 90) * Math.PI / 180; // weather deg -> screen angle
    this.windX = Math.cos(dir) * Math.max(6, speed);
    this.windY = Math.sin(dir) * Math.max(0, speed * 0.15);

    // Count + opacity depends on condition.
    let count = 5, alpha = 0.28;
    if (condition === "clear") { count = 3; alpha = 0.18; }
    else if (condition === "clouds") { count = 9; alpha = 0.45; }
    else if (condition === "rain") { count = 10; alpha = 0.55; }
    else if (condition === "storm") { count = 12; alpha = 0.7; }
    else if (condition === "snow") { count = 9; alpha = 0.5; }
    else if (condition === "fog") { count = 14; alpha = 0.6; }

    // Tint darker during rain/storm, warmer at golden hour.
    let tint = [255, 255, 255];
    if (condition === "storm") tint = [120, 130, 150];
    else if (condition === "rain") tint = [180, 190, 210];
    if (bucket === "dusk") tint = tint.map((v, i) => [v, v, v * 0.85][i] * (i === 0 ? 1.05 : i === 1 ? 0.95 : 0.85));
    if (bucket === "dawn") tint = [tint[0] * 1.0, tint[1] * 0.92, tint[2] * 0.88];
    if (bucket === "night") tint = [tint[0] * 0.55, tint[1] * 0.6, tint[2] * 0.75];

    this.target = { count, alpha, tint };
    this._ensureCloudCount();
  }

  onQualityChange(low) {
    this.lowQuality = low;
    this._ensureCloudCount();
  }

  _ensureCloudCount() {
    if (!this.w) return;
    let desired = this.target.count;
    if (this.lowQuality) desired = Math.ceil(desired / 2);
    while (this.clouds.length < desired) this.clouds.push(this._makeCloud(true));
    while (this.clouds.length > desired) this.clouds.pop();
  }

  _makeCloud(spread) {
    const scale = 0.8 + Math.random() * 1.6;
    // Cluster of 4–7 puffs.
    const puffs = [];
    const n = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      puffs.push({
        dx: (Math.random() - 0.5) * 180 * scale,
        dy: (Math.random() - 0.5) * 40 * scale,
        r: 70 * scale * (0.7 + Math.random() * 0.7),
      });
    }
    return {
      x: spread ? Math.random() * this.w : -200,
      y: Math.random() * this.h * 0.55 + this.h * 0.05,
      scale,
      speed: 0.6 + Math.random() * 0.8,
      puffs,
    };
  }

  update(dt) {
    const { w } = this;
    // Advance clouds; recycle when they leave the viewport.
    for (const c of this.clouds) {
      c.x += this.windX * c.speed * dt;
      c.y += this.windY * c.speed * dt;
      const maxR = 260 * c.scale;
      if (this.windX >= 0 && c.x - maxR > w) { c.x = -maxR; c.y = Math.random() * this.h * 0.6; }
      else if (this.windX < 0 && c.x + maxR < 0) { c.x = w + maxR; c.y = Math.random() * this.h * 0.6; }
      if (c.y - maxR > this.h) c.y = -maxR;
    }
    this._draw();
  }

  _draw() {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    const { alpha, tint } = this.target;
    if (alpha <= 0.01) return;

    const ox = -input.nx * 14;
    const oy = -input.ny * 8;

    ctx.globalCompositeOperation = "source-over";
    for (const c of this.clouds) {
      for (const p of c.puffs) {
        const px = c.x + p.dx + ox;
        const py = c.y + p.dy + oy;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, p.r);
        grad.addColorStop(0, `rgba(${tint[0]|0}, ${tint[1]|0}, ${tint[2]|0}, ${alpha})`);
        grad.addColorStop(0.6, `rgba(${tint[0]|0}, ${tint[1]|0}, ${tint[2]|0}, ${alpha * 0.45})`);
        grad.addColorStop(1, `rgba(${tint[0]|0}, ${tint[1]|0}, ${tint[2]|0}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
