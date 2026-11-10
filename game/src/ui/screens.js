import { FACTIONS } from '../data/factions.js';

const $ = (id) => document.getElementById(id);

export function showScreen(id) {
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('hidden', s.id !== id);
}

export function hideScreens() {
  for (const s of document.querySelectorAll('.screen')) s.classList.add('hidden');
}

export function factionSelect(onPick) {
  const list = $('faction-list');
  list.innerHTML = '';
  for (const f of FACTIONS) {
    const card = document.createElement('button');
    card.className = 'faction-card';
    card.style.setProperty('--fc', f.color);
    card.innerHTML = `
      <div class="fc-badge"></div>
      <h3>${f.name}</h3>
      <p class="fc-motto">${f.motto}</p>
      <p class="fc-corner">Base: canto ${f.corner}</p>
      <p class="fc-perk">${f.perk}</p>`;
    card.addEventListener('click', () => onPick(f.id));
    list.appendChild(card);
  }
  showScreen('screen-faction');
}

export function resultScreen({ result, killer, zone, kills, value, items }, onContinue) {
  const title = $('result-title');
  const body = $('result-body');
  if (result === 'extracted') {
    title.textContent = 'EXTRAÍDO';
    title.className = 'ok';
    body.innerHTML = `Extração por <b>${zone}</b>.<br>Abates: ${kills}<br>Itens trazidos: ${items}<br>Valor estimado: ₢ ${value.toLocaleString('pt-BR')}`;
  } else if (result === 'mia') {
    title.textContent = 'DESAPARECIDO (MIA)';
    title.className = 'bad';
    body.innerHTML = `O tempo do raid acabou antes da extração.<br>Todo o equipamento levado foi perdido.<br>Abates: ${kills}`;
  } else {
    title.textContent = 'MORTO EM COMBATE';
    title.className = 'bad';
    body.innerHTML = `Morto por <b>${killer}</b>.<br>Todo o equipamento levado foi perdido.<br>Abates: ${kills}`;
  }
  $('result-continue').onclick = onContinue;
  showScreen('screen-result');
}
