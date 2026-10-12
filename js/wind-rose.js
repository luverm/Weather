// 24-hour wind rose.
//
// Instead of the classic frequency rose (bars sized by % of time wind blew
// from each sector), this is a chronological rose: each of the next 24
// hours is a thin ray from the centre, pointing in the direction the wind
// is coming from, with length proportional to wind speed. Hour-of-day is
// encoded in opacity so the user can read morning→evening left-to-right.

const SIZE = 180;        // SVG viewBox size
const CX = SIZE / 2;
const CY = SIZE / 2;
const MAX_R = 70;        // outer radius for the longest wind
const INNER_R = 10;

export function renderWindRose({ card, svg, headlineEl, subEl, hours }) {
  if (!card || !svg) return;
  const list = (hours || []).slice(0, 24).filter((h) => h.windDir != null && h.wind != null);
  if (!list.length) {
    card.hidden = true;
    return;
  }
  card.hidden = false;

  const maxWind = Math.max(10, ...list.map((h) => h.wind));

  // Clear everything except the compass guides which we rebuild each time
  // so the rose stays in sync when units/location change.
  svg.innerHTML = "";

  // Compass ring + 4 cardinal spokes.
  const ns = "http://www.w3.org/2000/svg";
  for (const r of [MAX_R, MAX_R * 0.66, MAX_R * 0.33]) {
    const ring = document.createElementNS(ns, "circle");
    ring.setAttribute("cx", CX); ring.setAttribute("cy", CY);
    ring.setAttribute("r", r);
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke", "rgba(255,255,255,0.08)");
    ring.setAttribute("stroke-width", "1");
    svg.appendChild(ring);
  }
  const cardinals = [["N", 0], ["E", 90], ["S", 180], ["W", 270]];
  for (const [label, deg] of cardinals) {
    const { x, y } = polar(deg, MAX_R + 10);
    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", x); text.setAttribute("y", y);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("class", "wind-rose-cardinal");
    text.textContent = label;
    svg.appendChild(text);
  }

  // Rays, one per hour.
  list.forEach((h, i) => {
    const r = INNER_R + (h.wind / maxWind) * (MAX_R - INNER_R);
    // Dir is where wind comes FROM — point ray outward in that direction.
    const { x, y } = polar(h.windDir, r);
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", CX); line.setAttribute("y1", CY);
    line.setAttribute("x2", x);  line.setAttribute("y2", y);
    line.setAttribute("stroke", colorFor(h.wind));
    line.setAttribute("stroke-width", "2.4");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("opacity", String(0.35 + 0.6 * (1 - i / Math.max(1, list.length - 1))));
    svg.appendChild(line);
    // Arrowhead dot at the tip.
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("cx", x); dot.setAttribute("cy", y);
    dot.setAttribute("r", "2");
    dot.setAttribute("fill", colorFor(h.wind));
    dot.setAttribute("opacity", "0.9");
    svg.appendChild(dot);
  });

  // Headline + sub.
  const avgDir = circularMean(list.map((h) => h.windDir));
  const peak = list.reduce((best, h) => (h.wind > best.wind ? h : best), list[0]);
  const dominant = cardinal(avgDir);
  if (headlineEl) headlineEl.textContent = `${dominant} prevailing`;
  if (subEl) {
    const t = new Date(peak.time);
    const label = t.toLocaleTimeString([], { hour: "numeric" });
    subEl.textContent = `peak ${Math.round(peak.wind)} km/h at ${label}`;
  }
}

function polar(deg, r) {
  // 0° = north = straight up (-y).
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + Math.cos(rad) * r, y: CY + Math.sin(rad) * r };
}

function cardinal(deg) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const i = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return dirs[i];
}

function circularMean(degs) {
  // Average by converting to unit vectors.
  let sx = 0, sy = 0;
  for (const d of degs) {
    const r = (d * Math.PI) / 180;
    sx += Math.cos(r);
    sy += Math.sin(r);
  }
  const mean = (Math.atan2(sy, sx) * 180) / Math.PI;
  return (mean + 360) % 360;
}

function colorFor(w) {
  if (w == null) return "#9ad1ff";
  if (w < 10) return "#9ad1ff";    // calm/breeze
  if (w < 25) return "#7ad0b8";    // moderate
  if (w < 40) return "#ffd98a";    // fresh/strong
  if (w < 60) return "#ff9c7a";    // near gale
  return "#ff5b5b";                 // storm
}
