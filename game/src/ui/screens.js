import { FACTIONS, factionById } from '../data/factions.js';
import { sfx } from '../audio.js';

const $ = (id) => document.getElementById(id);

const SHIELD = 'M32 4l24 8v18c0 15-10 26-24 30C18 56 8 45 8 30V12z';
export const EMBLEMS = {
  bears: `<svg viewBox="0 0 64 64" class="emb"><path d="${SHIELD}" fill="none" stroke="currentColor" stroke-width="3"/><path d="M22 20l6 24M30 18l4 26M38 20l4 24" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`,
  eagle: `<svg viewBox="0 0 64 64" class="emb"><path d="${SHIELD}" fill="none" stroke="currentColor" stroke-width="3"/><path d="M16 26l16 8 16-8-4 8-12 6-12-6zM32 18l4 8h-8z" fill="currentColor"/><path d="M24 44l8 4 8-4" stroke="currentColor" stroke-width="3" fill="none"/></svg>`,
  cult: `<svg viewBox="0 0 64 64" class="emb"><path d="${SHIELD}" fill="none" stroke="currentColor" stroke-width="3"/><path d="M32 16c-8 0-13 5-13 12 0 4 2 7 5 9v6h16v-6c3-2 5-5 5-9 0-7-5-12-13-12z" fill="currentColor"/><circle cx="26.5" cy="29" r="3.5" fill="#111"/><circle cx="37.5" cy="29" r="3.5" fill="#111"/><path d="M28 43v4M32 43v4M36 43v4" stroke="#111" stroke-width="2"/></svg>`,
};

export function showScreen(id) {
  for (const s of document.querySelectorAll('.screen')) {
    if (s.id === 'settings-modal' || s.id === 'confirm') continue;
    s.classList.toggle('hidden', s.id !== id);
  }
}

export function hideScreens() {
  for (const s of document.querySelectorAll('.screen')) {
    if (s.id === 'settings-modal') continue;
    s.classList.add('hidden');
  }
}

/** Main menu. handlers: { play, settings, hud } */
export function mainMenu(profile, h) {
  const prof = $('mm-profile');
  if (profile) {
    const f = factionById(profile.faction);
    prof.style.setProperty('--fc', f.color);
    prof.innerHTML = `<span style="color:${f.color};width:40px;height:40px;display:block">${EMBLEMS[f.id]}</span>
      <div><b>${f.name}</b>₢ ${profile.money.toLocaleString('pt-BR')} · ${profile.stats.extracts} extrações · ${profile.stats.kills} abates</div>`;
    prof.classList.remove('hidden');
  } else prof.classList.add('hidden');
  $('mm-play').textContent = profile ? 'CONTINUAR' : 'JOGAR';
  $('mm-play').onclick = () => (sfx.ui(), h.play());
  $('mm-settings').onclick = () => (sfx.ui(), h.settings());
  $('mm-hud').onclick = () => (sfx.ui(), h.hud());
  $('mm-credits').onclick = () => {
    sfx.ui();
    $('credits').classList.remove('hidden');
    $('credits').querySelector('[data-close]').onclick = () => $('credits').classList.add('hidden');
  };
  showScreen('main-menu');
}

export function factionSelect(onPick, onBack) {
  const list = $('faction-list');
  list.innerHTML = '';
  for (const f of FACTIONS) {
    const card = document.createElement('button');
    card.className = 'faction-card';
    card.style.setProperty('--fc', f.color);
    card.innerHTML = `${EMBLEMS[f.id]}
      <h3>${f.name.toUpperCase()}</h3>
      <div class="motto">${f.motto}</div>
      <dl><dt>Origem</dt><dd>${f.origin}</dd><dt>Base</dt><dd>${f.cornerLabel}</dd><dt>Bônus</dt><dd>${f.perk}</dd></dl>
      <p>${f.desc}</p>`;
    card.addEventListener('click', () => (sfx.coin(), onPick(f.id)));
    list.appendChild(card);
  }
  $('fs-back').onclick = () => onBack?.();
  showScreen('screen-faction');
}

export function resultScreen({ result, killer, zone, kills, value, items }, onContinue) {
  const title = $('result-title');
  const body = $('result-body');
  const stats = (a, b, c) => `<div class="r-stats"><div><small>ABATES</small><strong>${a}</strong></div><div><small>ITENS</small><strong>${b}</strong></div><div><small>VALOR</small><strong>₢ ${c.toLocaleString('pt-BR')}</strong></div></div>`;
  if (result === 'extracted') {
    title.textContent = 'EXTRAÍDO';
    title.className = 'ok';
    body.innerHTML = `Extração por <b>${zone}</b>. Todo o equipamento foi guardado.${stats(kills, items, value)}`;
  } else if (result === 'mia' || result === 'abandon') {
    title.textContent = result === 'abandon' ? 'INCURSÃO ABANDONADA' : 'DESAPARECIDO (MIA)';
    title.className = 'bad';
    body.innerHTML = `${result === 'abandon' ? 'Você abandonou a incursão.' : 'O tempo acabou antes da extração.'} Todo o equipamento levado foi perdido.${stats(kills, 0, 0)}`;
  } else {
    title.textContent = 'MORTO EM COMBATE';
    title.className = 'bad';
    body.innerHTML = `Morto por <b>${killer}</b>. Todo o equipamento levado foi perdido.${stats(kills, 0, 0)}`;
  }
  $('result-continue').onclick = onContinue;
  showScreen('screen-result');
}

/** Pause menu (in raid). h: { resume, settings, hud, abandon } */
export function pauseMenu(h) {
  const m = $('pause-menu');
  m.classList.remove('hidden');
  for (const b of m.querySelectorAll('[data-p]')) {
    b.onclick = () => {
      sfx.ui();
      h[b.dataset.p]?.();
    };
  }
}

export function hidePause() {
  $('pause-menu').classList.add('hidden');
}

export function confirmBox(text, onYes, yes = 'CONFIRMAR') {
  const c = $('confirm');
  c.innerHTML = `<div class="pause-card"><h2>ATENÇÃO</h2><p style="font-family:Inter,sans-serif;font-size:14px;color:var(--dim);margin:0 0 8px">${text}</p>
    <button class="mm-btn danger" data-y>${yes}</button><button class="mm-btn" data-n>CANCELAR</button></div>`;
  c.classList.remove('hidden');
  c.querySelector('[data-y]').onclick = () => {
    c.classList.add('hidden');
    onYes();
  };
  c.querySelector('[data-n]').onclick = () => c.classList.add('hidden');
}
