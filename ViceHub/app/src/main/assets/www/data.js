/* ViceHub — base de dados do app.
 * s: "oficial"   = mostrado pela Rockstar (site, trailers, capturas)
 *    "comunidade" = levantado por jogadores / guias; pode mudar.
 * x/y: posição no mapa estilizado do ViceHub (0–1000 × 0–1400), aproximada.
 */
window.VH_DATA = {
  jogo: {
    titulo: "Grand Theft Auto VI",
    lancamento: "19 de novembro de 2026",
    plataformas: ["PlayStation 5", "Xbox Series X|S"],
    pc: "Sem data anunciada",
    online: "Ainda não lançado",
    estado: "Leonida",
    inspiracao: "Flórida, EUA",
    protagonistas: [
      { nome: "Lucia", texto: "Primeira protagonista mulher da era moderna da série. Aparece na Penitenciária de Leonida no começo da história." },
      { nome: "Jason", texto: "Parceiro de Lucia. Ex-militar que mora nas Leonida Keys e faz bicos para traficantes da região." }
    ],
    destaques: [
      { valor: "US$ 3,79 bi", rotulo: "vendas no 1º dia (Take-Two)" },
      { valor: "6", rotulo: "regiões em Leonida" },
      { valor: "4", rotulo: "esconderijos da história" },
      { valor: "8", rotulo: "garagens à venda no app" }
    ]
  },

  regioes: [
    { id: "vice", nome: "Vice City", base: "Miami", cor: "#ff3d8b", x: 756, y: 644,
      texto: "A metrópole de Leonida: praias, arranha-céus, vida noturna e o porto. Centro da maior parte da ação." },
    { id: "keys", nome: "Leonida Keys", base: "Florida Keys", cor: "#2de2e6", x: 473, y: 1360,
      texto: "Cadeia de ilhas no extremo sul ligadas por pontes. Casa de Jason em Key Lento, marinas e bares de pescador." },
    { id: "grass", nome: "Grassrivers", base: "Everglades", cor: "#7be38a", x: 429, y: 1055,
      texto: "Pântano enorme a oeste de Vice City. Jacarés, airboats e estradas isoladas." },
    { id: "gellhorn", nome: "Port Gellhorn", base: "Panhandle / costa do Golfo", cor: "#ff9a3c", x: 211, y: 509,
      texto: "Cidade costeira decadente no oeste, que já viveu dias melhores. Motel Starlet, autódromo e estrada de beira-mar." },
    { id: "ambrosia", nome: "Ambrosia", base: "Interior industrial", cor: "#ffd23f", x: 553, y: 527,
      texto: "Cidade industrial do açúcar no centro do estado, às margens do Lago Leonida." },
    { id: "kalaga", nome: "Mount Kalaga", base: "Parque nacional do norte", cor: "#8b5cf6", x: 473, y: 236,
      texto: "Parque Nacional Mount Kalaga: mata fechada, rios e lagos no norte, antes da divisa do estado." }
  ],

  categorias: {
    distrito: { nome: "Distritos",          cor: "#c9b6ff", icone: "grid" },
    marco:    { nome: "Pontos turísticos",  cor: "#ffd23f", icone: "star" },
    boate:    { nome: "Boates e bares",     cor: "#ff3d8b", icone: "music" },
    loja:     { nome: "Lojas e armas",      cor: "#ff9a3c", icone: "bag" },
    oficina:  { nome: "Oficinas",           cor: "#ff5f5f", icone: "wrench" },
    garagem:  { nome: "Garagens",           cor: "#2de2e6", icone: "garage" },
    casa:     { nome: "Esconderijos",       cor: "#7be38a", icone: "home" },
    marina:   { nome: "Marinas e barcos",   cor: "#4fa8ff", icone: "anchor" },
    aereo:    { nome: "Aeroportos",         cor: "#e7e1ff", icone: "plane" },
    corrida:  { nome: "Corridas",           cor: "#ff7ad9", icone: "flag" },
    natureza: { nome: "Natureza",           cor: "#5fd39a", icone: "leaf" }
  },

  locais: [
    /* ── VICE CITY ── */
    { n: "Downtown", c: "distrito", r: "vice", x: 720, y: 738, s: "oficial", d: "Centro financeiro com os arranha-céus e as boates mais caras da cidade." },
    { n: "Vice Beaches", c: "distrito", r: "vice", x: 927, y: 709, s: "oficial", d: "A faixa de praias na ilha-barreira em frente a Vice City." },
    { n: "Stockyard", c: "distrito", r: "vice", x: 676, y: 691, s: "oficial", d: "Bairro antigo de armazéns, hoje cheio de lojas e arte de rua." },
    { n: "Tequesta", c: "distrito", r: "vice", x: 691, y: 825, s: "oficial", d: "Bairro ao sul do centro, perto da baía." },
    { n: "La Perle", c: "distrito", r: "vice", x: 913, y: 578, s: "oficial", d: "Ponta norte e mais rica da ilha das praias." },
    { n: "Porto de Vice City", c: "distrito", r: "vice", x: 822, y: 775, s: "oficial", d: "Docas e terminal de cargas na ilha do porto." },
    { n: "Ocean Beach", c: "distrito", r: "vice", x: 931, y: 818, s: "comunidade", d: "Sul da ilha das praias, com hotéis antigos à beira-mar." },
    { n: "Washington Beach", c: "distrito", r: "vice", x: 931, y: 764, s: "comunidade", d: "Trecho de praia entre Vice Beaches e Ocean Beach." },
    { n: "Vice Point", c: "distrito", r: "vice", x: 916, y: 644, s: "comunidade", d: "Área de condomínios e calçadão no norte da praia." },
    { n: "Little Cuba", c: "distrito", r: "vice", x: 655, y: 767, s: "comunidade", d: "Bairro latino a oeste do centro." },
    { n: "Starfish Island", c: "distrito", r: "vice", x: 825, y: 716, s: "comunidade", d: "Ilha de mansões no meio da baía." },
    { n: "Rockridge", c: "distrito", r: "vice", x: 669, y: 644, s: "comunidade", d: "Bairro ao norte de Stockyard." },
    { n: "Crosstown", c: "distrito", r: "vice", x: 622, y: 724, s: "comunidade", d: "Bairro de oficinas, casas de penhores e clubes noturnos." },
    { n: "Bayside", c: "distrito", r: "vice", x: 764, y: 695, s: "comunidade", d: "Prédios residenciais de frente para a baía." },
    { n: "Peacock Bay", c: "distrito", r: "vice", x: 709, y: 884, s: "comunidade", d: "Bairro arborizado na baía ao sul." },
    { n: "Aeroporto Internacional de Vice City (VCI)", c: "aereo", r: "vice", x: 560, y: 807, s: "oficial", d: "Principal aeroporto de Leonida, a oeste do centro." },
    { n: "NINE1NINE", c: "boate", r: "vice", x: 735, y: 753, s: "comunidade", d: "Boate no Downtown." },
    { n: "The Vault", c: "boate", r: "vice", x: 713, y: 716, s: "comunidade", d: "Outra boate do Downtown." },
    { n: "Jack of Hearts (Boobie Ike's)", c: "boate", r: "vice", x: 611, y: 702, s: "comunidade", d: "Clube noturno em Crosstown, ligado ao personagem Boobie Ike." },
    { n: "Rideout Customs", c: "oficina", r: "vice", x: 633, y: 742, s: "comunidade", d: "Oficina de customização de carros em Crosstown." },
    { n: "Pawn & Gun", c: "loja", r: "vice", x: 604, y: 731, s: "comunidade", d: "Loja de penhores e armas em Crosstown." },
    { n: "Vice Vinyl", c: "loja", r: "vice", x: 687, y: 673, s: "comunidade", d: "Loja de discos em Stockyard." },
    { n: "Zeke's Gadgets", c: "loja", r: "vice", x: 658, y: 629, s: "comunidade", d: "Loja de eletrônicos em Rockridge." },
    { n: "Shoreline Marina", c: "marina", r: "vice", x: 749, y: 862, s: "comunidade", d: "Marina com lanchas e iates no sul da cidade." },
    { n: "Y Hotel", c: "casa", r: "vice", x: 935, y: 836, s: "comunidade", d: "Esconderijo de um dos capítulos, em Ocean Beach." },
    { n: "Apartamento em Bayside", c: "casa", r: "vice", x: 771, y: 676, s: "comunidade", d: "Esconderijo de um dos capítulos, de frente para a baía." },

    /* ── LEONIDA KEYS ── */
    { n: "Key Lento", c: "distrito", r: "keys", x: 495, y: 1313, s: "oficial", d: "Ilha onde Jason mora. Cais, barcos e bares simples." },
    { n: "Casa de palafita do Jason", c: "casa", r: "keys", x: 484, y: 1327, s: "comunidade", d: "Primeiro esconderijo: casa sobre palafitas em Key Lento." },
    { n: "Brian's Boat Works & Marina", c: "marina", r: "keys", x: 513, y: 1298, s: "oficial", d: "Estaleiro e marina de Brian Heder e da esposa, Lori." },
    { n: "The Rusty Anchor", c: "boate", r: "keys", x: 469, y: 1302, s: "comunidade", d: "Bar de Key Lento, ponto de referência na ilha." },
    { n: "Permit Keys", c: "natureza", r: "keys", x: 604, y: 1255, s: "comunidade", d: "Grupo de ilhotas mais perto do continente." },
    { n: "Riquezas Keys", c: "natureza", r: "keys", x: 400, y: 1324, s: "comunidade", d: "Ilhas no meio da cadeia das Keys." },
    { n: "Gambit Bay", c: "natureza", r: "keys", x: 655, y: 1196, s: "comunidade", d: "Baía na entrada das Keys." },
    { n: "Mile Zero Air Station", c: "aereo", r: "keys", x: 225, y: 1298, s: "comunidade", d: "Base aérea na última ilha da cadeia, no fim da estrada." },
    { n: "Estreito de Leonida", c: "natureza", r: "keys", x: 382, y: 1378, s: "comunidade", d: "Mar aberto ao sul das Keys." },

    /* ── GRASSRIVERS ── */
    { n: "Pântano de Grassrivers", c: "natureza", r: "grass", x: 436, y: 1000, s: "oficial", d: "O coração do pântano: canais, mangue e jacarés. Melhor explorado de airboat." },

    /* ── PORT GELLHORN ── */
    { n: "Port Gellhorn", c: "distrito", r: "gellhorn", x: 211, y: 411, s: "oficial", d: "Centro da cidade costeira do oeste." },
    { n: "Gellhorn International Raceway", c: "corrida", r: "gellhorn", x: 262, y: 578, s: "comunidade", d: "Autódromo da região, perto da costa." },
    { n: "Gellhorn Roadhouse", c: "marco", r: "gellhorn", x: 247, y: 345, s: "comunidade", d: "Restaurante de beira de estrada com o letreiro famoso." },
    { n: "Starlet Motel", c: "casa", r: "gellhorn", x: 182, y: 440, s: "oficial", d: "Motel de beira de estrada que aparece nas capturas oficiais; esconderijo de um capítulo." },
    { n: "Bocamar Bridge", c: "marco", r: "gellhorn", x: 189, y: 498, s: "comunidade", d: "Ponte na costa oeste de Port Gellhorn." },
    { n: "Manifest Canyon", c: "natureza", r: "gellhorn", x: 345, y: 338, s: "comunidade", d: "Cânion no interior, ao norte da cidade." },
    { n: "Borrachero Sound", c: "natureza", r: "gellhorn", x: 116, y: 520, s: "comunidade", d: "Enseada em frente a Port Gellhorn." },
    { n: "Crude Islands", c: "natureza", r: "gellhorn", x: 80, y: 353, s: "comunidade", d: "Ilhotas industriais no golfo." },
    { n: "Wild Hog Point", c: "natureza", r: "gellhorn", x: 58, y: 607, s: "comunidade", d: "Ponta de terra no extremo oeste." },
    { n: "Gellhorn Outfitters (Ammu-Nation)", c: "loja", r: "gellhorn", x: 233, y: 382, s: "comunidade", d: "Loja de armas e equipamentos." },
    { n: "Shore Court Garage", c: "garagem", r: "gellhorn", x: 167, y: 393, s: "comunidade", d: "Garagem para guardar veículos em Port Gellhorn." },
    { n: "Paradise Garage", c: "garagem", r: "gellhorn", x: 218, y: 462, s: "comunidade", d: "Garagem perto da estrada costeira." },

    /* ── MOUNT KALAGA ── */
    { n: "Mount Kalaga", c: "marco", r: "kalaga", x: 473, y: 280, s: "oficial", d: "O ponto mais alto de Leonida, dentro do parque nacional." },
    { n: "Lake Tallaloko", c: "natureza", r: "kalaga", x: 400, y: 309, s: "comunidade", d: "Lago no meio da mata do parque." },
    { n: "Millport Basin", c: "natureza", r: "kalaga", x: 327, y: 229, s: "comunidade", d: "Bacia de rios a oeste do parque." },
    { n: "Moreau River", c: "natureza", r: "kalaga", x: 527, y: 436, s: "comunidade", d: "Rio que desce do parque até o golfo." },
    { n: "Okchiloha Bay", c: "natureza", r: "kalaga", x: 720, y: 200, s: "comunidade", d: "Baía na costa nordeste." },

    /* ── AMBROSIA ── */
    { n: "Ambrosia", c: "distrito", r: "ambrosia", x: 556, y: 462, s: "oficial", d: "Cidade industrial do açúcar no centro de Leonida." },
    { n: "Lago Leonida", c: "natureza", r: "ambrosia", x: 629, y: 393, s: "oficial", d: "O maior lago do estado, na borda de Ambrosia." },
    { n: "Usina de açúcar", c: "marco", r: "ambrosia", x: 527, y: 498, s: "comunidade", d: "A indústria que move a economia de Ambrosia." }
  ],

  garagensInfo: {
    titulo: "Como funcionam as garagens",
    itens: [
      "Casas e negócios não estão à venda. Os esconderijos vêm da história.",
      "Depois da missão do capítulo 2 \"Daily Driver\", o app Vice City Real Estate libera a compra de garagens.",
      "São 8 garagens, de US$ 4.000 a US$ 40.000 (US$ 160.000 para todas, segundo guias).",
      "Garagem serve para guardar carros. Ela não gera renda."
    ]
  },

  /* t: carro | moto | barco | aereo   spd: nota de velocidade 0–10 (quando publicada) */
  veiculos: [
    { n: "Cheetah", m: "Grotti", t: "carro", cl: "Esportivo clássico", real: "Ferrari Testarossa", spd: 7.7, cor: "#ff2e4d", s: "oficial", nota: "Um dos 6 carros com versão real feita pela West Coast Customs para a Rockstar." },
    { n: "Tempesta", m: "Pegassi", t: "carro", cl: "Super", real: "Lamborghini Huracán", spd: 8.0, cor: "#c6ff3d", s: "oficial", nota: "Supercarro mais rápido segundo estimativas (~206 km/h)." },
    { n: "Emerus", m: "Progen", t: "carro", cl: "Super", real: "McLaren Senna", spd: 8.3, cor: "#ff8a1f", s: "oficial", nota: "Passa de 9,0 em velocidade com todas as melhorias, segundo guias." },
    { n: "Coquette D10", m: "Invetero", t: "carro", cl: "Esportivo", real: "Chevrolet Corvette C8", spd: 7.0, cor: "#f7f2ff", s: "oficial", nota: "Teve close-up oficial e versão real construída." },
    { n: "Manana", m: "Albany", t: "carro", cl: "Clássico (donk)", real: "Sedã americano anos 70", spd: null, cor: "#2de2e6", s: "oficial", nota: "Estilo donk: rodas gigantes e suspensão alta." },
    { n: "Buccaneer", m: "Albany", t: "carro", cl: "Muscle", real: "Buick Riviera", spd: null, cor: "#9b5cff", s: "oficial", nota: "Close-up oficial e versão real da West Coast Customs." },
    { n: "Thrax", m: "Truffade", t: "carro", cl: "Super", real: "Bugatti (hipercarro)", spd: 8.7, cor: "#3d7bff", s: "comunidade", nota: "Maior nota de velocidade de fábrica nas listas da comunidade." },
    { n: "Itali RSX", m: "Grotti", t: "carro", cl: "Esportivo", real: "Ferrari SF90", spd: null, cor: "#ff3d8b", s: "comunidade", nota: "Estimado em ~217 km/h, o mais rápido em algumas listas." },
    { n: "Banshee", m: "Bravado", t: "carro", cl: "Esportivo", real: "Dodge Viper", spd: null, cor: "#ffd23f", s: "comunidade", nota: "Motor V10 dianteiro." },
    { n: "Stanier", m: "Vapid", t: "carro", cl: "Sedã", real: "Ford Crown Victoria", spd: null, cor: "#cfd3e6", s: "comunidade", nota: "Sedã clássico, comum nas ruas e na polícia." },
    { n: "Sabre Turbo", m: "Declasse", t: "carro", cl: "Muscle", real: "Oldsmobile 442 / Buick GSX", spd: null, cor: "#ff6a3d", s: "comunidade", nota: "Muscle car dos anos 70." },
    { n: "Intruder", m: "Karin", t: "carro", cl: "Sedã", real: "Nissan Sentra", spd: null, cor: "#8fa3b8", s: "comunidade", nota: "Sedã compacto do dia a dia." },

    { n: "Alvino V1", m: "Principe", t: "moto", cl: "Clássica", real: null, spd: null, cor: "#ff9a3c", s: "comunidade", nota: "Marca nova na série." },
    { n: "Avarus", m: "LCC", t: "moto", cl: "Chopper", real: "Estilo Harley-Davidson", spd: null, cor: "#2b2b3a", s: "comunidade", nota: null },
    { n: "Bati 801", m: "Pegassi", t: "moto", cl: "Esportiva", real: "Ducati 848", spd: null, cor: "#ff2e4d", s: "comunidade", nota: "Algumas listas colocam como Shitzu." },
    { n: "PCJ-600", m: "Shitzu", t: "moto", cl: "Esportiva", real: "Yamaha YZF-R6", spd: null, cor: "#3d7bff", s: "comunidade", nota: null },
    { n: "Cliffhanger", m: "Western", t: "moto", cl: "Off-road", real: null, spd: null, cor: "#7be38a", s: "comunidade", nota: null },
    { n: "Double-T", m: "Dinka", t: "moto", cl: "Esportiva", real: null, spd: null, cor: "#ffd23f", s: "comunidade", nota: null },
    { n: "FCR 1000", m: "Übermacht", t: "moto", cl: "Café racer", real: "BMW R100", spd: null, cor: "#cfd3e6", s: "comunidade", nota: null },
    { n: "Nightblade", m: "Western", t: "moto", cl: "Chopper", real: null, spd: null, cor: "#1d1d2b", s: "comunidade", nota: null },
    { n: "Manchez", m: "Maibatsu", t: "moto", cl: "Off-road", real: null, spd: null, cor: "#ff8a1f", s: "comunidade", nota: null },
    { n: "Sanchez", m: "Maibatsu", t: "moto", cl: "Off-road", real: null, spd: null, cor: "#ff3d8b", s: "comunidade", nota: null },
    { n: "Zombie Chopper", m: "Western", t: "moto", cl: "Chopper", real: "Harley-Davidson Softail", spd: null, cor: "#5a4a6b", s: "comunidade", nota: null },
    { n: "Sovereign 107", m: "Western", t: "moto", cl: "Cruiser", real: null, spd: null, cor: "#b51f4a", s: "comunidade", nota: null },
    { n: "Carbon RS", m: "Nagasaki", t: "moto", cl: "Esportiva", real: null, spd: null, cor: "#111118", s: "comunidade", nota: null },
    { n: "SFB 1000", m: "Nagasaki", t: "moto", cl: "Esportiva", real: null, spd: null, cor: "#2de2e6", s: "comunidade", nota: null },
    { n: "Faggio", m: "Pegassi", t: "moto", cl: "Scooter", real: "Estilo Vespa", spd: null, cor: "#9ee8ff", s: "comunidade", nota: null },
    { n: "Enduro", m: "Dinka", t: "moto", cl: "Off-road", real: "Honda XL250 (1975)", spd: null, cor: "#e0402e", s: "comunidade", nota: null },

    { n: "Airboat 09", m: "—", t: "barco", cl: "Airboat", real: "Airboat de pântano", spd: null, cor: "#7be38a", s: "comunidade", nota: "Feito para os canais de Grassrivers." },
    { n: "Squalo", m: "Shitzu", t: "barco", cl: "Lancha", real: null, spd: null, cor: "#ff3d8b", s: "comunidade", nota: null },
    { n: "Seashark", m: "—", t: "barco", cl: "Jet ski", real: null, spd: null, cor: "#ffd23f", s: "comunidade", nota: null },
    { n: "Dinghy", m: "—", t: "barco", cl: "Bote inflável", real: null, spd: null, cor: "#2b2b3a", s: "comunidade", nota: null },
    { n: "Marquis", m: "—", t: "barco", cl: "Veleiro", real: null, spd: null, cor: "#f7f2ff", s: "comunidade", nota: null },
    { n: "Delmar", m: "BTN", t: "barco", cl: "Barco", real: null, spd: null, cor: "#4fa8ff", s: "comunidade", nota: null },
    { n: "S23", m: "—", t: "barco", cl: "Barco", real: null, spd: null, cor: "#cfd3e6", s: "comunidade", nota: null },
    { n: "CB69 Horizon", m: "Calder", t: "barco", cl: "Barco", real: null, spd: null, cor: "#2de2e6", s: "comunidade", nota: null },
    { n: "Reef Clipper II", m: "—", t: "barco", cl: "Barco de pesca", real: null, spd: null, cor: "#ff9a3c", s: "comunidade", nota: null },
    { n: "Kayak", m: "Crest", t: "barco", cl: "Caiaque", real: null, spd: null, cor: "#ff6a3d", s: "comunidade", nota: "Bônus da Ultimate Edition, segundo uma lista." },

    { n: "Maverick", m: "—", t: "aereo", cl: "Helicóptero", real: null, spd: null, cor: "#f7f2ff", s: "comunidade", nota: null },
    { n: "Police Maverick", m: "—", t: "aereo", cl: "Helicóptero policial", real: null, spd: null, cor: "#3d7bff", s: "comunidade", nota: null },
    { n: "Buzzard", m: "—", t: "aereo", cl: "Helicóptero de ataque", real: null, spd: null, cor: "#3a3f2e", s: "comunidade", nota: null },
    { n: "Sea Sparrow", m: "—", t: "aereo", cl: "Helicóptero anfíbio", real: null, spd: null, cor: "#ff8a1f", s: "comunidade", nota: null },
    { n: "SuperVolito", m: "—", t: "aereo", cl: "Helicóptero executivo", real: null, spd: null, cor: "#111118", s: "comunidade", nota: null },
    { n: "Swift", m: "—", t: "aereo", cl: "Helicóptero executivo", real: null, spd: null, cor: "#ff3d8b", s: "comunidade", nota: null },
    { n: "Dodo", m: "—", t: "aereo", cl: "Hidroavião", real: null, spd: null, cor: "#ff9a3c", s: "comunidade", nota: null },
    { n: "Duster", m: "—", t: "aereo", cl: "Avião agrícola", real: null, spd: null, cor: "#ffd23f", s: "comunidade", nota: null },
    { n: "Mammatus", m: "—", t: "aereo", cl: "Avião leve", real: null, spd: null, cor: "#f7f2ff", s: "comunidade", nota: null },
    { n: "Nimbus", m: "—", t: "aereo", cl: "Jato executivo", real: "Cessna Citation X", spd: null, cor: "#cfd3e6", s: "comunidade", nota: null },
    { n: "Shamal", m: "—", t: "aereo", cl: "Jato executivo", real: null, spd: null, cor: "#9b5cff", s: "comunidade", nota: null },
    { n: "Jet", m: "—", t: "aereo", cl: "Avião comercial", real: null, spd: null, cor: "#e7e1ff", s: "comunidade", nota: null }
  ]
};
