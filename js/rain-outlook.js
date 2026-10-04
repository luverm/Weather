// Rain outlook card: short headline ("rain starts in 2h"),
// a 24-hour precipitation strip, and a 7-day totals row.
//
// Reads from weather.hourly[] (precip + pop) and weather.daily[] (precip).
// Hides itself if neither series carries any usable data.
//
// If `onHourClick(ts)` is passed, each hourly cell becomes a button that
// scrubs the time to that hour.

export function renderRainOutlook(root, weather, { onHourClick } = {}) {
  if (!root) return;
  const headline = root.querySelector("#rain-outlook-headline");
  const sub = root.querySelector("#rain-outlook-sub");
  const strip24 = root.querySelector("#rain-outlook-24h");
  const total24 = root.querySelector("#rain-outlook-24h-total");
  const week = root.querySelector("#rain-outlook-week");
  const totalWeek = root.querySelector("#rain-outlook-week-total");

  const hourly = (weather?.hourly || []).slice(0, 24);
  const daily = (weather?.daily || []).slice(0, 7);
  const tz = weather?.timezone;

  const hasHourly = hourly.some((h) => h.precip != null || h.pop != null);
  const hasDaily = daily.some((d) => d.precip != null);
  if (!hasHourly && !hasDaily) {
    root.hidden = true;
    return;
  }
  root.hidden = false;

  // ---- Headline logic -----------------------------------------------------
  const now = Date.now();
  const rainingNow = hourly[0]?.precip != null && hourly[0].precip >= 0.1;
  // First hour with meaningful precip (>= 0.1mm) OR high probability (>= 50%).
  let firstRainIdx = -1;
  for (let i = 0; i < hourly.length; i++) {
    const h = hourly[i];
    const precipHit = h.precip != null && h.precip >= 0.1;
    const popHit = h.pop != null && h.pop >= 50;
    if (precipHit || popHit) { firstRainIdx = i; break; }
  }
  // Count rain hours in the next 24h.
  const rainHours = hourly.filter((h) => (h.precip ?? 0) >= 0.1).length;
  // Last continuous rain hour starting from firstRainIdx.
  let rainWindowEnd = firstRainIdx;
  if (firstRainIdx >= 0) {
    for (let i = firstRainIdx; i < hourly.length; i++) {
      if ((hourly[i].precip ?? 0) >= 0.1 || (hourly[i].pop ?? 0) >= 40) {
        rainWindowEnd = i;
      } else {
        break;
      }
    }
  }

  // Precipitation type (rain / snow / mix) within the rain window.
  const windowStart = firstRainIdx < 0 ? 0 : firstRainIdx;
  const windowEnd = firstRainIdx < 0 ? hourly.length - 1 : rainWindowEnd;
  const kinds = new Set();
  for (let i = windowStart; i <= windowEnd && i < hourly.length; i++) {
    if ((hourly[i].precip ?? 0) >= 0.1 || (hourly[i].pop ?? 0) >= 40) {
      if (hourly[i].condition === "snow") kinds.add("snow");
      else kinds.add("rain");
    }
  }
  const kind = kinds.has("snow") && kinds.has("rain")
    ? "wintry mix"
    : kinds.has("snow") ? "snow" : "rain";
  const kindCap = kind === "wintry mix" ? "Wintry mix" : kind[0].toUpperCase() + kind.slice(1);
  root.dataset.kind = kind.replace(" ", "-");

  let headlineText, subText;
  if (rainingNow) {
    headlineText = `${kindCap === "Rain" ? "Raining" : (kind === "snow" ? "Snowing" : "Wintry mix")} now`;
    const stopIdx = findStopIdx(hourly);
    subText = stopIdx > 0
      ? `Eases around ${fmtHour(hourly[stopIdx].time, tz)}`
      : "Expected to continue";
  } else if (firstRainIdx === 0) {
    headlineText = `${kindCap} starting`;
    subText = rainWindowEnd > 0
      ? `Through ~${fmtHour(hourly[rainWindowEnd].time + 3600_000, tz)}`
      : (kind === "snow" ? "Light flurries likely" : "Light shower likely");
  } else if (firstRainIdx > 0) {
    const h = hourly[firstRainIdx];
    const hrs = Math.max(1, Math.round((h.time - now) / 3600_000));
    headlineText = `${kindCap} in ${hrs}h`;
    const until = rainWindowEnd > firstRainIdx
      ? ` – ${fmtHour(hourly[rainWindowEnd].time + 3600_000, tz)}`
      : "";
    subText = `Around ${fmtHour(h.time, tz)}${until}`;
  } else {
    headlineText = "Dry 24h";
    // Look for the next rainy day beyond today.
    const nextWetDay = daily.findIndex((d, i) => i > 0 && (d.precip ?? 0) >= 0.5);
    if (nextWetDay > 0) {
      const d = daily[nextWetDay];
      const kindNext = d.condition === "snow" ? "snow" : "rain";
      subText = `Next ${kindNext}: ${fmtWeekday(d.time, tz)}`;
    } else if (daily.length) {
      subText = "Dry week ahead";
    } else {
      subText = "No rain expected";
    }
  }
  headline.textContent = headlineText;
  sub.textContent = subText;

  // ---- 24h hourly strip ---------------------------------------------------
  // Scale: use max of (0.5mm, actual max) so a drizzle still shows cells.
  const maxPrecip = Math.max(0.5, ...hourly.map((h) => h.precip ?? 0));
  const totalWet = hourly.reduce((a, h) => a + (h.precip ?? 0), 0);
  strip24.classList.toggle("is-dry", totalWet < 0.1);
  strip24.innerHTML = "";
  const nowTs = Date.now();
  hourly.forEach((h) => {
    const cell = document.createElement(onHourClick ? "button" : "div");
    if (onHourClick) cell.type = "button";
    cell.className = "rain-cell";
    if (Math.abs(h.time - nowTs) <= 30 * 60_000) cell.classList.add("now");
    if (onHourClick) cell.addEventListener("click", () => onHourClick(h.time));
    if (h.condition === "snow") cell.classList.add("is-snow");
    const precip = h.precip ?? 0;
    const pop = h.pop ?? 0;
    const heightPct = precip > 0 ? Math.min(100, 15 + (precip / maxPrecip) * 85) : 0;
    cell.style.setProperty("--h", `${heightPct}%`);
    // Opacity blends probability into the fill (makes high-pop/low-precip visible).
    const opacity = precip > 0 ? Math.max(0.35, pop / 100) : Math.max(0, pop / 100 * 0.25);
    cell.style.setProperty("--op", opacity.toFixed(2));
    cell.dataset.pop = pop;
    cell.dataset.precip = precip.toFixed(2);
    cell.title = `${fmtHour(h.time, tz)} · ${precip.toFixed(1)}mm · ${pop}% chance`;
    // Dot marker for the first rain hour.
    if (firstRainIdx >= 0 && h.time === hourly[firstRainIdx].time) {
      cell.classList.add("first-rain");
    }
    strip24.appendChild(cell);
  });

  const total24Sum = hourly.reduce((a, h) => a + (h.precip ?? 0), 0);
  total24.textContent = total24Sum > 0
    ? `${total24Sum.toFixed(total24Sum < 10 ? 1 : 0)} mm · ${rainHours}h wet`
    : "0 mm";

  // ---- 7-day totals -------------------------------------------------------
  if (daily.length && week && totalWeek) {
    const maxDaily = Math.max(0.5, ...daily.map((d) => d.precip ?? 0));
    const sumWeek = daily.reduce((a, d) => a + (d.precip ?? 0), 0);
    week.innerHTML = "";
    daily.forEach((d, i) => {
      const bar = document.createElement("div");
      bar.className = "rain-week-bar";
      const precip = d.precip ?? 0;
      const h = precip > 0 ? Math.min(100, 18 + (precip / maxDaily) * 82) : 4;
      bar.style.setProperty("--h", `${h}%`);
      bar.style.setProperty("--op", precip > 0 ? "0.85" : "0.18");
      // Keep day labels to 2 letters so narrow bars don't clip.
      const dayLabel = fmtWeekday(d.time, tz).slice(0, 2).toUpperCase();
      if (i === 0) bar.classList.add("today");
      if (d.condition === "snow") bar.classList.add("is-snow");
      const amountText = precip > 0 ? precip.toFixed(precip < 10 ? 1 : 0) : "";
      bar.innerHTML = `<span class="rain-week-amount">${amountText}</span><span class="rain-week-day">${dayLabel}</span>`;
      const typeLabel = d.condition === "snow" ? "snow" : "rain";
      bar.title = `${fmtWeekday(d.time, tz)} · ${precip.toFixed(1)} mm ${typeLabel} · ${d.pop ?? 0}% chance`;
      if (precip >= maxDaily * 0.75 && precip > 0.5) bar.classList.add("peak");
      week.appendChild(bar);
    });
    totalWeek.textContent = sumWeek > 0
      ? `${sumWeek.toFixed(sumWeek < 10 ? 1 : 0)} mm`
      : "0 mm";
  }
}

function findStopIdx(hourly) {
  for (let i = 1; i < hourly.length; i++) {
    if ((hourly[i].precip ?? 0) < 0.1 && (hourly[i].pop ?? 0) < 30) return i;
  }
  return -1;
}

function fmtHour(ts, tz) {
  const opts = { hour: "numeric", ...(tz && tz !== "auto" ? { timeZone: tz } : {}) };
  return new Date(ts).toLocaleTimeString(undefined, opts).replace(/\s?(AM|PM)/i, (m) => m.toLowerCase().replace(/\s/g, ""));
}

function fmtWeekday(ts, tz) {
  const opts = { weekday: "short", ...(tz && tz !== "auto" ? { timeZone: tz } : {}) };
  return new Date(ts).toLocaleDateString(undefined, opts);
}
