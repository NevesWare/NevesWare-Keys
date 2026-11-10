import './style.css';
import * as THREE from 'three';
import { FollowCamera } from './camera/followCamera.js';
import { Input } from './input.js';
import { InventoryUI } from './ui/inventoryUI.js';
import { InventoryScreen, loadSettings } from './ui/invScreen.js';
import { Hud, mapImage, worldMapCanvas } from './ui/hud.js';
import { TouchControls } from './ui/touch.js';
import { ui3d } from './ui/icons.js';
import { showScreen, hideScreens, factionSelect, resultScreen, mainMenu, pauseMenu, hidePause, confirmBox, insertionMap } from './ui/screens.js';
import { openSettingsModal } from './ui/settings.js';
import { loadLayout, applyLayout, HudEditor } from './ui/hudLayout.js';
import { view, updateView } from './ui/viewport.js';
import { load, save, newProfile, wipe } from './save.js';
import { Raid, flightTime } from './raid/raid.js';
import { Hub, HUB_POINTS } from './hub/hub.js';
import { worldMap } from './raid/map.js';
import { MUZZLE_HEIGHT, Actor } from './raid/actor.js';
import { Helicopter } from './raid/helicopter.js';
import { VoxelLevel } from './world/voxelLevel.js';
import { buildWorld, addLighting } from './gfx/world.js';
import { Pipeline, TIERS, resolveTier } from './gfx/post.js';
import { loadCharacters } from './gfx/characters.js';
import { ITEMS, newItem, levelInfo } from './data/items.js';
import { questEvent } from './data/quests.js';
import { factionById } from './data/factions.js';
import { newLoadout, loadoutValue, carriedItems, clearLoadout } from './inventory/loadout.js';
import { botLoadout } from './raid/loot.js';
import { unlockAudio, setVolume } from './audio.js';
import mannequinUrl from './assets/mannequin.glb?url';

const $ = (id) => document.getElementById(id);
const STEP = 1 / 60;
const params = new URLSearchParams(location.search);

// ---------- core ----------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const pipeline = new Pipeline(renderer);
const cam = new FollowCamera({ distance: isTouch ? 15 : 19 });
const viewport = new THREE.Vector2();
const input = new Input(canvas);
const touch = new TouchControls(input);
input.touch = touch;
const inv = new InventoryUI();
const hud = new Hud();
let settings = loadSettings();
let tierName = resolveTier(settings.quality ?? 'auto');
pipeline.setTier(tierName);
let hudLayout = loadLayout();
const editor = new HudEditor(() => ({ scale: settings.hudScale }));

function applyHud() {
  if (editor.active) return;
  applyLayout(hudLayout, { scale: settings.hudScale, opacity: settings.hudOpacity });
}

function applySettings() {
  document.body.classList.toggle('lowfx', tierName === 'baixo');
  setVolume(settings.volume);
  touch.aimMode = settings.aimMode;
  touch.vibrate = settings.vibration;
  applyHud();
}

function onSettingsChange(s, key) {
  settings = s;
  applySettings();
  if (key === 'quality' || !key) {
    const t = resolveTier(s.quality ?? 'auto');
    if (t !== tierName) {
      tierName = t;
      pipeline.setTier(t);
      resize();
    }
  }
}

function onSettingsAction(a) {
  if (a === 'editHud') openHudEditor();
  else if (a === 'fullscreen') {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  } else if (a === 'reset') {
    confirmBox('Apagar o perfil? Facção, stash, dinheiro e progresso serão perdidos.', () => {
      wipe();
      profile = null;
      document.getElementById('settings-modal').classList.add('hidden');
      screen.close();
      hub = null;
      goTitle();
    }, 'APAGAR PERFIL');
  }
}

function openSettings(onClose) {
  openSettingsModal(settings, { onChange: onSettingsChange, onAction: onSettingsAction, onClose });
}

function openHudEditor(onDone) {
  const wasHidden = document.getElementById('hud').classList.contains('hidden');
  const invWasOpen = screen.isOpen;
  if (invWasOpen) screen.root.classList.add('hidden');
  hud.show(true);
  editor.open(hudLayout, (l) => {
    hudLayout = l;
    applyHud();
    if (wasHidden) hud.show(false);
    if (invWasOpen) screen.root.classList.remove('hidden');
    onDone?.();
  });
}

