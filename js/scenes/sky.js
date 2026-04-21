// Sky scene: renders the time-of-day gradient plus a soft sun/moon disc.
// Crossfades to new palettes when conditions change.

import { prepCanvas } from "../animation-engine.js";
import { input } from "../input.js";

// Palettes keyed by time-of-day bucket. Each is a top-to-bottom gradient
// sampled at three stops, plus the sun/moon tint.
const PALETTES = {
  night: {
    stops: ["#05060f", "#0b1030", "#141a3c"],
    disc: "#e9eef7",
    discGlow: "rgba(200, 215, 255, 0.4)",
  },
  dawn: {
    stops: ["#1a1a45", "#6a4672", "#f5a182"],
    disc: "#ffd9a8",
    discGlow: "rgba(255, 170, 120, 0.55)",
  },
  morning: {
    stops: ["#7cc0ff", "#b4dcff", "#ffe6c7"],
    disc: "#fff1c9",
    discGlow: "rgba(255, 220, 140, 0.55)",
  },
  day: {
    stops: ["#3f90e6", "#7cb9ee", "#dbeaff"],
    disc: "#fff6cf",
    discGlow: "rgba(255, 230, 160, 0.6)",
  },
  dusk: {
    stops: ["#24225b", "#b0577a", "#ffb479"],
    disc: "#ffcf9b",
    discGlow: "rgba(255, 160, 110, 0.55)",
  },
};

// Weather overlays multiply/tint the gradient so a rainy noon still reads as noon.
const WEATHER_TINT = {
  clear: [1, 1, 1],
  clouds: [0.86, 0.9, 0.95],
  rain: [0.55, 0.62, 0.72],
  snow: [0.92, 0.94, 1.02],
  storm: [0.35, 0.4, 0.5],
  fog: [0.75, 0.78, 0.82],
};

// Decide which palette to use from current time and sunrise/sunset.
function pickPalette(now, sunrise, sunset) {
  if (!sunrise || !sunset) {
    const h = new Date(now).getHours();
    if (h < 5 || h >= 21) return "night";
    if (h < 7) return "dawn";
    if (h < 17) return "day";
    if (h < 19) return "dusk";
    return "night";
  }
  const dawnWindow = 60 * 60 * 1000; // 1h band around sunrise/sunset
  if (now < sunrise - dawnWindow || now > sunset + dawnWindow) return "night";
  if (now < sunrise + dawnWindow) return "dawn";
  if (now > sunset - dawnWindow) return "dusk";
  // Daytime sub-bucket: morning first 3h, else "day"
  if (now < sunrise + 3 * 60 * 60 * 1000) return "morning";
  return "day";
}

