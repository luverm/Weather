// Shared input bus. Every scene reads from the same normalized state so
// parallax, hover reactions, and cursor-driven effects stay in sync.

const state = {
  // Normalized cursor position (-0.5..0.5 around viewport center).
  nx: 0,
  ny: 0,
  // Pixel cursor position.
  x: 0,
  y: 0,
  // Velocity in pixels per second, smoothed.
  vx: 0,
  vy: 0,
  // Whether the pointer is currently over the window.
  active: false,
  // Last time we received a move event.
  lastMoveAt: 0,
};

let lastEvent = { x: 0, y: 0, t: performance.now() };

function handleMove(clientX, clientY) {
  const now = performance.now();
  const dt = Math.max(1, now - lastEvent.t) / 1000;

  const dx = clientX - lastEvent.x;
  const dy = clientY - lastEvent.y;

  // Exponential smoothing for velocity so jittery deltas don't make particles jump.
  const smoothing = 0.22;
  state.vx = state.vx * (1 - smoothing) + (dx / dt) * smoothing;
  state.vy = state.vy * (1 - smoothing) + (dy / dt) * smoothing;

  state.x = clientX;
  state.y = clientY;
  state.nx = clientX / window.innerWidth - 0.5;
  state.ny = clientY / window.innerHeight - 0.5;
  state.active = true;
  state.lastMoveAt = now;

  lastEvent = { x: clientX, y: clientY, t: now };
}

window.addEventListener("pointermove", (e) => handleMove(e.clientX, e.clientY), { passive: true });
window.addEventListener("pointerleave", () => { state.active = false; }, { passive: true });

window.addEventListener("touchmove", (e) => {
  const t = e.touches[0];
  if (t) handleMove(t.clientX, t.clientY);
}, { passive: true });

// Device orientation as a fallback "cursor" on mobile — subtle tilt parallax.
window.addEventListener("deviceorientation", (e) => {
  if (state.active) return; // real pointer takes priority
  if (e.gamma == null || e.beta == null) return;
  // gamma: left-right [-90..90], beta: front-back [-180..180]
  const nx = Math.max(-0.5, Math.min(0.5, e.gamma / 45 * 0.5));
  const ny = Math.max(-0.5, Math.min(0.5, (e.beta - 45) / 45 * 0.5));
  state.nx = state.nx * 0.9 + nx * 0.1;
  state.ny = state.ny * 0.9 + ny * 0.1;
}, { passive: true });

// Bleed velocity back to zero when idle so flourishes settle.
setInterval(() => {
  state.vx *= 0.85;
  state.vy *= 0.85;
}, 100);

export const input = state;
