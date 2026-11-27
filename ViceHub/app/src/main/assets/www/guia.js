/* ViceHub — conteúdo do guia (pesquisado em sites de notícias e guias da comunidade; ver README).
 * s: "oficial" = Rockstar/Take-Two; "comunidade" = guias de jogadores, pode variar.
 */
window.VH_GUIDE = {
  /* ---------- ARSENAL ---------- */
  armasTipos: {
    pistola:   { nome: "Pistolas",       icone: "pistol" },
    revolver:  { nome: "Revólveres",     icone: "revolver" },
    smg:       { nome: "Submetralhadoras", icone: "smg" },
    escopeta:  { nome: "Escopetas",      icone: "shotgun" },
    fuzil:     { nome: "Fuzis de assalto", icone: "rifle" },
    tatico:    { nome: "Rifles táticos e de caça", icone: "rifle" },
    sniper:    { nome: "Rifles de precisão", icone: "sniper" },
    pesada:    { nome: "Armas pesadas",  icone: "heavy" },
    arremesso: { nome: "Arremessáveis",  icone: "grenade" },
    branca:    { nome: "Corpo a corpo",  icone: "knife" }
  },
  armas: [
    { n: "Nipper .38", m: "Scorpio", t: "pistola" }, { n: "ES9", m: "Girardi", t: "pistola" }, { n: "K17", m: "Klose", t: "pistola" },
    { n: "1922", m: "Duke", t: "pistola", nota: "Algumas listas chamam de Duke 1992." }, { n: "ES18", m: "Girardi", t: "pistola" },
    { n: "K17 MCD", m: "Klose", t: "pistola" }, { n: "DRX", m: "Schlamm", t: "pistola" }, { n: "Kalinga .50", m: "Fairview", t: "pistola" },
    { n: "Mustang .357", m: "Duke", t: "revolver" }, { n: ".38", m: "Hawk & Little", t: "revolver" }, { n: "Morgan", m: "Hawk & Little", t: "revolver" },
    { n: "Akulus", m: "Scorpio", t: "revolver" }, { n: "WCR1", m: "Wortham", t: "revolver" },
    { n: "SMG compacta", m: "—", t: "smg" }, { n: "Micro SMG", m: "—", t: "smg" }, { n: "SMG estilo MP5", m: "—", t: "smg" },
    { n: "Moreland 850", m: "Fortune & Son", t: "escopeta" }, { n: "Gorse 425", m: "Fortune & Son", t: "escopeta" }, { n: "Drifter", m: "Shrewsbury", t: "escopeta" },
    { n: "Hobo", m: "Shrewsbury", t: "escopeta" }, { n: "Longshot", m: "Mason & Keen", t: "escopeta" }, { n: "Shortstraw", m: "Mason & Keen", t: "escopeta" },
    { n: "AZ1200", m: "Girardi", t: "escopeta" }, { n: "Verro", m: "Girardi", t: "escopeta" }, { n: "Super400", m: "Girardi", t: "escopeta" },
    { n: "KVGA-12", m: "Kozlov", t: "escopeta" }, { n: "Comshot 12", m: "Goodwin", t: "escopeta" },
    { n: "KZ-59", m: "Kozlov", t: "fuzil" }, { n: "556", m: "Duke", t: "fuzil" }, { n: "Hind", m: "Kozlov", t: "fuzil" },
    { n: "Heathen", m: "Hillinger", t: "fuzil" }, { n: "FRA", m: "ADB", t: "fuzil" }, { n: "VF-G1", m: "Vom Feuer", t: "fuzil" },
    { n: "Mediator", m: "Hawk & Little", t: "tatico" }, { n: "W-14", m: "Wortham", t: "tatico" }, { n: "W-22", m: "Wortham", t: "tatico" }, { n: "M306", m: "Hillinger", t: "tatico" },
    { n: "Laird 350", m: "Fortune & Son", t: "sniper" }, { n: "SM-69", m: "Shrewsbury", t: "sniper" }, { n: "SMS-01", m: "Shrewsbury", t: "sniper" }, { n: "FF-SR", m: "Fairview", t: "sniper" },
    { n: "Lança-granadas", m: "—", t: "pesada" }, { n: "RPG", m: "—", t: "pesada" }, { n: "Arpão", m: "—", t: "pesada" },
    { n: "Granada", m: "—", t: "arremesso" }, { n: "Granada de fumaça", m: "—", t: "arremesso" }, { n: "Granada de luz", m: "—", t: "arremesso" },
    { n: "Coquetel molotov", m: "—", t: "arremesso" }, { n: "Bola de golfe", m: "—", t: "arremesso" },
    { n: "Faca de caça", m: "—", t: "branca" }, { n: "Faca bushcraft", m: "—", t: "branca" }, { n: "Faca EDC", m: "—", t: "branca" }, { n: "Faca de sobrevivência", m: "—", t: "branca" },
    { n: "Faca de mergulho", m: "—", t: "branca" }, { n: "Canivete", m: "—", t: "branca" }, { n: "Faca de combate", m: "—", t: "branca" },
    { n: "Soco-inglês", m: "—", t: "branca" }, { n: "Cassetete", m: "—", t: "branca" }, { n: "Taco de beisebol", m: "—", t: "branca" },
    { n: "Pé de cabra", m: "—", t: "branca" }, { n: "Taco de golfe", m: "—", t: "branca" }, { n: "Taco de sinuca", m: "—", t: "branca" }
  ],
  armasNota: "Nomes reunidos de guias da comunidade (sem lista oficial da Rockstar). Contando variantes e versões únicas, os guias falam em 190+ itens.",

  /* ---------- CONTROLES (PS5 / Xbox) ---------- */
  controles: [
    { grupo: "Combate e armas", itens: [
      ["Mirar", "L2", "LT"], ["Atirar", "R2", "RT"], ["Proteger-se / sair da cobertura", "R1", "RB"],
      ["Guardar arma · segurar: roda de armas", "L1", "LB"], ["Foco (câmera lenta e mira estável)", "L3+R3", "LS+RS"],
      ["Trocar de arma rápido (mirando)", "△", "Y", "comunidade"]
    ]},
    { grupo: "Luta corpo a corpo", nota: "Jason e Lucia usam os mesmos comandos.", itens: [
      ["Soco / golpe", "□", "X"], ["Golpe forte (segurar)", "□", "X", "comunidade"], ["Agarrar", "R2", "RT", "comunidade"],
      ["Bloquear (segurar)", "✕", "A"], ["Esquivar / contra-atacar (na hora do golpe)", "✕", "A"]
    ]},
    { grupo: "Movimento e exploração", itens: [
      ["Correr", "L3", "LS"], ["Interagir com alguém (segurar olhando)", "L2", "LT"], ["Foco fora de combate: destaca itens, pistas e sons", "L3+R3", "LS+RS"],
      ["Examinar ao redor (segurar mira + clicar direito)", "L2+R3", "LT+RS"]
    ]},
    { grupo: "Mapa", itens: [
      ["Abrir o mapa", "Touchpad", "View"], ["Marcar destino", "✕", "A"]
    ]}
  ],
  controlesNota: "Guias de fãs concordam nesses comandos; alguns (marcados) variam entre guias. Confira em Configurações → Controles dentro do jogo.",

  /* ---------- COLECIONÁVEIS: cartas ---------- */
  cartas: [
    ["America's Next Top Hooker", 24, "Novidade"], ["Backyard Wrestling", 12, "Novidade"], ["Delights Dancers", 18, "Dançarinas"],
    ["Ed Comics Universe", 36, "Quadrinhos"], ["Jack of Hearts Dancers", 36, "Dançarinas"], ["Liberty City Penetrators", 24, "Esporte"],
    ["Liberty City Swingers", 24, "Esporte"], ["Liberty City Wrath", 24, "Esporte"], ["Los Santos Corkers", 24, "Esporte"],
    ["Los Santos Panic", 24, "Esporte"], ["Los Santos Pounders", 24, "Esporte"], ["Nine1Nine Dancers", 36, "Dançarinas"],
    ["Right Wing: America's Hero", 36, "Quadrinhos"], ["The Legends of Ratface", 36, "Quadrinhos"], ["Vice City Club De Fútbol", 30, "Esporte"],
    ["Vice City Flamingos", 24, "Esporte"], ["Vice City Manatees", 24, "Esporte"], ["Vice City Narcos", 24, "Esporte"]
  ],
  cartasNota: "18 coleções e 480 cartas, segundo guias da comunidade. As cartas podem ser vendidas em lojas de penhores. Marque no mapa onde achou cada uma com o botão dourado.",

  /* ---------- VEÍCULOS RAROS ---------- */
  raros: [
    { n: "Grotti Cheetah", info: "Um dos seis carros que a West Coast Customs construiu de verdade e levou para as ruas de Miami.", s: "oficial" },
    { n: "Pegassi Tempesta", info: "Versão real feita pela West Coast Customs.", s: "oficial" },
    { n: "Progen Emerus", info: "Versão real feita pela West Coast Customs.", s: "oficial" },
    { n: "Invetero Coquette", info: "Versão real feita pela West Coast Customs.", s: "oficial" },
    { n: "Albany Buccaneer", info: "Versão real feita pela West Coast Customs.", s: "oficial" },
    { n: "Albany Manana", info: "Versão real feita pela West Coast Customs; também aparece entre os extras da Ultimate Edition.", s: "oficial" },
    { n: "'67 Vapid Dominator Buggy", info: "Variante rara da Ultimate Edition, segundo guias.", s: "comunidade" },
    { n: "Annis Elegy Retro Custom", info: "Extra da Ultimate Edition, segundo guias.", s: "comunidade" },
    { n: "Lampadati Novak", info: "Extra da Ultimate Edition, segundo guias.", s: "comunidade" },
    { n: "Pegassi Toros", info: "Extra da Ultimate Edition, segundo guias.", s: "comunidade" },
    { n: "Pfister Astron", info: "Extra da Ultimate Edition, segundo guias.", s: "comunidade" },
    { n: "Vapid Aleutian", info: "Extra da Ultimate Edition, segundo guias.", s: "comunidade" },
    { n: "Vapid Contender", info: "Extra da Ultimate Edition, segundo guias.", s: "comunidade" },
    { n: "Shitzu Squalo", info: "Lancha da Ultimate Edition, segundo guias.", s: "comunidade" }
  ],

  /* ---------- LINHA DO TEMPO ---------- */
  linhaDoTempo: [
    { data: "4 fev 2022", t: "Anúncio", texto: "Rockstar confirma que o próximo Grand Theft Auto está em desenvolvimento." },
    { data: "set 2022", t: "Vazamento", texto: "Vídeos de testes do jogo vazam na internet; a Rockstar confirma o vazamento e diz que o desenvolvimento segue." },
    { data: "nov 2023", t: "Anúncio", texto: "Rockstar avisa que o primeiro trailer chega em dezembro, nos 25 anos do estúdio." },
    { data: "4 dez 2023", t: "Trailer", texto: "Trailer 1 sai um dia antes do previsto, depois de vazar. Revela Vice City, Leonida, Lucia e a data: 2025." },
    { data: "2 mai 2025", t: "Adiamento", texto: "Lançamento vai para 26 de maio de 2026." },
    { data: "6 mai 2025", t: "Trailer", texto: "Trailer 2 mostra Jason, Lucia e o elenco; o site oficial ganha páginas de personagens e lugares." },
    { data: "6 nov 2025", t: "Adiamento", texto: "Novo adiamento: 19 de novembro de 2026." },
    { data: "2026", t: "Marketing", texto: "West Coast Customs constrói seis carros do jogo em tamanho real e eles rodam por Miami: Cheetah, Tempesta, Emerus, Coquette, Buccaneer e Manana." },
    { data: "ago 2026", t: "Vazamento", texto: "Gameplay não autorizado vaza com nomes de rádios ainda não anunciadas, segundo a imprensa." },
    { data: "27 ago 2026", t: "Trailer", texto: "Extended Look com cerca de 27 minutos de gameplay no PS5; a Complex relata exibição especial também na Netflix." },
    { data: "15 out 2026", t: "Trailer", texto: "Trailer de lançamento." },
    { data: "11 nov 2026", t: "Anúncio", texto: "Rockstar revela nomes de apresentadores das rádios." },
    { data: "19 nov 2026", t: "Lançamento", texto: "GTA VI chega ao PS5 e ao Xbox Series X|S." },
    { data: "20 nov 2026", t: "Recorde", texto: "Take-Two anuncia US$ 3,79 bilhões em vendas no primeiro dia, a maior estreia do entretenimento." },
    { data: "em breve", t: "Futuro", texto: "Versão para PC e o novo GTA Online ainda sem data." }
  ]
};
