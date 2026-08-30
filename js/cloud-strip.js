// 24-hour sky-coverage ribbon. Bar height = cloud cover %, colour
// grades from bright sky-blue (clear) → soft grey (overcast). Sits
// alongside the precip timeline as a "sun window" locator, useful
// for photographers, stargazers, and anyone chasing sunshine.

export class CloudStrip {
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
    this.root.querySelectorAll(".csky-cell").forEach((b) => b.classList.remove("active"));
    if (idx == null || idx < 0) return;
    this.root.querySelector(`.csky-cell[data-i="${idx}"]`)?.classList.add("active");
  }

  render() {
    if (!this.root) return;
    const covers = this.hours.map((h) => h.cloudCover).filter((v) => v != null);
    if (!covers.length) {
      this.root.hidden = true;
      if (this.summary) { this.summary.hidden = true; this.summary.textContent = ""; }
      return;
    }
    this.root.hidden = false;

    const now = Date.now();
    const cells = this.hours.map((h, i) => {
      const c = h.cloudCover ?? 0;
      const color = coverColor(c, h.isDay);
      const heightPct = Math.max(6, Math.round(c));
      const tickHour = new Date(h.time).getHours();
      const showTick = tickHour % 6 === 0;
      const title = `${String(tickHour).padStart(2, "0")}:00 · ${Math.round(c)}% sky cover`;
      const isNow = Math.abs(h.time - now) < 30 * 60_000;
      return `
        <button class="csky-cell${isNow ? " is-now" : ""}" data-i="${i}" data-ts="${h.time}" title="${title}">
          <span class="csky-bar" style="height:${heightPct}%;background:${color}"></span>
          ${showTick ? `<span class="csky-tick">${String(tickHour).padStart(2, "0")}</span>` : ""}
        </button>
      `;
    }).join("");
    this.root.innerHTML = cells;

    this.root.querySelectorAll(".csky-cell").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ts = parseInt(btn.dataset.ts, 10);
        if (ts) this.onCellClick?.(ts);
      });
    });

    if (this.summary) {
      const s = summarize(this.hours);
      if (s) { this.summary.hidden = false; this.summary.textContent = s; }
      else   { this.summary.hidden = true; this.summary.textContent = ""; }
    }
  }
}

// Map cloud-cover % to a colour on the sky-blue → overcast-grey scale.
// Slightly muted at night so the strip still reads calm.
function coverColor(pct, isDay) {
  const c = Math.max(0, Math.min(100, pct));
  const clearDay   = [122, 190, 255]; // #7abeff
  const overcastDay = [180, 190, 200]; // muted grey
  const clearNight = [80, 110, 170];
  const overcastNight = [110, 118, 135];
  const a = isDay ? clearDay : clearNight;
  const b = isDay ? overcastDay : overcastNight;
  const t = c / 100;
  const mix = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
}

// Find the widest clear-sky window in the next 24 h. "Clear" here means
// ≤ 30 % cover (mostly clear). Returns "Mostly clear all day", a
// window description, or null.
function summarize(hours) {
  if (!hours.length) return null;
  const dayHours = hours.filter((h) => h.isDay);
  const scoped = dayHours.length ? dayHours : hours;
  const clearMask = scoped.map((h) => (h.cloudCover ?? 100) <= 30);
  const totalClear = clearMask.filter(Boolean).length;
  if (totalClear === scoped.length) {
    return dayHours.length ? "Mostly clear all day" : "Mostly clear tonight";
  }
  if (!totalClear) {
    return dayHours.length ? "Overcast through the day" : "Overcast tonight";
  }
  // Longest run of clear hours.
  let best = null, cur = null;
  for (let i = 0; i < scoped.length; i++) {
    if (clearMask[i]) {
      if (!cur) cur = { start: scoped[i].time, endTime: scoped[i].time, len: 1 };
      else { cur.endTime = scoped[i].time; cur.len++; }
      if (!best || cur.len > best.len) best = { ...cur };
    } else cur = null;
  }
  if (!best || best.len < 2) return null;
  const shortT = (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  // best.endTime is the *last* clear cell; the window actually extends
  // through the end of that hour, but this is close enough for a chip.
  return `Clearest window · ${shortT(best.start)} → ${shortT(best.endTime)} (${best.len} h)`;
}
