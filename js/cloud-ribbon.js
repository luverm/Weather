// A thin 24-hour ribbon that visualises sky cloudiness. Each hour contributes
// a gradient stop coloured from translucent (clear sky) to soft cloud-grey
// (overcast). Day vs night is respected so a starlit clear night reads
// distinctly from a clear noon.

const NS = "http://www.w3.org/2000/svg";

export class CloudRibbon {
  constructor({ svgEl, gradEl, ticksEl }) {
    this.svg = svgEl;
    this.grad = gradEl;
    this.ticks = ticksEl;
  }

  setHours(hours) {
    const list = (hours || []).slice(0, 24).filter((h) => h.cloudCover != null);
    if (!this.svg || !this.grad) return;
    if (list.length < 2) {
      this.svg.setAttribute("hidden", "");
      return;
    }
    this.svg.removeAttribute("hidden");

    // Rebuild gradient stops — one per hour, plus an extra at 100% for crispness.
    while (this.grad.firstChild) this.grad.removeChild(this.grad.firstChild);
    const n = list.length;
    list.forEach((h, i) => {
      const stop = document.createElementNS(NS, "stop");
      const pct = (i / (n - 1)) * 100;
      stop.setAttribute("offset", `${pct.toFixed(2)}%`);
      stop.setAttribute("stop-color", colorFor(h.cloudCover, h.isDay));
      this.grad.appendChild(stop);
    });

    // Hour ticks every 6h.
    if (this.ticks) {
      while (this.ticks.firstChild) this.ticks.removeChild(this.ticks.firstChild);
      list.forEach((h, i) => {
        const hr = new Date(h.time).getHours();
        if (hr % 6 !== 0) return;
        const x = (i / (n - 1)) * 600;
        const line = document.createElementNS(NS, "line");
        line.setAttribute("x1", x.toFixed(1));
        line.setAttribute("x2", x.toFixed(1));
        line.setAttribute("y1", "0");
        line.setAttribute("y2", "14");
        line.setAttribute("stroke", "rgba(255,255,255,0.18)");
        line.setAttribute("stroke-width", "1");
        line.setAttribute("stroke-dasharray", "2 2");
        this.ticks.appendChild(line);
      });
    }

    // Accessible title.
    const summary = describeRibbon(list);
    this.svg.setAttribute("title", summary);
    this.svg.setAttribute("aria-label", summary);
  }
}

function colorFor(cloudPct, isDay) {
  const c = Math.max(0, Math.min(100, cloudPct)) / 100;
  // Day: sky-blue (clear) -> warm grey (overcast).
  // Night: deep indigo (clear, stars visible) -> slate (overcast).
  const day = mix([155, 205, 240], [180, 180, 188], c);
  const night = mix([46, 56, 88], [80, 82, 96], c);
  const [r, g, b] = isDay ? day : night;
  // Slight transparency so the card glass shows through.
  return `rgba(${r},${g},${b},0.82)`;
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function describeRibbon(hours) {
  const avg = hours.reduce((a, h) => a + h.cloudCover, 0) / hours.length;
  const min = Math.min(...hours.map((h) => h.cloudCover));
  const max = Math.max(...hours.map((h) => h.cloudCover));
  let mood = "Mostly clear";
  if (avg > 80) mood = "Mostly overcast";
  else if (avg > 55) mood = "Mostly cloudy";
  else if (avg > 30) mood = "Partly cloudy";
  return `${mood} · cloud ${Math.round(min)}–${Math.round(max)}% over the next 24h`;
}
