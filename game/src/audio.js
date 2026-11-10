// Tiny synthesized SFX (no asset files). Volume falls off with distance from the listener.
let ctx = null;
let noiseBuf = null;
let master = null;
let volume = 1;

export function setVolume(v) {
  volume = v;
  if (master) master.gain.value = v;
}

function out() {
  if (!master) {
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  }
  return master;
}

function ensure() {
  if (ctx) return ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch {
    ctx = null;
  }
  return ctx;
}

export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

function noise(dur, freq, vol, q = 1) {
  const c = ensure();
  if (!c || vol <= 0.005) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  const t = c.currentTime;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(out());
  src.start(t);
  src.stop(t + dur);
}

function tone(freq, dur, vol, type = 'square') {
  const c = ensure();
  if (!c) return;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = c.createGain();
  const t = c.currentTime;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(out());
  o.start(t);
  o.stop(t + dur);
}

const falloff = (dist) => Math.max(0, 1 - dist / 45);

export const sfx = {
  shot(caliber, dist = 0) {
    const v = 0.35 * falloff(dist);
    if (caliber === '12g') noise(0.28, 900, v * 1.2);
    else if (caliber === '7.62') noise(0.18, 1800, v);
    else noise(0.11, 2600, v * 0.8);
  },
  empty() {
    tone(1400, 0.04, 0.05);
  },
  hit() {
    tone(220, 0.06, 0.07, 'sawtooth');
  },
  reload() {
    tone(700, 0.05, 0.04);
    setTimeout(() => tone(500, 0.05, 0.04), 120);
  },
  pickup() {
    tone(880, 0.05, 0.04, 'triangle');
  },
  ui() {
    tone(620, 0.03, 0.03, 'triangle');
  },
  coin() {
    tone(988, 0.06, 0.05, 'triangle');
    setTimeout(() => tone(1319, 0.08, 0.05, 'triangle'), 60);
  },
  groan(dist = 0) {
    const c = ensure();
    if (!c) return;
    const v = 0.06 * Math.max(0, 1 - dist / 25);
    const o = c.createOscillator();
    o.type = 'sawtooth';
    const t = c.currentTime;
    o.frequency.setValueAtTime(90 + Math.random() * 40, t);
    o.frequency.linearRampToValueAtTime(60 + Math.random() * 20, t + 0.7);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    o.connect(f).connect(g).connect(out());
    o.start(t);
    o.stop(t + 0.85);
  },
  heli(vol = 0.08) {
    noise(0.12, 200, vol, 4);
  },
};
