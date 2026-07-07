// Rain outlook — a 24-hour precipitation summary that complements the
// 2-hour nowcast banner. Takes the hourly array and produces a natural-
// language headline plus a per-hour intensity strip.

const WET_MM = 0.15;   // hourly amount that we call "wet"
const WET_POP = 40;    // or a probability threshold, whichever fires first

function isWet(h) {
  return (h.precip ?? 0) >= WET_MM || (h.pop ?? 0) >= WET_POP;
}

function fmtHour(ts, timezone) {
  try {
    return new Intl.DateTimeFormat([], {
      hour: "numeric", hour12: true, timeZone: timezone || undefined,
    }).format(new Date(ts));
  } catch {
    const d = new Date(ts);
    const h = d.getHours() % 12 || 12;
    return `${h}${d.getHours() < 12 ? "am" : "pm"}`;
  }
}

// Contiguous wet blocks.
function findBlocks(hours) {
  const blocks = [];
  let cur = null;
  for (const h of hours) {
    if (isWet(h)) {
      if (!cur) cur = { start: h.time, end: h.time + 3600_000, mm: 0, peakMm: 0, hours: [] };
      cur.hours.push(h);
      cur.end = h.time + 3600_000;
      cur.mm += (h.precip ?? 0);
      cur.peakMm = Math.max(cur.peakMm, h.precip ?? 0);
    } else if (cur) {
      blocks.push(cur);
      cur = null;
    }
  }
  if (cur) blocks.push(cur);
  return blocks;
}

function intensityWord(mm, isSnow) {
  if (isSnow) {
    if (mm >= 2) return "Heavy snow";
    if (mm >= 0.5) return "Snow";
    return "Light snow";
  }
  if (mm >= 4) return "Heavy rain";
  if (mm >= 1.5) return "Steady rain";
  if (mm >= 0.5) return "Showers";
  return "Light showers";
}

function humanDuration(ms) {
  const h = Math.round(ms / 3600_000);
  if (h <= 1) return "about an hour";
  if (h < 24) return `${h} hours`;
  return "a day";
}

// Turn (blocks, first hour, timezone) into a two-part { headline, sub }.
function narrate(blocks, hours, timezone) {
  if (!hours.length) return { headline: "Rain outlook unavailable", sub: "" };
  const firstBlock = blocks[0];
  if (!firstBlock) {
    return { headline: "Dry for the next 24 hours", sub: "No rain in the forecast." };
  }

  const now = Date.now();
  const startsInH = Math.max(0, Math.round((firstBlock.start - now) / 3600_000));
  const durationH = Math.max(1, Math.round((firstBlock.end - firstBlock.start) / 3600_000));
  const totalMm = blocks.reduce((s, b) => s + b.mm, 0);
  const isSnow = firstBlock.hours.every((h) => h.condition === "snow");
  const kind = intensityWord(firstBlock.peakMm, isSnow);

  let headline;
  if (durationH >= 20) {
    // Effectively all day.
    headline = `${kind} all day · ${totalMm.toFixed(1)} mm total`;
  } else if (startsInH === 0) {
    headline = `${kind} now, ${durationH === 1 ? "briefly" : `for ${durationH}h`}`;
  } else {
    headline = `${kind} in ${startsInH}h · ${fmtHour(firstBlock.start, timezone)}–${fmtHour(firstBlock.end, timezone)}`;
  }

  // What follows the first wet block?
  let sub;
  const afterEnd = firstBlock.end;
  const laterBlocks = blocks.slice(1);
  if (durationH >= 20) {
    sub = "Bring rain gear the whole day.";
  } else if (!laterBlocks.length) {
    const dryAfter = hours.some((h) => h.time >= afterEnd);
    sub = dryAfter
      ? `Dry after ${fmtHour(afterEnd, timezone)} · ${totalMm.toFixed(1)} mm total`
      : `${totalMm.toFixed(1)} mm expected · ${humanDuration(firstBlock.end - firstBlock.start)}`;
  } else {
    const nextStart = laterBlocks[0].start;
    sub = `Then again around ${fmtHour(nextStart, timezone)} · ${totalMm.toFixed(1)} mm total`;
  }

  return { headline, sub };
}

