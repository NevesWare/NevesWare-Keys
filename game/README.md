# Zona Rasa

Extraction shooter isométrico em voxel, com visual pixel + dithering e paleta de 16 cores. Feito em Three.js, roda no navegador.

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

## Controles

| Ação | Tecla |
| --- | --- |
| Mover | WASD |
| Mirar / atirar | Mouse / botão esquerdo |
| Correr | Shift |
| Recarregar | R |
| Curar | H |
| Interagir (loot, extração) | F |
| Inventário | Tab / I |
| Girar câmera | Q / E |
| Inventário: girar item | R ou botão direito durante o arrasto |
| Inventário: transferir rápido | Duplo-clique ou Ctrl+clique |

Também funciona com gamepad (analógicos para mover e mirar, RT atira).

## Estrutura

```
src/
  main.js            fluxo: título → facção → lobby → raid → resultado
  render/            pipeline de pixel (render target baixo + shader de dithering/paleta/contorno)
  camera/            câmera isométrica ortográfica com pixel snapping
  world/             voxels → InstancedMesh
  raid/              mapa (geração, colisão, LOS, A*), atores, IA, loot, helicóptero, raid
  inventory/grid.js  grade estilo Tarkov
  ui/                inventário com drag & drop, lobby/comerciante, HUD, telas
  data/              itens, facções, tabelas de loot
  save.js            progresso em localStorage
```

O hook `window.__game` expõe o estado para testes automatizados.

## Próximos passos

- Mapa maior, com streaming por chunks
- Multiplayer online (servidor autoritativo Node + WebSocket)
- Mochilas/rigs de tamanhos diferentes, modificação de armas, quests do comerciante
- Áudio posicional melhor e névoa de guerra por linha de visão
