import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ITEMS } from '../data/items.js';
import { itemModel } from '../gfx/items.js';
import { CharacterRig, charactersReady } from '../gfx/characters.js';

const PX = 80; // icon pixels per grid cell

/**
 * Offscreen renderer for UI: item icons rendered from the 3D item models,
 * and the character preview in the inventory.
 */
class UiRenderer {
  constructor() {
    this.renderer = null;
    this.icons = new Map();
    this.scene = new THREE.Scene();
    const key = new THREE.DirectionalLight('#fff2e0', 2.2);
    key.position.set(3, 5, 4);
    const rim = new THREE.DirectionalLight('#a8c4ff', 1.2);
    rim.position.set(-4, 2, -3);
    this.scene.add(key, rim, new THREE.HemisphereLight('#ffffff', '#40382e', 0.6));
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
  }

  ensure() {
    if (this.renderer) return this.renderer;
    const r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setClearColor(0x000000, 0);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    const pm = new THREE.PMREMGenerator(r);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.8;
    this.renderer = r;
    return r;
  }

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
    const obj = itemModel(id);
    const isGun = d.cat === 'weapon';
    obj.rotation.y = isGun ? Math.PI / 2 : -0.6;
    this.scene.add(obj);
    const dir = isGun ? new THREE.Vector3(0.04, 0.1, 1) : new THREE.Vector3(0.25, 0.7, 1);
    this.fit(obj, dir, w, h, isGun ? 1.06 : 1.28);
    r.render(this.scene, this.cam);
    const url = r.domElement.toDataURL('image/png');
    this.scene.remove(obj);
    this.icons.set(id, url);
    return url;
  }

  preloadAll() {
    for (const id of Object.keys(ITEMS)) this.icon(id);
  }

  /** Render the character with its gear into a 2D canvas. */
  drawCharacter(canvas, faction, loadout, seed = 0) {
    if (!charactersReady()) return;
    const r = this.ensure();
    const w = canvas.width, h = canvas.height;
    if (!w || !h) return;
    r.setSize(w, h, false);
    if (!this.preview || this.previewFaction !== faction) {
      if (this.preview) this.scene.remove(this.preview.root);
      this.preview = new CharacterRig({ faction, seed });
      this.previewFaction = faction;
      this.scene.add(this.preview.root);
    }
    const weapon = loadout[loadout.active] ?? loadout.primary ?? loadout.secondary;
    this.preview.setGear({ helmet: loadout.helmet?.id, armor: loadout.armor?.id, backpack: loadout.backpack?.id, weapon: weapon?.id });
    this.preview.root.visible = true;
    this.preview.root.rotation.y = 0.5;
    this.preview.update(0.016, { speed: 0, armed: !!weapon });
    this.preview.update(0.5, { speed: 0, armed: !!weapon });
    this.fit(this.preview.root, new THREE.Vector3(0.15, 0.12, 1), w, h, 1.1);
    r.render(this.scene, this.cam);
    this.preview.root.visible = false;
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, w, h);
    g.drawImage(r.domElement, 0, 0);
  }
}

export const ui3d = new UiRenderer();
