// Starfield with parallax, twinkle, shooting stars, and hover constellations.
//
// Implementation notes:
// - Stars live in 3 depth bands for a cheap parallax effect.
// - Constellations are pre-computed: for each star, find its 2 nearest neighbors.
//   When the cursor hovers near a star, we draw lines to those neighbors
//   with alpha scaled by proximity.
// - Shooting stars are spawned with an exponential inter-arrival time.

import { prepCanvas } from "../animation-engine.js";
import { input } from "../input.js";

export class StarsScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.w = 0; this.h = 0;
    this.stars = [];
    this.shootingStars = [];
    this.nextShootingAt = 0;
    this.visible = false;
    this.intensity = 0; // 0..1, faded in at night
    this.targetIntensity = 0;
    this.neighbors = []; // index -> [i1, i2]
    this.lowQuality = false;
  }

  resize(w, h, dpr) {
    this.w = w; this.h = h;
    prepCanvas(this.canvas, w, h, dpr);
    this._rebuildStars();
  }

  setWeather({ bucket, condition }) {
    // Visible at dusk / dawn / night; fade according to how dark the sky is.
    const map = { night: 1, dusk: 0.55, dawn: 0.35, morning: 0, day: 0, undefined: 0 };
    let target = map[bucket] ?? 0;
    // Dim stars further when thick clouds/storm obscure the sky.
    if (condition === "storm") target *= 0.3;
    else if (condition === "rain" || condition === "clouds" || condition === "snow") target *= 0.6;
    else if (condition === "fog") target *= 0.25;
    this.targetIntensity = target;
    this.visible = target > 0.01 || this.intensity > 0.01;
  }

  onQualityChange(low) {
    this.lowQuality = low;
    this._rebuildStars();
  }

  _rebuildStars() {
    if (!this.w) return;
    const density = this.lowQuality ? 1 / 6000 : 1 / 3500;
    const count = Math.floor(this.w * this.h * density);
    this.stars = Array.from({ length: count }, () => this._makeStar());
    this.neighbors = this._computeNeighbors();
  }

  _makeStar() {
    const depth = Math.random();
    return {
      x: Math.random() * this.w,
      y: Math.random() * this.h * 0.85, // keep clear of the horizon/UI
      r: 0.4 + Math.pow(depth, 2) * 1.8,
      depth: 0.3 + depth * 0.7, // 0.3..1 parallax factor
      // Color temperature — most white, a few warm or blue.
      hue: Math.random() < 0.15 ? (Math.random() < 0.5 ? 210 : 40) : 0,
      sat: Math.random() < 0.15 ? 60 : 0,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.4 + Math.random() * 1.2,
      baseAlpha: 0.35 + Math.random() * 0.65,
    };
  }

  _computeNeighbors() {
    const n = this.stars.length;
    const result = new Array(n);
    // Only consider bright (large-radius) stars as constellation anchors.
    const candidates = [];
    for (let i = 0; i < n; i++) if (this.stars[i].r > 1.2) candidates.push(i);
    for (let i = 0; i < n; i++) {
      const s = this.stars[i];
      // Find two closest candidates.
      let best1 = -1, best2 = -1, d1 = Infinity, d2 = Infinity;
      for (const j of candidates) {
        if (j === i) continue;
        const dx = this.stars[j].x - s.x;
        const dy = this.stars[j].y - s.y;
        const d = dx * dx + dy * dy;
        if (d < d1) { d2 = d1; best2 = best1; d1 = d; best1 = j; }
        else if (d < d2) { d2 = d; best2 = j; }
      }
      result[i] = [best1, best2];
    }
    return result;
  }

  update(dt, t) {
    // Fade intensity.
    this.intensity += (this.targetIntensity - this.intensity) * Math.min(1, dt * 1.2);

    // Shooting-star scheduler: Poisson-ish with ~1 every 6–12 s.
    if (t > this.nextShootingAt && this.intensity > 0.2) {
      this._spawnShooter();
      this.nextShootingAt = t + 4 + Math.random() * 10;
    }

    // Advance and prune shooters.
    for (const s of this.shootingStars) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
    }
    this.shootingStars = this.shootingStars.filter((s) => s.life > 0);

    this._draw(t);
  }

  _spawnShooter() {
    const angle = Math.PI * (0.15 + Math.random() * 0.2); // downward right
    const speed = 700 + Math.random() * 400;
    this.shootingStars.push({
      x: Math.random() * this.w * 0.4,
      y: Math.random() * this.h * 0.4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.9,
      maxLife: 0.9,
    });
  }

  _draw(t) {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    if (this.intensity < 0.01) return;

    const globalAlpha = this.intensity;

    // Parallax offset driven by cursor.
    const ox = -input.nx * 30;
    const oy = -input.ny * 18;

    // --- Stars ---
    for (const s of this.stars) {
      const px = s.x + ox * s.depth;
      const py = s.y + oy * s.depth;
      const tw = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
      const alpha = s.baseAlpha * (0.6 + 0.4 * tw) * globalAlpha;

      ctx.beginPath();
      ctx.arc(px, py, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.sat > 0
        ? `hsla(${s.hue}, ${s.sat}%, 85%, ${alpha})`
        : `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();

      // Brightest stars get a soft glow.
      if (s.r > 1.4) {
        const glow = ctx.createRadialGradient(px, py, 0, px, py, s.r * 5);
        glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.4})`);
        glow.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, s.r * 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // --- Constellations on hover ---
    if (input.active) {
      const hoverR = 130;
      const cx = input.x;
      const cy = input.y;
      ctx.lineWidth = 0.6;
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        const pairs = this.neighbors[i];
        if (!pairs) continue;
        const sx = s.x + ox * s.depth;
        const sy = s.y + oy * s.depth;
        const dx = sx - cx;
        const dy = sy - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > hoverR) continue;
        const prox = 1 - d / hoverR;
        const a = prox * 0.35 * globalAlpha;
        for (const j of pairs) {
          if (j < 0) continue;
          const n = this.stars[j];
          const nx = n.x + ox * n.depth;
          const ny = n.y + oy * n.depth;
          ctx.strokeStyle = `rgba(200, 225, 255, ${a})`;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(nx, ny);
          ctx.stroke();
        }
      }
    }

    // --- Shooting stars ---
    for (const s of this.shootingStars) {
      const tailLen = 120;
      const nx = s.vx / Math.hypot(s.vx, s.vy);
      const ny = s.vy / Math.hypot(s.vx, s.vy);
      const tx = s.x - nx * tailLen;
      const ty = s.y - ny * tailLen;
      const lifeT = s.life / s.maxLife;
      const grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
      grad.addColorStop(0, `rgba(255, 255, 255, ${lifeT * globalAlpha})`);
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
  }
}
