// Global keyboard shortcuts. Ignores keys while the user is typing.

export function installShortcuts(handlers) {
  const overlay = document.getElementById("shortcuts");
  const closeBtn = document.getElementById("shortcuts-close");

  function toggleOverlay(force) {
    const hide = force === false || (force !== true && !overlay.hidden);
    overlay.hidden = hide;
  }
  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) toggleOverlay(false);
  });
  closeBtn?.addEventListener("click", () => toggleOverlay(false));

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
    if (key === " ") {
      e.preventDefault();
      handlers.toggleRadar?.();
      return;
    }
    if (key === "ArrowLeft") { handlers.nudge?.(-1); e.preventDefault(); return; }
    if (key === "ArrowRight") { handlers.nudge?.(1); e.preventDefault(); return; }
  });
}

function isTyping(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable === true;
}
