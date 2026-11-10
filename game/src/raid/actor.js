import * as THREE from 'three';
import { ITEMS, ammoIdFor } from '../data/items.js';
import { CharacterRig } from '../gfx/characters.js';
import { activeWeapon, countItem, takeItem, storages } from '../inventory/loadout.js';

export const ACTOR_RADIUS = 0.32;
export const MUZZLE_HEIGHT = 1.35;

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
    this.aiming = false;
    if (faction === 'zombie') this.health = this.maxHealth = 70;
    this.cooldown = 0;
    this.reloadT = 0;
    this.healT = 0;
    this.healItem = null;
    this.hitFlash = 0;
    this.walkPhase = 0;
    this.kills = 0;
    this.killedBy = null;
    this.rig = new CharacterRig({ faction, seed: this.seed });
    this.mesh = this.rig.root;
    if (isPlayer) {
      this.ring = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 0.6, 32),
        new THREE.MeshBasicMaterial({ color: '#ffd66b', transparent: true, opacity: 0.7, depthWrite: false }),
      );
      this.ring.rotation.x = -Math.PI / 2;
      this.ring.position.y = 0.03;
      this.mesh.add(this.ring);
    }
    this.refreshGear();
  }

  get weapon() {
    return activeWeapon(this.loadout);
  }

  get weaponDef() {
    const w = this.weapon;
    return w ? ITEMS[w.id].weapon : null;
  }

  /** Sync visible equipment with the loadout. */
  refreshGear() {
    const lo = this.loadout;
    this.rig.setGear({
      helmet: lo.helmet?.id ?? null,
      armor: lo.armor?.id ?? null,
      backpack: lo.backpack?.id ?? null,
      weapon: this.weapon?.id ?? null,
    });
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
      this.rig.die();
    }
    return dmg;
  }

  update(dt, animate = true) {
    this.animate = animate;
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
    if (this.alive) {
      this.mesh.position.set(this.pos.x, 0, this.pos.z);
      this.mesh.rotation.y = this.aim;
    }
    this.rig.flash(this.hitFlash > 0);
    if (this.animate === false) return;
    const speed = this.vel.length();
    const backwards = speed > 0.25 && Math.cos(Math.atan2(this.vel.x, this.vel.y) - this.aim) < -0.3;
    this.rig.update(dt, {
      speed,
      sprint: speed > 5,
      zombie: this.faction === 'zombie',
      aiming: this.aiming || this.cooldown > 0,
      armed: !!this.weapon,
      reloading: this.reloadT > 0,
      healing: this.healT > 0,
      backwards,
    });
  }
}
