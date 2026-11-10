/**
 * Missions. Progress is saved in profile.quests[id] = { p, claimed }.
 * Events: kill (victim faction), loot (container tier), extract (items carried).
 */
export const QUESTS = [
  { id: 'zombies', title: 'Limpeza', desc: 'Elimine 10 zumbis.', target: 10, on: 'kill', match: (e) => e.faction === 'zombie', reward: { money: 6000, xp: 300 } },
  { id: 'crates', title: 'Suprimentos', desc: 'Saqueie 6 caixas ou cofres no setor.', target: 6, on: 'loot', match: () => true, reward: { money: 5000, xp: 250 } },
  { id: 'scavs', title: 'Sem Scavs', desc: 'Elimine 5 Scavs.', target: 5, on: 'kill', match: (e) => e.faction === 'scav', reward: { money: 8000, xp: 400 } },
  { id: 'extract', title: 'Volte Vivo', desc: 'Extraia com vida 3 vezes.', target: 3, on: 'extract', match: () => true, reward: { money: 12000, xp: 600 } },
  { id: 'usb', title: 'Dados Perdidos', desc: 'Extraia carregando um Pendrive Criptografado (ruínas do centro).', target: 1, on: 'extract', match: (e) => e.items.includes('pendrive'), reward: { money: 20000, xp: 800 } },
  // faction-only
  { id: 'bears', faction: 'bears', title: 'Domínio Russo', desc: 'Elimine 3 operadores da Eagle Force.', target: 3, on: 'kill', match: (e) => e.faction === 'eagle', reward: { money: 18000, xp: 900 } },
  { id: 'eagle', faction: 'eagle', title: 'Contenção', desc: 'Elimine 20 zumbis para conter a infecção.', target: 20, on: 'kill', match: (e) => e.faction === 'zombie', reward: { money: 16000, xp: 900 } },
  { id: 'cult', faction: 'cult', title: 'Contrato de Caça', desc: 'Cace e elimine 3 operadores de qualquer facção.', target: 3, on: 'kill', match: (e) => e.faction === 'bears' || e.faction === 'eagle', reward: { money: 25000, xp: 1100 } },
];

export function questsFor(profile) {
  return QUESTS.filter((q) => !q.faction || q.faction === profile.faction);
}

export function questState(profile, q) {
  profile.quests ??= {};
  return (profile.quests[q.id] ??= { p: 0, claimed: false });
}

/** Advance matching quests. Returns titles of quests completed by this event. */
export function questEvent(profile, on, e) {
  const done = [];
  for (const q of questsFor(profile)) {
    if (q.on !== on) continue;
    const st = questState(profile, q);
    if (st.claimed || st.p >= q.target || !q.match(e)) continue;
    st.p++;
    if (st.p >= q.target) done.push(q.title);
  }
  return done;
}
