import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { plankTexture } from './textures.js';

/*
 * Procedural PBR models for every item (meters). Weapons: grip at origin, barrel toward +z.
 */
const M = {};
function mat(key, params) {
  if (!M[key]) M[key] = new THREE.MeshStandardMaterial(params);
  return M[key];
}
const metal = () => mat('metal', { color: '#3a3d42', metalness: 0.75, roughness: 0.38 });
const darkMetal = () => mat('dmetal', { color: '#222427', metalness: 0.6, roughness: 0.45 });
const polymer = () => mat('poly', { color: '#2b2d30', metalness: 0.05, roughness: 0.7 });
const wood = () => mat('wood', { color: '#8a5530', metalness: 0, roughness: 0.55, map: plankTexture('#8a5530') });
const fabric = (c) => mat(`fab${c}`, { color: c, metalness: 0, roughness: 0.95 });
const paint = (c, r = 0.5, m = 0.1) => mat(`p${c}${r}${m}`, { color: c, roughness: r, metalness: m });

function box(w, h, d, m, x = 0, y = 0, z = 0, r = 0.004) {
  const g = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.2, h / 2.2, d / 2.2)) : new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  return mesh;
}
function cyl(r, len, m, x = 0, y = 0, z = 0, axis = 'z', seg = 14) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), m);
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  mesh.position.set(x, y, z);
  return mesh;
}
function group(...children) {
  const g = new THREE.Group();
  g.add(...children);
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

const BUILDERS = {
  k7() {
    const mag = new THREE.Group();
    for (let i = 0; i < 6; i++) mag.add(box(0.03, 0.035, 0.05, metal(), 0, -0.02 - i * 0.03, 0.08 + i * 0.012, 0.002));
    return group(
      box(0.045, 0.07, 0.3, metal(), 0, 0.03, 0.1),
      cyl(0.011, 0.42, darkMetal(), 0, 0.05, 0.45),
      cyl(0.009, 0.22, darkMetal(), 0, 0.075, 0.33),
      box(0.05, 0.055, 0.17, wood(), 0, 0.035, 0.32),
      box(0.04, 0.06, 0.26, wood(), 0, 0.0, -0.17),
      box(0.04, 0.11, 0.06, wood(), 0, -0.04, -0.27),
      box(0.03, 0.09, 0.035, polymer(), 0, -0.04, -0.01),
      box(0.006, 0.03, 0.012, metal(), 0, 0.085, 0.62, 0.001),
      mag,
    );
  },
  vespa() {
    return group(
      box(0.05, 0.075, 0.26, polymer(), 0, 0.03, 0.08),
      cyl(0.012, 0.12, darkMetal(), 0, 0.05, 0.27),
      box(0.03, 0.16, 0.035, darkMetal(), 0, -0.08, 0.06),
      box(0.032, 0.09, 0.035, polymer(), 0, -0.04, -0.01),
      box(0.02, 0.02, 0.24, metal(), 0, 0.03, -0.17),
      box(0.02, 0.07, 0.02, metal(), 0, 0.0, -0.29),
      box(0.03, 0.012, 0.18, metal(), 0, 0.074, 0.08, 0.002),
    );
  },
  trovao() {
    return group(
      box(0.05, 0.065, 0.24, metal(), 0, 0.03, 0.06),
      cyl(0.014, 0.6, darkMetal(), 0, 0.055, 0.46),
      cyl(0.013, 0.45, darkMetal(), 0, 0.02, 0.4),
      box(0.055, 0.05, 0.16, wood(), 0, 0.02, 0.33),
      box(0.042, 0.06, 0.3, wood(), 0, 0.0, -0.2),
      box(0.042, 0.12, 0.07, wood(), 0, -0.04, -0.32),
      box(0.032, 0.08, 0.035, wood(), 0, -0.035, -0.02),
    );
  },
  awm() {
    // bolt-action sniper: olive chassis, long fluted barrel, muzzle brake, scope, bipod
    const olive = paint('#4a5136', 0.7, 0.1);
    const scope = new THREE.Group();
    scope.add(cyl(0.018, 0.3, darkMetal(), 0, 0, 0), cyl(0.024, 0.06, darkMetal(), 0, 0, 0.15), cyl(0.022, 0.05, darkMetal(), 0, 0, -0.14));
    scope.add(new THREE.Mesh(new THREE.CircleGeometry(0.019, 16), mat('lens', { color: '#1a3040', metalness: 0.9, roughness: 0.05 })).translateZ(0.181));
    scope.add(box(0.012, 0.03, 0.02, metal(), 0, -0.03, 0.08), box(0.012, 0.03, 0.02, metal(), 0, -0.03, -0.08));
    scope.position.set(0, 0.11, 0.08);
    return group(
      box(0.055, 0.075, 0.42, olive, 0, 0.03, 0.08), // chassis
      cyl(0.012, 0.6, darkMetal(), 0, 0.05, 0.58), // barrel
      box(0.03, 0.03, 0.06, darkMetal(), 0, 0.05, 0.9, 0.006), // muzzle brake
      box(0.04, 0.09, 0.04, olive, 0, -0.04, -0.01), // grip
      box(0.045, 0.07, 0.3, olive, 0, 0.02, -0.28), // stock
      box(0.045, 0.13, 0.04, polymer(), 0, -0.01, -0.44), // butt pad
      box(0.02, 0.05, 0.12, olive, 0, 0.075, -0.25), // cheek rest
      box(0.03, 0.06, 0.05, darkMetal(), 0, -0.035, 0.1), // mag
      cyl(0.006, 0.05, metal(), 0.035, 0.06, -0.02, 'x', 8), // bolt handle
      box(0.008, 0.18, 0.008, darkMetal(), 0.02, -0.07, 0.36).rotateX(0.5), // bipod legs
      box(0.008, 0.18, 0.008, darkMetal(), -0.02, -0.07, 0.36).rotateX(0.5),
      scope,
    );
  },
  a338() {
    return BUILDERS.ammoBox('#3e4430', '#c8a24a', 6);
  },
  p9() {
    return group(
      box(0.03, 0.035, 0.19, polymer(), 0, 0.03, 0.06),
      box(0.028, 0.03, 0.17, metal(), 0, 0.058, 0.07, 0.003),
      box(0.03, 0.11, 0.045, polymer(), 0, -0.035, -0.015),
      cyl(0.006, 0.02, darkMetal(), 0, 0.05, 0.165),
    );
  },
  ammoBox(c, tip, n = 9) {
    const g = group(box(0.16, 0.06, 0.1, paint(c, 0.8, 0), 0, 0.03, 0, 0.006));
    for (let i = 0; i < n; i++) {
      const x = -0.05 + (i % 3) * 0.05, z = -0.025 + Math.floor(i / 3) * 0.025;
      g.add(cyl(0.007, 0.04, paint('#c8a24a', 0.3, 0.9), x, 0.08, z, 'y', 8));
      g.add(new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.015, 8), paint(tip, 0.4, 0.6)).translateX(x).translateY(0.107).translateZ(z));
    }
    return g;
  },
  a9() {
    return BUILDERS.ammoBox('#a88a5a', '#b06a3a');
  },
  a762() {
    return BUILDERS.ammoBox('#55613a', '#a87040');
  },
  a12() {
    return BUILDERS.ammoBox('#8a2a24', '#c8a24a', 6);
  },
  vest(c, heavy) {
    const g = group(
      box(0.36, 0.42, 0.07, fabric(c), 0, 0.21, 0.06, 0.03),
      box(0.36, 0.42, 0.06, fabric(c), 0, 0.21, -0.06, 0.03),
      box(0.08, 0.12, 0.17, fabric(c), -0.14, 0.44, 0, 0.02),
      box(0.08, 0.12, 0.17, fabric(c), 0.14, 0.44, 0, 0.02),
    );
    const pc = new THREE.Color(c).multiplyScalar(0.8).getStyle();
    for (let i = 0; i < 3; i++) g.add(box(0.085, 0.13, 0.04, fabric(pc), -0.1 + i * 0.1, 0.1, 0.115, 0.012));
    if (heavy) g.add(box(0.06, 0.26, 0.15, fabric(pc), -0.2, 0.18, 0, 0.02), box(0.06, 0.26, 0.15, fabric(pc), 0.2, 0.18, 0, 0.02));
    return g;
  },
  coleteL() {
    return BUILDERS.vest('#8a7a58', false);
  },
  coleteP() {
    return BUILDERS.vest('#4a5430', true);
  },
  helmet(c, visor) {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), paint(c, 0.75, 0.05));
    const g = group(shell, box(0.04, 0.03, 0.03, darkMetal(), 0, 0.09, 0.115, 0.004));
    if (visor) {
      const v = new THREE.Mesh(new THREE.SphereGeometry(0.135, 20, 8, -0.9, 1.8, Math.PI * 0.45, Math.PI * 0.15), paint('#1d2a33', 0.1, 0.6));
      v.rotation.y = Math.PI / 2 - 0.0;
      g.add(v);
    }
    return g;
  },
  capaceteL() {
    return BUILDERS.helmet('#5d6a40', false);
  },
  capaceteP() {
    return BUILDERS.helmet('#3a4228', true);
  },
  pack(c, h) {
    const pc = new THREE.Color(c).multiplyScalar(0.85).getStyle();
    return group(
      box(0.34, h, 0.2, fabric(c), 0, h / 2, 0, 0.05),
      box(0.26, h * 0.45, 0.07, fabric(pc), 0, h * 0.3, 0.12, 0.03),
      box(0.07, h * 0.6, 0.15, fabric(pc), -0.2, h * 0.4, 0, 0.03),
      box(0.07, h * 0.6, 0.15, fabric(pc), 0.2, h * 0.4, 0, 0.03),
      box(0.34, 0.06, 0.22, fabric(pc), 0, h + 0.02, 0, 0.03),
    );
  },
  mochilaP() {
    return BUILDERS.pack('#3b4252', 0.4);
  },
  mochilaM() {
    return BUILDERS.pack('#5a4a36', 0.5);
  },
  mochilaT() {
    return BUILDERS.pack('#4f5a34', 0.6);
  },
  bandagem() {
    return group(
      new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.07, 20, 1, false), fabric('#ece6da')),
      new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.071, 12), paint('#c8c0b0', 0.9, 0)),
    );
  },
  medkit() {
    return group(
      box(0.3, 0.14, 0.12, paint('#b8302a', 0.6, 0.05), 0, 0.07, 0, 0.02),
      box(0.04, 0.1, 0.005, paint('#f4f0e8', 0.6, 0), 0, 0.07, 0.061, 0.001),
      box(0.1, 0.035, 0.005, paint('#f4f0e8', 0.6, 0), 0, 0.07, 0.061, 0.001),
      box(0.1, 0.02, 0.03, polymer(), 0, 0.15, 0),
    );
  },
  cobre() {
    return group(
      cyl(0.08, 0.02, paint('#3a2a20', 0.8, 0), 0, 0.01, 0, 'y'),
      cyl(0.065, 0.1, paint('#c87533', 0.35, 0.9), 0, 0.07, 0, 'y'),
      cyl(0.08, 0.02, paint('#3a2a20', 0.8, 0), 0, 0.13, 0, 'y'),
    );
  },
  circuito() {
    return group(
      box(0.22, 0.012, 0.16, paint('#2f6b3a', 0.5, 0.1), 0, 0.006, 0, 0.002),
      box(0.05, 0.012, 0.05, polymer(), -0.05, 0.018, -0.02, 0.002),
      box(0.04, 0.012, 0.03, polymer(), 0.05, 0.018, 0.03, 0.002),
      cyl(0.008, 0.025, paint('#c8a24a', 0.3, 0.9), 0.06, 0.025, -0.05, 'y'),
    );
  },
  bateria() {
    return group(
      box(0.12, 0.26, 0.1, paint('#4a5040', 0.7, 0.1), 0, 0.13, 0, 0.01),
      cyl(0.012, 0.025, paint('#b8302a', 0.5, 0.3), -0.03, 0.27, 0, 'y'),
      cyl(0.012, 0.025, polymer(), 0.03, 0.27, 0, 'y'),
      box(0.121, 0.05, 0.101, paint('#d8c890', 0.8, 0), 0, 0.14, 0, 0.002),
    );
  },
  hd() {
    return group(box(0.15, 0.025, 0.1, paint('#9aa0a8', 0.3, 0.8), 0, 0.012, 0, 0.004), cyl(0.035, 0.002, paint('#6a7078', 0.25, 0.9), -0.02, 0.026, 0, 'y'));
  },
  relogio() {
    return group(
      cyl(0.035, 0.012, paint('#d4a83a', 0.25, 1), 0, 0.006, 0, 'y', 24),
      cyl(0.03, 0.002, paint('#f0ead8', 0.3, 0), 0, 0.013, 0, 'y', 24),
      box(0.02, 0.006, 0.07, paint('#6b3f2a', 0.6, 0), 0, 0.003, 0.06, 0.002),
      box(0.02, 0.006, 0.07, paint('#6b3f2a', 0.6, 0), 0, 0.003, -0.06, 0.002),
    );
  },
  combustivel() {
    return group(
      box(0.3, 0.38, 0.16, paint('#b8302a', 0.45, 0.2), 0, 0.19, 0, 0.03),
      cyl(0.025, 0.06, polymer(), 0.09, 0.41, 0, 'y'),
      box(0.14, 0.03, 0.04, paint('#8a2420', 0.5, 0.2), -0.04, 0.39, 0, 0.01),
    );
  },
  ferramentas() {
    return group(
      box(0.36, 0.16, 0.18, paint('#c0392b', 0.4, 0.3), 0, 0.08, 0, 0.012),
      box(0.37, 0.015, 0.19, paint('#8a2420', 0.4, 0.3), 0, 0.165, 0, 0.004),
      box(0.14, 0.03, 0.03, polymer(), 0, 0.19, 0, 0.01),
    );
  },
  agua() {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.038, 0.22, 18), new THREE.MeshStandardMaterial({ color: '#9cc8e8', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.75 }));
    bottle.position.y = 0.11;
    return group(bottle, cyl(0.039, 0.07, paint('#2f6db0', 0.5, 0), 0, 0.12, 0, 'y'), cyl(0.016, 0.03, paint('#1e5a9a', 0.4, 0), 0, 0.24, 0, 'y'));
  },
  racao() {
    return group(box(0.14, 0.05, 0.2, paint('#a08a5c', 0.85, 0), 0, 0.025, 0, 0.01), box(0.1, 0.002, 0.06, paint('#2a2a20', 0.8, 0), 0, 0.051, 0.03, 0));
  },
  energetico() {
    return group(cyl(0.03, 0.12, paint('#1e3a8a', 0.3, 0.8), 0, 0.06, 0, 'y'), cyl(0.031, 0.025, paint('#d0d4d8', 0.3, 0.9), 0, 0.03, 0, 'y'), cyl(0.026, 0.004, paint('#c0c4c8', 0.3, 0.9), 0, 0.122, 0, 'y'));
  },
  pendrive() {
    return group(box(0.025, 0.012, 0.06, paint('#2a4a7a', 0.4, 0.2), 0, 0.006, 0, 0.004), box(0.016, 0.006, 0.018, paint('#b0b4b8', 0.25, 0.9), 0, 0.006, 0.038, 0.001));
  },
};

const proto = new Map();
/** A fresh clone of an item's model (shares geometry/materials). */
export function itemModel(id) {
  if (!proto.has(id)) proto.set(id, (BUILDERS[id] ?? (() => group(box(0.1, 0.1, 0.1, paint('#ff00ff')))))());
  return proto.get(id).clone();
}

/** Muzzle offset (meters, model space) per weapon — used for tracers/flash. */
export const MUZZLE = { k7: 0.66, vespa: 0.34, trovao: 0.76, p9: 0.17, awm: 0.93 };
