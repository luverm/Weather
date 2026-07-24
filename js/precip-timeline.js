// Round 22: precipitation timeline.
//
// Turns the next-24h hourly precip + probability into:
//   • a compact intensity-bar chart with a "now" line and sunrise/sunset marks
//   • a plain-English headline that answers "will it rain today, when, how much"
//
// Complements — rather than duplicates — the temp-centric hourly chart and the
// 2-hour nowcast banner. Both of those show rain, but neither answers
// "when does it start / how long does it last / how much total" at a glance.

// Two thresholds keep this readable:
// • DETECT (≥0.1 mm/h) counts as "raining" for start/end markers,
//   matching the nowcast banner's own trigger to avoid mixed signals.
// • ACTIVE_POP (≥30%) lets us surface probable but not-yet-modelled showers
//   on days where quantitative precip is 0 but the forecaster still hedged.
const DETECT_MM = 0.1;
const ACTIVE_POP = 30;

export function buildPrecipTimeline(weather, { fmtTime } = {}) {
  const hours = (weather?.hourly || []).slice(0, 24);
  const fmt = fmtTime || ((t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  if (hours.length < 2) return null;

  const now = Date.now();
  const start = hours[0].time;
  const end = hours[hours.length - 1].time + 3600_000; // one hour past the last bucket

  // Aggregate.
  let total = 0;
  let peak = 0;
  let peakTs = null;
  let anyWet = false;
  let anyLikely = false;
  for (const h of hours) {
    const p = Number(h.precip) || 0;
    total += p;
    if (p > peak) { peak = p; peakTs = h.time; }
    if (p >= DETECT_MM) anyWet = true;
    if ((h.pop ?? 0) >= ACTIVE_POP) anyLikely = true;
  }

  // Contiguous rain windows (allow one dry hour gap so a bursty shower reads
  // as one event rather than 3 fragments).
  const windows = [];
  let cur = null;
  let gap = 0;
  for (const h of hours) {
    const wet = (h.precip ?? 0) >= DETECT_MM;
    if (wet) {
      if (!cur) cur = { start: h.time, end: h.time + 3600_000, mm: h.precip, peak: h.precip };
      else {
        cur.end = h.time + 3600_000;
        cur.mm += h.precip;
        if (h.precip > cur.peak) cur.peak = h.precip;
      }
      gap = 0;
    } else if (cur) {
      gap += 1;
      if (gap >= 2) { windows.push(cur); cur = null; gap = 0; }
    }
  }
  if (cur) windows.push(cur);

  // Headline / subline copy.
  const headline = buildHeadline({ windows, total, peak, anyLikely, now, fmt, hours });

  return {
    hours,
    windowStart: start,
    windowEnd: end,
    now,
    total,
    peak,
    peakTs,
    windows,
    anyWet,
    anyLikely,
    headline: headline.head,
    detail: headline.detail,
    tone: headline.tone, // "wet" | "watch" | "dry"
    sunrise: weather.daily?.[0]?.sunrise || weather.sunrise,
    sunset: weather.daily?.[0]?.sunset || weather.sunset,
  };
}

function buildHeadline({ windows, total, peak, anyLikely, now, fmt, hours }) {
  if (!windows.length) {
    if (anyLikely) {
      const first = hours.find((h) => (h.pop ?? 0) >= ACTIVE_POP);
      return {
        head: "Dry, but showers possible",
        detail: first ? `Chance rises around ${fmt(first.time)} · 0 mm modelled` : "0 mm modelled in the next 24 h",
        tone: "watch",
      };
    }
    return {
      head: "Dry for the next 24 hours",
      detail: "No measurable precipitation in the forecast",
      tone: "dry",
    };
  }

  // Currently raining?
  const active = windows.find((w) => w.start <= now && w.end > now);
  if (active) {
    const endsIn = Math.max(0, Math.round((active.end - now) / 60_000));
    const label = endsIn >= 90
      ? `until ~${fmt(active.end)}`
      : endsIn > 0 ? `easing in ~${endsIn} min` : "wrapping up";
    return {
      head: peak >= 4 ? "Heavy rain now" : peak >= 1 ? "Rain now" : "Light rain now",
      detail: `${label} · ${total.toFixed(1)} mm expected over 24 h`,
      tone: "wet",
    };
  }

  // Next event.
  const next = windows[0];
  const inMin = Math.max(0, Math.round((next.start - now) / 60_000));
  let whenLabel;
  if (inMin <= 60) whenLabel = inMin <= 5 ? "starting now" : `in ${inMin} min`;
  else if (inMin <= 240) whenLabel = `from ${fmt(next.start)}`;
  else whenLabel = `around ${fmt(next.start)}`;

  const durH = Math.round((next.end - next.start) / 3600_000);
  const durLabel = durH <= 1 ? "brief" : durH <= 2 ? `~${durH} h` : `~${durH} h`;
  const intensity = next.peak >= 4 ? "Heavy rain" : next.peak >= 1 ? "Rain" : "Light rain";

  return {
    head: `${intensity} ${whenLabel}`,
    detail: `${durLabel} · ${next.mm.toFixed(1)} mm in that window · ${total.toFixed(1)} mm over 24 h`,
    tone: next.peak >= 1 ? "wet" : "watch",
  };
}

export function renderPrecipTimeline(rootEl, data, { onHourClick } = {}) {
  if (!rootEl) return;
  if (!data) { rootEl.hidden = true; return; }
  rootEl.hidden = false;
  rootEl.dataset.tone = data.tone;

  const bars = renderBars(data);
  const marks = renderMarks(data);

  rootEl.innerHTML = `
    <div class="precip-head">
      <span class="precip-title">Precipitation · next 24 h</span>
      <span class="precip-total">${data.total >= 0.05 ? `${data.total.toFixed(1)} mm` : "0 mm"}</span>
    </div>
    <div class="precip-summary">
      <span class="precip-headline">${escapeHtml(data.headline)}</span>
      <span class="precip-detail">${escapeHtml(data.detail)}</span>
    </div>
    <div class="precip-timeline">
      <div class="precip-bars">${bars}</div>
      <div class="precip-axis">${marks}</div>
    </div>
  `;

  rootEl.querySelectorAll(".precip-bar[data-ts]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ts = parseInt(btn.dataset.ts, 10);
      if (ts && onHourClick) onHourClick(ts);
    });
  });
}

