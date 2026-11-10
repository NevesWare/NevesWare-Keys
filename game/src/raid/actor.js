import * as THREE from 'three';
import { ITEMS, ammoIdFor } from '../data/items.js';
import { humanoid, weaponGeo } from '../vox/models.js';
import { activeWeapon, countItem, takeItem, storages } from '../inventory/loadout.js';

export const ACTOR_RADIUS = 0.32;
export const MUZZLE_HEIGHT = 1.08;

let seedCounter = 0;

/**
 * Anything that walks and shoots: the player and every bot.
 * loadout: see inventory/loadout.js
 */
export class Actor {
  constructor({ name, faction, loadout, isPlayer = false, seed }) {
    this.name = name;
    this.faction = faction;
    this.isPlayer = isPlayer;
    this.loadout = loadout;
    this.seed = seed ?? seedCounter++;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector2();
    this.aim = 0; // radians, 0 = +z
    this.health = 100;
    this.maxHealth = 100;
    this.alive = true;
    this.hidden = false;
    this.cooldown = 0;
    this.reloadT = 0;
    this.healT = 0;
    this.healItem = null;
    this.hitFlash = 0;
    this.walkPhase = 0;
    this.kills = 0;
    this.killedBy = null;
    this.mesh = new THREE.Group();
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.gearKey = '';
    this.refreshGear();
  }

  get weapon() {
    return activeWeapon(this.loadout);
  }

  get weaponDef() {
    const w = this.weapon;
    return w ? ITEMS[w.id].weapon : null;
  }

  /** (Re)build the voxel body when equipment changes. */
  refreshGear() {
    const lo = this.loadout;
    const armor = lo.armor ? (lo.armor.id === 'coleteP' ? 'P' : 'L') : null;
    const helmet = lo.helmet ? (lo.helmet.id === 'capaceteP' ? 'P' : 'L') : null;
    const wid = this.weapon?.id ?? null;
    const key = `${armor}|${helmet}|${!!lo.backpack}|${wid}`;
    if (key === this.gearKey) return;
    this.gearKey = key;

    const m = this.mesh;
    m.clear();
    const h = humanoid({ faction: this.faction, armor, helmet, backpack: !!lo.backpack, seed: this.seed });
    const mk = (geo) => {
      const x = new THREE.Mesh(geo, this.material);
      x.castShadow = true;
      return x;
    };
    this.upper = mk(h.upper);
    this.legL = mk(h.legL);
    this.legR = mk(h.legR);
    this.legL.position.set(-h.hipX, h.hipY, 0);
    this.legR.position.set(h.hipX, h.hipY, 0);
    m.add(this.upper, this.legL, this.legR);
    if (wid) {
      this.gun = mk(weaponGeo(wid));
      this.gun.position.set(...h.gunPos);
      this.gunY = h.gunPos[1];
      m.add(this.gun);
    } else this.gun = null;

    if (this.isPlayer) {
      // x-ray silhouette where something occludes the player
      const ghost = new THREE.MeshBasicMaterial({ color: '#ffd66b', depthFunc: THREE.GreaterDepth, depthWrite: false, transparent: true, opacity: 0.55 });
      for (const src of [this.upper, this.legL, this.legR]) {
        const g = new THREE.Mesh(src.geometry, ghost);
        g.renderOrder = 10;
        src.add(g);
      }
      if (!this.ring) {
        this.ring = new THREE.Mesh(
          new THREE.RingGeometry(0.42, 0.5, 24),
          new THREE.MeshBasicMaterial({ color: '#ffd66b', transparent: true, opacity: 0.8, depthWrite: false }),
        );
        this.ring.rotation.x = -Math.PI / 2;
        this.ring.position.y = 0.02;
      }
      m.add(this.ring);
    }
  }

  canFire() {
    return this.alive && !!this.weapon && this.cooldown <= 0 && this.reloadT <= 0 && this.healT <= 0;
  }

  fire() {
    if (!this.canFire()) return null;
    const w = this.weaponDef;
    if (this.weapon.mag <= 0) return null;
    this.weapon.mag--;
    this.cooldown = 60 / w.rpm;
    return w;
  }

