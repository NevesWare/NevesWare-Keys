import './style.css';
import * as THREE from 'three';
import { IsoCamera } from './camera/isoCamera.js';
import { Input } from './input.js';
import { InventoryUI } from './ui/inventoryUI.js';
import { InventoryScreen, loadSettings } from './ui/invScreen.js';
import { Hud, mapImage } from './ui/hud.js';
import { TouchControls } from './ui/touch.js';
import { ui3d } from './ui/icons.js';
import { showScreen, hideScreens, factionSelect, resultScreen } from './ui/screens.js';
import { load, save, newProfile, wipe } from './save.js';
import { Raid } from './raid/raid.js';
import { RaidMap } from './raid/map.js';
import { MUZZLE_HEIGHT, Actor } from './raid/actor.js';
import { Helicopter } from './raid/helicopter.js';
import { VoxelLevel } from './world/voxelLevel.js';
import { buildWorld, addLighting } from './world/worldRender.js';
import { ITEMS, newItem } from './data/items.js';
import { factionById } from './data/factions.js';
import { newLoadout, loadoutValue, carriedItems, clearLoadout } from './inventory/loadout.js';
import { botLoadout } from './raid/loot.js';
import { unlockAudio } from './audio.js';

const $ = (id) => document.getElementById(id);
const STEP = 1 / 60;
const params = new URLSearchParams(location.search);

// ---------- core ----------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.75 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const cam = new IsoCamera({ viewHeight: 14, distance: 70 });
const input = new Input(canvas);
const touch = new TouchControls(input);
input.touch = touch;
const inv = new InventoryUI();
const hud = new Hud();
let settings = loadSettings();

let profile = load();
let mode = 'title'; // title | faction | lobby | raid | ending | result | showcase
let raid = null;
let base = null; // lobby backdrop world
let lobbyMap = null;

const screen = new InventoryScreen(inv, {
  onClose: () => closeRaidInv(),
  onDeploy: () => startRaid(),
  onReset: () => {
    wipe();
    profile = null;
    screen.close();
    goFaction();
  },
  onChange: () => {
    if (profile) save(profile);
    refreshBaseHero();
  },
  onHotbar: (i) => useHotbar(i),
  onSettings: (s) => (settings = s),
  toast: (m) => toast(m),
  getMapCanvas: () => {
    if (raid) return hud.bigMap(raid);
    lobbyMap = lobbyMap ?? new RaidMap(1337);
    const img = mapImage(lobbyMap, profile.faction);
    const c = document.createElement('canvas');
    c.width = img.width * 3;
    c.height = img.height * 3;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0, c.width, c.height);
    return c;
  },
});

function toast(m) {
  const t = $('toast');
  t.textContent = m;
  t.classList.remove('hidden');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.add('hidden'), 2600);
}

const quality = () => ({
  shadows: settings.shadows === 'off' ? 0 : settings.shadows === 'baixa' || isTouch ? 1024 : 2048,
  grass: settings.grass ? (isTouch ? 0.45 : 0.7) : 0,
});

function viewHeight() {
  const portraitish = window.innerHeight > window.innerWidth;
  const base = isTouch ? 12.5 : 16;
  return portraitish ? base * 1.4 : base;
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  cam.setViewport(window.innerWidth / window.innerHeight, window.innerHeight);
}
window.addEventListener('resize', resize);