let profile = load();
let mode = 'title'; // title | faction | lobby | raid | ending | result | showcase
let raid = null;
const mapBases = {};
function worldMapBase(f) {
  return (mapBases[f] ??= mapImage(worldMap(), f));
}

const screen = new InventoryScreen(inv, {
  onClose: () => (raid ? closeRaidInv() : closeHubScreen()),
  onDeploy: () => openDeployMap(),
  onReset: () => {
    wipe();
    profile = null;
    screen.close();
    goFaction();
  },
  onChange: () => {
    if (profile) save(profile);
    hub?.player.refreshGear();
  },
  onHotbar: (i) => useHotbar(i),
  onSettings: onSettingsChange,
  onAction: onSettingsAction,
  getSettings: () => settings,
  onMenu: () => {
    screen.close();
    goTitle();
  },
  toast: (m) => toast(m),
  getMapCanvas: () => {
    if (raid) return hud.bigMap(raid);
    return worldMapCanvas(worldMap(), profile.faction, { base: worldMapBase(profile.faction) });
  },
});

function toast(m) {
  const t = $('toast');
  t.textContent = m;
  t.classList.remove('hidden');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.add('hidden'), 2600);
}

const quality = () => {
  const t = TIERS[tierName];
  return { shadows: settings.shadows === 'off' ? 0 : t.shadows, grass: settings.grass === false ? 0 : t.grass, grassPatch: t.grassPatch };
};

function resize() {
  updateView();
  applyHud();
  pipeline.resize();
  cam.setAspect(view.w / view.h);
  renderer.getDrawingBufferSize(viewport);
}
window.addEventListener('resize', resize);

// ---------- safe zone (hub) ----------
let hub = null;

function ensureHub(faction) {
  if (!hub || hub.faction !== faction || (profile && hub.profile !== profile)) {
    hub = new Hub({ profile, renderer, quality: quality(), faction });
  }
  return hub;
}

// ---------- flow ----------
function goTitle() {
  mode = 'title';
  hud.show(false);
  document.body.classList.remove('in-hub');
  ensureHub(profile?.faction ?? 'bears');
  hub.player.mesh.visible = false;
  cam.distance = isTouch ? 30 : 34;
  resize();
  cam.snapTo(new THREE.Vector3(28, 0, 30));
  mainMenu(profile, {
    play: () => {
      unlockAudio();
      goImmersive();
      if (profile) goHub();
      else goFaction();
    },
    settings: () => openSettings(),
    hud: () => openHudEditor(),
  });
}

function goFaction() {
  mode = 'faction';
  factionSelect(
    (fid) => {
      profile = newProfile(fid);
      save(profile);
      goHub('Bem-vindo à safe zone. Fale com os comerciantes e embarque no heliponto.');
    },
    () => goTitle(),
  );
}

function goHub(msg, where = 'gate') {
  mode = 'hub';
  hideScreens();
  screen.close();
  touch.reset();
  ensureHub(profile.faction);
  hub.player.loadout = profile.loadout;
  hub.player.alive = true;
  hub.player.health = hub.player.maxHealth;
  hub.player.mesh.visible = true;
  hub.resetHeli();
  hub.spawnPlayer(where);
  cineHide();
  cam.cine = cam.cineTarget = 0;
  cam.aim = cam.aimTarget = 0;
  hud.setupMinimap(hub.map, profile.faction);
  const f = factionById(profile.faction);
  document.body.classList.add('in-hub');
  document.body.style.setProperty('--fc', f.color);
  hud.show(true);
  applyHud();
  $('hud-time').textContent = f.name.toUpperCase();
  $('hud-sub').textContent = 'SAFE ZONE';
  cam.distance = isTouch ? 17 : 20;
  resize();
  cam.snapTo(hub.player.pos.clone());
  if (msg) toast(msg);
}

/** Open the inventory/trader UI from an interaction point in the base. */
function openHubScreen(id = 'armario') {
  const meta = HUB_POINTS[id];
  if (meta.tab === 'deploy') {
    openDeployMap();
    return;
  }
  touch.reset();
  screen.open({
    context: 'lobby', profile, fromHub: true, tab: meta.tab,
    traderFilter: meta.filter, traderName: meta.label, barter: !!meta.barter,
  });
}

