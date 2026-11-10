import { ITEMS } from '../data/items.js';
import { factionById } from '../data/factions.js';
import { renderHotbar } from './invScreen.js';

const $ = (id) => document.getElementById(id);

function fmtTime(s) {
  s = Math.max(0, Math.ceil(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Top-down image of a raid map (1px per cell). */
export function mapImage(map, faction) {
  const c = document.createElement('canvas');
  c.width = map.W;
  c.height = map.H;
  const g = c.getContext('2d');
  const col = {
    road: '#8a6e4a', dirt: '#7a5e40', concrete: '#8e8a86', helipad: '#44484c', helipadMark: '#e8e2d0', plank: '#8a6038',
    grassDark: '#4b7232', grassLight: '#7aa04c', grass: '#5f8a3c',
  };
  for (let z = 0; z < map.H; z++)
    for (let x = 0; x < map.W; x++) {
      const gm = map.vox.get(x, -1, z);
      g.fillStyle = col[gm] ?? col.grass;
      g.fillRect(x, z, 1, 1);
      if (map.isSolid(x, z)) {
        const b = map.vox.get(x, 0, z);
        g.fillStyle = b === 'trunk' ? '#2c4a26' : b === 'rock' ? '#6a6870' : b?.startsWith('crate') ? '#c08a4a' : '#2a2622';
        g.fillRect(x, z, 1, 1);
      }
    }
  for (const e of map.extracts) {
    if (e.faction && e.faction !== faction) continue;
    g.strokeStyle = '#ffd66b';
    g.lineWidth = 1;
    g.strokeRect(e.x - e.r, e.z - e.r, e.r * 2, e.r * 2);
  }
  for (const [fid, o] of Object.entries(map.outposts)) {
    g.fillStyle = factionById(fid).color;
    g.fillRect(o.x - 1.5, o.z - 1.5, 3, 3);
  }
  return c;
}

/** In-raid HUD (DOM overlay). */
export class Hud {
  constructor() {
    this.root = $('hud');
    this.toastT = 0;
    this.base = null;
    this.frame = 0;
    this.hbSig = '';
    this.fps = { t: performance.now(), n: 0, v: 0 };
  }

  show(on) {
    this.root.classList.toggle('hidden', !on);
  }

  setupMinimap(map, faction) {
    this.base = mapImage(map, faction);
    this.mm = $('minimap');
    this.mm.width = map.W;
    this.mm.height = map.H;
    this.hbSig = '';
  }

  /** Large map for the inventory "Mapa" tab. */
  bigMap(raid) {
    if (!this.base) return null;
    const c = document.createElement('canvas');
    c.width = this.base.width * 3;
    c.height = this.base.height * 3;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(this.base, 0, 0, c.width, c.height);
    if (raid) {
      const p = raid.player.pos;
      g.fillStyle = '#f4e9d8';
      g.strokeStyle = '#140c1c';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(p.x * 3, p.z * 3, 6, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    return c;
  }

  drawMinimap(raid, yaw) {
    if (!this.base || ++this.frame % 6) return;
    const g = this.mm.getContext('2d');
    g.drawImage(this.base, 0, 0);
    const p = raid.player.pos;
    g.fillStyle = '#f4e9d8';
    g.fillRect(p.x - 1.5, p.z - 1.5, 3, 3);
    g.strokeStyle = '#f4e9d8';
    g.beginPath();
    g.moveTo(p.x, p.z);
    g.lineTo(p.x + Math.sin(raid.player.aim) * 6, p.z + Math.cos(raid.player.aim) * 6);
    g.stroke();
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rot = -Math.PI / 2 - Math.atan2(fz, fx);
    const wrap = this.mm.parentElement.clientWidth || 150;
    this.mm.style.transform = `rotate(${rot}rad) scale(${(wrap / 128) * 2.2}) translate(${64 - p.x}px, ${64 - p.z}px)`;
  }

  update(raid, onHotbar, showFps) {
    const pl = raid.player;
    $('hud-time').textContent = fmtTime(raid.time);
    const hp = $('hud-hp-fill');
    hp.style.width = `${(pl.health / pl.maxHealth) * 100}%`;
    hp.classList.toggle('low', pl.health < 35);
    $('hud-hp-txt').textContent = Math.ceil(pl.health);
    const ar = pl.loadout.armor;
    $('hud-ar-fill').style.width = ar ? `${(ar.dur / ITEMS[ar.id].armor.durability) * 100}%` : '0%';
    $('hud-armor').textContent = ar ? Math.round(ar.dur) : '';
    $('hud-st-fill').style.width = `${pl.stamina}%`;
    const wt = $('hud-water'), en = $('hud-energy');
    wt.textContent = `💧 ${Math.round(pl.water)}`;
    en.textContent = `⚡ ${Math.round(pl.energy)}`;
    wt.classList.toggle('low', pl.water < 25);
    en.classList.toggle('low', pl.energy < 25);
    $('hud-bleed').classList.toggle('hidden', !pl.bleeding);
    const w = pl.weapon;
    $('hud-weapon').textContent = w ? ITEMS[w.id].name.toUpperCase() : 'DESARMADO';
    $('hud-ammo').innerHTML = w ? `${w.mag}<small> / ${pl.ammoReserve()}</small>` : '—';
    let status = '';
    if (pl.reloadT > 0) status = 'RECARREGANDO…';
    else if (pl.healT > 0) status = 'CURANDO…';
    $('hud-status').textContent = status;
    $('hud-prompt').textContent = raid.prompt();
    $('hud-sub').textContent = raid.state === 'extracting' ? `EXTRAÇÃO ${Math.ceil(raid.extractT)}s` : '';

    const ex = raid.state === 'extracting';
    $('hud-extract').classList.toggle('hidden', !ex);
    if (ex) $('hud-extract-fill').style.width = `${(1 - raid.extractT / 10) * 100}%`;

    // hotbar: rebuild only when contents change
    const lo = pl.loadout;
    const sig = [lo.active, lo.primary?.uid, lo.secondary?.uid, ...[0, 1, 2, 3].map((x) => { const e = lo.pockets.at(x, 0); return e ? `${e.item.uid}:${e.item.count}` : ''; })].join('|');
    if (sig !== this.hbSig) {
      this.hbSig = sig;
      renderHotbar($('hud-hotbar'), pl, onHotbar);
    }

    if (this.toastT > 0) {
      this.toastT -= 1 / 60;
      if (this.toastT <= 0) $('hud-toast').classList.add('hidden');
    }

    const f = this.fps;
    f.n++;
    const now = performance.now();
    if (now - f.t > 500) {
      f.v = Math.round((f.n * 1000) / (now - f.t));
      f.t = now;
      f.n = 0;
    }
    $('hud-fps').textContent = showFps ? `${f.v} FPS` : '';
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
    while (f.children.length > 3) f.lastChild.remove();
    setTimeout(() => row.remove(), 7000);
  }

  damageFlash() {
    const d = $('hud-dmg');
    d.classList.remove('flash');
    void d.offsetWidth;
    d.classList.add('flash');
  }
}