// Public: produce a complete outlook payload from a weather object.
export function computeRainOutlook(weather) {
  const hourly = (weather?.hourly || []).slice(0, 24);
  if (!hourly.length) return null;
  const blocks = findBlocks(hourly);
  const { headline, sub } = narrate(blocks, hourly, weather.timezone);
  const total = blocks.reduce((s, b) => s + b.mm, 0);
  const anyRisk = hourly.some((h) => (h.pop ?? 0) >= 20 || (h.precip ?? 0) >= 0.05);
  return {
    hourly,
    blocks,
    headline,
    sub,
    total,
    anyRisk,
    dry: blocks.length === 0,
  };
}

// Cell background: encode intensity as opacity of the accent colour.
// A cell renders as "dry" unless it clears both a precip and probability
// bar — otherwise a 5% pop hour would masquerade as light rain.
function cellStyle(h) {
  const mm = h.precip ?? 0;
  const pop = h.pop ?? 0;
  const dry = mm < 0.1 && pop < 25;
  if (dry) return { className: "dry", opacity: 1 };
  const i = Math.min(1, Math.max(mm / 3, pop / 100));
  const isSnow = h.condition === "snow";
  return {
    className: isSnow ? "snow" : (mm >= 2 ? "heavy" : mm >= 0.5 ? "steady" : "light"),
    opacity: 0.3 + i * 0.65,
  };
}

// Render the outlook into a root element. `handlers.onHourClick(ts)` is
// called if the user clicks a cell (for scrubber integration).
export function renderRainOutlook(rootEl, outlook, { onHourClick, timezone } = {}) {
  if (!rootEl) return;
  // Hide when there is no real wet block. A 20% probability with no
  // precip isn't worth a whole banner.
  if (!outlook || !outlook.blocks.length) {
    rootEl.hidden = true;
    return;
  }

  // Build the header row (icon + copy).
  const headerHtml = `
    <div class="rain-outlook-head">
      <svg class="rain-outlook-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 14a4 4 0 010-8 5 5 0 019.9-1A4 4 0 0116 14H6z"
              fill="none" stroke="currentColor" stroke-width="1.6"/>
        <path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"
              stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
      <div class="rain-outlook-text">
        <strong>${outlook.headline}</strong>
        <span>${outlook.sub || ""}</span>
      </div>
      <span class="rain-outlook-total" title="Total precipitation over 24 h" aria-label="Total precipitation ${outlook.total.toFixed(1)} millimetres">
        ${outlook.total.toFixed(1)}<span class="rain-outlook-unit">mm</span>
      </span>
    </div>`;

  // Build the 24-cell timeline.
  const cellsHtml = outlook.hourly.map((h, i) => {
    const { className, opacity } = cellStyle(h);
    const showLabel = i === 0 || i % 6 === 0;
    const label = showLabel ? fmtHour(h.time, timezone) : "";
    const title = `${fmtHour(h.time, timezone)} · ${(h.precip ?? 0).toFixed(1)} mm · ${Math.round(h.pop ?? 0)}%`;
    return `
      <button type="button" class="rain-cell ${className}" data-ts="${h.time}" style="--fill:${opacity.toFixed(2)}" title="${title}" aria-label="${title}">
        <span class="rain-cell-fill"></span>
        <span class="rain-cell-label">${label}</span>
      </button>`;
  }).join("");

  rootEl.innerHTML = `${headerHtml}
    <div class="rain-outlook-strip" role="list" aria-label="24-hour precipitation timeline">${cellsHtml}</div>`;

  if (onHourClick) {
    rootEl.querySelectorAll(".rain-cell").forEach((cell) => {
      cell.addEventListener("click", () => {
        const ts = Number(cell.dataset.ts);
        if (!Number.isNaN(ts)) onHourClick(ts);
      });
    });
  }

  rootEl.hidden = false;
}