/** Helipad: full sector map with rival bases and common bases; pick a landing zone. */
function openDeployMap() {
  if (screen.isOpen) screen.close();
  touch.reset();
  const map = worldMap();
  const base = map.outposts[profile.faction];
  mode = 'hubmenu'; // freeze the base while the map is open
  insertionMap({
    map,
    faction: profile.faction,
    drawMap: (sel) => worldMapCanvas(map, profile.faction, { selected: sel, base: worldMapBase(profile.faction) }),
    flightTime: (l) => flightTime(base, l),
    onPick: (lz) => {
      mode = 'hub';
      boardHeli(lz);
    },
    onCancel: () => {
      mode = 'hub';
      input.clear();
    },
  });
}

function boardHeli(lz) {
  unlockAudio();
  touch.reset();
  cineShow('EMBARQUE', lz.name, 'Decolando da base…', false);
  hub.board(() => {
    document.body.classList.remove('in-hub');
    startRaid(lz.id);
  });
}

// ---------- cinematic overlay ----------
function cineShow(kind, dest, eta, canSkip = true) {
  $('cine').classList.remove('hidden');
  $('cine-kind').textContent = kind;
  $('cine-dest').textContent = dest;
  $('cine-eta').textContent = eta;
  $('cine-skip').style.display = canSkip ? '' : 'none';
  document.body.classList.add('cine');
}
function cineHide() {
  if ($('cine').classList.contains('hidden')) return;
  $('cine').classList.add('hidden');
  document.body.classList.remove('cine');
}
$('cine-skip').addEventListener('click', () => raid?.skipFlight());
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
/** Orbit the camera behind a heading (cinematic chase). */
function chaseYaw(heading, swing = 0.5) {
  cam.targetYaw = cam.yaw + wrapA(heading + Math.PI + swing - cam.yaw);
}

