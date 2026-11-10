# DeadSector — Game Design Document

> Versão 0.3 · documento vivo. As marcações **[feito]**, **[parcial]** e **[planejado]** indicam o estado na versão jogável atual.

## Identidade

| | |
| --- | --- |
| **Nome** | DeadSector |
| **Gênero** | Military Survival Extraction (PvPvE) |
| **Câmera** | 3D vista de cima, com rotação de 360° e zoom |
| **Plataforma** | Mobile primeiro, depois PC |
| **Tecnologia** | Navegador (Three.js). Pode ser empacotado como app Android/iOS. Multiplayer previsto com servidor Node/WebSocket. *(O GDD original citava Godot; decidimos continuar na web.)* |
| **Referências** | Escape from Tarkov, Arena Breakout, DayZ, Gray Zone Warfare |

**Regra de ouro:** entrar é fácil. Voltar vivo com o loot é o verdadeiro desafio.

## 1. Conceito

Um território isolado, tomado por zumbis, forças militares, instalações de pesquisa, vilarejos, florestas e pontos estratégicos. Três facções militares disputam o lugar, cada uma com uma base num extremo do mapa. O jogador escolhe uma facção, prepara o equipamento na base, entra no território de helicóptero, saqueia, combate e precisa extrair vivo.

## 2. Facções

| | Red Bears | Eagle Force | Death Cult |
| --- | --- | --- | --- |
| **Origem** | Rússia | EUA | Independente |
| **Perfil** | Militar | Militar | Extremista |
| **Combate** | Estratégico | Tático | Agressivo |
| **Identidade** | Força | Disciplina | Caçada |
| **Prioridade** | Sobrevivência | Controle | Eliminar rivais |
| **Lema** | *Strength Through War* | *Freedom Through Strength* | *No Mercy. No Survivors.* |
| **Base** | Norte | Sudoeste | Sudeste |
| **Cor** | Vermelho | Azul | Osso / preto |

- **Red Bears:** organização militar russa com base fortificada no território. Disciplina, armamento pesado e operações estratégicas.
- **Eagle Force:** força americana enviada para investigar e conter o desastre. Reconhecimento, operações táticas e tecnologia.
- **Death Cult:** grupo armado que usa o caos para dominar territórios. Recebe **contratos de caça** a jogadores, enquanto as outras facções recebem missões militares, de exploração e de recuperação. **[planejado]**

As três são adversárias permanentes. Cada uma tem identidade visual, uniforme, base, NPCs, comerciantes, missões e reputação próprios. O PvP é livre nas áreas de risco. **[parcial: identidade, base, comerciante e PvP com bots]**

## 3. Mundo

Um único mundo compartilhado e persistente (PvPvE).

| Região | Função |
| --- | --- |
| Norte | Base Red Bears |
| Sudoeste | Base Eagle Force |
| Sudeste | Base Death Cult |
| Centro ("Ground Zero") | Maior risco: ruínas, zumbis, melhor loot |
| Nordeste | Vila Scav |

Conteúdo do território: florestas densas e estradas, vilarejos e cidades abandonadas, aeroportos e bases militares, delegacias e hospitais, instalações subterrâneas, laboratórios, postos de controle, acampamentos, zonas infestadas e pontos de extração por helicóptero.

- **Tamanho:** começar menor e expandir. **[feito: 128×128 m]** Próximo passo: mapa por chunks com streaming. **[planejado]**

## 4. Regras oficiais

| Mecânica | Definição |
| --- | --- |
| Morte | Perde todo o equipamento e o loot levados na incursão **[feito]** |
| Corpos | Permanecem no chão e podem ser saqueados **[feito]** |
| Mundo | Um único mundo compartilhado **[planejado: online]** |
| Facções | Três facções em conflito livre **[feito com bots]** |
| Bases | Três bases permanentes (safe zones) **[feito]** |
| Extração | Helicóptero, com temporizador que pode ser interrompido **[feito]** |
| Inimigos | Jogadores, Scavs e zumbis **[feito com bots]** |

## 4b. Regras de sobrevivência e progressão (v0.5)

| Mecânica | Regra |
| --- | --- |
| Hidratação | Cai com o tempo, mais rápido correndo. Em 0, perde vida. Água recupera. **[feito]** |
| Energia | Cai com o tempo. Em 0, perde vida; com pouca energia, o fôlego volta devagar. Ração e energético recuperam. **[feito]** |
| Fôlego | Correr gasta fôlego; sem fôlego não dá para correr. O energético dá 30 s de fôlego extra. **[feito]** |
| Sangramento | Tiros (22%) e mordidas de zumbi (35%) podem causar sangramento contínuo até usar bandagem ou kit médico. **[feito]** |
| XP e nível | Abates (zumbi 10, Scav 30, operador 70), caixas saqueadas e extração (150 + valor do loot) dão XP. O XP fica mesmo se você morrer. **[feito]** |
| Desbloqueios | O comerciante libera itens por nível (Trovão nv 2, K-7 nv 3, Colete Pesado nv 4, Mochila Tática nv 5…). **[feito]** |
| Missões | Missões gerais e um contrato por facção (Death Cult: caça a operadores). Recompensas em créditos e XP, resgatadas na base. **[feito]** |
| Inserção | O jogador escolhe o ponto de entrada: Ground Zero, Norte, Sul, Leste ou Oeste. **[feito]** |
| Extração paga | A Clareira Oeste (neutra) cobra ₢ 4.000; o heliponto da facção é gratuito. **[feito]** |

