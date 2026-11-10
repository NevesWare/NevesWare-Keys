// Three playable factions, one per map corner. Scavs hold the fourth corner.
export const FACTIONS = [
  {
    id: 'ferro',
    name: 'Vanguarda de Ferro',
    motto: 'Disciplina e poder de fogo.',
    color: '#e0583c',
    corner: 'NO',
    perk: 'Começa com um Colete Leve.',
  },
  {
    id: 'mare',
    name: 'Coletivo Maré',
    motto: 'Rápidos, silenciosos, sempre um passo à frente.',
    color: '#5f8fbf',
    corner: 'NE',
    perk: 'Começa com uma SMG Vespa.',
  },
  {
    id: 'raiz',
    name: 'Ordem da Raiz',
    motto: 'A floresta protege quem a conhece.',
    color: '#8bbf4f',
    corner: 'SO',
    perk: 'Começa com 2 Kits Médicos e créditos extras.',
  },
];

export const SCAV = { id: 'scav', name: 'Scav', color: '#a8703f' };

export function factionById(id) {
  return FACTIONS.find((f) => f.id === id) ?? (id === 'scav' ? SCAV : null);
}
