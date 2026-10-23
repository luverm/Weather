// 7-day precipitation outlook: compact mm bars + weekly total.
// Takes a weather object (with `daily`) and renders into a container.

export class PrecipOutlook {
  constructor({ rootEl, onDayClick, getUnit }) {
    this.rootEl = rootEl;
    this.onDayClick = onDayClick;
    this.getUnit = getUnit || (() => "C");
    this._days = [];
  }

  setDays(days, { timezone } = {}) {
    this._days = Array.isArray(days) ? days.slice(0, 7) : [];
    this._timezone = timezone;
    this.render();
  }

  render() {
    if (!this.rootEl) return;
    const days = this._days;
    if (!days.length) {
      this.rootEl.hidden = true;
      this.rootEl.innerHTML = "";
      return;
    }
    const anyRain = days.some((d) => (d.precip ?? 0) > 0.05);
    if (!anyRain) {
      // Hide the whole card when the week is bone-dry — avoids a row of zero bars.
      this.rootEl.hidden = true;
      this.rootEl.innerHTML = "";
      return;
    }
    this.rootEl.hidden = false;

    const total = days.reduce((s, d) => s + (d.precip ?? 0), 0);
    const peak = Math.max(0.5, ...days.map((d) => d.precip ?? 0));
    const wettestIdx = days.reduce((best, d, i) =>
      (d.precip ?? 0) > (days[best]?.precip ?? 0) ? i : best, 0);

    const unitLabel = total >= 25 ? "mm" : "mm";
    const totalLabel = total >= 10 ? total.toFixed(0) : total.toFixed(1);

    const dayLabels = days.map((d, i) => {
      if (i === 0) return "Today";
      try {
        return new Date(d.time).toLocaleDateString(undefined, {
          weekday: "short",
          ...(this._timezone && this._timezone !== "auto"
            ? { timeZone: this._timezone }
            : {}),
        });
      } catch {
        return new Date(d.time).toLocaleDateString(undefined, { weekday: "short" });
      }
    });

    const bars = days.map((d, i) => {
      const mm = d.precip ?? 0;
      const h = Math.max(2, Math.round((mm / peak) * 36));
      const pop = Math.round(d.pop ?? 0);
      const wet = i === wettestIdx && mm > 0.1;
      const dim = mm < 0.1 ? " dim" : "";
      const kind = (d.condition === "snow") ? "snow" : "rain";
      const mmLabel = mm >= 1 ? mm.toFixed(0) : mm >= 0.1 ? mm.toFixed(1) : "·";
      return `
        <button type="button" class="precip-col${wet ? " wettest" : ""}${dim}"
                data-i="${i}" data-ts="${d.time}" data-kind="${kind}"
                aria-label="${dayLabels[i]}: ${mm.toFixed(1)} mm, ${pop}% chance">
          <span class="precip-mm">${mmLabel}</span>
          <span class="precip-bar" style="height:${h}px"></span>
          <span class="precip-pop">${pop}%</span>
          <span class="precip-day">${dayLabels[i]}</span>
        </button>
      `;
    }).join("");

    this.rootEl.innerHTML = `
      <div class="precip-head">
        <span class="precip-title">Rain this week</span>
        <span class="precip-total">${totalLabel} ${unitLabel}<span class="precip-total-sub"> total</span></span>
      </div>
      <div class="precip-cols">${bars}</div>
    `;

    this.rootEl.querySelectorAll(".precip-col").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ts = parseInt(btn.dataset.ts, 10);
        if (!isFinite(ts)) return;
        // Jump to the daytime hour of that day (12:00 local) so scrubber lands
        // somewhere useful rather than midnight.
        const noon = new Date(ts);
        noon.setHours(12, 0, 0, 0);
        this.onDayClick?.(noon.getTime());
      });
    });
  }
}
