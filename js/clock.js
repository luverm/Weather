// Simulated clock. Every scene reads the "scene time" from here so the
// time scrubber can rewind/fast-forward the entire sky.
//
// - offsetMs: milliseconds added to real time.
// - listeners: fire when the offset changes so the UI can re-sample data.

const state = {
  offsetMs: 0,
  listeners: new Set(),
};

export const clock = {
  /** Current scene time (real-time + offset). */
  now() { return Date.now() + state.offsetMs; },
  /** Current offset in ms (positive = future, negative = past). */
  offset() { return state.offsetMs; },
  /** Set an absolute offset. */
  setOffset(ms) {
    if (ms === state.offsetMs) return;
    state.offsetMs = ms;
    for (const fn of state.listeners) fn(ms);
  },
  reset() { this.setOffset(0); },
  isLive() { return Math.abs(state.offsetMs) < 60_000; },
  onChange(fn) { state.listeners.add(fn); return () => state.listeners.delete(fn); },
};