// ---------- base / lobby backdrop ----------
function buildBase(factionId) {
  const f = factionById(factionId) ?? factionById('ferro');
  const scene = new THREE.Scene();
  const L = new VoxelLevel();
  const props = [];
  const S = 16;
  for (let x = -S; x < S; x++)
    for (let z = -S; z < S; z++) {
      const edge = Math.max(Math.abs(x + 0.5), Math.abs(z + 0.5));
      const pad = Math.abs(x + 0.5) <= 3 && Math.abs(z + 0.5) <= 3;
      L.set(x, -1, z, edge > 11 ? 'grassDark' : pad ? 'helipad' : 'concrete');
      if (Math.floor(edge) === 11 && Math.abs(x + 0.5) > 2 && Math.abs(z + 0.5) > 2) {
        L.set(x, 0, z, `wall_${f.id}`);
        L.set(x, 1, z, `wall_${f.id}`);
      }
    }
  for (let i = -2; i <= 1; i++) for (const z of [-1, 0]) L.set(i, -1, z, 'helipadMark');
  for (const [x, z, t] of [[-8, -8, 'military'], [-7, -8, 'common'], [-8, -7, 'common'], [7, 6, 'military'], [6, 8, 'rare']]) props.push({ kind: 'crate', v: t, x: x + 0.5, z: z + 0.5, rot: 0 });
  for (let i = -3; i <= 3; i++) props.push({ kind: 'sandbag', v: 0, x: i + 0.5, z: 7.5, rot: 0 });
  props.push({ kind: 'car', v: 0, x: -7, z: 5, rot: 0.3 });
  for (const [x, z, v] of [[-14, 4, 0], [13, -13, 1], [14, 9, 0], [-13, -14, 1], [-14, 12, 1], [12, 14, 0]]) props.push({ kind: 'tree', v, x, z, rot: x, s: 1 });
  scene.add(buildWorld(L, props, { x0: -S, z0: -S, W: S * 2, H: S * 2 }, { grass: quality().grass }));
  const light = addLighting(scene, { shadowSize: quality().shadows, extent: 18 });
  light.follow(new THREE.Vector3(0, 0, 0));
  const heli = new Helicopter(f.color);
  heli.placeAt(0, 0, 0.5);
  heli.land();
  scene.add(heli.mesh);
  const mk = (fac, x, z, aim, lo, seed) => {
    const a = new Actor({ name: 'npc', faction: fac, loadout: lo, seed });
    a.pos.set(x, 0, z);
    a.aim = aim;
    a.syncMesh(0);
    scene.add(a.mesh);
    return a;
  };
  const guard = (x, z, aim, s) => mk(factionId, x, z, aim, botLoadout(factionId).loadout, s);
  const hero = mk(factionId, 4.2, 4.2, 2.4, profile?.loadout ?? newLoadout(), 3);
  guard(-6.5, 1.5, 1.4, 1);
  guard(7.5, -3, -1.9, 2);
  guard(5.5, 5.3, -2.2, 4);
  return { scene, heli, hero, light };
}

function refreshBaseHero() {
  if (base && profile) {
    base.hero.loadout = profile.loadout;
    base.hero.refreshGear();
    base.hero.syncMesh(0);
  }
}

// ---------- flow ----------
function goTitle() {
  mode = 'title';
  base = buildBase(profile?.faction ?? 'ferro');
  cam.viewHeight = viewHeight();
  resize();
  cam.snapTo(new THREE.Vector3(0, 0, 0));
  showScreen('screen-title');
  $('title-start').onclick = () => {
    unlockAudio();
    if (isTouch) document.documentElement.requestFullscreen?.().catch(() => {});
    if (profile) goLobby();
    else goFaction();
  };
}

function goFaction() {
  mode = 'faction';
  factionSelect((fid) => {
    profile = newProfile(fid);
    save(profile);
    base = buildBase(fid);
    goLobby('Bem-vindo à base. Prepare o equipamento e chame o helicóptero.');
  });
}

function goLobby(msg) {
  mode = 'lobby';
  hideScreens();
  hud.show(false);
  touch.show(false);
  if (!base) base = buildBase(profile.faction);
  refreshBaseHero();
  cam.viewHeight = viewHeight();
  resize();
  cam.snapTo(new THREE.Vector3(0, 0, 0));
  screen.open({ context: 'lobby', profile });
  if (msg) toast(msg);
}

