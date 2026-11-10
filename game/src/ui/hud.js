import { ITEMS } from '../data/items.js';
import { factionById } from '../data/factions.js';

const $ = (id) => document.getElementById(id);

function fmtTime(s) {
  s = Math.max(0, Math.ceil(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** In-raid HUD (DOM overlay). */
export class Hud {
  constructor() {
    this.root = $('hud');
    this.toastT = 0;
    this.mmBase = null;
    this.mmFrame = 0;
  }

  show(on) {
    this.root.classList.toggle('hidden', !on);
  }

  setupMinimap(map, faction) {
    const c = document.createElement('canvas');
    c.width = map.W;
    c.height = map.H;
    const g = c.getContext('2d');
    g.fillStyle = '#4f7a3a';
    g.fillRect(0, 0, map.W, map.H);
    for (let z = 0; z < map.H; z++)
      for (let x = 0; x < map.W; x++) {
        const gm = map.vox.get(x, -1, z);
        if (gm === 'road' || gm === 'dirt') g.fillStyle = '#a8703f';
        else if (gm === 'concrete' || gm === 'helipad' || gm === 'helipadMark' || gm === 'plank') g.fillStyle = '#5d4a87';
        else continue;
        g.fillRect(x, z, 1, 1);
      }
    for (let z = 0; z < map.H; z++)
      for (let x = 0; x < map.W; x++)
        if (map.isSolid(x, z)) {
          g.fillStyle = map.vox.get(x, 0, z) === 'wood' ? '#2a1d3d' : '#140c1c';
          g.fillRect(x, z, 1, 1);
        }
    for (const e of map.extracts) {
      if (e.faction && e.faction !== faction) continue;
      g.fillStyle = '#ffd66b';
      g.fillRect(e.x - 2, e.z - 2, 4, 4);
    }
    for (const [fid, o] of Object.entries(map.outposts)) {
      g.fillStyle = factionById(fid).color;
      g.fillRect(o.x - 1, o.z - 1, 3, 3);
    }
    this.mmBase = c;
    this.mm = $('minimap');
    this.mm.width = map.W;
    this.mm.height = map.H;
  }

  drawMinimap(raid, yaw) {
    if (!this.mmBase || ++this.mmFrame % 6) return;
    const g = this.mm.getContext('2d');
    g.drawImage(this.mmBase, 0, 0);
    const p = raid.player.pos;
    g.fillStyle = '#f4e9d8';
    g.fillRect(p.x - 1.5, p.z - 1.5, 3, 3);
    g.strokeStyle = '#f4e9d8';
    g.beginPath();
    g.moveTo(p.x, p.z);
    g.lineTo(p.x + Math.sin(raid.player.aim) * 6, p.z + Math.cos(raid.player.aim) * 6);
    g.stroke();
    // rotate so the camera's forward points up
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rot = -Math.PI / 2 - Math.atan2(fz, fx);
    const s = 150 / 128;
    this.mm.style.transform = `rotate(${rot}rad) scale(${s * 2.2}) translate(${64 - p.x}px, ${64 - p.z}px)`;
  }

  update(raid) {
    const pl = raid.player;
    $('hud-time').textContent = fmtTime(raid.time);
    $('hud-hp-fill').style.width = `${pl.health}%`;
    $('hud-hp-fill').classList.toggle('low', pl.health < 35);
    $('hud-hp-txt').textContent = Math.ceil(pl.health);
    const ar = pl.loadout.armor;
    $('hud-armor').textContent = ar ? `${ITEMS[ar.id].short} ${Math.round(ar.dur)}` : 'SEM COLETE';
    const w = pl.loadout.weapon;
    if (w) {
      $('hud-weapon').textContent = ITEMS[w.id].name;
      $('hud-ammo').textContent = `${w.mag} / ${pl.ammoReserve()}`;
    } else {
      $('hud-weapon').textContent = 'Desarmado';
      $('hud-ammo').textContent = '—';
    }
    let status = '';
    if (pl.reloadT > 0) status = 'RECARREGANDO…';
    else if (pl.healT > 0) status = 'CURANDO…';
    $('hud-status').textContent = status;
    $('hud-prompt').textContent = raid.prompt();

    const ex = raid.state === 'extracting';
    $('hud-extract').classList.toggle('hidden', !ex);
    if (ex) $('hud-extract-fill').style.width = `${(1 - raid.extractT / 10) * 100}%`;

    if (this.toastT > 0) {
      this.toastT -= 1 / 60;
      if (this.toastT <= 0) $('hud-toast').classList.add('hidden');
    }
  }

  toast(msg, secs = 3) {
    const t = $('hud-toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    this.toastT = secs;
  }

  killfeed(killer, victim) {
    const f = $('hud-feed');
    const row = document.createElement('div');
    const kc = factionById(killer?.faction)?.color ?? '#a8703f';
    const vc = factionById(victim.faction)?.color ?? '#a8703f';
    row.innerHTML = `<span style="color:${kc}">${killer?.name ?? '?'}</span> ✕ <span style="color:${vc}">${victim.name}</span>`;
    f.prepend(row);
    while (f.children.length > 5) f.lastChild.remove();
    setTimeout(() => row.remove(), 7000);
  }

  damageFlash() {
    const d = $('hud-dmg');
    d.classList.remove('flash');
    void d.offsetWidth;
    d.classList.add('flash');
  }
}
