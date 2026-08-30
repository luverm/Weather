// Compact 24-hour precipitation-amount ribbon. Complements the comfort
// strip (which shows probability) by visualizing *how much* rain is
// forecast per hour — bar height = mm, color = intensity band.
// The whole strip hides when the next 24 h is completely dry.

const INTENSITY_STOPS = [
  { max: 0.1,  color: null },                 // dry
  { max: 0.5,  color: "#7fbfff" },            // drizzle
  { max: 2.5,  color: "#4d8bff" },            // light
  { max: 7.5,  color: "#3a5fd6" },            // moderate
  { max: 15,   color: "#7a4bc7" },            // heavy
  { max: Infinity, color: "#c14ea3" },        // torrential
];

export class PrecipTimeline {
  constructor({ rootEl, summaryEl, onCellClick }) {
    this.root = rootEl;
    this.summary = summaryEl;
    this.onCellClick = onCellClick;
    this.hours = [];
  }

  setHours(hours) {
    this.hours = (hours || []).slice(0, 24);
    this.render();
  }

  highlight(idx) {
    if (!this.root) return;
    this.root.querySelectorAll(".ptl-cell").forEach((b) => b.classList.remove("active"));
    if (idx == null || idx < 0) return;
    this.root.querySelector(`.ptl-cell[data-i="${idx}"]`)?.classList.add("active");
  }

  render() {
    if (!this.root) return;
    const total = this.hours.reduce((s, h) => s + (h.precip ?? 0), 0);
    const anyVisible = this.hours.some((h) => (h.precip ?? 0) >= 0.1);
    // Nothing meaningful to plot — hide everything.
    if (!this.hours.length || (!anyVisible && total < 0.1)) {
      this.root.hidden = true;
      if (this.summary) { this.summary.hidden = true; this.summary.textContent = ""; }
      return;
    }
    this.root.hidden = false;

    // Scale bar height to the peak hour, capped so drizzle days still
    // register visibly (never let peak be less than 0.5 mm for scale).
    const peak = Math.max(0.5, ...this.hours.map((h) => h.precip ?? 0));

    const cells = this.hours.map((h, i) => {
      const mm = h.precip ?? 0;
      const color = intensityColor(mm);
      const heightPct = mm <= 0.02 ? 0 : Math.max(6, Math.round((mm / peak) * 100));
      const tickHour = new Date(h.time).getHours();
      const showTick = tickHour % 6 === 0;
      const titleAmt = mm >= 0.1 ? `${mm.toFixed(mm < 1 ? 2 : 1)} mm` : "trace";
      const title = `${String(tickHour).padStart(2, "0")}:00 · ${titleAmt}${h.pop != null ? ` · ${h.pop}%` : ""}`;
      return `
        <button class="ptl-cell" data-i="${i}" data-ts="${h.time}" title="${title}">
          <span class="ptl-bar" style="height:${heightPct}%;background:${color || "transparent"}"></span>
          ${showTick ? `<span class="ptl-tick">${String(tickHour).padStart(2, "0")}</span>` : ""}
        </button>
      `;
    }).join("");
    this.root.innerHTML = cells;

    this.root.querySelectorAll(".ptl-cell").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ts = parseInt(btn.dataset.ts, 10);
        if (ts) this.onCellClick?.(ts);
      });
    });

    if (this.summary) {
      const s = summarize(this.hours, total);
      if (s) {
        this.summary.hidden = false;
        this.summary.textContent = s;
      } else {
        this.summary.hidden = true;
      }
    }
  }
}

function intensityColor(mm) {
  for (const stop of INTENSITY_STOPS) if (mm < stop.max) return stop.color;
  return INTENSITY_STOPS[INTENSITY_STOPS.length - 1].color;
}

// Produce a short human summary such as
//   "3.2 mm in 24 h · rain 14:00 → 18:00"
// or "trace showers around 09:00".
function summarize(hours, total) {
  const wet = hours.map((h, i) => ({ i, h, mm: h.precip ?? 0 })).filter((x) => x.mm >= 0.1);
  if (!wet.length) return null;
  const first = wet[0].h;
  const last = wet[wet.length - 1].h;
  const shortT = (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

  if (total < 0.5) {
    return `Trace showers near ${shortT(first.time)}`;
  }
  const totalStr = total < 10 ? total.toFixed(1) : Math.round(total).toString();
  if (wet.length === 1) return `${totalStr} mm · brief burst at ${shortT(first.time)}`;
  return `${totalStr} mm over 24 h · ${shortT(first.time)} → ${shortT(last.time)}`;
}
