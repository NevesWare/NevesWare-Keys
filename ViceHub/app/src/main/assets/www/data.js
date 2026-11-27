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

  personagens: [
    { nome: "Lucia Caminos", papel: "Protagonista", texto: "Começa a história na Penitenciária de Leonida e quer uma vida melhor para ela e a família." },
    { nome: "Jason Duval", papel: "Protagonista", texto: "Ex-militar que vive nas Leonida Keys e faz trabalhos para gente perigosa da região." },
    { nome: "Cal Hampton", papel: "Aliado", texto: "Amigo de Jason, desconfiado de tudo e de todos." },
    { nome: "Boobie Ike", papel: "Empresário", texto: "Dono de imóveis, de um clube de strip e de uma gravadora em Vice City." },
    { nome: "Dre'Quan Priest", papel: "Produtor", texto: "Quer transformar a gravadora num império da música." },
    { nome: "Real Dimez", papel: "Dupla de rap", texto: "Bae-Luxe e Roxy, artistas que estouram nas redes de Leonida." },
    { nome: "Raul Bautista", papel: "Assaltante", texto: "Veterano de golpes que está sempre atrás do próximo grande roubo." },
    { nome: "Brian Heder", papel: "Contrabandista", texto: "Dono da marina em Key Lento, mexe com contrabando há décadas." }
  ],

  radios: [
    { nome: "Flash FM", estilo: "Pop", cor: "#ff3d8b" },
    { nome: "Cocoteo FM", estilo: "Latina moderna", cor: "#ff9a3c" },
    { nome: "Back Country Radio", estilo: "Country", cor: "#ffd23f" },
    { nome: "AfroBank FM", estilo: "Afrobeats", cor: "#7be38a" },
    { nome: "The Chamber 106.6", estilo: "Hip-hop", cor: "#8b5cf6" },
    { nome: "Dirty South Classics", estilo: "Rap do sul dos EUA", cor: "#2de2e6" }
  ],

  linhaDoTempo: [
    { data: "4 fev 2022", texto: "Rockstar confirma que o próximo GTA está em desenvolvimento." },
    { data: "5 dez 2023", texto: "Trailer 1 sai e revela Vice City, Leonida e Lucia." },
    { data: "2 mai 2025", texto: "Lançamento adiado para 26 de maio de 2026." },
    { data: "6 mai 2025", texto: "Trailer 2 mostra Jason, Lucia e o elenco de apoio." },
    { data: "6 nov 2025", texto: "Novo adiamento: 19 de novembro de 2026." },
    { data: "19 nov 2026", texto: "GTA VI chega ao PS5 e ao Xbox Series X|S." },
    { data: "20 nov 2026", texto: "Take-Two anuncia US$ 3,79 bilhões em vendas no primeiro dia." }
  ],

  regioes: [
    { id: "vice", nome: "Vice City", base: "Miami", cor: "#ff3d8b", x: 10124, y: 10224,
      texto: "A metrópole de Leonida: praias, arranha-céus, vida noturna e o porto. Centro da maior parte da ação." },
    { id: "keys", nome: "Leonida Keys", base: "Florida Keys", cor: "#2de2e6", x: 7624, y: 17224,
      texto: "Cadeia de ilhas no extremo sul ligadas por pontes. Casa de Jason em Key Lento, marinas e bares de pescador." },
    { id: "grass", nome: "Grassrivers", base: "Everglades", cor: "#7be38a", x: 6824, y: 14624,
      texto: "Pântano enorme a oeste de Vice City. Jacarés, airboats e estradas isoladas." },
    { id: "gellhorn", nome: "Port Gellhorn", base: "Panhandle / costa do Golfo", cor: "#ff9a3c", x: 4048, y: 6833,
      texto: "Cidade costeira decadente no oeste, que já viveu dias melhores. Motel Starlet, autódromo e estrada de beira-mar." },
    { id: "ambrosia", nome: "Ambrosia", base: "Interior industrial", cor: "#ffd23f", x: 7713, y: 6590,
      texto: "Cidade industrial do açúcar no centro do estado, às margens do Lago Leonida." },
    { id: "kalaga", nome: "Mount Kalaga", base: "Parque nacional do norte", cor: "#8b5cf6", x: 7180, y: 3603,
      texto: "Parque Nacional Mount Kalaga: mata fechada, rios e lagos no norte, antes da divisa do estado." }
  ],

  categorias: {
    lendario:    { nome: "Carros lendários",    cor: "#f5c542", icone: "carGold", ouro: true, meu: true },
    garlend:     { nome: "Garagens lendárias",  cor: "#f5c542", icone: "garageGold", ouro: true, meu: true },
    carta:       { nome: "Cartas douradas",     cor: "#f5c542", icone: "card", ouro: true, meu: true },
    casa:        { nome: "Esconderijos",        cor: "#7be38a", icone: "home" },
    garagem:     { nome: "Garagens",            cor: "#2de2e6", icone: "garage" },
    oficina:     { nome: "Oficinas",            cor: "#ff6b5f", icone: "wrench" },
    armas:       { nome: "Armas",               cor: "#ff3b3b", icone: "gun" },
    posto:       { nome: "Postos",              cor: "#ffe066", icone: "fuel" },
    comida:      { nome: "Restaurantes",        cor: "#ffb86b", icone: "food" },
    bar:         { nome: "Bares",               cor: "#ff7ab8", icone: "glass" },
    boate:       { nome: "Boates",              cor: "#ff3d8b", icone: "music" },
    hotel:       { nome: "Hotéis",              cor: "#f7a8ff", icone: "bed" },
    mercado:     { nome: "Mercados",            cor: "#9be15d", icone: "cart" },
    loja:        { nome: "Lojas",               cor: "#ff9a3c", icone: "bag" },
    roupas:      { nome: "Roupas",              cor: "#c58cff", icone: "shirt" },
    barbearia:   { nome: "Barbearias",          cor: "#5ad1ff", icone: "scissors" },
    tatuagem:    { nome: "Tatuagem",            cor: "#b36bff", icone: "pen" },
    saude:       { nome: "Saúde",               cor: "#ff5c7a", icone: "cross" },
    seguranca:   { nome: "Polícia e prisão",    cor: "#6f8dff", icone: "shield" },
    servico:     { nome: "Serviços públicos",   cor: "#b8c4ff", icone: "gov" },
    transporte:  { nome: "Transporte",          cor: "#8fd3ff", icone: "bus" },
    marina:      { nome: "Marinas",             cor: "#4fa8ff", icone: "anchor" },
    aereo:       { nome: "Aeroportos",          cor: "#e7e1ff", icone: "plane" },
    corrida:     { nome: "Corridas",            cor: "#ff7ad9", icone: "flag" },
    marco:       { nome: "Pontos turísticos",   cor: "#ffd23f", icone: "star" },
    natureza:    { nome: "Natureza",            cor: "#5fd39a", icone: "tree" },
    residencial: { nome: "Residências",         cor: "#9fb0c8", icone: "house" },
    industria:   { nome: "Indústria",           cor: "#a7a29a", icone: "factory" },
    outros:      { nome: "Prédios e outros",    cor: "#c9b6ff", icone: "building" }
  },

  /* notas próprias do ViceHub sobre locais do GTADB (chave = id do GTADB) */
  notas: {
    L172: "Clube noturno de Boobie Ike em Crosstown.",
    L190: "Boate do Downtown de Vice City.",
    L556: "Outra boate famosa do Downtown.",
    L2375: "Oficina de customização de carros em Crosstown.",
    L1781: "Loja de discos em Stockyard.",
    L2757: "Loja de eletrônicos em Rockridge.",
    L304: "Motel de beira de estrada que aparece nas capturas oficiais; esconderijo de um capítulo.",
    L326: "Estaleiro e marina de Brian Heder e da esposa, Lori.",
    L325: "Bar de Key Lento, ponto de encontro na ilha.",
    L281: "Autódromo de Port Gellhorn.",
    L1383: "Restaurante de beira de estrada com o letreiro famoso.",
    L2980: "Garagem para guardar veículos em Ocean Beach.",
    L2413: "Loja de armas e equipamentos de Port Gellhorn.",
    L354: "Base aérea na última ilha das Keys, no fim da estrada.",
    L317: "Ponte na costa de Port Gellhorn."
  },

  /* os locais do mapa vêm do GTADB (gtadb/landmarks.js) */
  locais: [],

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
    { n: "8F Drafter", m: "Obey", t: "carro", cl: "Cupê", real: null, spd: null, cor: "#6f8dff", s: "comunidade", nota: null },
    { n: "Akane", m: "Declasse", t: "carro", cl: "Cupê", real: null, spd: null, cor: "#ff7ab8", s: "comunidade", nota: null },
    { n: "Tsunami Zorrusso", m: "Granforma", t: "carro", cl: "Super", real: null, spd: null, cor: "#2de2e6", s: "comunidade", nota: "Adicionado em listas da comunidade em novembro de 2026." },
    { n: "Trash Rebel", m: "Karin", t: "carro", cl: "Picape", real: null, spd: null, cor: "#a7a29a", s: "comunidade", nota: null },
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
