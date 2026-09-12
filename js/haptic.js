// Tiny wrapper around navigator.vibrate. Fires only on devices that
// actually vibrate — desktops with the API present but non-functional
// treat it as a no-op. Silent when the API is missing or reduce-motion
// is on (the OS convention for "quiet" tactile too).

let enabled = true;

export function setHapticEnabled(v) { enabled = !!v; }

export function haptic(kind = "tap") {
  if (!enabled) return;
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    switch (kind) {
      case "tap":     navigator.vibrate(8);          break;
      case "step":    navigator.vibrate(4);          break;
      case "success": navigator.vibrate([6, 30, 6]); break;
      case "warn":    navigator.vibrate([14]);       break;
      default:        navigator.vibrate(8);
    }
  } catch { /* silent */ }
}
