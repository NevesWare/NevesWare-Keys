import { ACTOR_RADIUS } from './actor.js';

const POI = [
  { x: 64, z: 64 }, { x: 41, z: 43 }, { x: 93, z: 43 }, { x: 43, z: 95 }, { x: 91, z: 91 },
  { x: 67, z: 33 }, { x: 33, z: 67 }, { x: 101, z: 67 }, { x: 64, z: 10 },
];

function angDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Bot finite-state machine: idle -> combat <-> search -> idle.
 * Senses: sight (cone + LOS), hearing (gunshot noise events), pain.
 */
export class BotBrain {
  constructor(actor, raid, { guard = false, patrol = false, home }) {
    this.a = actor;
    this.raid = raid;
    this.guard = guard;
    this.patrol = patrol;
    this.home = { ...home };
    this.state = 'idle';
    this.target = null;
    this.lastSeen = null;
    this.senseT = Math.random() * 0.2;
    this.reaction = 0;
    this.lostT = 0;
    this.burstT = 0;
    this.pauseT = 0;
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeT = 0;
    this.goal = null;
    this.path = null;
    this.pathT = 0;
    this.idleT = Math.random() * 3;
    const scav = actor.faction === 'scav';
    this.sight = scav ? 16 : 21;
    this.aimError = scav ? 0.15 : 0.07;
    this.reactBase = scav ? 0.85 : 0.5;
    this.lookAngle = actor.aim;
  }

  hostile(o) {
    return o !== this.a && o.alive && !o.hidden && o.faction !== this.a.faction;
  }

