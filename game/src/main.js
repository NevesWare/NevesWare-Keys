import './style.css';
import * as THREE from 'three';
import { PixelPipeline } from './render/pixelPipeline.js';
import { IsoCamera } from './camera/isoCamera.js';
import { Input } from './input.js';
import { InventoryUI } from './ui/inventoryUI.js';
import { Hud } from './ui/hud.js';
import { Lobby } from './ui/lobby.js';
import { showScreen, hideScreens, factionSelect, resultScreen } from './ui/screens.js';
import { load, save, newProfile, wipe } from './save.js';
import { Raid } from './raid/raid.js';
import { MUZZLE_HEIGHT, Actor } from './raid/actor.js';
import { Helicopter } from './raid/helicopter.js';
import { VoxelLevel } from './world/voxelLevel.js';
import { Grid } from './inventory/grid.js';
import { ITEMS, newItem, itemValue } from './data/items.js';
import { factionById } from './data/factions.js';
import { unlockAudio } from './audio.js';

const $ = (id) => document.getElementById(id);
const STEP = 1 / 60;

// ---------- core ----------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
const pipeline = new PixelPipeline(renderer, { pixelHeight: 240 });
const cam = new IsoCamera({ viewHeight: 22 });
const input = new Input(canvas);
const inv = new InventoryUI();
const hud = new Hud();

let profile = load();
let mode = 'title'; // title | faction | lobby | raid | ending | result
let raid = null;
let raidInvOpen = false;
let lobbyWorld = null;

const raycaster = new THREE.Raycaster();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -MUZZLE_HEIGHT);
const aimPoint = new THREE.Vector3();
const ndc = new THREE.Vector2();

function resize() {
  pipeline.resize(window.innerWidth, window.innerHeight);
  cam.setViewport(pipeline.width / pipeline.height, pipeline.height);
}
window.addEventListener('resize', resize);
resize();

// ---------- lobby backdrop (3D) ----------
function buildLobbyWorld(factionId) {
  const f = factionById(factionId) ?? { color: '#ffd66b', id: 'ferro' };
  const scene = new THREE.Scene();
  const L = new VoxelLevel();
  const S = 14;
  for (let x = -S; x <= S; x++)
    for (let z = -S; z <= S; z++) {
      const edge = Math.max(Math.abs(x), Math.abs(z));
      L.set(x, -1, z, edge > 10 ? 'grassDark' : Math.abs(x) <= 2 && Math.abs(z) <= 2 ? 'helipad' : 'concrete');
      if (edge === 10 && !(Math.abs(x) <= 1 || Math.abs(z) <= 1)) {
        L.set(x, 0, z, `wall_${f.id ?? 'ferro'}`);
        L.set(x, 1, z, `wall_${f.id ?? 'ferro'}`);
      }
    }
  for (const [dx, dz] of [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1], [0, 0]]) L.set(dx, -1, dz, 'helipadMark');
  for (const [x, z, m] of [[-7, -7, 'crateMil'], [-6, -7, 'crate'], [-7, -6, 'crate'], [7, 6, 'crateMil'], [6, 7, 'crateRare']]) L.set(x, 0, z, m);
  for (let i = -3; i <= 3; i++) L.set(i, 0, 6, 'sandbag');
  for (const [x, z] of [[-13, 4], [12, -12], [13, 9], [-12, -13]]) {
    L.set(x, 0, z, 'wood');
    L.set(x, 1, z, 'wood');
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) L.set(x + dx, 2, z + dz, 'leaves');
  }
  scene.add(L.buildMeshes());
  scene.add(new THREE.HemisphereLight('#a3c6e0', '#44305e', 1.4));
  const sun = new THREE.DirectionalLight('#ffd6a0', 2.2);
  sun.position.set(-30, 50, 20);
  scene.add(sun);
  const heli = new Helicopter(f.color);
  heli.placeAt(0.5, 0.5, 0.6);
  heli.land();
  scene.add(heli.mesh);
  const crew = [];
  const mk = (name, x, z, aim) => {
    const a = new Actor({ name, faction: factionId ?? 'ferro', loadout: { weapon: null, armor: null, backpack: new Grid(1, 1) } });
    a.pos.set(x, 0, z);
    a.aim = aim;
    a.refreshGear();
    a.syncMesh(0);
    scene.add(a.mesh);
    crew.push(a);
    return a;
  };
  const me = mk('me', 3.5, 4, Math.PI);
  mk('g1', -8, 2, 1.2);
  mk('g2', 8, -3, -1.6);
  return { scene, heli, crew, me };
}

