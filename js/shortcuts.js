// Global keyboard shortcuts. Ignores keys while the user is typing.

export function installShortcuts(handlers) {
  const overlay = document.getElementById("shortcuts");
  const closeBtn = document.getElementById("shortcuts-close");
  let lastFocus = null;

  function toggleOverlay(force) {
    const hide = force === false || (force !== true && !overlay.hidden);
    if (hide) {
      overlay.hidden = true;
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
      lastFocus = null;
    } else {
      lastFocus = document.activeElement;
      overlay.hidden = false;
      // Move focus into the dialog for screen readers / trap.
      (closeBtn || overlay).focus?.();
    }
  }
  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) toggleOverlay(false);
  });
  closeBtn?.addEventListener("click", () => toggleOverlay(false));

  // Focus trap: Tab cycles within the dialog when open.
  overlay?.addEventListener("keydown", (e) => {
    if (overlay.hidden || e.key !== "Tab") return;
    const focusables = overlay.querySelectorAll(
      'button, [href], [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      last.focus(); e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus(); e.preventDefault();
    }
  });

  window.addEventListener("keydown", (e) => {
    // Let browsers handle modifier combos (copy, find, etc.)
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    // Shift+Arrow is a shortcut on its own (±6h scrub) — allow it even though
    // shiftKey is set, as long as it isn't paired with a modifier.
    const typing = isTyping(e.target);

    // Always available, even while typing.
    if (e.key === "Escape") {
      if (!overlay.hidden) { toggleOverlay(false); e.preventDefault(); return; }
      if (typing) { e.target.blur(); return; }
    }

    if (typing) return;

    const key = e.key;
    if (key === "/") { e.preventDefault(); handlers.focusSearch?.(); return; }
    if (key === "?" || (e.shiftKey && key === "/")) { e.preventDefault(); toggleOverlay(); return; }
    if (key === "h" || key === "H" || key === "k" || key === "K") {
      e.preventDefault(); toggleOverlay(); return;
    }
    if (key === "l" || key === "L") { e.preventDefault(); handlers.locate?.(); return; }
    if (key === "u" || key === "U") { e.preventDefault(); handlers.toggleUnits?.(); return; }
    if (key === "m" || key === "M") { e.preventDefault(); handlers.toggleAudio?.(); return; }
    if (key === "f" || key === "F") { e.preventDefault(); handlers.toggleFullscreenRadar?.(); return; }
    if (key === "n" || key === "N") { e.preventDefault(); handlers.resetScrubber?.(); return; }
    if (key === " ") {
      e.preventDefault();
      handlers.toggleRadar?.();
      return;
    }
    if (key === "ArrowLeft") {
      handlers.nudge?.(e.shiftKey ? -6 : -1);
      e.preventDefault();
      return;
    }
    if (key === "ArrowRight") {
      handlers.nudge?.(e.shiftKey ? 6 : 1);
      e.preventDefault();
      return;
    }
    if (key === "[") { handlers.cyclePlace?.(-1); e.preventDefault(); return; }
    if (key === "]") { handlers.cyclePlace?.(1); e.preventDefault(); return; }
    if (key === "t" || key === "T") { handlers.jumpTomorrow?.(); e.preventDefault(); return; }
    if (key === "r" || key === "R") { handlers.refresh?.(); e.preventDefault(); return; }
    if (key === "s" || key === "S") { handlers.share?.(); e.preventDefault(); return; }
    if (key === "p" || key === "P") { handlers.togglePresentation?.(); e.preventDefault(); return; }
    if (key === ",") { handlers.jumpColdest?.(); e.preventDefault(); return; }
    if (key === ".") { handlers.jumpWarmest?.(); e.preventDefault(); return; }
    if (key === "v" || key === "V") { handlers.jumpUvPeak?.(); e.preventDefault(); return; }
    if (key === "x" || key === "X") { handlers.jumpGustPeak?.(); e.preventDefault(); return; }
    if (key === "w" || key === "W") { handlers.jumpNextRain?.(); e.preventDefault(); return; }
    if (key === "g" || key === "G") { handlers.toggleSettings?.(); e.preventDefault(); return; }
    if (key === "+" || (e.shiftKey && key === "=")) { handlers.volumeDelta?.(0.1); e.preventDefault(); return; }
    if (key === "-" || key === "_") { handlers.volumeDelta?.(-0.1); e.preventDefault(); return; }
    if (key === "i" || key === "I") { handlers.toggleInsights?.(); e.preventDefault(); return; }
    if (/^[1-9]$/.test(key)) {
      handlers.jumpToPlaceIndex?.(parseInt(key, 10) - 1);
      e.preventDefault();
      return;
    }
  });
}

function isTyping(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable === true;
}