## 4c. Safe zone jogável (v0.6)

A base não é uma tela: é um lugar dentro do jogo. Do menu principal você entra andando na safe zone da sua facção (as três bases seguem o mesmo padrão). Nela não há combate. **[feito]**

| Ponto | Função |
| --- | --- |
| Armeiro (barraca) | Compra e venda de armas e munição |
| Intendente (barraca) | Coletes, capacetes, mochilas e **trocas** (itens de loot por equipamento) |
| Médico (barraca) | Remédios, água e comida |
| Comandante (QG) | Missões e contratos |
| Armário | Stash global e equipamento |
| Heliponto | Escolher o ponto de inserção e embarcar no helicóptero |

Ao voltar de uma incursão, o jogador desembarca no heliponto da base.

## 4d. Setor de 1 km, inserção pelo mapa e câmera de mira (v0.7)

- **Mapa:** 1024 × 1024 m, fixo e persistente (como no DayZ). Só o loot e os inimigos mudam a cada incursão. Lugares: as bases Red Bears (N), Eagle Force (SO) e Death Cult (SE); Ground Zero (centro); Aeródromo Pha; Base Militar Kilo; Vila Norte; Serraria; Hospital São Lucas; Fazenda Velha; Posto Florestal; Porto Sul; Vila Leste; Acampamento Oeste; e a vila scav NE. Estradas ligam tudo.
- **Bases comuns:** heliponto com sacos de areia e suprimentos. Servem de ponto de pouso e de extração paga (₢ 3.000). A Clareira Oeste continua custando ₢ 4.000.
- **Inserção:** no heliponto da base abre o mapa do setor, com a sua base, as bases rivais, as bases comuns e o tempo de voo. Escolha a LZ e toque em EMBARCAR. O personagem entra no helicóptero e ele decola na base. Depois vem o voo cinemático até a LZ com contagem regressiva (dá para PULAR), o pouso, a animação de desembarque e o início do jogo. O relógio da incursão (40 min) só começa no pouso.
- **Extração:** o helicóptero pousa, o jogador embarca e o helicóptero sobe antes da tela de resultado.
- **Desempenho:** o mundo é dividido em regiões de 64 m e só as próximas são desenhadas. Inimigos aparecem quando o jogador chega a menos de 110 m e "dormem" além de 140 m.
- **Safe zone:** o HUD completo fica disponível. Dá para andar, correr, agachar, rolar, mirar, recarregar, trocar de arma e usar o inventário. Só atirar é bloqueado (botão com cadeado).
- **Agachar (C / botão):** metade da velocidade. Os inimigos te veem a 60–70% da distância normal.
- **Rolar (Espaço / botão):** esquiva rápida de 0,7 s que custa 15 de estamina.
- **Câmera de mira:** ao mirar, a câmera desce (~30°), aproxima por trás do ombro, sobe para a altura dos olhos e fecha um pouco o FOV, para ver mais longe na direção da mira.

## 4e. Terceira pessoa, visual HD e sons reais (v0.8)

- **Câmera:** terceira pessoa sobre o ombro (estilo DayZ/War Dogs). Arrastar gira para os lados e para cima/baixo; pinça muda a distância. A câmera encosta nas paredes para não atravessá-las.
- **Mira:** a cruz fica no centro da tela. Mirar aproxima a câmera do ombro e fecha o FOV. Tiro mirado ou do quadril vai para onde a cruz aponta; andando sem atirar, o personagem vira para onde anda. No PC, clicar captura o mouse para girar a câmera.
- **Visual HD:** texturas fotoescaneadas da Poly Haven (CC0) no chão, nas paredes de tijolo, pedra, madeira e concreto e na casca das árvores; céu HDRI real com iluminação de dia; modelos reais de caixas militares, galões, barris, barreiras de concreto, pneus, botijões, pedras, troncos caídos e carros cobertos.
- **Distância de visão** por nível gráfico: baixo 95 m, médio 135 m, alto 180 m.
- **Sons de arma gravados:** AK (K-7), MP5 (Vespa), pistola silenciada (P-9), AWM (sniper nova, e escopeta com tom mais grave). Rajadas tocam um disparo por tiro mais o eco no fim; tiros distantes soam abafados.
- **Nova arma:** Sniper AWM (.338 Lapua, 5 tiros, dano 95, alcance 70 m), nível 6 no comerciante e rara no loot.