function startRaid() {
  unlockAudio();
  screen.close();
  mode = 'raid';
  raid = new Raid({
    profile,
    quality: quality(),
    callbacks: {
      onToast: (m) => hud.toast(m),
      onKill: (k, v) => hud.killfeed(k, v),
      onPlayerHit: () => hud.damageFlash(),
      onOpenLoot: (c) => openRaidInv(c),
      onEnd: (res) => {
        mode = 'ending';
        closeRaidInv();
        touch.show(false);
        setTimeout(() => endRaid(res), res.result === 'extracted' ? 400 : 1600);
      },
    },
  });
  hud.setupMinimap(raid.map, profile.faction);
  hud.show(true);
  touch.show(touch.enabled);
  cam.viewHeight = viewHeight();
  resize();
  cam.yaw = cam.targetYaw = Math.PI / 4;
  cam.snapTo(raid.player.pos.clone());
  input.clear();
}

function endRaid(res) {
  hud.show(false);
  const lo = profile.loadout;
  const s = profile.stats;
  s.raids++;
  s.kills += raid.stats.kills;
  let value = 0, items = 0;
  if (res.result === 'extracted') {
    s.extracts++;
    items = carriedItems(lo).length;
    value = loadoutValue(lo);
  } else {
    s.deaths++;
    clearLoadout(lo);
  }
  let note = '';
  const hasWeapon = lo.primary || lo.secondary || profile.stash.items().some((i) => ITEMS[i.id].cat === 'weapon');
  if (!hasWeapon && profile.money < ITEMS.p9.value * 1.6) {
    profile.stash.add(newItem('p9'));
    profile.stash.add(newItem('a9', 36));
    note = 'O quartel-mestre te deu uma P-9 e munição de emergência.';
  }
  save(profile);
  const kills = raid.stats.kills;
  raid.dispose();
  raid = null;
  mode = 'result';
  resultScreen({ ...res, kills, value, items }, () => goLobby(note));
}

// ---------- raid inventory ----------
function openRaidInv(container = null) {
  if (!raid) return;
  raid.invOpen = true;
  touch.show(false);
  screen.open({ context: 'raid', profile, actor: raid.player, container, raid });
}

function closeRaidInv() {
  if (raid) raid.invOpen = false;
  if (screen.isOpen) screen.close();
  raid?.player.refreshGear();
  if (mode === 'raid') touch.show(touch.enabled);
  input.clear();
}

function useHotbar(i) {
  if (!raid) return;
  const pl = raid.player;
  if (i === 0) pl.switchWeapon('primary');
  else if (i === 1) pl.switchWeapon('secondary');
  else {
    const it = pl.loadout.pockets.at(i - 2, 0)?.item;
    if (it && ITEMS[it.id].cat === 'med') {
      if (!pl.startHeal(it)) hud.toast('Vida cheia ou ocupado.');
    } else if (it) hud.toast(`${ITEMS[it.id].name} não pode ser usado.`);
  }
}

// ---------- update ----------
const raycaster = new THREE.Raycaster();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -MUZZLE_HEIGHT);
const aimPoint = new THREE.Vector3();
const ndc = new THREE.Vector2();

/** Light aim assist for sticks: snap toward the closest visible hostile inside a narrow cone. */
function assist(pl, aim) {
  let best = null, bestErr = 0.3;
  for (const o of raid.actors) {
    if (o === pl || !o.alive || o.faction === pl.faction) continue;
    const dx = o.pos.x - pl.pos.x, dz = o.pos.z - pl.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > 24) continue;
    let e = Math.atan2(dx, dz) - aim;
    e = Math.atan2(Math.sin(e), Math.cos(e));
    if (Math.abs(e) < bestErr && raid.map.hasLOS(pl.pos.x, pl.pos.z, o.pos.x, o.pos.z)) {
      bestErr = Math.abs(e);
      best = aim + e;
    }
  }
  return best ?? aim;
}