function refreshLobbyHero() {
  if (!lobbyWorld || !profile) return;
  const me = lobbyWorld.me;
  me.loadout.weapon = profile.loadout.weapon;
  me.loadout.armor = profile.loadout.armor;
  me.refreshGear();
}

// ---------- flow ----------
function goTitle() {
  mode = 'title';
  lobbyWorld = buildLobbyWorld(profile?.faction ?? 'ferro');
  cam.viewHeight = 16;
  resize();
  cam.snapTo(new THREE.Vector3(0, 0, 0));
  showScreen('screen-title');
  $('title-start').onclick = () => {
    unlockAudio();
    if (profile) goLobby();
    else goFaction();
  };
}

function goFaction() {
  mode = 'faction';
  factionSelect((fid) => {
    profile = newProfile(fid);
    save(profile);
    lobbyWorld = buildLobbyWorld(fid);
    goLobby('Bem-vindo à base. Prepare seu equipamento e chame o helicóptero.');
  });
}

const lobby = new Lobby(inv, {
  onDeploy: () => startRaid(),
  onSave: () => {
    save(profile);
    refreshLobbyHero();
  },
  onReset: () => {
    wipe();
    profile = null;
    lobby.close();
    goFaction();
  },
});

function goLobby(msg) {
  mode = 'lobby';
  hideScreens();
  hud.show(false);
  if (!lobbyWorld) lobbyWorld = buildLobbyWorld(profile.faction);
  cam.viewHeight = 16;
  resize();
  cam.snapTo(new THREE.Vector3(0, 0, 0));
  lobby.open(profile, msg);
  refreshLobbyHero();
}

function startRaid() {
  unlockAudio();
  lobby.close();
  mode = 'raid';
  raidInvOpen = false;
  raid = new Raid({
    profile,
    callbacks: {
      onToast: (m) => hud.toast(m),
      onKill: (k, v) => hud.killfeed(k, v),
      onPlayerHit: () => hud.damageFlash(),
      onOpenLoot: (c) => openRaidInv(c),
      onEnd: (res) => {
        mode = 'ending';
        closeRaidInv();
        setTimeout(() => endRaid(res), res.result === 'extracted' ? 400 : 1600);
      },
    },
  });
  hud.setupMinimap(raid.map, profile.faction);
  hud.show(true);
  cam.viewHeight = 22;
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
    const all = [...lo.backpack.items(), lo.weapon, lo.armor].filter(Boolean);
    items = all.length;
    value = all.reduce((v, i) => v + itemValue(i), 0);
  } else {
    s.deaths++;
    lo.weapon = null;
    lo.armor = null;
    lo.backpack.clear();
  }
  // safety net: never leave a player with no way to fight back
  let note = '';
  const hasWeapon = lo.weapon || profile.stash.items().some((i) => ITEMS[i.id].cat === 'weapon');
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
  raidInvOpen = true;
  const lo = profile.loadout;
  const panels = [
    {
      id: 'weapon', title: 'Arma', type: 'slot', w: 4, h: 2, hint: 'vazio',
      accept: (it) => ITEMS[it.id].cat === 'weapon', get: () => lo.weapon, set: (it) => (lo.weapon = it),
      quickTo: container ? 'loot' : null,
    },
    {
      id: 'armor', title: 'Colete', type: 'slot', w: 3, h: 3, hint: 'vazio',
      accept: (it) => ITEMS[it.id].cat === 'armor', get: () => lo.armor, set: (it) => (lo.armor = it),
      quickTo: container ? 'loot' : null,
    },
    { id: 'backpack', title: 'Mochila', type: 'grid', grid: lo.backpack, quickTo: container ? 'loot' : null },
  ];
  if (container) panels.push({ id: 'loot', title: container.label, type: 'grid', grid: container.grid, quickTo: ['weapon', 'armor', 'backpack'] });
  inv.mount($('raid-inv-panels'), panels, { onChange: () => raid?.player.refreshGear(), onSell: null });
  $('raid-inv').classList.remove('hidden');
}