## 6b. Tamanhos realistas no inventário (v0.6)

**1 célula ≈ 12,5 cm.** Cada item ocupa o tamanho real dele, e o tooltip mostra o tamanho em células e em cm. **[feito]**

| Item | Células | Real aprox. |
| --- | --- | --- |
| Fuzil K-7 | 7×2 | 88 cm |
| Escopeta Trovão | 8×2 | 100 cm |
| SMG Vespa | 4×2 | 50 cm |
| Pistola P-9 | 2×1 | 25 cm |
| Colete leve / pesado | 3×3 / 4×3 | |
| Mochila Assalto / Média / Tática (fechada → espaço interno) | 3×4 → 4×5 / 4×4 → 5×6 / 4×5 → 6×7 | |

Fuzis inteiros não cabem na mochila de assalto: vão no slot de arma ou no stash, como na vida real.

## 5. Fluxo da incursão

1. **Base da facção:** preparação, stash global, comerciante. **[feito]**
2. **Helicóptero de inserção:** escolha do ponto de entrada. **[parcial: inserção perto do centro]**
3. **Mundo aberto:** combate, exploração e coleta. **[feito]**
4. **Ponto de extração:** chamar o helicóptero e segurar a zona. **[feito]**
5. **Volta à base:** guardar, vender ou usar o loot. **[feito]**

Ideia: helicópteros de extração com horários, tempo de espera ou condições. **[planejado]**

## 6. Inventário e loot

Inspirado em Tarkov e Arena Breakout. **[feito]**
- Grade com itens de tamanhos diferentes, rotação e itens empilháveis.
- Slots: capacete, colete, mochila (com grade própria), arma principal, arma secundária, bolsos e hotbar 1–6.
- Stash global na base, peso transportado e valor em risco.

Categorias: armas, munições, proteção, medicina **[feito]** · sobrevivência (água/comida), ferramentas, eletrônicos, materiais, itens raros/de missão **[parcial]**.

## 7. Inteligência artificial

- **Scavs:** bots humanos armados que patrulham, protegem locais, investigam sons e combatem. **[feito]**
- **Operadores das facções rivais (bots):** guardas e patrulhas. **[feito]**
- **Zumbis:** percepção sonora e visual, perseguição, ataque corpo a corpo e hordas. Atacam qualquer humano. Tiros atraem zumbis. **[feito]**
- Confrontos dinâmicos entre Scavs, facções e zumbis, sem precisar do jogador. **[feito]**

## 8. Câmera e controles

- Câmera 3D vista de cima, rotação de 360° (arrastar) e zoom (pinça ou roda do mouse). **[feito]**
- Movimento em 8 direções com joystick virtual. **[feito]**
- **Mira (mobile):** o botão MIRAR levanta a arma e trava o personagem apontando para a frente da câmera, desenhando uma linha de mira. Girar a câmera gira a linha. Dá para andar enquanto mira. O tiro sai pelo botão ATIRAR. **[feito]**
- PC: WASD, mouse para mirar, botão direito para mira precisa. **[feito]**
- Vegetação e paredes ficam transparentes ao redor do jogador. **[feito]**
- Construções com interiores exploráveis. **[parcial]**

## 9. Interface

- Mobile-first, moderna, limpa e sem poluição visual. **[feito]**
- **Editor de HUD:** mover, redimensionar e mudar a opacidade de cada elemento, com opção de restaurar o padrão. **[feito]**
- Menu principal e configurações (gráficos, controles, áudio, HUD, perfil). **[feito]**

## 10. Progressão e economia

Reputação, missões, equipamentos, comerciantes desbloqueáveis, receitas de criação, melhorias do stash e conhecimento do território. **[parcial: dinheiro, comerciante e stash]**

## 11. Plano de desenvolvimento (MVP)

| Fase | Conteúdo | Estado |
| --- | --- | --- |
| 1. Protótipo | Câmera rotativa, personagem, movimento e mira, ambiente | feito |
| 2. Combate | Armas, vida, zumbis, Scavs | feito (ferimentos por parte do corpo: planejado) |
| 3. Loot e extração | Inventário em grade, mochilas, helicópteros | feito |
| 4. Base | Safe zone, comerciantes, stash; crafting e missões | parcial |
| 5. Multiplayer | Servidor, três facções online, sincronização | planejado |
| 6. Mundo completo | Mapa gigante, instalações militares, economia | planejado |

## 12. Decisões em aberto

1. Origem da Death Cult: ex-militares e mercenários que abandonaram suas organizações, ou grupo terrorista que já existia antes do apocalipse?
2. Scavs: só bots, ou também jogadores independentes?
3. Saúde: sistema de ferimentos por parte do corpo (sangramento, fraturas)?
4. Sobrevivência: fome e sede durante a incursão?
