import * as THREE from 'three';
import { RaidMap } from '../raid/map.js';
import { Actor, ACTOR_RADIUS } from '../raid/actor.js';
import { BotBrain } from '../raid/ai.js';
import { Helicopter } from '../raid/helicopter.js';
import { botLoadout } from '../raid/loot.js';
import { VoxelLevel } from '../world/voxelLevel.js';
import { buildWorld, addLighting } from '../gfx/world.js';
import { factionById } from '../data/factions.js';
import { newLoadout } from '../inventory/loadout.js';

const W = 56;

/** Interaction points inside the safe zone. */
export const HUB_POINTS = {
  armeiro: { label: 'ARMEIRO', role: 'Armas e munição', tab: 'trade', filter: ['weapon', 'ammo'] },
  intendente: { label: 'INTENDENTE', role: 'Equipamento e trocas', tab: 'trade', filter: ['armor', 'helmet', 'backpack'], barter: true },
  medico: { label: 'MÉDICO', role: 'Remédios e comida', tab: 'trade', filter: ['med', 'food'] },
  comandante: { label: 'COMANDANTE', role: 'Missões e contratos', tab: 'quest' },
  armario: { label: 'ARMÁRIO', role: 'Stash e equipamento', tab: 'inv' },
  heli: { label: 'HELIPONTO', role: 'Embarcar para a incursão', tab: 'deploy' },
};

function labelSprite(title, sub, color) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(12,14,16,0.72)';
  g.beginPath();
  g.roundRect(16, 20, 480, 120, 28);
  g.fill();
  g.fillStyle = color;
  g.fillRect(16, 20, 8, 120);
  g.fillStyle = '#ffffff';
  g.font = '700 58px "Barlow Condensed", sans-serif';
  g.fillText(title, 48, 82);
  g.fillStyle = '#c9c5bc';
  g.font = '400 34px Inter, sans-serif';
  g.fillText(sub, 48, 124);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(3.2, 1.0, 1);
  s.renderOrder = 30;
  return s;
}

/**
 * Playable safe zone of the player's faction: walk to traders, the commander,
 * the stash locker and the helipad. No combat here.
 */
export class Hub {
  constructor({ profile, renderer, quality, faction }) {
    this.profile = profile;
    this.faction = faction;
    this.time = 0;
    this.state = 'hub';
    this.extractT = 0;
    this.boarding = null;
    const f = factionById(faction);
    this.scene = new THREE.Scene();
    // grid map (reuses the raid map helpers without generating a raid)
    const m = Object.create(RaidMap.prototype);
    Object.assign(m, {
      W, H: W, solid: new Uint8Array(W * W), gnd: new Uint8Array(W * W), reserved: new Uint8Array(W * W), vox: new VoxelLevel(),
      rand: (() => { let a = 17; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })(),
      containers: [], extracts: [], outposts: {}, botSpawns: [], props: [],
    });
    this.map = m;
    this.actors = [];
    this.bots = [];
    this.points = [];
    this.build(f);

    this.world = buildWorld({ map: m, bounds: { x0: 0, z0: 0, W, H: W }, quality });
    this.scene.add(this.world.group);
    this.lighting = addLighting(this.scene, renderer, { shadowSize: quality.shadows, extent: 24, viewDist: quality.viewDist });
    this.lighting.follow(new THREE.Vector3(28, 0, 28));

    this.heli = new Helicopter(f.color);
    this.heli.placeAt(this.heliPos.x, this.heliPos.z, Math.PI / 2);
    this.heli.land();
    this.scene.add(this.heli.mesh);

    for (const p of this.points) {
      const meta = HUB_POINTS[p.id];
      const s = labelSprite(meta.label, meta.role, f.color);
      s.position.set(p.x, p.labelY ?? 3.4, p.z);
      this.scene.add(s);
      p.sprite = s;
    }

    this.player = new Actor({ name: 'Você', faction, loadout: profile?.loadout ?? newLoadout(), isPlayer: true });
    this.player.refreshGear();
    this.spawnPlayer('gate');
    this.scene.add(this.player.mesh);
    this.actors.push(this.player);
  }