/** Mouse aim angle on the ground plane (desktop). */
function mouseAim(pos) {
  const rect = canvas.getBoundingClientRect();
  ndc.set(((input.mouse.x - rect.left) / rect.width) * 2 - 1, -((input.mouse.y - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, cam.camera);
  if (raycaster.ray.intersectPlane(aimPlane, aimPoint) && input.mouse.inside) return Math.atan2(aimPoint.x - pos.x, aimPoint.z - pos.z);
  return null;
}

function closeHubScreen() {
  if (screen.isOpen) screen.close();
  hub?.player.refreshGear();
  input.clear();
}

function hubMenu() {
  mode = 'hubmenu';
  touch.reset();
  const m = $('pause-menu');
  m.querySelector('h2').textContent = 'SAFE ZONE';
  const ab = m.querySelector('[data-p=abandon]');
  ab.textContent = 'MENU PRINCIPAL';
  pauseMenu({
    resume: () => {
      hidePause();
      mode = 'hub';
    },
    settings: () => openSettings(),
    hud: () => {
      hidePause();
      mode = 'hub';
      openHudEditor();
    },
    abandon: () => {
      hidePause();
      goTitle();
    },
  });
}

let lockToastT = 0;
function hubStep(dt) {
  input.poll();
  if (hub.boarding) {
    hub.update(dt, {});
    const h = hub.heli.mesh.position;
    cam.cineTarget = hub.boarding.phase === 'lift' ? 1 : 0.35;
    cam.aimTarget = 0;
    if (hub.boarding.phase === 'lift') chaseYaw(hub.heli.mesh.rotation.y, 0.9);
    cam.update(dt, new THREE.Vector3(h.x, hub.heli.y * 0.85, h.z));
    hub.lighting.follow(cam.focus);
    hub.world.update(dt, cam.camera, cam.focus, null, viewport);
    return;
  }
  const invOpen = screen.isOpen;
  if (invOpen) {
    if (input.pressed('inventory') || input.pressed('escape')) closeHubScreen();
  } else {
    if (input.pressed('inventory')) openHubScreen('armario');
    if (input.pressed('menu') || input.pressed('escape')) return hubMenu();
  }
  if (input.isHeld('rotL')) cam.addYaw(dt * 2.2);
  if (input.isHeld('rotR')) cam.addYaw(-dt * 2.2);
  for (let i = 1; i <= 6; i++) if (input.pressed(`hb${i}`)) useHotbar(i - 1);
  if (input.pressed('swap')) hub.player.switchWeapon();
  if (input.pressed('reload')) hub.player.startReload();
  const m = input.move();
  const ax = cam.groundAxes();
  const pl = hub.player;
  const aiming = !invOpen && !!pl.weapon && (touch.enabled ? touch.aiming : input.isHeld('aim'));
  const aim = touch.enabled ? cam.forwardAngle() : mouseAim(pl.pos) ?? pl.aim;
  hub.update(dt, {
    moveX: ax.right.x * m.x + ax.forward.x * m.y,
    moveZ: ax.right.y * m.x + ax.forward.y * m.y,
    sprint: input.isHeld('sprint'),
    aiming,
    aim,
    crouchPressed: input.pressed('crouch'),
    rollPressed: input.pressed('roll'),
    uiOpen: invOpen || editor.active,
  });
  const near = hub.nearest();
  if (!invOpen && near && input.pressed('interact')) openHubScreen(near.id);
  lockToastT -= dt;
  if (input.pressed('fire') && !invOpen && lockToastT <= 0) {
    lockToastT = 2.5;
    hud.toast('Armas travadas: proibido atirar na safe zone.', 2);
  }
  cam.cineTarget = 0;
  cam.aimTarget = aiming ? 1 : 0;
  const focus = pl.pos.clone().setY(0);
  if (aiming) {
    focus.x += Math.sin(pl.aim) * 1.4;
    focus.z += Math.cos(pl.aim) * 1.4;
  }
  cam.update(dt, focus);
  hub.lighting.follow(cam.focus);
  hub.world.update(dt, cam.camera, cam.focus, pl.pos, viewport);
  // full HUD (same as in the raid)
  hud.update(hub, (i) => useHotbar(i), settings.fps);
  hud.drawMinimap(hub, cam.yaw);
  $('hud-time').textContent = factionById(profile.faction).name.toUpperCase();
  $('hud-sub').textContent = 'SAFE ZONE';
  touch.setInteract(near ? HUB_POINTS[near.id].label : '');
  $('hud-prompt').textContent = near ? `[F] ${HUB_POINTS[near.id].label} — ${HUB_POINTS[near.id].role}` : '';
}

function questToast(done) {
  for (const t of done) hud.toast(`Missão concluída: ${t}. Resgate na base.`, 4);
}

function startRaid(lz = null) {
  unlockAudio();
  screen.close();
  mode = 'raid';
  raid = new Raid({
    profile,
    lz,
    quality: quality(),
    renderer,
    callbacks: {
      onToast: (m) => hud.toast(m),
      onLoot: () => questToast(questEvent(profile, 'loot', {})),
      onKill: (k, v) => {
        if (k?.isPlayer) questToast(questEvent(profile, 'kill', { faction: v.faction }));
        // keep the feed clean: only fights between humans, or anything involving the player
        if (k?.isPlayer || v.isPlayer || (k && k.faction !== 'zombie' && v.faction !== 'zombie')) hud.killfeed(k, v);
      },
      onPlayerHit: () => {
        hud.damageFlash();
        if (settings.vibration) navigator.vibrate?.(40);
      },
      onOpenLoot: (c) => openRaidInv(c),
      onEnd: (res) => {
        mode = 'ending';
        closeRaidInv();
        touch.reset();
        setTimeout(() => endRaid(res), res.result === 'extracted' ? 400 : 1600);
      },
    },
  });
  hud.setupMinimap(raid.map, profile.faction, worldMapBase(profile.faction));
  hud.show(true);
  touch.reset();
  applyHud();
  cam.distance = isTouch ? 15 : 19;
  resize();
  cam.yaw = cam.targetYaw = raid.heli.mesh.rotation.y + Math.PI + 0.5;
  cam.cine = cam.cineTarget = 1;
  cam.aim = cam.aimTarget = 0;
  cam.snapTo(raid.heli.mesh.position.clone().setY(raid.heli.y * 0.92));
  cineShow('INSERÇÃO', raid.lz.name, '');
  $('hud-time').textContent = '40:00';
  $('hud-sub').textContent = '';
  touch.setInteract('');
  input.clear();
}

function endRaid(res) {
  hud.show(false);
  const lo = profile.loadout;
  const s = profile.stats;
  s.raids++;
  s.kills += raid.stats.kills;
  let value = 0, items = 0;
  const lvlBefore = levelInfo(profile.xp ?? 0).level;
  let xp = raid.stats.xp;
  if (res.result === 'extracted') {
    s.extracts++;
    items = carriedItems(lo).length;
    value = loadoutValue(lo);
    xp += 150 + Math.round(value / 400);
    profile.money = Math.max(0, profile.money - (res.cost ?? 0));
    const ids = [...carriedItems(lo), ...(lo.backpack?.grid.items() ?? [])].map((i) => i.id);
    questEvent(profile, 'extract', { items: ids });
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
  profile.xp = (profile.xp ?? 0) + xp;
  const lvlAfter = levelInfo(profile.xp).level;
  if (lvlAfter > lvlBefore) note = `Subiu para o nível ${lvlAfter}! Novos itens no comerciante.`;
  save(profile);
  const kills = raid.stats.kills;
  res.xp = xp;
  raid.dispose();
  raid = null;
  mode = 'result';
  resultScreen({ ...res, kills, value, items, xp }, () => goHub(note, 'heli'));
}

// ---------- raid inventory ----------
function openRaidInv(container = null, tab = 'inv') {
  if (!raid) return;
  raid.invOpen = true;
  touch.reset();
  screen.open({ context: 'raid', profile, actor: raid.player, container, raid, tab });
}

function closeRaidInv() {
  if (raid) raid.invOpen = false;
  if (screen.isOpen) screen.close();
  raid?.player.refreshGear();
  input.clear();
}

function useHotbar(i) {
  const pl = raid?.player ?? hub?.player;
  if (!pl) return;
  if (i === 0) pl.switchWeapon('primary');
  else if (i === 1) pl.switchWeapon('secondary');
  else {
    const it = pl.loadout.pockets.at(i - 2, 0)?.item;
    if (it && ITEMS[it.id].cat === 'med') {
      if (!pl.startHeal(it) && !pl.bleeding) hud.toast('Vida cheia ou ocupado.');
    } else if (it && ITEMS[it.id].cat === 'food') {
      pl.consume(it);
      hud.toast(`${ITEMS[it.id].name} consumido.`);
    } else if (it) hud.toast(`${ITEMS[it.id].name} não pode ser usado.`);
  }
}

// ---------- update ----------
const raycaster = new THREE.Raycaster();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -MUZZLE_HEIGHT);
const aimPoint = new THREE.Vector3();
const ndc = new THREE.Vector2();

/** Light aim assist for sticks: snap toward the closest visible hostile inside a narrow cone. */
function assist(pl, aim, cone = 0.3) {
  let best = null, bestErr = cone;
  for (const o of raid.actors) {
    if (o === pl || !o.alive || o.hidden || o.faction === pl.faction) continue;
    const dx = o.pos.x - pl.pos.x, dz = o.pos.z - pl.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > (pl.weaponDef?.range ?? 24)) continue;
    let e = Math.atan2(dx, dz) - aim;
    e = Math.atan2(Math.sin(e), Math.cos(e));
    if (Math.abs(e) < bestErr && raid.map.hasLOS(pl.pos.x, pl.pos.z, o.pos.x, o.pos.z)) {
      bestErr = Math.abs(e);
      best = aim + e;
    }
  }
  return best ?? aim;
}

function pauseRaid() {
  if (mode !== 'raid') return;
  mode = 'paused';
  touch.reset();
  $('pause-menu').querySelector('h2').textContent = 'PAUSADO';
  $('pause-menu').querySelector('[data-p=abandon]').textContent = 'ABANDONAR INCURSÃO';
  pauseMenu({
    resume: () => {
      hidePause();
      mode = 'raid';
      input.clear();
    },
    settings: () => openSettings(),
    hud: () => {
      hidePause();
      openHudEditor(() => pauseRaid.reopen());
    },
    abandon: () =>
      confirmBox('Abandonar a incursão? Todo o equipamento levado será perdido.', () => {
        hidePause();
        mode = 'raid';
        raid.abandon();
      }, 'ABANDONAR'),
  });
}
pauseRaid.reopen = () => {
  mode = 'raid';
  pauseRaid();
};

const CINE_STATES = new Set(['flight', 'landing', 'disembark', 'boarding']);
const tmpV = new THREE.Vector3();
function raidCinematic(dt) {
  const st = raid.state;
  if ((input.pressed('interact') || input.pressed('escape')) && st === 'flight') raid.skipFlight();
  input.pressed('fire');
  raid.update(dt, { moveX: 0, moveZ: 0, aim: raid.player.aim, uiOpen: true });
  if (!raid) return;
  const heliView = st === 'flight' || st === 'landing' || st === 'boarding';
  const fp = heliView ? tmpV.copy(raid.heli.mesh.position).setY(raid.heli.y * 0.92) : tmpV.copy(raid.player.pos);
  cam.cineTarget = st === 'disembark' ? 0 : st === 'landing' ? 0.6 : 1;
  cam.aimTarget = 0;
  if (st === 'flight') chaseYaw(raid.heli.mesh.rotation.y, 0.5);
  cam.update(dt, fp);
  raid.scene.fog.near = 34 + 50 * cam.cine;
  raid.scene.fog.far = 150 + 90 * cam.cine;
  raid.lighting.follow(cam.focus.clone().setY(0));
  raid.world.update(dt, cam.camera, cam.focus.clone().setY(0), null, viewport);
  const eta = Math.ceil(raid.eta());
  if (st === 'flight' || st === 'landing') {
    $('cine-eta').textContent = st === 'landing' ? 'Pousando…' : `Chegada em ${Math.floor(eta / 60)}:${String(eta % 60).padStart(2, '0')}`;
    $('cine-skip').style.display = st === 'flight' ? '' : 'none';
  } else if (st === 'disembark') cineHide();
  else if (st === 'boarding' && $('cine').classList.contains('hidden')) cineShow('EXTRAÇÃO', raid.extractZone.name, 'Decolando…', false);
}

function raidStep(dt) {
  input.poll();
  if (CINE_STATES.has(raid.state)) return raidCinematic(dt);
  cineHide();
  cam.cineTarget = 0;
  if (raid.scene.fog.near !== 34) {
    raid.scene.fog.near = 34;
    raid.scene.fog.far = 150;
  }
  const invOpen = screen.isOpen;
  if (invOpen) {
    if (input.pressed('inventory') || input.pressed('escape')) closeRaidInv();
  } else {
    if (input.pressed('inventory')) openRaidInv(null);
    if (input.pressed('map')) openRaidInv(null, 'map');
    if (input.pressed('menu') || input.pressed('escape')) return pauseRaid();
  }
  // camera: Q/E (hold) rotate, touch drag handled by TouchControls
  if (input.isHeld('rotL')) cam.addYaw(dt * 2.2);
  if (input.isHeld('rotR')) cam.addYaw(-dt * 2.2);
  for (let i = 1; i <= 6; i++) if (input.pressed(`hb${i}`)) useHotbar(i - 1);
  if (input.pressed('swap')) raid.player.switchWeapon();

  const pl = raid.player;
  const m = input.move();
  const ax = cam.groundAxes();
  const moveX = ax.right.x * m.x + ax.forward.x * m.y;
  const moveZ = ax.right.y * m.x + ax.forward.y * m.y;

  // --- aiming model ---
  // Mobile: AIM raises the weapon and locks the character to the camera's forward
  // direction (rotating the camera rotates the aim line). Without aiming, the
  // character faces where it walks; FIRE without aiming is a quick hip-fire.
  // PC: the mouse aims; right button = precise aim with the laser.
  let aim = pl.aim;
  const firingHeld = input.isHeld('fire') && !invOpen;
  let aiming = false;
  if (touch.enabled) {
    aiming = touch.aiming;
    if (aiming) {
      aim = cam.forwardAngle();
      if (settings.aimAssist) aim = assist(pl, aim, 0.07);
    } else {
      if (Math.hypot(moveX, moveZ) > 0.2) aim = Math.atan2(moveX, moveZ);
      if (firingHeld && settings.aimAssist) aim = assist(pl, aim, 0.35);
    }
  } else {
    aiming = input.isHeld('aim');
    aim = mouseAim(pl.pos) ?? aim;
    const pad = input.stickAim();
    if (pad) aim = Math.atan2(ax.right.x * pad.x + ax.forward.x * pad.y, ax.right.y * pad.x + ax.forward.y * pad.y);
  }

  raid.update(dt, {
    moveX, moveZ, aim, aiming,
    sprint: input.isHeld('sprint'),
    fire: input.isHeld('fire') && !invOpen,
    firePressed: input.pressed('fire') && !invOpen,
    reload: input.pressed('reload'),
    heal: input.pressed('heal'),
    interact: !invOpen && input.pressed('interact'),
    crouchPressed: !invOpen && input.pressed('crouch'),
    rollPressed: !invOpen && input.pressed('roll'),
    uiOpen: invOpen,
  });
  if (!raid) return;
  if (CINE_STATES.has(raid.state)) return;
  cam.aimTarget = aiming && pl.alive ? 1 : 0;

  const focus = pl.pos.clone();
  const lookDist = aiming ? 1.4 : touch.enabled ? 1.0 : 1.6;
  focus.x += Math.sin(pl.aim) * lookDist;
  focus.z += Math.cos(pl.aim) * lookDist;
  focus.y = 0;
  cam.update(dt, focus);
  raid.lighting.follow(focus);
  raid.world.update(dt, cam.camera, cam.focus, pl.alive ? pl.pos : null, viewport);
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
  if (!hub) return;
  cam.targetYaw += dt * 0.05;
  cam.update(dt, new THREE.Vector3(28, 0, 30));
  hub.heli.update(dt, 3);
  hub.world.update(dt, cam.camera, cam.focus, null, viewport);
  for (const b of hub.bots) {
    b.update(dt);
    b.a.update(dt);
  }
  for (const q of hub.points) q.actor?.update(dt);
}

function step(dt) {
  if (mode === 'paused' || mode === 'hubmenu') return;
  if (mode === 'hub') return hubStep(dt);
  if (editor.active && mode === 'raid') return;
  if (mode === 'raid') raidStep(dt);
  else if (mode === 'ending') {
    if (raid && CINE_STATES.has(raid.state)) return raidCinematic(dt);
    raid?.update(dt, { moveX: 0, moveZ: 0, aim: raid.player.aim, uiOpen: true });
  } else if (mode === 'showcase') showcaseStep(dt);
  else menuStep(dt);
}

function render() {
  const scene = (mode === 'raid' || mode === 'ending' || mode === 'paused') && raid ? raid.scene : showcase?.scene ?? hub?.scene;
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

// ---------- showcase (key art) ----------
let showcase = null;
function buildShowcase() {
  mode = 'showcase';
  hideScreens();
  const scene = new THREE.Scene();
  const L = new VoxelLevel();
  const props = [];
  const S = 30;
  for (let x = -S; x < S; x++)
    for (let z = -S; z < S; z++) {
      const path = Math.abs(z + 0.5 - (Math.sin(x * 0.12) * 4 + x * 0.25)) < 1.4;
      L.set(x, -1, z, path ? 'road' : (x * 7 + z * 13) % 5 === 0 ? 'grassDark' : 'grass');
    }
  const R = (() => { let a = 7; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
  for (let i = 0; i < 26; i++) {
    const x = -S + R() * S * 2, z = -S + R() * S * 2;
    if (Math.abs(z - (Math.sin(x * 0.12) * 4 + x * 0.25)) < 4 || Math.hypot(x - 1, z - 1) < 9) continue;
    props.push({ kind: 'tree', v: i % 3, x, z, rot: R() * 6, s: 0.75 + R() * 0.25 });
  }
  props.push({ kind: 'tree', v: 0, x: -9, z: 5, rot: 1, s: 0.9 }, { kind: 'tree', v: 2, x: 10, z: -6, rot: 2, s: 0.95 }, { kind: 'tree', v: 1, x: -11, z: -8, rot: 3, s: 1 });
  for (let i = 0; i < 40; i++) props.push({ kind: 'bush', v: i % 2, x: -S + R() * S * 2, z: -S + R() * S * 2, rot: R() * 6, s: 0.7 + R() * 0.6 });
  for (let i = 0; i < 7; i++) props.push({ kind: 'fence', v: 0, x: -6 + i * 2.1, z: -9.5 + i * 0.5, rot: -0.24 });
  props.push({ kind: 'rock', v: 1, x: 5.5, z: 6.5, rot: 1, s: 1 });
  props.push({ kind: 'rock', v: 2, x: -4.5, z: 6.5, rot: 2, s: 1 });
  props.push({ kind: 'car', v: 0, x: 9, z: 4.5, rot: 0.9 });
  props.push({ kind: 'crate', v: 'military', x: -2.5, z: -2.6, rot: 0.3 });
  props.push({ kind: 'crate', v: 'common', x: -3.6, z: -1.8, rot: 0.1 });
  const world = buildWorld({ map: { vox: L, props, groundAt: (x, z) => L.get(x, -1, z) ?? 'grass', isSolid: () => false }, bounds: { x0: -S, z0: -S, W: S * 2, H: S * 2 }, quality: { grass: TIERS.alto.grass, grassPatch: TIERS.alto.grassPatch } });
  scene.add(world.group);
  const light = addLighting(scene, renderer, { shadowSize: 4096, extent: 26 });
  light.follow(new THREE.Vector3(0, 0, 0));
  const squad = [
    ['eagle', 0.5, 1.5, 2.5, 'k7', 'coleteP', 'capaceteP', 'mochilaT', 2.2],
    ['eagle', -1.6, 0.4, 2.2, 'vespa', 'coleteL', 'capaceteL', 'mochilaM', 0],
    ['scav', 4.5, -3.5, -0.8, 'trovao', null, null, null, 1.3],
  ];
  const actors = [];
  squad.forEach(([fac, x, z, aim, w, ar, hm, bp, spd], i) => {
    const lo = newLoadout();
    lo.primary = newItem(w);
    if (ar) lo.armor = newItem(ar);
    if (hm) lo.helmet = newItem(hm);
    if (bp) lo.backpack = newItem(bp);
    const a = new Actor({ name: 'x', faction: fac, loadout: lo, seed: i * 2 + 1 });
    a.pos.set(x, 0, z);
    a.aim = aim;
    a.vel.set(Math.sin(aim) * spd, Math.cos(aim) * spd);
    scene.add(a.mesh);
    actors.push(a);
  });
  pipeline.setTier('alto');
  cam.distance = Number(params.get('dist') ?? 17);
  resize();
  cam.yaw = cam.targetYaw = Math.PI / 4 + 0.35;
  cam.snapTo(new THREE.Vector3(1, 0, 0));
  showcase = { scene, world, actors };
}

function showcaseStep(dt) {
  showcase.world.update(dt, cam.camera, cam.focus, null, viewport);
  for (const a of showcase.actors) a.update(dt);
}

// ---------- fullscreen + landscape ----------
/** Mobile game: go fullscreen and lock to landscape (needs a user gesture). */
function goImmersive() {
  if (!isTouch) return;
  const el = document.documentElement;
  const lock = () => window.screen.orientation?.lock?.('landscape')?.catch(() => {});
  if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).then(lock, lock);
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  else lock();
}
window.addEventListener('pointerup', function first() {
  window.removeEventListener('pointerup', first);
  goImmersive();
});
window.addEventListener('orientationchange', () => setTimeout(resize, 250));

// ---------- boot ----------
touch.onCamera = (dx) => cam.addYaw(-dx * 0.0065 * settings.sens);
touch.onZoom = (f) => cam.zoom(f);
touch.onStickReset = () => applyHud();
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  cam.zoom(1 + Math.sign(e.deltaY) * 0.08);
}, { passive: false });
applySettings();
resize();
const playBtn = $('mm-play');
showScreen('main-menu');
playBtn.disabled = true;
playBtn.textContent = 'CARREGANDO…';
function showBootError(where, e) {
  const box = document.getElementById('boot-error');
  box.classList.remove('hidden');
  box.textContent = `${where}: ${e?.message ?? e}`;
  console.error(e);
}
window.addEventListener('error', (e) => showBootError('Erro', e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => showBootError('Erro', e.reason));

function startGame() {
  try {
    setTimeout(() => {
      try {
        ui3d.preloadAll();
      } catch (e) {
        showBootError('Ícones', e);
      }
    }, 50);
    playBtn.disabled = false;
    if (params.has('showcase')) buildShowcase();
    else goTitle();
  } catch (e) {
    showBootError('Inicialização', e);
    playBtn.disabled = false;
    playBtn.textContent = 'JOGAR';
    playBtn.onclick = () => goFaction();
  }
}

loadCharacters(params.has('nomodel') ? 'data:,invalid' : mannequinUrl)
  .then(startGame)
  .catch((e) => {
    // the game still runs with simplified characters
    showBootError('Modelo 3D (usando bonecos simplificados)', e);
    startGame();
  });
requestAnimationFrame(frame);

// test/debug hook
window.__game = {
  get mode() { return mode; },
  get raid() { return raid; },
  get profile() { return profile; },
  get hub() { return hub; },
  input,
  cam,
  touch,
  screen,
  start: () => $('mm-play').click(),
  pickFaction: (i) => document.querySelectorAll('.faction-card')[i]?.click(),
  deploy: () => startRaid(),
  openInv: () => openRaidInv(null),
  closeInv: () => closeRaidInv(),
  pause: () => pauseRaid(),
  editHud: () => openHudEditor(),
  settings: () => openSettings(),
};
