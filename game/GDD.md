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
