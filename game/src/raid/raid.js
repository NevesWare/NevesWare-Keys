import * as THREE from 'three';
import { worldMap } from './map.js';
import { Actor, ACTOR_RADIUS, MUZZLE_HEIGHT } from './actor.js';
import { BotBrain, ZombieBrain } from './ai.js';
import { Helicopter, CRUISE_ALT } from './helicopter.js';
import { fillContainer, botLoadout, bodyContainer } from './loot.js';
import { newLoadout } from '../inventory/loadout.js';
import { Grid } from '../inventory/grid.js';
import { factionById } from '../data/factions.js';
import { sfx } from '../audio.js';
import { buildWorld, addLighting } from '../gfx/world.js';
import { Fx } from '../gfx/fx.js';
import { ITEMS } from '../data/items.js';
import { MAP_SIZE } from './map.js';

export const RAID_TIME = 40 * 60;
export const HELI_SPEED = 42; // m/s cruise
const SPAWN_R = 110, SLEEP_R = 140;

let worldVisual = null; // { key, world } built once per quality tier

/** Flight time (s) from a faction base to a landing zone, including descent. */
export function flightTime(from, to) {
  return Math.hypot(to.x - from.x, to.z - from.z) / (HELI_SPEED * 0.82) + 6;
}
const EXTRACT_TIME = 10;
const INTERACT_RANGE = 1.9;

/**
 * One raid instance: world, actors, bullets, loot, insertion/extraction.
 * Emits events through callbacks so UI stays decoupled.
 */
export class Raid {
  constructor({ profile, callbacks, quality = {}, renderer, lz = null }) {
    this.quality = quality;
    this.renderer = renderer;
    this.profile = profile;
    this.cb = callbacks;
    this.scene = new THREE.Scene();
    this.map = worldMap();
    this.map.resetLoot();
    this.time = RAID_TIME;
    this.state = 'flight';
    this.actors = [];
    this.bots = [];
    this.tracers = [];
    this.containers = [...this.map.containers];
    this.extractT = 0;
    this.extractZone = null;
    this.stateT = 0;
    this.stats = { kills: 0, looted: 0, xp: 0 };

    this.setupScene();

    // player (hidden inside the helicopter until disembark)
    const pf = profile.faction;
    this.player = new Actor({ name: 'Você', faction: pf, loadout: profile.loadout, isPlayer: true });
    this.player.refreshGear();
    const lzs = this.map.lzs;
    this.lz = lzs.find((l) => l.id === lz) ?? lzs[Math.floor(Math.random() * lzs.length)];
    this.player.pos.set(this.lz.x - 2.2, 0, this.lz.z);
    this.player.mesh.visible = false;
    this.player.hidden = true;
    this.actors.push(this.player);
    this.scene.add(this.player.mesh);

    // spawns are created lazily when the player gets close (the sector is 1 km wide)
    const R = Math.random;
    this.spawnQueue = [];
    for (const s of this.map.botSpawns) if (R() < 0.85) this.spawnQueue.push({ ...s, kind: 'bot' });
    for (const zs of this.map.zombieSpawns) {
      for (let i = 0; i < zs.n; i++) this.spawnQueue.push({ x: zs.x + (R() - 0.5) * 6, z: zs.z + (R() - 0.5) * 6, kind: 'zombie' });
    }
    this.spawnT = 0;

    // insertion: fly from the faction base to the landing zone
    const base = this.map.outposts[pf] ?? { x: 512, z: 80 };
    this.base = base;
    this.heli = new Helicopter(factionById(pf).color);
    this.heli.y = CRUISE_ALT;
    this.heli.placeAt(base.x, base.z, 0);
    this.heli.flyTo(this.lz.x, this.lz.z, HELI_SPEED);
    this.heli.spin = 24;
    this.scene.add(this.heli.mesh);
    this.flightTotal = flightTime(base, this.lz);
    sfx.heli(0.15);
  }

