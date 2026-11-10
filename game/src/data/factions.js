// DeadSector factions. Bases: north, southwest, southeast. Scavs hold the northeast village.
export const FACTIONS = [
  {
    id: 'bears',
    name: 'Red Bears',
    origin: 'Rússia',
    motto: 'Strength Through War',
    desc: 'Organização militar russa com base fortificada. Disciplina, armamento pesado e operações estratégicas.',
    color: '#d0473a',
    corner: 'N',
    cornerLabel: 'Norte',
    perk: 'Começa com Colete Leve e Capacete.',
  },
  {
    id: 'eagle',
    name: 'Eagle Force',
    origin: 'EUA',
    motto: 'Freedom Through Strength',
    desc: 'Força americana enviada para investigar e conter o desastre. Reconhecimento e operações táticas.',
    color: '#4a90e2',
    corner: 'SO',
    cornerLabel: 'Sudoeste',
    perk: 'Começa com uma SMG Vespa.',
  },
  {
    id: 'cult',
    name: 'Death Cult',
    origin: 'Independente',
    motto: 'No Mercy. No Survivors.',
    desc: 'Grupo extremista que usa o caos para dominar territórios. Especialista em emboscadas e caçadas.',
    color: '#e3d6b4',
    corner: 'SE',
    cornerLabel: 'Sudeste',
    perk: 'Começa com a Escopeta Trovão e créditos extras.',
  },
];

export const SCAV = { id: 'scav', name: 'Scav', color: '#a8703f' };
export const ZOMBIE = { id: 'zombie', name: 'Zumbi', color: '#7c8f5a' };

export function factionById(id) {
  return FACTIONS.find((f) => f.id === id) ?? (id === 'scav' ? SCAV : id === 'zombie' ? ZOMBIE : null);
}
