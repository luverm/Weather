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
    if (key === "l" || key === "L") { e.preventDefault(); handlers.locate?.(); return; }
    if (key === "u" || key === "U") { e.preventDefault(); handlers.toggleUnits?.(); return; }
    if (key === "m" || key === "M") { e.preventDefault(); handlers.toggleAudio?.(); return; }
    if (key === "f" || key === "F") { e.preventDefault(); handlers.toggleFullscreenRadar?.(); return; }
    if (key === "n" || key === "N") { e.preventDefault(); handlers.resetScrubber?.(); return; }
    if (key === "r" || key === "R") { e.preventDefault(); handlers.refresh?.(); return; }
    if (key === "k" || key === "K") { e.preventDefault(); handlers.toggleKiosk?.(); return; }
    if (key === " ") {
      e.preventDefault();
      handlers.toggleRadar?.();
      return;
    }
    if (key === "ArrowLeft") { handlers.nudge?.(-1); e.preventDefault(); return; }
    if (key === "ArrowRight") { handlers.nudge?.(1); e.preventDefault(); return; }
    if (key === "[") { handlers.cyclePlace?.(-1); e.preventDefault(); return; }
    if (key === "]") { handlers.cyclePlace?.(1); e.preventDefault(); return; }
    if (key >= "1" && key <= "7") {
      e.preventDefault();
      handlers.jumpToDay?.(parseInt(key, 10) - 1);
      return;
    }
  });

  installSwipeNavigation(handlers);
}

// Two-finger horizontal swipe cycles saved cities on touch devices.
// We use 2 fingers (or a long edge swipe) to avoid clashing with the scrubber,
// chart, and radar map which already capture single-touch gestures.
function installSwipeNavigation(handlers) {
  let startX = null;
  let startY = null;
  let twoFinger = false;
  const THRESHOLD = 70;     // min horizontal distance
  const RATIO = 1.6;        // dx must dominate dy

  const isInteractive = (target) => !!(target?.closest?.(
    "#scrubber-track, #chart-svg, #radar-map, .nowcast-bars, .comfort-strip, .search-results, .settings-menu"
  ));

  window.addEventListener("touchstart", (e) => {
    twoFinger = e.touches.length === 2;
    if (!twoFinger) {
      // Allow single-finger swipe from the page background only, never from
      // inside an interactive widget.
      if (isInteractive(e.target)) { startX = null; return; }
    }
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
  }, { passive: true });

  window.addEventListener("touchend", (e) => {
    if (startX == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    startX = startY = null;
    if (Math.abs(dx) < THRESHOLD) return;
    if (Math.abs(dx) < Math.abs(dy) * RATIO) return;
    // Only fire when the user is past the threshold and the swipe is
    // unmistakably horizontal.
    handlers.cyclePlace?.(dx < 0 ? 1 : -1);
  }, { passive: true });
}

function isTyping(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable === true;
}