function raidStep(dt) {
  input.poll();
  const invOpen = screen.isOpen;
  if (invOpen) {
    if (input.pressed('inventory') || input.pressed('escape')) closeRaidInv();
  } else if (input.pressed('inventory')) openRaidInv(null);
  if (input.pressed('rotL')) cam.rotate(-1);
  if (input.pressed('rotR')) cam.rotate(1);
  for (let i = 1; i <= 6; i++) if (input.pressed(`hb${i}`)) useHotbar(i - 1);
  if (input.pressed('swap')) raid.player.switchWeapon();

  const pl = raid.player;
  const m = input.move();
  const ax = cam.groundAxes();
  const moveX = ax.right.x * m.x + ax.forward.x * m.y;
  const moveZ = ax.right.y * m.x + ax.forward.y * m.y;

  let aim = pl.aim;
  const stick = input.stickAim();
  if (stick) {
    const wx = ax.right.x * stick.x + ax.forward.x * stick.y;
    const wz = ax.right.y * stick.x + ax.forward.y * stick.y;
    aim = assist(pl, Math.atan2(wx, wz));
  } else if (touch.enabled) {
    if (Math.hypot(moveX, moveZ) > 0.2) aim = Math.atan2(moveX, moveZ);
  } else {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((input.mouse.x - rect.left) / rect.width) * 2 - 1, -((input.mouse.y - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, cam.camera);
    if (raycaster.ray.intersectPlane(aimPlane, aimPoint) && input.mouse.inside) aim = Math.atan2(aimPoint.x - pl.pos.x, aimPoint.z - pl.pos.z);
  }

  raid.update(dt, {
    moveX, moveZ, aim,
    sprint: input.isHeld('sprint'),
    fire: input.isHeld('fire') && !invOpen,
    firePressed: input.pressed('fire') && !invOpen,
    reload: input.pressed('reload'),
    heal: input.pressed('heal'),
    interact: !invOpen && input.pressed('interact'),
    uiOpen: invOpen,
  });
  if (!raid) return;

  const focus = pl.pos.clone();
  const lookDist = touch.enabled ? 2.2 : 3.5;
  focus.x += Math.sin(pl.aim) * lookDist * 0.5;
  focus.z += Math.cos(pl.aim) * lookDist * 0.5;
  focus.y = 0;
  cam.update(dt, focus);
  raid.lighting.follow(focus);
  hud.update(raid, (i) => useHotbar(i), settings.fps);
  hud.drawMinimap(raid, cam.yaw);
  if (touch.enabled) {
    const p = raid.prompt();
    touch.setInteract(p ? (p.includes('extração') ? 'EXTRAIR' : p.includes('Saquear') ? 'SAQUEAR' : '') : '');
  }
  if (screen.isOpen && ++raidStep.n % 30 === 0) {
    const t = document.getElementById('iv-time');
    if (t) t.textContent = `${Math.floor(raid.time / 60)}:${String(Math.ceil(raid.time % 60) % 60).padStart(2, '0')}`;
  }
}
raidStep.n = 0;

function menuStep(dt) {
  if (!base) return;
  cam.targetYaw += dt * 0.06;
  cam.update(dt, new THREE.Vector3(1.5, 0, 1.5));
  base.heli.update(dt, 4);
}

function step(dt) {
  if (mode === 'raid') raidStep(dt);
  else if (mode === 'ending') {
    raid?.update(dt, { moveX: 0, moveZ: 0, aim: raid.player.aim, uiOpen: true });
  } else if (mode !== 'showcase') menuStep(dt);
}

function render() {
  const scene = (mode === 'raid' || mode === 'ending') && raid ? raid.scene : showcase?.scene ?? base?.scene;
  if (scene) renderer.render(scene, cam.camera);
}

let last = performance.now();
let acc = 0;
function frame(now) {
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  while (acc >= STEP) {
    step(STEP);
    acc -= STEP;
  }
  render();
  requestAnimationFrame(frame);
}

// ---------- showcase (key art) ----------
let showcase = null;
function buildShowcase() {
  mode = 'showcase';
  hideScreens();
  const scene = new THREE.Scene();
  const L = new VoxelLevel();
  const props = [];
  for (let x = -14; x < 14; x++)
    for (let z = -14; z < 14; z++) {
      const road = Math.abs(x + z * 0.35) < 2.2;
      L.set(x, -1, z, road ? 'road' : (x * 7 + z * 13) % 5 === 0 ? 'grassDark' : 'grass');
    }
  for (let z = -6; z <= -2; z++) {
    L.set(-9, 0, z, 'brick');
    L.set(-9, 1, z, 'brick');
  }
  for (let x = -9; x <= -5; x++) {
    L.set(x, 0, -6, 'brick');
    if (x !== -7) L.set(x, 1, -6, 'brick');
  }
  props.push({ kind: 'car', v: 1, x: 2.2, z: -4.5, rot: 0.5 });
  props.push({ kind: 'crate', v: 'military', x: -3.5, z: 2.5, rot: 0.2 });
  props.push({ kind: 'crate', v: 'common', x: -4.4, z: 3.4, rot: 0 });
  props.push({ kind: 'crate', v: 'rare', x: -7.5, z: -4.5, rot: 0 });
  for (let i = 0; i < 4; i++) props.push({ kind: 'sandbag', v: 0, x: 4.5 + i, z: 3.5, rot: 0 });
  for (const [x, z, v, s] of [[-10, 5, 0, 1.1], [8, -9, 1, 1], [10, 6, 0, 1.2], [-11, -11, 1, 1.1], [-5, 10, 1, 0.9], [11, -1, 0, 1]])
    props.push({ kind: 'tree', v, x, z, rot: x * 1.3, s });
  props.push({ kind: 'rock', v: 1, x: 6.5, z: 8.5, rot: 1 });
  props.push({ kind: 'rock', v: 2, x: -1.5, z: 9, rot: 2 });
  scene.add(buildWorld(L, props, { x0: -14, z0: -14, W: 28, H: 28 }, { grass: 1 }));
  const light = addLighting(scene, { shadowSize: 4096, extent: 16 });
  light.follow(new THREE.Vector3(0, 0, 0));
  const heli = new Helicopter('#4a5560');
  heli.placeAt(5.5, -11, -0.6);
  heli.land();
  heli.update(0.016, 0);
  scene.add(heli.mesh);
  const squad = [
    ['ferro', -0.5, 0.5, 2.2, 'k7', 'P', 'P', true],
    ['ferro', 1.2, 1.8, 1.4, 'vespa', 'L', 'L', true],
    ['ferro', -1.8, 2.2, 2.9, 'k7', 'P', 'L', false],
    ['scav', 5.8, 5.6, -2.6, 'trovao', null, null, false],
    ['scav', 7.2, 4.6, -2.3, 'p9', null, null, true],
  ];
  squad.forEach(([fac, x, z, aim, w, ar, hm, bp], i) => {
    const lo = newLoadout();
    lo.primary = w === 'p9' ? null : newItem(w);
    lo.secondary = w === 'p9' ? newItem('p9') : null;
    lo.active = w === 'p9' ? 'secondary' : 'primary';
    if (ar) lo.armor = newItem(ar === 'P' ? 'coleteP' : 'coleteL');
    if (hm) lo.helmet = newItem(hm === 'P' ? 'capaceteP' : 'capaceteL');
    if (bp) lo.backpack = newItem('mochilaM');
    const a = new Actor({ name: 'x', faction: fac, loadout: lo, seed: i * 2 + 1 });
    a.pos.set(x, 0, z);
    a.aim = aim;
    a.vel.set(i % 2 ? 1.5 : 0, 0);
    a.walkPhase = i;
    a.syncMesh(0.1);
    scene.add(a.mesh);
  });
  cam.viewHeight = Number(params.get('zoom') ?? 11);
  resize();
  cam.yaw = cam.targetYaw = Math.PI / 4 + 0.25;
  cam.snapTo(new THREE.Vector3(0.5, 0, 0));
  showcase = { scene };
}

// ---------- boot ----------
resize();
setTimeout(() => ui3d.preloadAll(), 50);
if (params.has('showcase')) buildShowcase();
else goTitle();
requestAnimationFrame(frame);

// test/debug hook
window.__game = {
  get mode() { return mode; },
  get raid() { return raid; },
  get profile() { return profile; },
  input,
  cam,
  touch,
  screen,
  start: () => $('title-start').click(),
  pickFaction: (i) => document.querySelectorAll('.faction-card')[i]?.click(),
  deploy: () => startRaid(),
  openInv: () => openRaidInv(null),
  closeInv: () => closeRaidInv(),
};
