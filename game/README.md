# DeadSector

Extraction shooter com câmera de cima em perspectiva e visual **realista estilizado**: luz de fim de tarde, capim denso balançando ao vento (gerado na GPU), árvores com folhagem, névoa, bloom e desfoque tilt-shift. Personagens animados (andar, correr, mirar, recarregar, morrer) com capacete, colete, mochila e armas. Feito em Three.js, **mobile-first**, com níveis de qualidade automáticos (Baixo / Médio / Alto).

Cena de vitrine: `npm run dev` e abra `/?showcase` (use `&dist=10` para aproximar).

Créditos: manequim animado da Universal Animation Library de Quaternius (CC0) — ver `src/assets/CREDITS.md`. O resto é procedural.

## Como rodar

```bash
cd game
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/ (estático, pode hospedar em qualquer lugar)
```

## O loop

1. **Escolha uma facção:** Red Bears (N), Eagle Force (SO) ou Death Cult (SE).
2. **Base (safe zone jogável):** ande até os comerciantes, o comandante (missões) e o armário (stash). Dá para agachar, rolar e mirar; só atirar é proibido.
3. **Heliponto:** abre o mapa do setor de 1 km com as bases rivais e as bases comuns. Escolha a LZ, veja o tempo de voo e embarque. Vem um voo cinemático até a LZ (dá para pular), o pouso e o desembarque.
4. **Raid (40 min):** lootear caixas e corpos, enfrentar scavs, zumbis e operadores rivais.
5. **Extração:** no heliponto da sua base, numa base comum (₢ 3.000) ou na Clareira Oeste (₢ 4.000). Aperte **F**, segure a zona e embarque.
6. Se extrair, tudo o que está com você vai para o stash. Se morrer ou o tempo acabar, perde o que levou.

## Controles (celular)

- **Joystick (esquerda):** mover. Empurrar até o fim faz correr.
- **Arrastar no resto da tela:** girar a câmera em 360°. Pinça: zoom.
- **MIRAR:** levanta a arma, trava o personagem para a frente da câmera e mostra a linha de mira. Girar a câmera gira a mira, e dá para andar mirando. Pode ser "alternar" ou "segurar" (Configurações › Controles).
- **ATIRAR:** dispara. Sem mirar, é tiro rápido na direção em que você anda.
- **Agachar** e **rolar** (botões próprios). Ao mirar, a câmera desce para trás do ombro e olha à frente.
- Recarregar, curar, trocar arma, SAQUEAR/EXTRAIR (contextual), mochila, minimapa (abre o mapa), ☰ pausa.
- **Editor de HUD:** menu principal, pausa ou Configurações › Interface. Arraste os botões e ajuste tamanho e opacidade.

## Controles (PC)

| Ação | Tecla |
| --- | --- |
| Mover | WASD |
| Agachar | C |
| Rolar | Espaço |
| Mirar / atirar | Mouse / botão esquerdo |
| Correr | Shift |
| Recarregar | R |
| Curar | H |
| Interagir (loot, extração) | F |
| Inventário | Tab / I |
| Hotbar | 1–6 |
| Trocar arma | X |
| Girar câmera | Q / E (segurar) · roda do mouse = zoom |
| Mira precisa (linha) | Botão direito |
| Mapa | M |
| Pausa | Esc |
| Inventário: girar item | R ou botão direito durante o arrasto |
| Inventário: transferir rápido | Duplo-clique ou Ctrl+clique |

Também funciona com gamepad (analógicos para mover e mirar, RT atira).

## Estrutura

```
src/
  main.js            fluxo: título → facção → lobby → raid → resultado
  gfx/               renderização: personagens animados, capim/árvores, terreno, props, itens 3D, pós-processamento
  camera/            câmera de cima em perspectiva
  world/voxelLevel.js grade de células do mapa (dados de chão/paredes)
  raid/              mapa (geração, colisão, LOS, A*), atores, IA, loot, helicóptero, raid
  inventory/grid.js  grade estilo Tarkov
  ui/                tela de inventário (abas, personagem 3D, mochila, bolsos, saque/stash), comerciante, HUD, controles touch, ícones 3D
  data/              itens, facções, tabelas de loot
  save.js            progresso em localStorage
```

O hook `window.__game` expõe o estado para testes automatizados.

## Próximos passos

- Mapa maior, com streaming por chunks
- Multiplayer online (servidor autoritativo Node + WebSocket)
- Mochilas/rigs de tamanhos diferentes, modificação de armas, quests do comerciante
- Áudio posicional melhor e névoa de guerra por linha de visão
