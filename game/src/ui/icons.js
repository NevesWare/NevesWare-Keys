import * as THREE from 'three';
import { ITEMS } from '../data/items.js';
import { itemGeo } from '../vox/models.js';
import { VOX_MATERIAL } from '../vox/voxModel.js';
import { Actor } from '../raid/actor.js';

const PX = 72; // icon pixels per grid cell

/**
 * Small offscreen renderer used for UI: item icons (rendered from the voxel models)
 * and the character preview in the inventory.
 */
class UiRenderer {
  constructor() {
    this.renderer = null;
    this.icons = new Map();
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#5a5450', 2.4));
    const key = new THREE.DirectionalLight('#fff4e0', 3.2);
    key.position.set(3, 5, 4);
    const rim = new THREE.DirectionalLight('#9fc0ff', 1.6);
    rim.position.set(-4, 2, -3);
    this.scene.add(key, rim);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
  }

  ensure() {
    if (this.renderer) return this.renderer;
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);
    return this.renderer;
  }

  /** Fit an ortho camera around `obj` looking from `dir`, matching aspect w/h. */
  fit(obj, dir, w, h, pad = 1.12) {
    const box = new THREE.Box3().setFromObject(obj);
    const center = box.getCenter(new THREE.Vector3());
    const cam = this.cam;
    cam.position.copy(center).addScaledVector(dir.clone().normalize(), 20);
    cam.up.set(0, 1, 0);
    cam.lookAt(center);
    cam.updateMatrixWorld();
    const inv = cam.matrixWorldInverse;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(inv);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    let hw = ((maxX - minX) / 2) * pad, hh = ((maxY - minY) / 2) * pad;
    const cx = (maxX + minX) / 2, cy = (maxY + minY) / 2;
    const aspect = w / h;
    if (hw / hh > aspect) hh = hw / aspect;
    else hw = hh * aspect;
    cam.left = cx - hw;
    cam.right = cx + hw;
    cam.top = cy + hh;
    cam.bottom = cy - hh;
    cam.updateProjectionMatrix();
  }

  /** data URL of an item icon sized for its (unrotated) grid footprint. */
  icon(id) {
    if (this.icons.has(id)) return this.icons.get(id);
    const d = ITEMS[id];
    const r = this.ensure();
    const w = d.w * PX, h = d.h * PX;
    r.setSize(w, h, false);
    const mesh = new THREE.Mesh(itemGeo(id), VOX_MATERIAL);
    const isGun = d.cat === 'weapon';
    if (isGun) mesh.rotation.y = Math.PI / 2; // barrel to the right
    const tall = d.h > d.w && !isGun;
    if (tall) mesh.rotation.y = -0.5;
    else if (!isGun) mesh.rotation.y = -0.6;
    this.scene.add(mesh);
    const dir = isGun ? new THREE.Vector3(0.05, 0.12, 1) : new THREE.Vector3(0.25, 0.65, 1);
    this.fit(mesh, dir, w, h, isGun ? 1.06 : 1.25);
    r.render(this.scene, this.cam);
    const url = r.domElement.toDataURL('image/png');
    this.scene.remove(mesh);
    this.icons.set(id, url);
    return url;
  }

  preloadAll() {
    for (const id of Object.keys(ITEMS)) this.icon(id);
  }

  /** Render a character with the given loadout into a 2D canvas. */
  drawCharacter(canvas, faction, loadout, seed = 0) {
    const r = this.ensure();
    const w = canvas.width, h = canvas.height;
    if (!w || !h) return;
    r.setSize(w, h, false);
    const a = new Actor({ name: 'preview', faction, loadout, seed });
    a.mesh.rotation.y = 0.55;
    this.scene.add(a.mesh);
    this.fit(a.mesh, new THREE.Vector3(0.1, 0.15, 1), w, h, 1.08);
    r.render(this.scene, this.cam);
    this.scene.remove(a.mesh);
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, w, h);
    g.drawImage(r.domElement, 0, 0);
  }
}

export const ui3d = new UiRenderer();