  sense() {
    const a = this.a;
    let best = null, bestD = Infinity;
    for (const o of this.raid.actors) {
      if (!this.hostile(o)) continue;
      const dx = o.pos.x - a.pos.x, dz = o.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > this.sight || d >= bestD) continue;
      const inCone = Math.abs(angDiff(a.aim, Math.atan2(dx, dz))) < 1.2;
      if (!inCone && d > 6 && this.state !== 'combat') continue;
      if (!this.raid.map.hasLOS(a.pos.x, a.pos.z, o.pos.x, o.pos.z)) continue;
      best = o;
      bestD = d;
    }
    if (best) {
      if (this.target !== best) this.reaction = this.reactBase + Math.random() * 0.35;
      this.target = best;
      this.lastSeen = { x: best.pos.x, z: best.pos.z };
      this.state = 'combat';
      this.lostT = 0;
    } else if (this.state === 'combat') {
      this.lostT += 0.2;
      if (this.lostT > 1.2) {
        this.state = 'search';
        this.target = null;
        this.setGoal(this.lastSeen);
      }
    }
  }

  hear(x, z, source) {
    if (this.state === 'combat' || !this.a.alive) return;
    if (source && source.faction === this.a.faction) return;
    this.state = 'search';
    this.lastSeen = { x, z };
    this.setGoal(this.guard ? null : { x, z });
    this.lookAngle = Math.atan2(x - this.a.pos.x, z - this.a.pos.z);
    this.searchT = 6;
  }

  hurt(attacker) {
    if (!attacker) return;
    this.lastSeen = { x: attacker.pos.x, z: attacker.pos.z };
    this.lookAngle = Math.atan2(attacker.pos.x - this.a.pos.x, attacker.pos.z - this.a.pos.z);
    if (this.state !== 'combat') {
      this.state = 'search';
      this.searchT = 6;
      this.setGoal(this.lastSeen);
    }
  }

  setGoal(g) {
    this.goal = g ? { x: g.x, z: g.z } : null;
    this.path = null;
    this.pathT = 0;
  }

  /** Returns desired planar velocity toward goal (path-following). */
  steer(speed, dt) {
    const a = this.a;
    if (!this.goal) return { x: 0, z: 0, arrived: true };
    const dx = this.goal.x - a.pos.x, dz = this.goal.z - a.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.6) return { x: 0, z: 0, arrived: true };
    const m = this.raid.map;
    const r = ACTOR_RADIUS + 0.05;
    const ox = (-dz / d) * r, oz = (dx / d) * r;
    const direct =
      m.hasLOS(a.pos.x + ox, a.pos.z + oz, this.goal.x + ox, this.goal.z + oz) &&
      m.hasLOS(a.pos.x - ox, a.pos.z - oz, this.goal.x - ox, this.goal.z - oz);
    let tx = this.goal.x, tz = this.goal.z;
    if (!direct) {
      this.pathT -= dt;
      if (!this.path || this.pathT <= 0) {
        this.path = m.findPath(a.pos.x, a.pos.z, this.goal.x, this.goal.z) ?? [];
        this.pathT = 1.0;
      }
      while (this.path.length && Math.hypot(this.path[0].x - a.pos.x, this.path[0].z - a.pos.z) < 0.7) this.path.shift();
      if (this.path.length) {
        tx = this.path[0].x;
        tz = this.path[0].z;
      } else return { x: 0, z: 0, arrived: false, stuck: true };
    }
    const ddx = tx - a.pos.x, ddz = tz - a.pos.z;
    const dd = Math.hypot(ddx, ddz) || 1;
    return { x: (ddx / dd) * speed, z: (ddz / dd) * speed, arrived: false };
  }

  turnToward(angle, rate, dt) {
    const d = angDiff(this.a.aim, angle);
    const s = Math.sign(d) * Math.min(Math.abs(d), rate * dt);
    this.a.aim += s;
    return Math.abs(d - s);
  }

  randomFreeNear(x, z, r) {
    for (let i = 0; i < 8; i++) {
      const px = x + (Math.random() * 2 - 1) * r, pz = z + (Math.random() * 2 - 1) * r;
      if (!this.raid.map.isSolid(Math.floor(px), Math.floor(pz))) return { x: px, z: pz };
    }
    return { x, z };
  }

  update(dt) {
    const a = this.a;
    if (!a.alive) return;

    this.senseT -= dt;
    if (this.senseT <= 0) {
      this.senseT = 0.2;
      this.sense();
    }

    let v = { x: 0, z: 0 };

    if (this.state === 'combat' && this.target) {
      const t = this.target;
      if (!t.alive) {
        this.target = null;
        this.state = 'idle';
        this.setGoal(null);
      } else {
        const dx = t.pos.x - a.pos.x, dz = t.pos.z - a.pos.z;
        const d = Math.hypot(dx, dz);
        const want = Math.atan2(dx, dz);
        const err = this.turnToward(want, 7, dt);

        // positioning: close in / back off / strafe
        const range = a.weaponDef?.range ?? 20;
        const ideal = Math.min(range * 0.55, 12);
        this.strafeT -= dt;
        if (this.strafeT <= 0) {
          this.strafeT = 0.8 + Math.random() * 1.4;
          this.strafeDir *= -1;
        }
        const nx = dx / d, nz = dz / d;
        let fwd = d > ideal + 3 ? 1 : d < ideal - 3 ? -0.8 : 0;
        if (this.guard && fwd > 0) fwd = 0.2;
        const sp = 2.6;
        v = { x: (nx * fwd + -nz * this.strafeDir * 0.7) * sp, z: (nz * fwd + nx * this.strafeDir * 0.7) * sp };

        // shooting
        this.reaction -= dt;
        if (a.loadout.weapon && a.loadout.weapon.mag <= 0) a.startReload();
        else if (this.reaction <= 0 && err < 0.15 && d < range) {
          const w = a.weaponDef;
          if (w.auto) {
            if (this.pauseT > 0) this.pauseT -= dt;
            else {
              this.burstT += dt;
              this.raid.shoot(a, a.aim + (Math.random() * 2 - 1) * this.aimError);
              if (this.burstT > 0.35 + Math.random() * 0.4) {
                this.burstT = 0;
                this.pauseT = 0.35 + Math.random() * 0.5;
              }
            }
          } else if (a.cooldown <= 0) {
            if (Math.random() < 0.15) this.raid.shoot(a, a.aim + (Math.random() * 2 - 1) * this.aimError);
          }
        }
      }
    } else if (this.state === 'search') {
      this.searchT = (this.searchT ?? 6) - dt;
      const s = this.steer(3.4, dt);
      v = s;
      if (s.x || s.z) this.turnToward(Math.atan2(s.x, s.z), 5, dt);
      else this.turnToward(this.lookAngle + Math.sin(performance.now() / 600) * 0.8, 3, dt);
      if ((s.arrived || s.stuck) && this.searchT <= 0) {
        this.state = 'idle';
        this.setGoal(this.guard ? this.home : null);
      }
    } else {
      // idle behaviors
      if (a.loadout.weapon && a.loadout.weapon.mag < (a.weaponDef?.mag ?? 0) * 0.5) a.startReload();
      if (a.health < 60) a.startHeal();
      this.idleT -= dt;
      if (this.idleT <= 0) {
        if (this.patrol) {
          this.setGoal(POI[Math.floor(Math.random() * POI.length)]);
          this.idleT = 25 + Math.random() * 20;
        } else if (this.guard) {
          this.setGoal(this.randomFreeNear(this.home.x, this.home.z, 2));
          this.lookAngle = Math.random() * Math.PI * 2;
          this.idleT = 3 + Math.random() * 4;
        } else {
          this.setGoal(this.randomFreeNear(this.home.x, this.home.z, 9));
          this.idleT = 4 + Math.random() * 6;
        }
      }
      const s = this.steer(this.patrol ? 2.4 : 1.6, dt);
      v = s;
      if (s.x || s.z) this.turnToward(Math.atan2(s.x, s.z), 4, dt);
      else this.turnToward(this.lookAngle, 2, dt);
      if (s.arrived && this.patrol) this.idleT = Math.min(this.idleT, 2);
    }

    if (a.reloadT > 0 || a.healT > 0) {
      v.x *= 0.6;
      v.z *= 0.6;
    }
    a.vel.set(v.x, v.z);
    this.raid.map.move(a.pos, v.x, v.z, ACTOR_RADIUS, dt);
  }
}
