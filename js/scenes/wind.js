// Wind scene: leaves / dust particles streaming across the screen.
//
// Particle count + speed scale with wind speed. Particles react to cursor
// velocity: a fast-moving pointer pushes nearby leaves away.

import { prepCanvas } from "../animation-engine.js";
import { input } from "../input.js";

export class WindScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.w = 0; this.h = 0;
    this.visible = false;
    this.particles = [];
    this.windSpeed = 0; // km/h
    this.windDir = 0; // radians (screen-space)
    this.intensity = 0; // 0..1
    this.targetIntensity = 0;
    this.variant = "leaf"; // leaf for warm/day, dust for night
    this.lowQuality = false;
  }

  resize(w, h, dpr) {
    this.w = w; this.h = h;
    prepCanvas(this.canvas, w, h, dpr);
    this._rebuild();
  }

  setWeather({ windSpeed, windDir, bucket, condition }) {
    this.windSpeed = windSpeed ?? 0;
    this.windDir = (((windDir ?? 220) - 90) * Math.PI) / 180;

    // Only show particles when wind is meaningful and weather doesn't already
    // dominate the scene.
    const windy = this.windSpeed > 14;
    const suppressed = condition === "rain" || condition === "storm" || condition === "snow";
    this.targetIntensity = windy && !suppressed ? Math.min(1, (this.windSpeed - 10) / 40) : 0;
    this.visible = this.targetIntensity > 0 || this.intensity > 0.01;
    this.variant = bucket === "night" ? "dust" : "leaf";
    this._rebuild();
  }

  onQualityChange(low) {
    this.lowQuality = low;
    this._rebuild();
  }

  _rebuild() {
    if (!this.w) return;
    let count = Math.floor(20 + this.targetIntensity * 60);
    if (this.lowQuality) count = Math.ceil(count / 2);
    while (this.particles.length < count) this.particles.push(this._makeParticle(true));
    while (this.particles.length > count) this.particles.pop();
  }

  _makeParticle(spread) {
    const depth = Math.random();
    return {
      x: spread ? Math.random() * this.w : -20,
      y: Math.random() * this.h,
      depth,
      r: 2 + depth * 4,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 3,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleAmp: 8 + Math.random() * 20,
      vy: (Math.random() - 0.5) * 10,
    };
  }

  update(dt, t) {
    this.intensity += (this.targetIntensity - this.intensity) * Math.min(1, dt * 1);
    if (this.intensity < 0.01) { this._draw(); return; }

    // Base velocity derived from wind.
    const baseSpeed = 40 + this.windSpeed * 6; // px/s
    const vx = Math.cos(this.windDir) * baseSpeed;
    const vy = Math.sin(this.windDir) * baseSpeed;

    for (const p of this.particles) {
      // Parallax: far particles move slower.
      p.x += vx * (0.4 + p.depth * 0.6) * dt;
      p.y += (vy + p.vy) * (0.4 + p.depth * 0.6) * dt;
      p.y += Math.sin(t * 2 + p.wobblePhase) * p.wobbleAmp * dt;
      p.rot += p.rotSpeed * dt;

      // Cursor push — quick sweeps flick nearby leaves away.
      if (input.active) {
        const dx = p.x - input.x;
        const dy = p.y - input.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 140 * 140) {
          const force = 1 - Math.sqrt(d2) / 140;
          p.x += (input.vx * 0.003) * force;
          p.y += (input.vy * 0.003) * force;
        }
      }

      // Recycle off-screen.
      if (p.x > this.w + 30) { p.x = -30; p.y = Math.random() * this.h; }
      else if (p.x < -30) { p.x = this.w + 30; p.y = Math.random() * this.h; }
      if (p.y > this.h + 30) p.y = -20;
      else if (p.y < -30) p.y = this.h + 20;
    }
    this._draw();
  }

  _draw() {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    if (this.intensity < 0.01) return;
    const a = this.intensity;

    for (const p of this.particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      const alpha = (0.3 + p.depth * 0.5) * a;
      if (this.variant === "leaf") {
        // Simple leaf: elongated ellipse with a midrib.
        ctx.fillStyle = `rgba(210, 170, 90, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r * 1.8, p.r * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(120, 80, 30, ${alpha * 0.6})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-p.r * 1.6, 0); ctx.lineTo(p.r * 1.6, 0);
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(230, 235, 255, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(0, 0, p.r * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
