import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { concreteTexture, plankTexture } from './textures.js';

/*
 * Military vehicles and base structures (procedural PBR, meters, nose toward +z).
 */

const cache = {};
function paintTex(base) {
  if (cache[`p${base}`]) return cache[`p${base}`];
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  let s = 11;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) {
    const x = r() * S, y = r() * S, rr = 1 + r() * 10;
    g.fillStyle = r() < 0.6 ? `rgba(40,32,20,${0.05 + r() * 0.12})` : `rgba(200,190,160,${0.03 + r() * 0.06})`;
    g.beginPath();
    g.arc(x, y, rr, 0, 7);
    g.fill();
  }
  // grime streaks from top
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(30,25,18,${0.05 + r() * 0.08})`;
    g.fillRect(r() * S, 0, 1 + r() * 3, r() * S);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (cache[`p${base}`] = t);
}

const mats = {};
function M(key, make) {
  return (mats[key] ??= make());
}
const olive = (c = '#4b5236') => M(`ol${c}`, () => new THREE.MeshStandardMaterial({ map: paintTex(c), roughness: 0.72, metalness: 0.25 }));
const canvasMat = () => M('canvas', () => new THREE.MeshStandardMaterial({ map: paintTex('#4e5338'), roughness: 0.95 }));
const tire = () => M('tire', () => new THREE.MeshStandardMaterial({ color: '#161616', roughness: 0.9 }));
const rim = () => M('rim', () => new THREE.MeshStandardMaterial({ color: '#2e3128', roughness: 0.6, metalness: 0.5 }));
const glass = () => M('glass', () => new THREE.MeshStandardMaterial({ color: '#141c22', roughness: 0.05, metalness: 0.6 }));
const steel = () => M('steel', () => new THREE.MeshStandardMaterial({ color: '#2b2d2f', roughness: 0.5, metalness: 0.7 }));
const lamp = () => M('lamp', () => new THREE.MeshStandardMaterial({ color: '#f2e6b8', emissive: '#3a3218', roughness: 0.2 }));

function box(w, h, d, m, x, y, z, r = 0.06) {
  const mesh = new THREE.Mesh(r ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.1, h / 2.1, d / 2.1)) : new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  return mesh;
}
function wheel(r, w, x, y, z) {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 22), tire());
  t.rotation.z = Math.PI / 2;
  const h = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 14), rim());
  h.rotation.z = Math.PI / 2;
  // tread blocks
  for (let i = 0; i < 14; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.05, r * 0.28), tire());
    const a = (i / 14) * Math.PI * 2;
    b.position.set(0, Math.cos(a) * r, Math.sin(a) * r);
    b.rotation.x = a;
    g.add(b);
  }
  g.add(t, h);
  g.position.set(x, y, z);
  return g;
}
function finish(g) {
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

export function truck() {
  const g = new THREE.Group();
  const P = olive('#4a5134');
  g.add(box(2.3, 0.35, 7.4, steel(), 0, 0.95, 0, 0.04)); // chassis
  g.add(box(2.4, 1.5, 1.9, P, 0, 1.9, 2.6, 0.12)); // cab
  g.add(box(2.42, 0.62, 0.05, glass(), 0, 2.25, 3.56, 0)); // windshield
  g.add(box(0.05, 0.5, 1.0, glass(), 1.21, 2.25, 2.7, 0), box(0.05, 0.5, 1.0, glass(), -1.21, 2.25, 2.7, 0));
  g.add(box(2.3, 1.1, 1.2, P, 0, 1.5, 4.0, 0.1)); // hood
  g.add(box(1.6, 0.6, 0.08, steel(), 0, 1.4, 4.62, 0.02)); // grille
  g.add(box(2.5, 0.25, 0.25, steel(), 0, 0.95, 4.72, 0.04)); // bumper
  for (const x of [-0.85, 0.85]) g.add(box(0.3, 0.2, 0.05, lamp(), x, 1.85, 4.62, 0.02));
  g.add(box(2.5, 0.6, 4.4, P, 0, 1.45, -1.25, 0.06)); // bed
  // canvas cover with ribs
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 4.4, 20, 1, false, 0, Math.PI), canvasMat());
  cover.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  cover.scale.set(1, 1, 0.75);
  cover.position.set(0, 1.85, -1.25);
  g.add(cover, box(2.5, 1.0, 4.4, canvasMat(), 0, 2.2, -1.25, 0.02));
  for (let i = 0; i < 5; i++) g.add(box(2.56, 0.06, 0.06, canvasMat(), 0, 2.72, -3.2 + i * 1.0, 0.02));
  for (const z of [3.2, -0.6, -2.4]) for (const x of [-1.12, 1.12]) g.add(wheel(0.58, 0.42, x, 0.58, z));
  g.add(box(0.5, 0.5, 0.9, steel(), 1.15, 1.05, 1.3, 0.05)); // fuel tank
  return finish(g);
}

export function humvee() {
  const g = new THREE.Group();
  const P = olive('#525a3a');
  g.add(box(2.2, 0.9, 4.7, P, 0, 1.0, 0, 0.12));
  g.add(box(2.1, 0.75, 2.3, P, 0, 1.8, -0.55, 0.1)); // cabin
  g.add(box(1.9, 0.45, 0.05, glass(), 0, 1.9, 0.62, 0));
  for (const z of [-0.2, -1.1]) for (const x of [-1.06, 1.06]) g.add(box(0.04, 0.4, 0.7, glass(), x, 1.9, z, 0));
  const hood = box(2.15, 0.25, 1.5, P, 0, 1.5, 1.55, 0.08);
  hood.rotation.x = -0.08;
  g.add(hood, box(1.7, 0.5, 0.08, steel(), 0, 1.1, 2.37, 0.02)); // grille
  for (const x of [-0.7, 0.7]) g.add(box(0.25, 0.15, 0.05, lamp(), x, 1.3, 2.36, 0.02));
  // turret ring + gun
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.22, 20), steel()).translateY(2.28).translateZ(-0.6));
  g.add(box(0.9, 0.5, 0.06, P, 0, 2.55, -0.15, 0.02));
  const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 8), steel());
  gun.rotation.x = Math.PI / 2;
  gun.position.set(0, 2.62, 0.3);
  g.add(gun, box(0.22, 0.2, 0.45, steel(), 0, 2.6, -0.2, 0.03));
  for (const z of [1.45, -1.45]) for (const x of [-1.0, 1.0]) g.add(wheel(0.48, 0.38, x, 0.48, z));
  g.add(box(1.0, 0.5, 0.4, P, 0, 1.25, -2.45, 0.05)); // rear rack
  return finish(g);
}

export function apc() {
  const g = new THREE.Group();
  const P = olive('#495033');
  g.add(box(2.7, 1.2, 5.8, P, 0, 1.25, 0, 0.1));
  const glacis = box(2.7, 0.9, 1.4, P, 0, 1.3, 2.8, 0.08);
  glacis.rotation.x = 0.55;
  g.add(glacis);
  // tracks
  for (const x of [-1.42, 1.42]) {
    g.add(box(0.5, 0.75, 6.0, tire(), x, 0.45, 0, 0.25));
    for (let i = 0; i < 6; i++) g.add(wheel(0.32, 0.3, x, 0.42, -2.3 + i * 0.92));
    g.add(box(0.56, 0.08, 5.6, P, x, 0.95, 0, 0.02)); // side skirt top
  }
  // turret
  g.add(box(1.4, 0.55, 1.6, P, 0.2, 2.1, 0.3, 0.12));
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.0, 10), steel());
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0.2, 2.15, 1.9);
  g.add(barrel);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.15, 14), steel()).translateY(2.45).translateX(-0.4).translateZ(-0.3));
  for (let i = 0; i < 3; i++) g.add(box(0.5, 0.25, 0.5, steel(), -0.9 + i * 0.6, 1.95, -2.3, 0.04));
  return finish(g);
}

export function suv() {
  const g = new THREE.Group();
  const P = olive('#3a3e32');
  g.add(box(1.95, 0.8, 4.6, P, 0, 0.95, 0, 0.14));
  g.add(box(1.85, 0.7, 2.9, glass(), 0, 1.65, -0.35, 0.12));
  g.add(box(1.9, 0.08, 2.7, P, 0, 2.02, -0.4, 0.04));
  for (const x of [-0.9, 0.9]) g.add(box(0.06, 0.06, 2.4, steel(), x, 2.15, -0.4, 0.02)); // roof rack
  for (let i = 0; i < 5; i++) g.add(box(1.86, 0.04, 0.05, steel(), 0, 2.16, -1.5 + i * 0.55, 0.01));
  g.add(box(2.05, 0.3, 0.3, steel(), 0, 0.75, 2.35, 0.05)); // bull bar
  for (const x of [-0.65, 0.65]) g.add(box(0.28, 0.14, 0.05, lamp(), x, 1.1, 2.31, 0.02));
  for (const z of [1.45, -1.45]) for (const x of [-0.95, 0.95]) g.add(wheel(0.42, 0.32, x, 0.42, z));
  return finish(g);
}

export function tower() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ map: plankTexture('#8a7a62'), roughness: 0.9 });
  for (const x of [-1.1, 1.1]) for (const z of [-1.1, 1.1]) g.add(box(0.14, 4.2, 0.14, steel(), x, 2.1, z, 0.02));
  for (const y of [1.3, 2.6]) {
    for (const z of [-1.1, 1.1]) g.add(box(2.3, 0.08, 0.08, steel(), 0, y, z, 0.01));
    for (const x of [-1.1, 1.1]) g.add(box(0.08, 0.08, 2.3, steel(), x, y, 0, 0.01));
  }
  g.add(box(2.6, 0.15, 2.6, wood, 0, 4.2, 0, 0.02)); // floor
  g.add(box(2.6, 1.0, 0.08, wood, 0, 4.75, 1.26, 0), box(2.6, 1.0, 0.08, wood, 0, 4.75, -1.26, 0), box(0.08, 1.0, 2.6, wood, 1.26, 4.75, 0, 0));
  for (const x of [-1.2, 1.2]) for (const z of [-1.2, 1.2]) g.add(box(0.08, 1.2, 0.08, steel(), x, 5.8, z, 0.01));
  const roof = box(3.0, 0.12, 3.0, wood, 0, 6.45, 0, 0.02);
  roof.rotation.z = 0.06;
  g.add(roof);
  // stairs
  for (let i = 0; i < 14; i++) g.add(box(0.9, 0.06, 0.28, steel(), -1.75, 0.3 + i * 0.29, 1.6 - i * 0.22, 0.01));
  g.add(box(0.05, 4.6, 0.05, steel(), -2.2, 2.3, 0.1, 0));
  return finish(g);
}

export function barrier() {
  const m = M('jersey', () => new THREE.MeshStandardMaterial({ map: concreteTexture(), color: '#d8d4cc', roughness: 0.95 }));
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-0.35, 0);
  shape.lineTo(0.35, 0);
  shape.lineTo(0.12, 0.35);
  shape.lineTo(0.1, 0.85);
  shape.lineTo(-0.1, 0.85);
  shape.lineTo(-0.12, 0.35);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 2, bevelEnabled: false });
  geo.translate(0, 0, -1);
  geo.rotateY(Math.PI / 2);
  g.add(new THREE.Mesh(geo, m));
  return finish(g);
}

export function barrels(n = 3) {
  const g = new THREE.Group();
  const cols = ['#2a4a6a', '#3a4a30', '#2a4a6a'];
  for (let i = 0; i < n; i++) {
    const m = M(`barrel${i % 3}`, () => new THREE.MeshStandardMaterial({ map: paintTex(cols[i % 3]), roughness: 0.6, metalness: 0.4 }));
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 16), m);
    b.position.set((i % 2) * 0.62 - 0.3, 0.45, Math.floor(i / 2) * 0.62 - 0.3);
    g.add(b);
    for (const y of [0.25, 0.65]) g.add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.015, 6, 16), m).translateX(b.position.x).translateY(y).translateZ(b.position.z).rotateX(Math.PI / 2));
  }
  return finish(g);
}

export function crateStack(seed = 1) {
  const g = new THREE.Group();
  const greens = ['#4f5a36', '#59603e', '#46502f'];
  let s = seed * 97;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 6; i++) {
    const m = M(`crate${i % 3}`, () => new THREE.MeshStandardMaterial({ map: paintTex(greens[i % 3]), roughness: 0.8 }));
    const x = (i % 3) * 0.95 - 0.95, z = 0, y = i < 3 ? 0.28 : 0.84;
    if (i >= 3 && r() < 0.35) continue;
    const c = box(0.9, 0.55, 0.6, m, x + (r() - 0.5) * 0.1, y, z, 0.03);
    c.rotation.y = (r() - 0.5) * 0.15;
    g.add(c);
  }
  return finish(g);
}

export function hangar() {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ map: concreteTexture(), color: '#bdb8ae', roughness: 0.95 });
  const roofM = new THREE.MeshStandardMaterial({ color: '#5b6066', roughness: 0.55, metalness: 0.6 });
  g.add(box(10, 3.6, 0.3, wall, 0, 1.8, -4, 0.02), box(0.3, 3.6, 8, wall, -5, 1.8, 0, 0.02), box(0.3, 3.6, 8, wall, 5, 1.8, 0, 0.02));
  g.add(box(3.2, 3.6, 0.3, wall, -3.4, 1.8, 4, 0.02), box(3.2, 3.6, 0.3, wall, 3.4, 1.8, 4, 0.02));
  g.add(box(3.6, 3.0, 0.12, steel(), 0, 1.5, 4.05, 0.01)); // door
  // corrugated roof
  for (let i = 0; i < 24; i++) {
    const p = box(10.4, 0.06, 0.36, roofM, 0, 3.75 + Math.sin(i * 1.3) * 0.02, -4.1 + i * 0.36, 0.01);
    g.add(p);
  }
  return finish(g);
}

export function stall(color = '#888888') {
  const g = new THREE.Group();
  const pole = new THREE.MeshStandardMaterial({ color: '#2b2d2f', roughness: 0.5, metalness: 0.6 });
  const cloth = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color('#4a4a3e'), 0.55), roughness: 0.95, side: THREE.DoubleSide });
  const wood = new THREE.MeshStandardMaterial({ color: '#6b5238', roughness: 0.85 });
  for (const x of [-1.6, 1.6]) for (const z of [-1.2, 1.2]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8), pole);
    p.position.set(x, 1.3, z);
    g.add(p);
  }
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.0), cloth);
  roof.rotation.x = -Math.PI / 2 + 0.18;
  roof.position.y = 2.6;
  g.add(roof);
  const table = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 0.9), wood);
  table.position.set(0, 0.85, 0.7);
  g.add(table);
  for (const x of [-1.35, 1.35]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.8), wood);
    leg.position.set(x, 0.42, 0.7);
    g.add(leg);
  }
  g.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
  return g;
}

export function locker() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: '#4e5a5e', roughness: 0.45, metalness: 0.7 });
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.9, 0.55), m);
    b.position.set(i * 0.62 - 0.62, 0.95, 0);
    g.add(b);
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.04), new THREE.MeshStandardMaterial({ color: '#c8c8c0', metalness: 0.8, roughness: 0.3 }));
    h.position.set(i * 0.62 - 0.4, 1.0, 0.29);
    g.add(h);
  }
  g.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
  return g;
}


const BUILD = { truck, humvee, apc, suv, tower, barrier, barrels, crateStack, hangar, stall, locker };
const protos = {};
/** Instance of a vehicle/structure by kind (clones share geometry and materials). */
export function vehicleModel(kind, v = 1) {
  const key = `${kind}:${v}`;
  protos[key] ??= BUILD[kind](v);
  return protos[key].clone();
}