  /** Lay out the compound. Coordinates are meters/cells (0..56). */
  build(f) {
    const m = this.map;
    const A = 8, B = 47; // wall rectangle
    for (let x = 0; x < W; x++)
      for (let z = 0; z < W; z++) {
        const inside = x > A && x < B && z > A && z < B;
        const road = Math.abs(x - 27.5) < 2.2 && z >= B - 1;
        m.ground(x, z, road ? 'road' : inside ? 'concrete' : (x + z) % 7 === 0 ? 'grassDark' : 'grass');
      }
    for (let i = A; i <= B; i++)
      for (const [x, z] of [[i, A], [i, B], [A, i], [B, i]]) {
        if (z === B && Math.abs(x - 27.5) < 2.5) continue; // gate
        m.block(x, z, 2, `wall_${f.id}`);
      }
    // helipad (north)
    for (let x = 22; x <= 33; x++) for (let z = 11; z <= 20; z++) m.ground(x, z, 'helipad');
    m.prop('helipad', 0, 27.5, 15.5, 0);
    this.heliPos = { x: 27.5, z: 15.5 };
    this.points.push({ id: 'heli', x: 27.5, z: 21.5, r: 3, labelY: 4.6 });
    // block the helicopter footprint
    for (let x = 23; x <= 32; x++) for (let z = 14; z <= 17; z++) m.solid[z * W + x] = 1;

    // trader stalls (west)
    const stalls = [['armeiro', 15, 20], ['intendente', 15, 28], ['medico', 15, 36]];
    for (const [id, x, z] of stalls) {
      m.prop('stall', f.color, x, z, Math.PI / 2);
      for (let dz = -1; dz <= 1; dz++) m.solid[(z + dz) * W + (x + 1)] = 1; // table
      this.points.push({ id, x: x + 2.4, z, r: 2.4, npc: { x: x - 0.3, z, aim: Math.PI / 2 } });
    }
    m.prop('crates', 2, 12, 24, 0.2);
    m.prop('barrels', 3, 12, 32, 0.6);

    // headquarters (east) with the commander at the door
    m.building(36, 24, 8, 7, { wall: 'brick', floor: 'plank', doors: 'w' });
    this.points.push({ id: 'comandante', x: 34.2, z: 27.5, r: 2.4, npc: { x: 35.2, z: 27.5, aim: -Math.PI / 2 } });
    // stash lockers (south-east)
    m.prop('locker', 0, 38, 37, Math.PI);
    for (let x = 37; x <= 39; x++) m.solid[37 * W + x] = 1;
    this.points.push({ id: 'armario', x: 38, z: 35.2, r: 2.2 });

    // vehicle park, towers, barriers
    m.structure('truck', 22, 38, 3, 8, 0);
    m.structure('humvee', 27, 39, 3, 5, 0);
    m.structure('apc', 32.5, 39, 3, 6, 0);
    m.structure('tower', 11, 11, 3, 3, 0);
    m.structure('tower', 44, 11, 3, 3, 0);
    m.structure('hangar', 40, 15, 10, 8, Math.PI);
    m.prop('suv', 0, 44, 30, 0);
    for (let i = 0; i < 4; i++) m.prop('barrier', 0, 21 + i * 2.1, 46, 0);
    m.prop('barrels', 2, 34, 33, 0.3);
    m.prop('crates', 3, 21, 25, 0);
    // greenery outside the walls
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2, r = 25 + (i % 3) * 1.5;
      const x = 28 + Math.cos(a) * r, z = 28 + Math.sin(a) * r;
      if (x < 1 || z < 1 || x > W - 2 || z > W - 2) continue;
      m.prop(i % 4 ? 'bush' : 'tree', i % 3, x, z, i, 0.9);
    }

