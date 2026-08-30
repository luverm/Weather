// 24-hour "comfort score" ribbon — each cell is coloured by the same
// score palette as the hero chip. Height also scales with the score so
// the good and bad stretches are readable in low-contrast environments.

import { scoreWeather, scoreLabel, scoreColor } from "./weather-score.js";

export class ScoreStrip {
  constructor({ rootEl, summaryEl, onCellClick, getWeather }) {
    this.root = rootEl;
    this.summary = summaryEl;
    this.onCellClick = onCellClick;
    // getWeather lets us pull the parent air-quality once (hourly items
    // never carry an AQI); avoids duplicating the field into every hour.
    this.getWeather = getWeather || (() => ({}));
    this.hours = [];
  }

  setHours(hours) {
    this.hours = (hours || []).slice(0, 24);
    this.render();
  }

  highlight(idx) {
    if (!this.root) return;
    this.root.querySelectorAll(".sscore-cell").forEach((b) => b.classList.remove("active"));
    if (idx == null || idx < 0) return;
    this.root.querySelector(`.sscore-cell[data-i="${idx}"]`)?.classList.add("active");
  }

  render() {
    if (!this.root) return;
    if (!this.hours.length) {
      this.root.innerHTML = "";
      this.root.hidden = true;
      if (this.summary) { this.summary.hidden = true; this.summary.textContent = ""; }
      return;
    }
    this.root.hidden = false;
    const parent = this.getWeather() || {};
    const now = Date.now();
    const scores = this.hours.map((h) =>
      scoreWeather({ ...h, airQuality: parent.airQuality })
    );

    const cells = this.hours.map((h, i) => {
      const s = scores[i] ?? 0;
      const color = scoreColor(s);
      const heightPct = Math.max(8, Math.round(s));
      const isNow = Math.abs(h.time - now) < 30 * 60_000;
      const tickHour = new Date(h.time).getHours();
      const showTick = tickHour % 6 === 0;
      const title = `${String(tickHour).padStart(2, "0")}:00 · score ${s} (${scoreLabel(s)})`;
      return `
        <button class="sscore-cell${isNow ? " is-now" : ""}" data-i="${i}" data-ts="${h.time}" title="${title}">
          <span class="sscore-bar" style="height:${heightPct}%;background:${color}"></span>
          ${showTick ? `<span class="sscore-tick">${String(tickHour).padStart(2, "0")}</span>` : ""}
        </button>
      `;
    }).join("");
    this.root.innerHTML = cells;

    this.root.querySelectorAll(".sscore-cell").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ts = parseInt(btn.dataset.ts, 10);
        if (ts) this.onCellClick?.(ts);
      });
    });

    if (this.summary) {
      const peak = peakWindow(this.hours, scores);
      if (peak) {
        this.summary.hidden = false;
        this.summary.textContent = peak.label;
        // Make it clickable — a shortcut for scrubbing to the peak hour.
        this.summary.style.cursor = "pointer";
        this.summary.setAttribute("role", "button");
        this.summary.setAttribute("tabindex", "0");
        this.summary.onclick = () => this.onCellClick?.(peak.ts);
        this.summary.onkeydown = (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this.onCellClick?.(peak.ts);
          }
        };
      } else {
        this.summary.hidden = true;
        this.summary.textContent = "";
      }
    }
  }
}

// Find the peak-score cell and its window (surrounding cells within 5
// points of peak). Returns { label, ts } so the caller can make it
// clickable.
function peakWindow(hours, scores) {
  if (!hours.length) return null;
  let peakI = 0;
  for (let i = 1; i < scores.length; i++) if (scores[i] > scores[peakI]) peakI = i;
  const peak = scores[peakI];
  if (peak == null) return null;
  let a = peakI, b = peakI;
  while (a > 0 && scores[a - 1] >= peak - 5) a--;
  while (b < scores.length - 1 && scores[b + 1] >= peak - 5) b++;
  const shortT = (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const window = a === b
    ? `at ${shortT(hours[a].time)}`
    : `${shortT(hours[a].time)} → ${shortT(hours[b].time)}`;
  return {
    label: `Peak comfort · ${window} (${peak} · ${scoreLabel(peak)})`,
    ts: hours[peakI].time,
  };
}