  ammoReserve() {
    const w = this.weaponDef;
    return w ? countItem(this.loadout, ammoIdFor(w.caliber)) : 0;
  }

  switchWeapon(slot) {
    const lo = this.loadout;
    const target = slot ?? (lo.active === 'primary' ? 'secondary' : 'primary');
    if (!lo[target] || lo.active === target) return false;
    lo.active = target;
    this.reloadT = 0;
    this.cooldown = 0.35;
    this.refreshGear();
    return true;
  }

  startReload() {
    const w = this.weaponDef;
    if (!w || this.reloadT > 0 || this.healT > 0) return false;
    if (this.weapon.mag >= w.mag || this.ammoReserve() <= 0) return false;
    this.reloadT = w.reload;
    return true;
  }

  finishReload() {
    const w = this.weaponDef;
    if (!w) return;
    this.weapon.mag += takeItem(this.loadout, ammoIdFor(w.caliber), w.mag - this.weapon.mag);
  }

  /** Use a specific med item, or the best one carried. */
  startHeal(item = null) {
    if (this.healT > 0 || this.reloadT > 0 || this.health >= this.maxHealth) return false;
    let med = item;
    if (!med) {
      const meds = storages(this.loadout).flatMap((g) => g.items()).filter((i) => ITEMS[i.id].cat === 'med');
      if (!meds.length) return false;
      const missing = this.maxHealth - this.health;
      meds.sort((a, b) => Math.abs(ITEMS[a.id].med.heal - missing) - Math.abs(ITEMS[b.id].med.heal - missing));
      med = meds[0];
    }
    if (ITEMS[med.id].cat !== 'med') return false;
    this.healItem = med;
    this.healT = ITEMS[med.id].med.time;
    return true;
  }

  finishHeal() {
    if (!this.healItem) return;
    this.health = Math.min(this.maxHealth, this.health + ITEMS[this.healItem.id].med.heal);
    for (const g of storages(this.loadout)) if (g.remove(this.healItem)) break;
    this.healItem = null;
  }

  takeDamage(dmg, attacker) {
    if (!this.alive) return 0;
    for (const slot of ['armor', 'helmet']) {
      const a = this.loadout[slot];
      if (a && a.dur > 0) {
        const absorbed = dmg * ITEMS[a.id].armor.reduce;
        a.dur = Math.max(0, a.dur - absorbed);
        dmg -= absorbed;
      }
    }
    this.health -= dmg;
    this.hitFlash = 0.08;
    this.healT = 0;
    this.healItem = null;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.killedBy = attacker;
      if (attacker) attacker.kills++;
      if (this.ring) this.ring.visible = false;
      this.mesh.rotation.set(-Math.PI / 2, this.aim, 0, 'YXZ');
      this.mesh.position.y = 0.2;
    }
    return dmg;
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        this.reloadT = 0;
        this.finishReload();
      }
    }
    if (this.healT > 0) {
      this.healT -= dt;
      if (this.healT <= 0) {
        this.healT = 0;
        this.finishHeal();
      }
    }
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.syncMesh(dt);
  }

  syncMesh(dt) {
    if (!this.alive) return;
    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.mesh.rotation.y = this.aim;
    // legs swing relative to movement direction
    const speed = this.vel.length();
    this.walkPhase += speed * dt * 2.6;
    const swing = speed > 0.2 ? Math.sin(this.walkPhase) * 0.6 : 0;
    const fwd = speed > 0.2 ? Math.cos(Math.atan2(this.vel.x, this.vel.y) - this.aim) : 1;
    this.legL.rotation.x = swing * fwd;
    this.legR.rotation.x = -swing * fwd;
    this.upper.position.y = speed > 0.2 ? Math.abs(Math.cos(this.walkPhase)) * 0.025 : 0;
    if (this.gun) this.gun.position.y = this.upper.position.y + this.gunY;
    this.material.emissive.set(this.hitFlash > 0 ? '#ffffff' : '#000000');
  }
}