function renderBars(data) {
  const { hours, windowStart, windowEnd, now, peak } = data;
  const denom = Math.max(1.2, peak, 3); // guarantee visible bars in light rain
  const totalSpan = Math.max(1, windowEnd - windowStart);
  const nowPct = clamp01((now - windowStart) / totalSpan) * 100;
  const N = hours.length;
  const width = 100 / N;

  const barsHtml = hours.map((h, i) => {
    const mm = Number(h.precip) || 0;
    const pop = Math.round(h.pop ?? 0);
    const barH = mm > 0 ? Math.max(6, Math.min(100, (mm / denom) * 100)) : 0;
    const ghostH = mm > 0 ? 0 : Math.max(0, Math.min(28, (pop / 100) * 28));
    const cls = classFor(mm, pop);
    const hh = new Date(h.time).getHours().toString().padStart(2, "0");
    const title = `${hh}:00 · ${mm.toFixed(1)} mm · ${pop}%`;
    return `
      <button type="button"
              class="precip-bar ${cls}"
              data-ts="${h.time}"
              style="left:${(i * width).toFixed(3)}%;width:${width.toFixed(3)}%"
              title="${escapeHtml(title)}"
              aria-label="${escapeHtml(title)}">
        ${ghostH > 0 ? `<span class="precip-ghost" style="height:${ghostH.toFixed(1)}%"></span>` : ""}
        ${barH > 0 ? `<span class="precip-fill" style="height:${barH.toFixed(1)}%"></span>` : ""}
      </button>
    `;
  }).join("");

  const nowLine = `<span class="precip-now" style="left:${nowPct.toFixed(2)}%"></span>`;
  return barsHtml + nowLine;
}

function renderMarks(data) {
  const { windowStart, windowEnd, sunrise, sunset } = data;
  const totalSpan = Math.max(1, windowEnd - windowStart);
  const pctFor = (ts) => clamp01((ts - windowStart) / totalSpan) * 100;
  const N = data.hours.length;

  // Time labels at ~6-hour intervals: first, +6h, +12h, +18h, last.
  const steps = [];
  for (let i = 0; i < N; i += Math.max(1, Math.round(N / 4))) steps.push(i);
  if (steps[steps.length - 1] !== N - 1) steps.push(N - 1);

  const tickHtml = steps.map((i) => {
    const h = data.hours[i];
    const hh = new Date(h.time).getHours().toString().padStart(2, "0");
    return `<span class="precip-tick" style="left:${pctFor(h.time).toFixed(2)}%">${hh}</span>`;
  }).join("");

  const events = [];
  if (sunrise && sunrise >= windowStart && sunrise <= windowEnd) {
    events.push(`<span class="precip-event sunrise" style="left:${pctFor(sunrise).toFixed(2)}%" title="Sunrise">↑</span>`);
  }
  if (sunset && sunset >= windowStart && sunset <= windowEnd) {
    events.push(`<span class="precip-event sunset" style="left:${pctFor(sunset).toFixed(2)}%" title="Sunset">↓</span>`);
  }
  return tickHtml + events.join("");
}

function classFor(mm, pop) {
  if (mm >= 4) return "heavy";
  if (mm >= 1) return "moderate";
  if (mm >= DETECT_MM) return "light";
  if (pop >= 60) return "likely";
  if (pop >= ACTIVE_POP) return "possible";
  return "dry";
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
