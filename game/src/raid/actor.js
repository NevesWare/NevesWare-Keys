import * as THREE from 'three';
import { ITEMS } from '../data/items.js';
import { factionById } from '../data/factions.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);

function part(color, sx, sy, sz, x, y, z) {
  const m = new THREE.Mesh(BOX, new THREE.MeshLambertMaterial({ color }));
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  return m;
}

export const ACTOR_RADIUS = 0.32;
export const MUZZLE_HEIGHT = 1.0;

/**
 * Anything that walks and shoots: the player and every bot.
 * loadout = { weapon: item|null, armor: item|null, backpack: Grid }
 */
export class Actor {
  constructor({ name, faction, loadout, isPlayer = false }) {
    this.name = name;
    this.faction = faction;
    this.isPlayer = isPlayer;
    this.loadout = loadout;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector2();
    this.aim = 0; // radians, 0 = +z
    this.health = 100;
    this.maxHealth = 100;
    this.alive = true;
    this.cooldown = 0;
    this.reloadT = 0;
    this.healT = 0;
    this.healItem = null;
    this.hitFlash = 0;
    this.walkPhase = 0;
    this.kills = 0;
    this.killedBy = null;
    this.mesh = this.buildMesh();
  }

  get weaponDef() {
    return this.loadout.weapon ? ITEMS[this.loadout.weapon.id].weapon : null;
  }

  buildMesh() {
    const f = factionById(this.faction);
    const g = new THREE.Group();
    const body = f?.color ?? '#a8703f';
    const skin = '#f4e9d8';
    const dark = '#2a1d3d';
    this.legL = part(dark, 0.18, 0.55, 0.2, -0.13, 0.28, 0);
    this.legR = part(dark, 0.18, 0.55, 0.2, 0.13, 0.28, 0);
    this.torso = part(body, 0.52, 0.55, 0.32, 0, 0.83, 0);
    this.head = part(skin, 0.3, 0.3, 0.3, 0, 1.28, 0);
    this.gun = part('#140c1c', 0.09, 0.09, 0.62, 0.2, 0.98, 0.32);
    this.vest = part('#44305e', 0.58, 0.4, 0.38, 0, 0.86, 0);
    this.vest.visible = !!this.loadout.armor;
    if (this.faction === 'scav') this.hat = part('#6b3f2a', 0.36, 0.1, 0.36, 0, 1.47, 0);
    else this.hat = part(body, 0.34, 0.12, 0.34, 0, 1.46, 0);
    g.add(this.legL, this.legR, this.torso, this.vest, this.head, this.hat, this.gun);
    this.parts = [this.legL, this.legR, this.torso, this.vest, this.head, this.hat, this.gun];

    if (this.isPlayer) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.42, 0.55, 16),
        new THREE.MeshBasicMaterial({ color: '#ffd66b', side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
      g.add(ring);
      this.ring = ring;
      // x-ray silhouette: only draws where something is in front of the player
      const ghostMat = new THREE.MeshBasicMaterial({ color: '#f4e9d8', depthFunc: THREE.GreaterDepth, depthWrite: false });
      for (const p of [this.torso, this.head, this.legL, this.legR]) {
        const gm = new THREE.Mesh(BOX, ghostMat);
        gm.scale.copy(p.scale);
        gm.position.copy(p.position);
        gm.renderOrder = 10;
        g.add(gm);
      }
    }
    return g;
  }

  refreshGear() {
    this.vest.visible = !!this.loadout.armor;
    this.gun.visible = !!this.loadout.weapon;
  }

  canFire() {
    return this.alive && this.loadout.weapon && this.cooldown <= 0 && this.reloadT <= 0 && this.healT <= 0;
  }

  /** Consumes one round; returns the weapon def or null (empty/cooldown). */
  fire() {
    if (!this.canFire()) return null;
    const w = this.weaponDef;
    if (this.loadout.weapon.mag <= 0) return null;
    this.loadout.weapon.mag--;
    this.cooldown = 60 / w.rpm;
    return w;
  }

  ammoReserve() {
    const w = this.weaponDef;
    if (!w) return 0;
    const ammoId = Object.keys(ITEMS).find((k) => ITEMS[k].cat === 'ammo' && ITEMS[k].caliber === w.caliber);
    return this.loadout.backpack.count(ammoId);
  }

  startReload() {
    const w = this.weaponDef;
    if (!w || this.reloadT > 0 || this.healT > 0) return false;
    if (this.loadout.weapon.mag >= w.mag) return false;
    if (this.ammoReserve() <= 0) return false;
    this.reloadT = w.reload;
    return true;
  }

  finishReload() {
    const w = this.weaponDef;
    if (!w) return;
    const ammoId = Object.keys(ITEMS).find((k) => ITEMS[k].cat === 'ammo' && ITEMS[k].caliber === w.caliber);
    const need = w.mag - this.loadout.weapon.mag;
    this.loadout.weapon.mag += this.loadout.backpack.take(ammoId, need);
  }

  /** Use best med from backpack. */
  startHeal() {
    if (this.healT > 0 || this.reloadT > 0 || this.health >= this.maxHealth) return false;
    const meds = this.loadout.backpack.items().filter((i) => ITEMS[i.id].cat === 'med');
    if (!meds.length) return false;
    const missing = this.maxHealth - this.health;
    meds.sort((a, b) => Math.abs(ITEMS[a.id].med.heal - missing) - Math.abs(ITEMS[b.id].med.heal - missing));
    this.healItem = meds[0];
    this.healT = ITEMS[this.healItem.id].med.time;
    return true;
  }

  finishHeal() {
    if (!this.healItem) return;
    this.health = Math.min(this.maxHealth, this.health + ITEMS[this.healItem.id].med.heal);
    this.loadout.backpack.remove(this.healItem);
    this.healItem = null;
  }

  takeDamage(dmg, attacker) {
    if (!this.alive) return 0;
    const armor = this.loadout.armor;
    if (armor && armor.dur > 0) {
      const a = ITEMS[armor.id].armor;
      const absorbed = dmg * a.reduce;
      armor.dur = Math.max(0, armor.dur - absorbed);
      dmg -= absorbed;
    }
    this.health -= dmg;
    this.hitFlash = 0.08;
    this.healT = 0; // getting shot interrupts healing
    this.healItem = null;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.killedBy = attacker;
      if (attacker) attacker.kills++;
      if (this.ring) this.ring.visible = false;
      this.mesh.rotation.x = -Math.PI / 2;
      this.mesh.position.y = 0.18;
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
    const speed = this.vel.length();
    this.walkPhase += speed * dt * 3.2;
    const swing = speed > 0.2 ? Math.sin(this.walkPhase) * 0.5 : 0;
    this.legL.rotation.x = swing;
    this.legR.rotation.x = -swing;
    const flash = this.hitFlash > 0;
    for (const p of this.parts) p.material.emissive?.set(flash ? '#f4e9d8' : '#000000');
  }
}