function hexToRgb(hex) {
  const v = hex.replace("#", "");
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function rgbToCss([r, g, b], a = 1) {
  return `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${a})`;
}
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpRgb(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

export class SkyScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.w = 0; this.h = 0;
    this.visible = true;
    // Crossfade state
    this.from = buildPalette("day", "clear");
    this.to = this.from;
    this.mix = 1;
    this.fadeSpeed = 0.25; // per second
    // Disc position follows a sun arc across the viewport.
    this.sunX = 0.5;
    this.sunY = 0.35;
  }

  resize(w, h, dpr) {
    this.w = w; this.h = h;
    prepCanvas(this.canvas, w, h, dpr);
  }

  setWeather({ sunrise, sunset, condition, isDay }) {
    this.sunrise = sunrise;
    this.sunset = sunset;
    this.condition = condition;
    this.isDay = isDay;
    const bucket = pickPalette(Date.now(), sunrise, sunset);
    const next = buildPalette(bucket, condition);
    if (this.to && paletteEqual(this.to, next)) return;
    // Start a crossfade from whatever is currently displayed.
    this.from = interpolate(this.from, this.to, this.mix);
    this.to = next;
    this.mix = 0;
    this.bucket = bucket;

    // Position the sun/moon based on where we are in the day/night cycle.
    this._updateSunPos();
  }

  _updateSunPos() {
    const now = Date.now();
    let t;
    if (this.sunrise && this.sunset && this.bucket !== "night") {
      // Daytime arc 0..1 from sunrise to sunset.
      t = (now - this.sunrise) / (this.sunset - this.sunrise);
    } else if (this.sunrise && this.sunset) {
      // Nighttime arc for the moon: sunset -> next sunrise.
      const nextSunrise = this.sunrise + 24 * 3600_000;
      t = (now - this.sunset) / (nextSunrise - this.sunset);
    } else {
      t = ((new Date().getHours() + new Date().getMinutes() / 60) / 24) % 1;
    }
    t = Math.max(0, Math.min(1, t));
    this.sunX = 0.15 + t * 0.7;
    // Parabolic arc — highest in the middle.
    this.sunY = 0.65 - Math.sin(t * Math.PI) * 0.42;
  }

  update(dt) {
    if (this.mix < 1) this.mix = Math.min(1, this.mix + dt * this.fadeSpeed);
    this._updateSunPos();
    this._draw();
  }

  _draw() {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);

    // Interpolated palette between from->to.
    const p = interpolate(this.from, this.to, easeOutCubic(this.mix));

    // Gradient background.
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgbToCss(p.stops[0]));
    g.addColorStop(0.55, rgbToCss(p.stops[1]));
    g.addColorStop(1, rgbToCss(p.stops[2]));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Subtle horizon glow
    const horizonY = h * 0.78;
    const hg = ctx.createRadialGradient(w / 2, horizonY, 0, w / 2, horizonY, Math.max(w, h) * 0.8);
    hg.addColorStop(0, rgbToCss(p.stops[2], 0.6));
    hg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, w, h);

    // Sun/Moon disc with parallax offset from cursor.
    const px = this.sunX * w + input.nx * 18;
    const py = this.sunY * h + input.ny * 12;
    const discRadius = Math.min(w, h) * 0.085;

    // Halo
    const halo = ctx.createRadialGradient(px, py, 0, px, py, discRadius * 5);
    halo.addColorStop(0, rgbToCss(p.discGlow, 0.7));
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(px, py, discRadius * 5, 0, Math.PI * 2);
    ctx.fill();

    // Disc
    ctx.fillStyle = rgbToCss(p.disc);
    ctx.beginPath();
    ctx.arc(px, py, discRadius, 0, Math.PI * 2);
    ctx.fill();

    // Moon crater shading (only at night)
    if (this.bucket === "night") {
      const shade = ctx.createRadialGradient(
        px + discRadius * 0.35, py - discRadius * 0.2, 0,
        px + discRadius * 0.35, py - discRadius * 0.2, discRadius * 1.3
      );
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(1, "rgba(10, 12, 25, 0.45)");
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(px, py, discRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Expose the current UI tone so the main app can flip CSS variables.
  getTone() {
    if (!this.bucket) return "dark";
    if (this.bucket === "night") return "dark";
    if (this.bucket === "dawn" || this.bucket === "dusk") return "warm";
    if (this.condition === "storm" || this.condition === "rain") return "dark";
    return "bright";
  }
}

function buildPalette(bucket, condition) {
  const base = PALETTES[bucket] || PALETTES.day;
  const tint = WEATHER_TINT[condition] || WEATHER_TINT.clear;
  const stops = base.stops.map(hexToRgb).map(([r, g, b]) => [r * tint[0], g * tint[1], b * tint[2]]);
  return {
    stops,
    disc: hexToRgb(base.disc),
    discGlow: hexToRgb(base.disc), // reuse disc color; alpha applied at draw time
  };
}

function interpolate(a, b, t) {
  return {
    stops: [0, 1, 2].map((i) => lerpRgb(a.stops[i], b.stops[i], t)),
    disc: lerpRgb(a.disc, b.disc, t),
    discGlow: lerpRgb(a.discGlow, b.discGlow, t),
  };
}

function paletteEqual(a, b) {
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) if (Math.abs(a.stops[i][j] - b.stops[i][j]) > 0.5) return false;
  }
  return true;
}

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
