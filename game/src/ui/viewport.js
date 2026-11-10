/**
 * DeadSector is landscape-only. When a phone is held upright (or auto-rotate is
 * locked), the whole game (#app) is rotated 90° so it always opens lying down.
 * Pointer coordinates and element rects are converted to the app's own space here.
 */
const touchDevice = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

export const view = { rot: false, w: window.innerWidth, h: window.innerHeight };

export function updateView() {
  const W = window.innerWidth, H = window.innerHeight;
  view.rot = touchDevice && H > W;
  view.w = view.rot ? H : W;
  view.h = view.rot ? W : H;
  const app = document.getElementById('app');
  if (app) {
    app.style.width = `${view.w}px`;
    app.style.height = `${view.h}px`;
    // rotate clockwise around the top-left corner, then shift back into view
    app.style.transform = view.rot ? `translate(${W}px, 0) rotate(90deg)` : 'none';
  }
  const b = document.body;
  b.classList.toggle('rot', view.rot);
  b.classList.toggle('compact', view.h < 520);
  b.classList.toggle('narrow', view.w < 700);
  document.documentElement.style.setProperty('--aw', `${view.w}px`);
  document.documentElement.style.setProperty('--ah', `${view.h}px`);
}

/** Client (screen) point -> app point. */
export function toApp(cx, cy) {
  return view.rot ? { x: cy, y: window.innerWidth - cx } : { x: cx, y: cy };
}

/** Client rect (getBoundingClientRect) -> rect in app space. */
export function rectToApp(r) {
  if (!view.rot) return r;
  const W = window.innerWidth;
  return { left: r.top, top: W - r.right, right: r.bottom, bottom: W - r.left, width: r.height, height: r.width };
}