  /** Seconds until touchdown during the insertion flight. */
  eta() {
    if (this.state === 'flight') return this.heli.eta() + 5;
    if (this.state === 'landing') return Math.max(0, 5 - this.stateT);
    return 0;
  }

  /** Skip the cinematic flight (tap). */
  skipFlight() {
    if (this.state !== 'flight') return;
    this.heli.mode = 'hover';
    this.heli.fly = null;
    this.heli.placeAt(this.lz.x, this.lz.z, this.heli.mesh.rotation.y);
  }

  /** Where the camera looks: the helicopter during insertion, else the player. */
  focusPoint(out) {
    if (this.state === 'flight' || this.state === 'landing') return out.copy(this.heli.mesh.position).setY(0);
    return out.copy(this.player.pos);
  }

  spawnNear() {
    const p = this.player.pos;
    for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
      const s = this.spawnQueue[i];
      const d = Math.hypot(s.x - p.x, s.z - p.z);
      if (d > SPAWN_R) continue;
      this.spawnQueue.splice(i, 1);
      if (d < (s.kind === 'zombie' ? 16 : 22)) continue; // nothing pops in right next to you
      const pos = this.map.freeSpot(s.x, s.z, 0);
      if (s.kind === 'zombie') {
        const a = new Actor({ name: 'Zumbi', faction: 'zombie', loadout: newLoadout(), seed: Math.floor(Math.random() * 100) });
        a.pos.set(pos.x, 0, pos.z);
        a.aim = Math.random() * Math.PI * 2;
        this.addBot(a, new ZombieBrain(a, this, { home: pos }));
      } else {
        const { name, loadout } = botLoadout(s.faction);
        const a = new Actor({ name, faction: s.faction, loadout });
        a.pos.set(pos.x, 0, pos.z);
        a.aim = Math.random() * Math.PI * 2;
        a.refreshGear();
        this.addBot(a, new BotBrain(a, this, { guard: s.guard, patrol: s.patrol, home: pos }));
      }
    }
  }

  addBot(a, brain) {
    this.actors.push(a);
    this.bots.push(brain);
    this.scene.add(a.mesh);
    a.syncMesh(0);
  }

  setupScene() {
    const s = this.scene;
    const key = `${this.quality.grass}/${this.quality.grassPatch}/${this.quality.viewDist}`;
    if (worldVisual?.key !== key) worldVisual = { key, world: buildWorld({ map: this.map, bounds: { x0: 0, z0: 0, W: MAP_SIZE, H: MAP_SIZE }, quality: this.quality }) };
    this.world = worldVisual.world;
    s.add(this.world.group);
    this.lighting = addLighting(s, this.renderer, { shadowSize: this.quality.shadows ?? 2048, viewDist: this.quality.viewDist });
    // pooled muzzle flash lights (fixed count so shaders never recompile)
    this.flashes = [];
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight('#ffc070', 0, 6, 1.6);
      s.add(l);
      this.flashes.push(l);
    }
    this.flashIdx = 0;
    // extraction zone markers (ring of tiles)
    const ringMat = new THREE.MeshBasicMaterial({ color: '#ffd66b', transparent: true, opacity: 0.85 });
    for (const ex of this.map.extracts) {
      if (ex.faction && ex.faction !== this.profile.faction) continue;
      const ring = new THREE.Mesh(new THREE.RingGeometry(ex.r - 0.25, ex.r, 32), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(ex.x, 0.02, ex.z);
      s.add(ring);
    }
    this.fx = new Fx(s);
    for (const f of this.map.fires ?? []) this.fx.addFire(f.x, f.z, f.s);
    this.grenades = [];
    this.tracerMat = new THREE.LineBasicMaterial({ color: '#ffe8a0', transparent: true, opacity: 0.9 });
    // aim laser (player)
    // a thin glowing strip, 1 m long along +z, scaled to the hit distance each frame
    const lg = new THREE.PlaneGeometry(0.045, 1);
    lg.rotateX(-Math.PI / 2);
    lg.translate(0, 0, 0.5);
    this.laser = new THREE.Mesh(lg, new THREE.MeshBasicMaterial({ color: '#ff3b2a', transparent: true, opacity: 0.8, depthTest: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    this.laser.renderOrder = 20;
    this.laser.frustumCulled = false;
    this.laserDot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff5a44', depthTest: false }));
    this.laserDot.renderOrder = 21;
    this.laser.visible = this.laserDot.visible = false;
    s.add(this.laser, this.laserDot);
  }

  hostileOf(a, b) {
    return a.faction !== b.faction;
  }

  /** Fire `actor`'s weapon toward `angle`. Handles spread, pellets, hits, tracers, noise. */
  shoot(actor, angle) {
    const w = actor.fire();
    if (!w) return false;
    actor.rig.shoot();
    const ox = actor.pos.x + Math.sin(angle) * 0.6;
    const oz = actor.pos.z + Math.cos(angle) * 0.6;
    const moving = actor.vel.length() > 0.5 ? 1.5 : 1;
    for (let p = 0; p < w.pellets; p++) {
      const a = angle + THREE.MathUtils.degToRad((Math.random() * 2 - 1) * w.spread * moving);
      const dx = Math.sin(a), dz = Math.cos(a);
      let maxT = Math.min(w.range, this.map.raycast(ox, oz, dx, dz, w.range));
      let victim = null;
      for (const o of this.actors) {
        if (o === actor || !o.alive || o.hidden) continue;
        const cx = o.pos.x - ox, cz = o.pos.z - oz;
        const t = cx * dx + cz * dz;
        if (t < 0 || t > maxT) continue;
        const perp2 = cx * cx + cz * cz - t * t;
        const r = ACTOR_RADIUS + 0.08;
        if (perp2 > r * r) continue;
        const th = t - Math.sqrt(r * r - perp2);
        if (th < maxT) {
          maxT = th;
          victim = o;
        }
      }
      this.addTracer(ox, oz, ox + dx * maxT, oz + dz * maxT);
      if (!victim && maxT < w.range - 0.05 && Math.abs(ox - this.player.pos.x) + Math.abs(oz - this.player.pos.z) < 60) this.fx.impact(ox + dx * maxT, 0.9, oz + dz * maxT);
      if (victim) this.damage(victim, w.damage, actor);
    }
    const dist = Math.hypot(actor.pos.x - this.player.pos.x, actor.pos.z - this.player.pos.z);
    sfx.shot(w.sound ?? 'mp5', actor.isPlayer ? 0 : dist, actor);
    const fl = this.flashes[this.flashIdx++ % this.flashes.length];
    fl.position.set(ox, MUZZLE_HEIGHT + 0.3, oz);
    fl.intensity = 18;
    // everyone nearby hears it
    for (const b of this.bots) {
      if (b.a === actor) continue;
      const d = Math.hypot(b.a.pos.x - actor.pos.x, b.a.pos.z - actor.pos.z);
      if (d < (b instanceof ZombieBrain ? 45 : 30)) b.hear(actor.pos.x, actor.pos.z, actor);
    }
    this.cb.onShot?.(actor);
    return true;
  }

  /** Throw a grenade from `actor` toward `angle` (lands ~`dist` m away). */
  throwGrenade(actor, angle, dist = 13) {
    const d = ITEMS.granada.throw;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: '#3e4630', roughness: 0.6 }));
    m.castShadow = true;
    const sp = Math.min(14, Math.sqrt(dist * 18 * 0.9));
    const g = {
      mesh: m, t: d.fuse, owner: actor,
      pos: new THREE.Vector3(actor.pos.x + Math.sin(angle) * 0.5, 1.6, actor.pos.z + Math.cos(angle) * 0.5),
      vel: new THREE.Vector3(Math.sin(angle) * sp * 0.75, sp * 0.55, Math.cos(angle) * sp * 0.75),
    };
    m.position.copy(g.pos);
    this.scene.add(m);
    this.grenades.push(g);
    actor.rig.shoot?.();
    sfx.reload();
  }

  explode(x, z, owner) {
    const d = ITEMS.granada.throw;
    this.fx.explosion(x, z, 1);
    const dist = Math.hypot(x - this.player.pos.x, z - this.player.pos.z);
    sfx.boom(dist);
    this.cb.onShake?.(Math.max(0, 1 - dist / 40));
    for (const a of [...this.actors]) {
      if (!a.alive || a.hidden) continue;
      const r = Math.hypot(a.pos.x - x, a.pos.z - z);
      if (r > d.radius || !this.map.hasLOS(x, z, a.pos.x, a.pos.z)) continue;
      this.damage(a, d.damage * (1 - r / d.radius) ** 1.2, owner);
    }
    for (const b of this.bots) {
      if (Math.hypot(b.a.pos.x - x, b.a.pos.z - z) < 60) b.hear(x, z, owner);
    }
  }

  updateGrenades(dt) {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.t -= dt;
      g.vel.y -= 18 * dt;
      const nx = g.pos.x + g.vel.x * dt, nz = g.pos.z + g.vel.z * dt;
      if (this.map.isSolid(Math.floor(nx), Math.floor(nz)) && g.pos.y < 2.6) {
        g.vel.x *= -0.35;
        g.vel.z *= -0.35;
      } else {
        g.pos.x = nx;
        g.pos.z = nz;
      }
      g.pos.y += g.vel.y * dt;
      if (g.pos.y < 0.07) {
        g.pos.y = 0.07;
        g.vel.y *= -0.3;
        g.vel.x *= 0.6;
        g.vel.z *= 0.6;
      }
      g.mesh.position.copy(g.pos);
      if (g.t <= 0) {
        this.scene.remove(g.mesh);
        g.mesh.geometry.dispose();
        this.grenades.splice(i, 1);
        this.explode(g.pos.x, g.pos.z, g.owner);
      }
    }
  }

  /** A zombie that spots prey pulls nearby zombies into the chase. */
  alertHorde(src, target) {
    for (const b of this.bots) {
      if (!(b instanceof ZombieBrain) || b === src || !b.a.alive || b.state === 'combat') continue;
      if (Math.hypot(b.a.pos.x - src.a.pos.x, b.a.pos.z - src.a.pos.z) < 12) b.engage(target);
    }
  }

  groan(a) {
    const d = Math.hypot(a.pos.x - this.player.pos.x, a.pos.z - this.player.pos.z);
    if (d < 25) sfx.groan(d);
  }

  /** Where a ray from the player's muzzle along `angle` stops (wall, actor or range). */
  aimHit(angle, range) {
    const pl = this.player;
    const ox = pl.pos.x + Math.sin(angle) * 0.6, oz = pl.pos.z + Math.cos(angle) * 0.6;
    const dx = Math.sin(angle), dz = Math.cos(angle);
    let maxT = Math.min(range, this.map.raycast(ox, oz, dx, dz, range));
    for (const o of this.actors) {
      if (o === pl || !o.alive || o.hidden) continue;
      const cx = o.pos.x - ox, cz = o.pos.z - oz;
      const t = cx * dx + cz * dz;
      if (t < 0 || t > maxT) continue;
      const perp2 = cx * cx + cz * cz - t * t;
      if (perp2 < 0.16) maxT = t - Math.sqrt(0.16 - perp2);
    }
    return { ox, oz, x: ox + dx * maxT, z: oz + dz * maxT };
  }

  /** Give up: counts as missing in action. */
  abandon() {
    if (this.state === 'dead' || this.state === 'extracted') return;
    this.state = 'dead';
    this.cb.onEnd?.({ result: 'abandon' });
  }

  damage(victim, dmg, attacker, pierce = false) {
    const wasAlive = victim.alive;
    victim.takeDamage(dmg, attacker, pierce);
    // wounds may bleed until bandaged
    if (!pierce && victim.alive && victim.faction !== 'zombie' && Math.random() < (attacker?.faction === 'zombie' ? 0.35 : 0.22)) {
      if (victim.isPlayer && !victim.bleeding) this.cb.onToast?.('Você está sangrando! Use bandagem ou kit médico.');
      victim.bleeding = true;
    }
    if (victim.isPlayer) {
      if (!pierce) this.cb.onPlayerHit?.(dmg);
    }
    else {
      if (attacker?.isPlayer) sfx.hit();
      this.bots.find((b) => b.a === victim)?.hurt(attacker);
    }
    if (wasAlive && !victim.alive) {
      this.cb.onKill?.(attacker, victim);
      if (attacker?.isPlayer) {
        this.stats.kills++;
        this.stats.xp += victim.faction === 'zombie' ? 10 : victim.faction === 'scav' ? 30 : 70;
      }
      if (victim.isPlayer) {
        this.state = 'dead';
        this.cb.onEnd?.({ result: 'dead', killer: attacker?.name ?? 'desconhecido' });
      } else if (victim.faction === 'zombie') {
        if (Math.random() < 0.25) {
          const c = { x: victim.pos.x, z: victim.pos.z, label: 'Restos', grid: new Grid(5, 4), tier: 'common', filled: false, body: true };
          this.containers.push(c);
        }
      } else {
        this.containers.push(bodyContainer(victim));
      }
    }
  }

  addTracer(x0, z0, x1, z1) {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x0, MUZZLE_HEIGHT, z0),
      new THREE.Vector3(x1, MUZZLE_HEIGHT, z1),
    ]);
    const line = new THREE.Line(g, this.tracerMat);
    this.scene.add(line);
    this.tracers.push({ line, t: 0.06 });
  }

  nearestContainer() {
    const p = this.player.pos;
    let best = null, bd = INTERACT_RANGE;
    for (const c of this.containers) {
      const d = Math.hypot(c.x - p.x, c.z - p.z);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return best;
  }

  currentExtract() {
    const p = this.player.pos;
    return (
      this.map.extracts.find(
        (e) => (!e.faction || e.faction === this.profile.faction) && Math.hypot(e.x - p.x, e.z - p.z) < e.r,
      ) ?? null
    );
  }

  openContainer(c) {
    if (!c.filled) fillContainer(c);
    if (!c.looted && !c.body) {
      this.stats.looted++;
      this.stats.xp += c.tier === 'rare' ? 40 : c.tier === 'military' ? 20 : 8;
      this.cb.onLoot?.(c);
    }
    c.looted = true;
    this.cb.onOpenLoot?.(c);
  }

  /** Per-fixed-step update. `ctl` = player intent computed by main from input. */
  update(dt, ctl) {
    if (this.state === 'dead' || this.state === 'extracted') return;
    const pl = this.player;

    // --- insertion: flight, landing, disembark ---
    this.stateT += dt;
    this.heli.update(dt);
    if (this.state === 'flight') {
      if (this.heli.mode !== 'fly') {
        this.state = 'landing';
        this.stateT = 0;
        this.heli.descend(5, this.heli.y);
        this.spawnNear();
      }
      if (Math.random() < dt * 6) sfx.heli(0.12);
      return; // raid clock starts on touchdown
    }
    if (this.state === 'landing') {
      if (Math.random() < dt * 6) sfx.heli(0.1);
      if (this.heli.mode === 'landed') {
        this.state = 'disembark';
        this.stateT = 0;
        const d = this.heli.doorPos(new THREE.Vector3(), 1.0);
        pl.pos.set(d.x, 0, d.z);
        this.disembarkTo = this.heli.doorPos(new THREE.Vector3(), 3.6);
        pl.aim = Math.atan2(this.disembarkTo.x - d.x, this.disembarkTo.z - d.z);
        pl.mesh.visible = true;
      }
      return;
    }
    if (this.state === 'disembark') {
      const t = this.disembarkTo;
      const dx = t.x - pl.pos.x, dz = t.z - pl.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.12 && this.stateT < 2.5) {
        pl.vel.set((dx / d) * 2.4, (dz / d) * 2.4);
        pl.pos.x += pl.vel.x * dt;
        pl.pos.z += pl.vel.y * dt;
      } else {
        pl.vel.set(0, 0);
        pl.hidden = false;
        this.state = 'play';
        this.heli.ascend(4, 26);
        this.cb.onToast?.(`Inserção em ${this.lz.name}. Boa sorte.`);
      }
      pl.update(dt);
      return;
    }

    // --- leaving on the extraction helicopter ---
    if (this.state === 'boarding') {
      if (this.stateT > 3.2) {
        this.state = 'extracted';
        this.cb.onEnd?.({ result: 'extracted', zone: this.extractZone.name, cost: this.extractZone.cost ?? 0 });
      }
      return;
    }

    if ((this.spawnT -= dt) <= 0) {
      this.spawnT = 0.5;
      this.spawnNear();
    }

    this.time -= dt;
    if (this.time <= 0 && this.state !== 'dead') {
      this.state = 'dead';
      this.cb.onEnd?.({ result: 'mia' });
      return;
    }

    // --- player ---
    if (this.state === 'play' || this.state === 'extracting') {
      if (!ctl.uiOpen) {
        const rolling = pl.stance(ctl, dt);
        pl.aiming = !!ctl.aiming && !rolling;
        const sprint = !rolling && ctl.sprint && !ctl.fire && !ctl.aiming && pl.reloadT <= 0 && pl.healT <= 0 && pl.stamina > 4 && (ctl.moveX || ctl.moveZ);
        if (sprint) pl.crouch = false;
        if (!rolling) {
          let sp = sprint ? 6.0 : ctl.aiming ? 2.3 : 4.0;
          if (pl.crouch) sp *= sprint ? 1 : 0.5;
          if (pl.healT > 0) sp *= 0.5;
          pl.vel.set(ctl.moveX * sp, ctl.moveZ * sp);
          pl.aim = ctl.aim;
        }
        this.survival(pl, dt, sprint);
        this.map.move(pl.pos, pl.vel.x, pl.vel.y, ACTOR_RADIUS, dt);

        if (ctl.reload && pl.startReload()) sfx.reload();
        if (ctl.heal && !pl.startHeal()) this.cb.onToast?.('Sem remédios ou vida cheia.');
        const w = pl.weaponDef;
        if (w && !sprint && !rolling) {
          const wants = w.auto ? ctl.fire : ctl.firePressed;
          if (wants && pl.canFire()) {
            if (pl.weapon.mag > 0) this.shoot(pl, pl.aim);
            else {
              sfx.empty();
              if (pl.startReload()) sfx.reload();
              pl.cooldown = 0.25;
            }
          }
        }

        if (ctl.interact) {
          const ex = this.currentExtract();
          const c = this.nearestContainer();
          if (c) this.openContainer(c);
          else if (ex && this.state === 'play') this.startExtraction(ex);
        }
      } else {
        pl.vel.set(0, 0);
      }
    }

    // --- extraction ---
    if (this.state === 'extracting') {
      const inZone = Math.hypot(this.extractZone.x - pl.pos.x, this.extractZone.z - pl.pos.z) < this.extractZone.r + 0.5;
      if (!inZone) {
        this.state = 'play';
        this.cb.onToast?.('Extração cancelada: você saiu da zona.');
        if (this.heli.mesh.visible) this.heli.ascend(2);
      } else {
        this.extractT -= dt;
        if (this.extractT < 5 && this.heli.mode === 'idle') {
          this.heli.placeAt(this.extractZone.x + 3.2, this.extractZone.z, 0);
          this.heli.descend(4.6);
        }
        if (Math.random() < dt * 8) sfx.heli(0.05 + 0.1 * (1 - this.extractT / EXTRACT_TIME));
        if (this.extractT <= 0 && this.heli.mode === 'landed') {
          // board and lift off
          this.state = 'boarding';
          this.stateT = 0;
          pl.mesh.visible = false;
          pl.hidden = true;
          this.laser.visible = this.laserDot.visible = false;
          this.heli.ascend(3.4, 30, false);
          sfx.heli(0.2);
          return;
        }
      }
    }

    pl.update(dt);

    // aim laser
    const showLaser = !!ctl.aiming && !!pl.weapon && pl.alive;
    this.laser.visible = this.laserDot.visible = showLaser;
    if (showLaser) {
      const h = this.aimHit(pl.aim, pl.weaponDef.range);
      this.laser.position.set(h.ox, MUZZLE_HEIGHT, h.oz);
      this.laser.rotation.y = pl.aim;
      this.laser.scale.set(1, 1, Math.max(0.01, Math.hypot(h.x - h.ox, h.z - h.oz)));
      this.laserDot.position.set(h.x, MUZZLE_HEIGHT, h.z);
    }

    // --- bots ---
    for (const b of this.bots) {
      const dx = Math.abs(b.a.pos.x - pl.pos.x), dz = Math.abs(b.a.pos.z - pl.pos.z);
      if (dx > SLEEP_R || dz > SLEEP_R) {
        // asleep: far from the player, frozen and hidden
        b.a.mesh.visible = false;
        continue;
      }
      b.update(dt);
      const far = dx > 48 || dz > 48; // beyond this: no animation (pose freezes)
      b.a.mesh.visible = dx < 125 && dz < 125;
      b.a.update(dt, !far);
    }

    // --- fx ---
    this.updateGrenades(dt);
    this.fx.update(dt, pl.pos);
    for (const f of this.flashes) f.intensity = Math.max(0, f.intensity - dt * 400);
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.t -= dt;
      if (t.t <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        this.tracers.splice(i, 1);
      }
    }
  }

  /** Stamina, thirst, hunger, bleeding (player). */
  survival(pl, dt, sprinting) {
    pl.boostT = Math.max(0, pl.boostT - dt);
    if (sprinting) pl.stamina = Math.max(0, pl.stamina - (pl.boostT > 0 ? 9 : 20) * dt);
    else pl.stamina = Math.min(100, pl.stamina + (pl.energy > 20 ? 14 : 6) * dt);
    pl.water = Math.max(0, pl.water - dt * (sprinting ? 0.16 : 0.085));
    pl.energy = Math.max(0, pl.energy - dt * (sprinting ? 0.12 : 0.065));
    let dot = 0, cause = null;
    if (pl.bleeding) {
      dot += 1.1;
      cause = 'Sangramento';
    }
    if (pl.water <= 0) {
      dot += 0.6;
      cause = 'Desidratação';
    }
    if (pl.energy <= 0) {
      dot += 0.4;
      cause = 'Exaustão';
    }
    if (dot > 0) this.damage(pl, dot * dt, { name: cause, faction: 'none', kills: 0 }, true);
  }

  startExtraction(ex) {
    if (ex.cost && this.profile.money < ex.cost) {
      this.cb.onToast?.(`Extração paga: você precisa de ₢ ${ex.cost.toLocaleString('pt-BR')}.`);
      return;
    }
    this.state = 'extracting';
    this.extractZone = ex;
    this.extractT = EXTRACT_TIME;
    this.heli.mode = 'idle';
    this.heli.mesh.visible = false;
    this.cb.onToast?.(`Helicóptero a caminho de ${ex.name}. Segure a posição!`);
  }

  /** Prompt text for HUD. */
  prompt() {
    if (this.state === 'extracting') return `EXTRAÇÃO EM ${Math.ceil(this.extractT)}s — fique na zona`;
    if (this.state !== 'play') return '';
    const c = this.nearestContainer();
    if (c) return `[F] Saquear ${c.label}`;
    const ex = this.currentExtract();
    if (ex) return `[F] Pedir extração — ${ex.name}${ex.cost ? ` (₢ ${ex.cost.toLocaleString('pt-BR')})` : ''}`;
    return '';
  }

  dispose() {
    this.scene.remove(this.world.group); // the world is cached for the next raid
    this.scene.traverse((o) => {
      if (o.geometry && o.geometry.type !== 'BoxGeometry') o.geometry.dispose();
    });
  }
}
