// Thin wrapper around the Vibration API.
//
// Browsers that don't support `navigator.vibrate` (every desktop and iOS
// Safari as of 2026) silently no-op. Each call pattern is kept short so a
// device without a vibration motor stays indistinguishable from one that
// just received an ignored call. Respects the user's reduce-motion
// preference so people who dialled motion down don't feel surprise taps.

let reducedMotion = false;

export function setHapticsReducedMotion(on) {
  reducedMotion = !!on;
}

function doVibrate(pattern) {
  if (reducedMotion) return;
  const nav = globalThis.navigator;
  if (!nav || typeof nav.vibrate !== "function") return;
  try { nav.vibrate(pattern); } catch { /* ignore */ }
}

/** Short tap — chips, buttons, forecast rows. */
export function hapticTap() { doVibrate(12); }

/** Toggle / snap-to feel — unit flip, scrubber reset, daily expand. */
export function hapticToggle() { doVibrate([8, 24, 8]); }

/** Soft error / blocked state — e.g. empty search submission. */
export function hapticWarn() { doVibrate([30, 40, 30]); }
