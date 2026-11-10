import * as THREE from 'three';

/*
 * Procedural, tileable canvas textures (no external image assets needed).
 * Everything is drawn with wrap-around so textures repeat seamlessly.
 */

let seed = 12345;
function rnd() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

/** Draw fn at (x,y) and its wrapped copies so the texture tiles. */
function wrap(size, x, y, r, fn) {
  for (const dx of [-size, 0, size])
    for (const dy of [-size, 0, size]) {
      const px = x + dx, py = y + dy;
      if (px + r < 0 || py + r < 0 || px - r > size || py - r > size) continue;
      fn(px, py);
    }
}

function tex(c, { srgb = true, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
const cache = new Map();
const once = (k, f) => (cache.has(k) ? cache.get(k) : (cache.set(k, f()), cache.get(k)));

/** Leaf cluster with alpha (for tree/bush foliage cards). hueShift: autumn-ish -> green */
export function leafTexture(hue = 62) {
  return once(`leaf${hue}`, () => {
    seed = 99 + hue;
    const S = 256;
    const [c, g] = canvas(S);
    g.clearRect(0, 0, S, S);
    for (let i = 0; i < 420; i++) {
      // denser near the center so the card silhouette reads as a clump
      const a = rnd() * Math.PI * 2, rr = Math.pow(rnd(), 0.65) * S * 0.47;
      const x = S / 2 + Math.cos(a) * rr, y = S / 2 + Math.sin(a) * rr;
      const len = 10 + rnd() * 12, w = len * (0.4 + rnd() * 0.2);
      const h = hue + (rnd() - 0.5) * 26;
      const l = 30 + rnd() * 32 + (y < S / 2 ? 8 : 0);
      g.save();
      g.translate(x, y);
      g.rotate(rnd() * Math.PI * 2);
      g.fillStyle = hsl(h, 45 + rnd() * 25, l);
      g.beginPath();
      g.ellipse(0, 0, len / 2, w / 2, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = hsl(h, 40, l - 10, 0.6);
      g.lineWidth = 0.7;
      g.beginPath();
      g.moveTo(-len / 2, 0);
      g.lineTo(len / 2, 0);
      g.stroke();
      g.restore();
    }
    const t = tex(c, { repeat: false });
    t.generateMipmaps = true;
    return t;
  });
}

export function barkTexture() {
  return once('bark', () => {
    seed = 7;
    const S = 256;
    const [c, g] = canvas(S);
    g.fillStyle = '#4a3a2c';
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 260; i++) {
      const x = rnd() * S, w = 2 + rnd() * 6, l = 16 + rnd() * 22;
      g.fillStyle = hsl(28, 22, l, 0.55);
      wrap(S, x, 0, w, (px) => g.fillRect(px, 0, w, S));
    }
    for (let i = 0; i < 120; i++) {
      const x = rnd() * S, y = rnd() * S;
      g.fillStyle = hsl(30, 15, 10 + rnd() * 10, 0.7);
      wrap(S, x, y, 10, (px, py) => g.fillRect(px, py, 1 + rnd() * 2, 6 + rnd() * 18));
    }
    return tex(c);
  });
}

/** Ground: mossy soil seen under the grass. */
export function soilTexture() {
  return once('soil', () => {
    seed = 21;
    const S = 512;
    const [c, g] = canvas(S);
    g.fillStyle = '#4c5a2a';
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * S, y = rnd() * S, r = 2 + rnd() * 9;
      const dry = rnd() < 0.35;
      g.fillStyle = dry ? hsl(40, 32, 28 + rnd() * 12, 0.5) : hsl(80 + rnd() * 18, 38, 20 + rnd() * 14, 0.5);
      wrap(S, x, y, r, (px, py) => {
        g.beginPath();
        g.arc(px, py, r, 0, Math.PI * 2);
        g.fill();
      });
    }
    return tex(c);
  });
}

/** Dirt path with pebbles. */
export function dirtTexture() {
  return once('dirt', () => {
    seed = 33;
    const S = 512;
    const [c, g] = canvas(S);
    g.fillStyle = '#6e5539';
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 3000; i++) {
      const x = rnd() * S, y = rnd() * S, r = 1 + rnd() * 7;
      g.fillStyle = hsl(28 + rnd() * 12, 28 + rnd() * 15, 22 + rnd() * 22, 0.45);
      wrap(S, x, y, r, (px, py) => {
        g.beginPath();
        g.arc(px, py, r, 0, Math.PI * 2);
        g.fill();
      });
    }
    // pebbles with highlight + shadow
    for (let i = 0; i < 260; i++) {
      const x = rnd() * S, y = rnd() * S, r = 1.5 + rnd() * 4.5;
      const l = 30 + rnd() * 18;
      wrap(S, x, y, r + 2, (px, py) => {
        g.fillStyle = 'rgba(30,20,10,0.45)';
        g.beginPath();
        g.ellipse(px + 1.2, py + 1.5, r, r * 0.75, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = hsl(30, 10, l);
        g.beginPath();
        g.ellipse(px, py, r, r * 0.75, rnd() * 3, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = hsl(35, 15, l + 10, 0.35);
        g.beginPath();
        g.ellipse(px - r * 0.3, py - r * 0.3, r * 0.4, r * 0.3, 0, 0, Math.PI * 2);
        g.fill();
      });
    }
    return tex(c);
  });
}

export function concreteTexture() {
  return once('concrete', () => {
    seed = 44;
    const S = 512;
    const [c, g] = canvas(S);
    g.fillStyle = '#8b8780';
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 4000; i++) {
      const x = rnd() * S, y = rnd() * S, r = 1 + rnd() * 4;
      g.fillStyle = hsl(30, 5, 40 + rnd() * 30, 0.25);
      wrap(S, x, y, r, (px, py) => g.fillRect(px, py, r, r));
    }
    for (let i = 0; i < 40; i++) {
      const x = rnd() * S, y = rnd() * S, r = 20 + rnd() * 60;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(60,55,45,0.25)');
      grd.addColorStop(1, 'rgba(60,55,45,0)');
      g.fillStyle = grd;
      wrap(S, x, y, r, (px, py) => g.fillRect(px - r, py - r, r * 2, r * 2));
    }
    g.strokeStyle = 'rgba(40,38,34,0.6)';
    g.lineWidth = 2;
    g.strokeRect(0, 0, S, S);
    return tex(c);
  });
}

export function brickTexture(base = '#8e4a36') {
  return once(`brick${base}`, () => {
    seed = 55;
    const S = 256;
    const [c, g] = canvas(S);
    g.fillStyle = '#a69a88';
    g.fillRect(0, 0, S, S);
    const bw = 64, bh = 21.33;
    for (let row = 0; row < 12; row++)
      for (let col = -1; col < 5; col++) {
        const x = col * bw + (row % 2 ? bw / 2 : 0), y = row * bh;
        const k = 0.75 + rnd() * 0.4;
        const cc = new THREE.Color(base).multiplyScalar(k);
        g.fillStyle = `#${cc.getHexString()}`;
        g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
        g.fillStyle = 'rgba(0,0,0,0.12)';
        g.fillRect(x + 2, y + bh - 5, bw - 4, 3);
      }
    return tex(c);
  });
}

export function plankTexture(base = '#7a5634') {
  return once(`plank${base}`, () => {
    seed = 66;
    const S = 256;
    const [c, g] = canvas(S);
    const ph = 32;
    for (let row = 0; row < S / ph; row++) {
      const cc = new THREE.Color(base).multiplyScalar(0.8 + rnd() * 0.35);
      g.fillStyle = `#${cc.getHexString()}`;
      g.fillRect(0, row * ph, S, ph);
      for (let i = 0; i < 30; i++) {
        g.fillStyle = `rgba(30,18,8,${0.08 + rnd() * 0.12})`;
        g.fillRect(rnd() * S, row * ph + rnd() * ph, 20 + rnd() * 80, 1);
      }
      g.fillStyle = 'rgba(20,12,6,0.6)';
      g.fillRect(0, row * ph, S, 2);
      g.fillStyle = 'rgba(15,10,5,0.8)';
      g.beginPath();
      g.arc(20 + rnd() * 200, row * ph + ph / 2, 1.8, 0, 7);
      g.fill();
    }
    return tex(c);
  });
}

export function rustTexture(paint = '#7a2f22') {
  return once(`rust${paint}`, () => {
    seed = 77;
    const S = 256;
    const [c, g] = canvas(S);
    g.fillStyle = paint;
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 260; i++) {
      const x = rnd() * S, y = rnd() * S, r = 2 + rnd() * 14;
      g.fillStyle = rnd() < 0.6 ? hsl(22, 55, 18 + rnd() * 18, 0.55) : hsl(30, 10, 35, 0.3);
      wrap(S, x, y, r, (px, py) => {
        g.beginPath();
        g.arc(px, py, r, 0, Math.PI * 2);
        g.fill();
      });
    }
    return tex(c);
  });
}

/** Painted helipad "H" decal (transparent background). */
export function helipadTexture() {
  return once('helipad', () => {
    const S = 512;
    const [c, g] = canvas(S);
    g.clearRect(0, 0, S, S);
    g.strokeStyle = 'rgba(235,225,200,0.85)';
    g.lineWidth = 18;
    g.beginPath();
    g.arc(S / 2, S / 2, S * 0.42, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = 'rgba(235,225,200,0.85)';
    g.fillRect(S * 0.32, S * 0.28, 36, S * 0.44);
    g.fillRect(S * 0.68 - 36, S * 0.28, 36, S * 0.44);
    g.fillRect(S * 0.32, S * 0.47, S * 0.36, 32);
    return tex(c, { repeat: false });
  });
}