    // NPCs: traders, commander, guards
    const fac = f.id;
    for (const p of this.points) {
      if (!p.npc) continue;
      const lo = newLoadout();
      if (p.id === 'comandante') {
        const b = botLoadout(fac).loadout;
        lo.armor = b.armor;
        lo.helmet = null;
      }
      const a = new Actor({ name: HUB_POINTS[p.id].label, faction: fac, loadout: lo, seed: p.x * 3 + p.z });
      a.pos.set(p.npc.x, 0, p.npc.z);
      a.aim = p.npc.aim;
      a.syncMesh(0);
      this.scene.add(a.mesh);
      this.actors.push(a);
      p.actor = a;
    }
    const guardSpots = [[20, 44], [35, 44], [10, 30], [45, 22], [27, 10]];
    for (const [x, z] of guardSpots) {
      const { loadout } = botLoadout(fac);
      const a = new Actor({ name: 'Guarda', faction: fac, loadout, seed: x + z });
      a.pos.set(x, 0, z);
      a.refreshGear();
      this.actors.push(a);
      this.bots.push(new BotBrain(a, this, { guard: true, home: { x, z } }));
      this.scene.add(a.mesh);
    }
  }

  /** Walk to the helicopter door, climb in and lift off. `done` fires once airborne. */
  board(done) {
    const pl = this.player;
    pl.crouch = false;
    pl.aiming = false;
    this.boarding = { t: 0, phase: 'walk', done, door: this.heli.doorPos(new THREE.Vector3(), 1.6) };
  }

  updateBoarding(dt) {
    const B = this.boarding, pl = this.player;
    B.t += dt;
    if (B.phase === 'walk') {
      const dx = B.door.x - pl.pos.x, dz = B.door.z - pl.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.15 && B.t < 6) {
        pl.vel.set((dx / d) * 3.2, (dz / d) * 3.2);
        pl.aim = Math.atan2(dx, dz);
        pl.pos.x += pl.vel.x * dt;
        pl.pos.z += pl.vel.y * dt;
      } else {
        pl.vel.set(0, 0);
        pl.mesh.visible = false;
        B.phase = 'lift';
        B.t = 0;
        this.heli.ascend(5, 34, false);
      }
    } else if (B.phase === 'lift' && B.t > 4.2 && !B.fired) {
      B.fired = true;
      B.done?.();
    }
    pl.update(dt);
    this.heli.update(dt, B.phase === 'lift' ? 26 : 10);
    for (const b of this.bots) {
      b.update(dt);
      b.a.update(dt);
    }
  }

  /** Reset after returning from a raid. */
  resetHeli() {
    this.boarding = null;
    this.heli.placeAt(this.heliPos.x, this.heliPos.z, Math.PI / 2);
    this.heli.land();
    this.heli.body.rotation.set(0, 0, 0);
    this.player.mesh.visible = true;
  }

  // BotBrain expects these from its "raid"
  shoot() {}
  hostileOf() {
    return false;
  }

  spawnPlayer(where) {
    this.player.crouch = false;
    this.player.rollT = 0;
    const p = where === 'heli' ? { x: 27.5, z: 22.5 } : { x: 27.5, z: 43 };
    this.player.pos.set(p.x, 0, p.z);
    this.player.aim = Math.PI;
    this.player.vel.set(0, 0);
    this.player.refreshGear();
  }

  /** Nearest interaction point in range. */
  nearest() {
    const p = this.player.pos;
    let best = null, bd = Infinity;
    for (const q of this.points) {
      const d = Math.hypot(q.x - p.x, q.z - p.z);
      if (d < q.r && d < bd) {
        bd = d;
        best = q;
      }
    }
    return best;
  }

  prompt() {
    const q = this.nearest();
    return q ? HUB_POINTS[q.id].label : '';
  }

  update(dt, ctl) {
    const pl = this.player;
    if (this.boarding) return this.updateBoarding(dt);
    if (!ctl.uiOpen) {
      const rolling = pl.stance(ctl, dt);
      if (!rolling) {
        const sprint = ctl.sprint && (ctl.moveX || ctl.moveZ);
        if (sprint) pl.crouch = false;
        const sp = sprint ? 5.6 : pl.crouch ? 1.9 : ctl.aiming ? 2.3 : 3.8;
        pl.vel.set(ctl.moveX * sp, ctl.moveZ * sp);
        if (ctl.aiming) pl.aim = ctl.aim;
        else if (Math.hypot(ctl.moveX, ctl.moveZ) > 0.15) pl.aim = Math.atan2(ctl.moveX, ctl.moveZ);
      }
      this.map.move(pl.pos, pl.vel.x, pl.vel.y, ACTOR_RADIUS, dt);
      pl.stamina = Math.min(100, pl.stamina + dt * 14);
    } else pl.vel.set(0, 0);
    // safe zone: weapon can be raised but never fired
    pl.aiming = !!ctl.aiming && pl.rollT <= 0 && !ctl.uiOpen;
    pl.update(dt);
    for (const b of this.bots) {
      b.update(dt);
      b.a.update(dt);
    }
    for (const q of this.points) {
      if (q.actor) {
        // traders turn to face the player when close
        const d = Math.hypot(pl.pos.x - q.actor.pos.x, pl.pos.z - q.actor.pos.z);
        q.actor.aim = d < 6 ? Math.atan2(pl.pos.x - q.actor.pos.x, pl.pos.z - q.actor.pos.z) : q.npc.aim;
        q.actor.update(dt);
      }
      if (q.sprite) q.sprite.material.opacity = Math.hypot(pl.pos.x - q.x, pl.pos.z - q.z) < 14 ? 1 : 0.35;
    }
    this.heli.update(dt, 3);
  }
}
