// Rain outlook: cumulative precipitation over the next 24 hours.
//
// Renders a filled area chart in the extras card. Produces a short headline
// ("12 mm expected", "Dry — chance of showers after 3pm", etc.) and marks
// the hours where rain is forecast to start / peak.

const WIDTH = 160;
const HEIGHT = 36;

export function renderRainOutlook({ card, totalEl, headlineEl, pathLineEl, pathFillEl, labelsEl, hours, unit }) {
  if (!card) return;
  const next24 = (hours || []).slice(0, 24);
  if (!next24.length) {
    card.hidden = true;
    return;
  }
  card.hidden = false;

  const unitLabel = unit === "in" ? "in" : "mm";
  const toUnit = (mm) => (unit === "in" ? mm / 25.4 : mm);

  // Cumulative sum, step-by-step.
  const cumulative = [];
  let running = 0;
  for (const h of next24) {
    running += Math.max(0, h.precip ?? 0);
    cumulative.push(running);
  }
  const total = cumulative[cumulative.length - 1] || 0;
  const peak = Math.max(0.5, total); // avoid /0

  const points = cumulative.map((v, i) => {
    const x = (i / (cumulative.length - 1 || 1)) * WIDTH;
    const y = HEIGHT - (v / peak) * (HEIGHT - 4) - 2;
    return [x, y];
  });

  const line = points.map(([x, y], i) => (i === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : `L${x.toFixed(1)} ${y.toFixed(1)}`)).join(" ");
  const fill = `${line} L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z`;
  if (pathLineEl) pathLineEl.setAttribute("d", line);
  if (pathFillEl) pathFillEl.setAttribute("d", fill);

  // Headline + total
  if (totalEl) totalEl.textContent = `${format(toUnit(total))} ${unitLabel}`;
  if (headlineEl) headlineEl.textContent = headline(next24, total);

  // Rain-start marker label
  if (labelsEl) {
    labelsEl.innerHTML = "";
    const start = next24.findIndex((h) => (h.precip ?? 0) > 0.1 || (h.pop ?? 0) >= 55);
    if (start >= 0 && total > 0.1) {
      const [x] = points[start];
      const marker = document.createElementNS("http://www.w3.org/2000/svg", "line");
      marker.setAttribute("x1", String(x));
      marker.setAttribute("x2", String(x));
      marker.setAttribute("y1", "2");
      marker.setAttribute("y2", String(HEIGHT));
      marker.setAttribute("class", "rain-outlook-marker");
      labelsEl.appendChild(marker);
    }
  }
}

function format(v) {
  if (v == null || isNaN(v)) return "0";
  if (v < 0.1) return "0";
  if (v < 1) return v.toFixed(1);
  if (v < 10) return v.toFixed(1);
  return Math.round(v).toString();
}

function headline(hours, total) {
  if (total < 0.2) {
    const chance = hours.reduce((max, h) => Math.max(max, h.pop ?? 0), 0);
    if (chance >= 40) return `Dry mostly — up to ${Math.round(chance)}% chance`;
    return "Dry across the next 24h";
  }
  const first = hours.findIndex((h) => (h.precip ?? 0) > 0.1 || (h.pop ?? 0) >= 55);
  if (first >= 0) {
    const t = hours[first].time;
    const mins = Math.round((t - Date.now()) / 60_000);
    if (mins < 60) return `Starts within the hour`;
    if (mins < 180) return `Starts in ~${Math.round(mins / 60)}h`;
    const label = new Date(t).toLocaleTimeString([], { hour: "numeric" });
    return `Starts around ${label}`;
  }
  return "Scattered showers possible";
}
