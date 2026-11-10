import { ITEMS } from '../data/items.js';
import { factionById } from '../data/factions.js';
import { renderHotbar } from './invScreen.js';

const $ = (id) => document.getElementById(id);

function fmtTime(s) {
  s = Math.max(0, Math.ceil(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const GROUND_RGB = {
  road: [138, 110, 74], dirt: [122, 94, 64], concrete: [142, 138, 134], helipad: [68, 72, 76], helipadMark: [232, 226, 208], plank: [138, 96, 56],
  grassDark: [75, 114, 50], grassLight: [122, 160, 76], grass: [95, 138, 60],
};

/** Top-down image of a map (1px per cell), built with ImageData (fast for 1024²). */
export function mapImage(map, faction) {
  const c = document.createElement('canvas');
  c.width = map.W;
  c.height = map.H;
  const g = c.getContext('2d');
  const img = g.createImageData(map.W, map.H);
  const d = img.data;
  for (let z = 0; z < map.H; z++)
    for (let x = 0; x < map.W; x++) {
      const i = (z * map.W + x) * 4;
      let rgb = GROUND_RGB[map.groundAt(x, z)] ?? GROUND_RGB.grass;
      if (map.isSolid(x, z)) {
        const b = map.vox.get(x, 0, z);
        rgb = b === 'trunk' ? [36, 66, 32] : b === 'rock' ? [106, 104, 112] : b?.startsWith('crate') ? [192, 138, 74] : [42, 38, 34];
      }
      d[i] = rgb[0];
      d[i + 1] = rgb[1];
      d[i + 2] = rgb[2];
      d[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const big = map.W > 300;
  for (const e of map.extracts) {
    if (e.faction && e.faction !== faction) continue;
    g.strokeStyle = '#ffd66b';
    g.lineWidth = big ? 2 : 1;
    g.strokeRect(e.x - e.r, e.z - e.r, e.r * 2, e.r * 2);
  }
  for (const [fid, o] of Object.entries(map.outposts)) {
    g.fillStyle = factionById(fid).color;
    const s = big ? 10 : 3;
    g.fillRect(o.x - s / 2, o.z - s / 2, s, s);
  }
  return c;
}

/**
 * Labelled world map: rival main bases, common bases (landing zones), places,
 * optional player marker and selected landing zone.
 */
export function worldMapCanvas(map, faction, { player = null, selected = null, base = null } = {}) {
  const img = base ?? mapImage(map, faction);
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.fillStyle = 'rgba(10,12,14,0.18)';
  g.fillRect(0, 0, c.width, c.height);
  const k = c.width / 1024;
  const label = (txt, x, y, color = '#f4efe6', size = 26) => {
    g.font = `700 ${size * k}px "Barlow Condensed", Inter, sans-serif`;
    g.textAlign = 'center';
    g.lineWidth = 5 * k;
    g.strokeStyle = 'rgba(8,10,12,0.85)';
    g.strokeText(txt, x, y);
    g.fillStyle = color;
    g.fillText(txt, x, y);
  };
  for (const p of map.pois ?? []) label(p.name.toUpperCase(), p.x, p.z - 14 * k, '#e8e2d4', 22);
  for (const l of map.lzs ?? []) {
    const sel = selected && selected.id === l.id;
    g.beginPath();
    g.arc(l.x, l.z, (sel ? 15 : 10) * k, 0, Math.PI * 2);
    g.fillStyle = sel ? '#ffd66b' : 'rgba(255,214,107,0.35)';
    g.fill();
    g.lineWidth = 3 * k;
    g.strokeStyle = '#ffd66b';
    g.stroke();
    g.fillStyle = '#141414';
    g.font = `800 ${14 * k}px Inter, sans-serif`;
    g.textAlign = 'center';
    g.fillText('H', l.x, l.z + 5 * k);
  }
  for (const [fid, o] of Object.entries(map.outposts)) {
    const f = factionById(fid);
    const own = fid === faction;
    g.save();
    g.translate(o.x, o.z);
    g.rotate(Math.PI / 4);
    g.fillStyle = f.color;
    g.strokeStyle = own ? '#ffffff' : '#140c1c';
    g.lineWidth = 4 * k;
    g.fillRect(-14 * k, -14 * k, 28 * k, 28 * k);
    g.strokeRect(-14 * k, -14 * k, 28 * k, 28 * k);
    g.restore();
    label(own ? `${f.name.toUpperCase()} (SUA BASE)` : `${f.name.toUpperCase()} · BASE RIVAL`, o.x, o.z + 42 * k, f.color, 26);
  }
  if (player) {
    g.fillStyle = '#f4e9d8';
    g.strokeStyle = '#140c1c';
    g.lineWidth = 3 * k;
    g.beginPath();
    g.arc(player.x, player.z, 9 * k, 0, Math.PI * 2);
    g.fill();
    g.stroke();
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

  setupMinimap(map, faction, base = null) {
    this.base = base ?? mapImage(map, faction);
    this.mm = $('minimap');
    this.mm.width = 128;
    this.mm.height = 128;
    this.hbSig = '';
  }

  /** Large map for the inventory "Mapa" tab. */
  bigMap(raid) {
    if (!this.base) return null;
    return worldMapCanvas(raid.map, raid.profile.faction, { player: raid.player.pos, base: this.base });
  }

  drawMinimap(raid, yaw) {
    if (!this.base || ++this.frame % 6) return;
    const g = this.mm.getContext('2d');
    const p = raid.player.pos;
    const S = this.mm.width, h = S / 2;
    g.fillStyle = '#2e3a26';
    g.fillRect(0, 0, S, S);
    g.drawImage(this.base, p.x - h, p.z - h, S, S, 0, 0, S, S);
    g.fillStyle = '#f4e9d8';
    g.fillRect(h - 1.5, h - 1.5, 3, 3);
    g.strokeStyle = '#f4e9d8';
    g.beginPath();
    g.moveTo(h, h);
    g.lineTo(h + Math.sin(raid.player.aim) * 7, h + Math.cos(raid.player.aim) * 7);
    g.stroke();
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rot = -Math.PI / 2 - Math.atan2(fz, fx);
    const wrap = this.mm.parentElement.clientWidth || 150;
    this.mm.style.transform = `rotate(${rot}rad) scale(${(wrap / S) * 1.5})`;
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
