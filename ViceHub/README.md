# ViceHub

Guia de fã de GTA VI para celular: mapa de Leonida com filtros, veículos com modelo 3D, garagens, esconderijos e informações do jogo.

O app é uma interface web (`app/src/main/assets/www`) aberta num WebView em tela cheia, travado em pé. O mesmo código vira o site depois.

## Estrutura

| Caminho | O que é |
|---|---|
| `app/src/main/java/.../MainActivity.java` | WebView em tela cheia (modo imersivo), botão voltar ligado à interface |
| `app/src/main/assets/www/index.html` | Telas do app |
| `app/src/main/assets/www/style.css` | Visual de vidro com as cores de Vice City |
| `app/src/main/assets/www/app.js` | Navegação 3D, mapa (zoom, pinça, filtros, busca, salvos), veículos, cenas 3D |
| `app/src/main/assets/www/data.js` | **Base de dados**: regiões, locais, categorias, veículos, garagens |
| `app/src/main/assets/www/three.min.js` | three.js r128 (MIT), embutido para funcionar offline |
| `tools/build_web.py` | Gera `web/vicehub.html` (site em um arquivo só) |

## Como compilar o APK

Abra a pasta `ViceHub` no AIDE ou no Android Studio e rode o módulo `app`. Não precisa de bibliotecas extras.

## Como adicionar locais e veículos

Edite `data.js`. Cada local tem `n` (nome), `c` (categoria), `r` (região), `x`/`y` (posição no mapa de 1000 × 1400), `s` (`oficial` ou `comunidade`) e `d` (descrição). O quadrante do mapa (A–J, 1–14) é calculado sozinho.

## Gerar o site

```
python3 ViceHub/tools/build_web.py          # embute o three.js
python3 ViceHub/tools/build_web.py --cdn    # carrega o three.js do cdnjs
```

## Aviso

Projeto de fã, sem ligação com a Rockstar Games ou a Take-Two. O mapa é uma ilustração própria, com posições aproximadas. Itens marcados como "comunidade" vêm de guias de jogadores e podem mudar.
