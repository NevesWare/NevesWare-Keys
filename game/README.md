# Zona Rasa

Extraction shooter com câmera de cima em perspectiva e visual **realista estilizado**: luz de fim de tarde, capim denso balançando ao vento (gerado na GPU), árvores com folhagem, névoa, bloom e desfoque tilt-shift. Personagens animados (andar, correr, mirar, recarregar, morrer) com capacete, colete, mochila e armas. Feito em Three.js, **mobile-first**, com níveis de qualidade automáticos (Baixo / Médio / Alto).

Cena de vitrine: `npm run dev` e abra `/?showcase` (use `&dist=10` para aproximar).

Créditos: manequim animado da Universal Animation Library de Quaternius (CC0) — ver `public/models/CREDITS.md`. O resto é procedural.

## Como rodar

```bash
cd game
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/ (estático, pode hospedar em qualquer lugar)
```

## O loop

1. **Escolha uma facção:** Vanguarda de Ferro (NO), Coletivo Maré (NE) ou Ordem da Raiz (SO). Os scavs dominam o canto SE.
2. **Base (safe zone):** equipe arma, colete e mochila; mexa no **stash global** em grade; compre e venda no **comerciante**.
3. **Chame o helicóptero:** a inserção é perto do centro do mapa.
4. **Raid:** lootear caixas e corpos, enfrentar scavs e operadores das facções rivais (que também lutam entre si).
5. **Extração:** vá ao heliponto da sua facção ou à Clareira Norte, aperte **F** e segure a zona por 10 s.
6. Se extrair, tudo o que está com você vai para o stash. Se morrer ou o tempo (20 min) acabar, perde o que levou.

## Controles (celular)

- **Metade esquerda da tela:** joystick de movimento (empurrar até o fim = correr)
- **Metade direita:** joystick de mira; puxe além do anel interno para atirar (com leve auxílio de mira)
- Botões: Recarregar, Curar, Trocar arma, Mochila; botão SAQUEAR/EXTRAIR aparece quando há algo por perto
- Hotbar 1–6 tocável: arma principal, secundária e itens dos bolsos
- No inventário: arraste; toque duplo transfere; botão GIRAR aparece durante o arrasto

## Controles (PC)

| Ação | Tecla |
| --- | --- |
| Mover | WASD |
| Mirar / atirar | Mouse / botão esquerdo |
| Correr | Shift |
| Recarregar | R |
| Curar | H |
| Interagir (loot, extração) | F |
| Inventário | Tab / I |
| Hotbar | 1–6 |
| Trocar arma | X |
| Girar câmera | Q / E |
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
