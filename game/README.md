# Zona Rasa

Extraction shooter isométrico em **micro-voxels** (personagens e veículos com cubos de 5 cm, armas e itens com cubos de 2,5 cm), com sombras em tempo real. Feito em Three.js e pensado **mobile-first**; roda no navegador do celular e do PC.

Para ver a cena de vitrine (imagem do estilo): `npm run dev` e abra `/?showcase` (use `&zoom=6` para aproximar).

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
  vox/               construtor de modelos micro-voxel (AO por vértice) + modelos procedurais
  camera/            câmera isométrica ortográfica com pixel snapping
  world/             chão texturizado, blocos e props instanciados por chunk, iluminação/sombras
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
