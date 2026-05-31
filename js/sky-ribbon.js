// Compact 12-hour "sky ribbon" showing cloud cover with day/night shading.
// Each cell is clickable to scrub to that hour. Renders as a strip of segments
// where the color blends from clear blue → overcast grey at daytime, and from
// midnight blue → grey-violet at night.

export class SkyRibbon {
  constructor({ rootEl, onCellClick }) {
    this.root = rootEl;
    this.onCellClick = onCellClick;
    this.hours = [];
    this.sunrise = null;
    this.sunset = null;
  }

  setData(hours, { sunrise, sunset } = {}) {
    this.hours = (hours || []).slice(0, 12);
    this.sunrise = sunrise || null;
    this.sunset = sunset || null;
    this.render();
  }

  /** Index of the cell whose hour contains the current moment. */
  _nowIndex() {
    if (!this.hours.length) return -1;
    const now = Date.now();
    let best = -1, bestDiff = Infinity;
    for (let i = 0; i < this.hours.length; i++) {
      const diff = Math.abs(this.hours[i].time - now);
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    }
    // Only mark if within 90 minutes — otherwise "now" isn't in view.
    return bestDiff <= 90 * 60_000 ? best : -1;
  }

  render() {
    if (!this.root) return;
    if (!this.hours.length) {
      this.root.innerHTML = "";
      this.root.hidden = true;
      return;
    }
    this.root.hidden = false;
    const sunriseLabel = this.sunrise ? fmtHour(this.sunrise) : null;
    const sunsetLabel = this.sunset ? fmtHour(this.sunset) : null;
    const nowIdx = this._nowIndex();

    const cells = this.hours.map((h, i) => {
      const cover = h.cloudCover ?? estimateCoverFromCondition(h.condition);
      const isDay = !!h.isDay;
      const color = skyColor(cover, isDay);
      const label = new Date(h.time).getHours();
      const labelStr = label.toString().padStart(2, "0");
      const showTick = i === 0 || label % 3 === 0;
      const title = `${labelStr}:00 · ${Math.round(cover)}% cloud · ${h.label}`;
      // Mark the sunrise/sunset-crossing hour with a tiny sun glyph.
      const isCross = (this.sunrise && hourMatches(h.time, this.sunrise)) ||
                      (this.sunset && hourMatches(h.time, this.sunset));
      const crossIcon = isCross
        ? (this.sunrise && hourMatches(h.time, this.sunrise) ? "↑" : "↓")
        : "";
      const nowAttr = i === nowIdx ? ' data-now="true"' : "";
      return `
        <button class="sky-cell" data-i="${i}" data-ts="${h.time}"${nowAttr}
                title="${title}" aria-label="${title}"
                style="--sky:${color}">
          ${isCross ? `<span class="sky-cross" aria-hidden="true">${crossIcon}</span>` : ""}
          ${showTick ? `<span class="sky-tick">${labelStr}</span>` : ""}
        </button>
      `;
    }).join("");

    const legend = [
      sunriseLabel ? `<span class="sky-legend-item">↑ ${sunriseLabel}</span>` : "",
      sunsetLabel ? `<span class="sky-legend-item">↓ ${sunsetLabel}</span>` : "",
    ].filter(Boolean).join("");

    this.root.innerHTML = `
      <div class="sky-row">${cells}</div>
      <div class="sky-legend">
        <span class="sky-legend-label">Sky next 12h</span>
        <span class="sky-legend-meta">${legend}</span>
      </div>
    `;
    this.root.querySelectorAll(".sky-cell").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ts = parseInt(btn.dataset.ts, 10);
        if (ts) this.onCellClick?.(ts);
      });
    });
  }
}

function fmtHour(ts) {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function hourMatches(a, b) {
  return Math.abs(a - b) <= 30 * 60_000;
}

// Heuristic fallback when hourly cloud_cover isn't available.
function estimateCoverFromCondition(c) {
  switch (c) {
    case "clear": return 5;
    case "fog": return 95;
    case "storm":
    case "rain":
    case "snow": return 90;
    case "clouds": return 70;
    default: return 50;
  }
}

// Map (cover%, day/night) to an RGB-ish CSS color. Day clear = warm sky blue;
// day overcast = pale grey. Night clear = deep navy with violet tint; night
// overcast = muted slate.
function skyColor(cover, isDay) {
  const c = Math.max(0, Math.min(100, cover ?? 50)) / 100;
  if (isDay) {
    // From #6cb4ff (clear) to #b8bec8 (overcast).
    return mix("#6cb4ff", "#b8bec8", c);
  }
  return mix("#1a2a55", "#454a66", c);
}

function mix(a, b, t) {
  const ax = parseInt(a.slice(1), 16);
  const bx = parseInt(b.slice(1), 16);
  const ar = (ax >> 16) & 255, ag = (ax >> 8) & 255, ab = ax & 255;
  const br = (bx >> 16) & 255, bg = (bx >> 8) & 255, bb = bx & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}