function closeRaidInv() {
  raidInvOpen = false;
  inv.cancelDrag();
  inv.unmountAll();
  $('raid-inv').classList.add('hidden');
  raid?.player.refreshGear();
  input.clear();
}

// ---------- update ----------
function raidStep(dt) {
  input.poll();
  if (raidInvOpen) {
    if (input.pressed('inventory') || input.pressed('escape') || input.pressed('interact')) closeRaidInv();
  } else if (input.pressed('inventory')) {
    openRaidInv(null);
  }
  if (input.pressed('rotL')) cam.rotate(-1);
  if (input.pressed('rotR')) cam.rotate(1);

  const pl = raid.player;
  const m = input.move();
  const ax = cam.groundAxes();
  const moveX = ax.right.x * m.x + ax.forward.x * m.y;
  const moveZ = ax.right.y * m.x + ax.forward.y * m.y;

  // mouse aim -> world
  const rect = canvas.getBoundingClientRect();
  ndc.set(((input.mouse.x - rect.left) / rect.width) * 2 - 1, -((input.mouse.y - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, cam.camera);
  let aim = pl.aim;
  if (raycaster.ray.intersectPlane(aimPlane, aimPoint) && input.mouse.inside) {
    aim = Math.atan2(aimPoint.x - pl.pos.x, aimPoint.z - pl.pos.z);
  }
  const pa = input.padAim;
  if (pa.x || pa.y) {
    const wx = ax.right.x * pa.x + ax.forward.x * pa.y;
    const wz = ax.right.y * pa.x + ax.forward.y * pa.y;
    aim = Math.atan2(wx, wz);
  }

  raid.update(dt, {
    moveX, moveZ, aim,
    sprint: input.isHeld('sprint'),
    fire: input.isHeld('fire') && !raidInvOpen,
    firePressed: input.pressed('fire') && !raidInvOpen,
    reload: input.pressed('reload'),
    heal: input.pressed('heal'),
    interact: !raidInvOpen && input.pressed('interact'),
    uiOpen: raidInvOpen,
  });
  if (!raid) return;

  // camera looks a bit toward the aim point
  const focus = pl.pos.clone();
  if (input.mouse.inside && !raidInvOpen) {
    const look = aimPoint.clone().sub(pl.pos).setY(0);
    if (look.length() > 5) look.setLength(5);
    focus.addScaledVector(look, 0.3);
  }
  focus.y = 0;
  cam.update(dt, focus);
  hud.update(raid);
  hud.drawMinimap(raid, cam.yaw);
}

function menuStep(dt) {
  if (!lobbyWorld) return;
  cam.targetYaw += dt * 0.08;
  cam.update(dt, new THREE.Vector3(0, 0, 0));
  lobbyWorld.heli.update(dt);
}

function step(dt) {
  if (mode === 'raid') raidStep(dt);
  else if (mode === 'ending') {
    raid?.update(dt, { moveX: 0, moveZ: 0, aim: raid.player.aim, uiOpen: true });
    raid?.heli.update(dt);
  } else menuStep(dt);
}

function render() {
  const scene = (mode === 'raid' || mode === 'ending') && raid ? raid.scene : lobbyWorld?.scene;
  if (scene) pipeline.render(scene, cam.camera);
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

goTitle();
requestAnimationFrame(frame);

// test/debug hook
window.__game = {
  get mode() { return mode; },
  get raid() { return raid; },
  get profile() { return profile; },
  input,
  cam,
  start: () => $('title-start').click(),
  pickFaction: (i) => document.querySelectorAll('.faction-card')[i]?.click(),
  deploy: () => startRaid(),
  openInv: () => openRaidInv(null),
  closeInv: () => closeRaidInv(),
};
