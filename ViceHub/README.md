# ViceHub

Guia de fã de GTA VI para celular: mapa de Leonida com filtros, veículos com modelo 3D, garagens, esconderijos e informações do jogo.

O app é uma interface web (`app/src/main/assets/www`) aberta num WebView em tela cheia, travado em pé. O mesmo código vira o site depois.

## Estrutura

| Caminho | O que é |
|---|---|
| `app/src/main/java/.../MainActivity.java` | WebView em tela cheia (modo imersivo), botão voltar ligado à interface |
| `app/src/main/assets/www/index.html` | Telas do app |
| `app/src/main/assets/www/style.css` | Visual de vidro com as cores de Vice City |
| `app/src/main/assets/www/app.js` | Abertura animada, navegação 3D, mapa (zoom, pinça, filtros, busca, salvos, editor), veículos com foto |
| `app/src/main/assets/www/data.js` | **Base de dados**: regiões, locais, categorias, veículos, garagens |
| `app/src/main/assets/www/img/mapa-leonida.jpg` | Imagem do mapa (troque por uma versão em alta com o mesmo enquadramento) |
| `app/src/main/assets/www/img/veiculos/` | Fotos dos veículos (veja abaixo) |
| `tools/build_web.py` | Gera `web/vicehub.html` (site em um arquivo só) |

## Como compilar o APK

Abra a pasta `ViceHub` no AIDE ou no Android Studio e rode o módulo `app`. Não precisa de bibliotecas extras.

## Como adicionar locais e veículos

Edite `data.js`. Cada local tem `n` (nome), `c` (categoria), `r` (região), `x`/`y` (posição no mapa de 1000 × 1400), `s` (`oficial` ou `comunidade`) e `d` (descrição). O quadrante do mapa (A–J, 1–14) é calculado sozinho.

## Editor do mapa (dentro do app)

No mapa, toque no lápis para ligar o editor. Com ele ligado:
- toque num ponto vazio do mapa para criar um local (nome, categoria, região);
- abra um local e use "Mover pin" para corrigir a posição;
- em Filtros → Editor do mapa → Exportar, copie o JSON e cole em `data.js` para publicar para todo mundo.

## Fotos dos veículos

Coloque a foto (JPG, de preferência 16:9, até ~300 KB) com o nome exato abaixo em `app/src/main/assets/www/img/veiculos/`. Sem foto, o app mostra uma silhueta com "Foto em breve". Use fotos que você tenha direito de usar (ex.: capturas que você mesmo tirou no jogo).

- Grotti Cheetah: `img/veiculos/grotti-cheetah.jpg`
- Pegassi Tempesta: `img/veiculos/pegassi-tempesta.jpg`
- Progen Emerus: `img/veiculos/progen-emerus.jpg`
- Invetero Coquette D10: `img/veiculos/invetero-coquette-d10.jpg`
- Albany Manana: `img/veiculos/albany-manana.jpg`
- Albany Buccaneer: `img/veiculos/albany-buccaneer.jpg`
- Truffade Thrax: `img/veiculos/truffade-thrax.jpg`
- Grotti Itali RSX: `img/veiculos/grotti-itali-rsx.jpg`
- Bravado Banshee: `img/veiculos/bravado-banshee.jpg`
- Vapid Stanier: `img/veiculos/vapid-stanier.jpg`
- Declasse Sabre Turbo: `img/veiculos/declasse-sabre-turbo.jpg`
- Karin Intruder: `img/veiculos/karin-intruder.jpg`
- Principe Alvino V1: `img/veiculos/principe-alvino-v1.jpg`
- LCC Avarus: `img/veiculos/lcc-avarus.jpg`
- Pegassi Bati 801: `img/veiculos/pegassi-bati-801.jpg`
- Shitzu PCJ-600: `img/veiculos/shitzu-pcj-600.jpg`
- Western Cliffhanger: `img/veiculos/western-cliffhanger.jpg`
- Dinka Double-T: `img/veiculos/dinka-double-t.jpg`
- Übermacht FCR 1000: `img/veiculos/ubermacht-fcr-1000.jpg`
- Western Nightblade: `img/veiculos/western-nightblade.jpg`
- Maibatsu Manchez: `img/veiculos/maibatsu-manchez.jpg`
- Maibatsu Sanchez: `img/veiculos/maibatsu-sanchez.jpg`
- Western Zombie Chopper: `img/veiculos/western-zombie-chopper.jpg`
- Western Sovereign 107: `img/veiculos/western-sovereign-107.jpg`
- Nagasaki Carbon RS: `img/veiculos/nagasaki-carbon-rs.jpg`
- Nagasaki SFB 1000: `img/veiculos/nagasaki-sfb-1000.jpg`
- Pegassi Faggio: `img/veiculos/pegassi-faggio.jpg`
- Dinka Enduro: `img/veiculos/dinka-enduro.jpg`
- Airboat 09: `img/veiculos/airboat-09.jpg`
- Shitzu Squalo: `img/veiculos/shitzu-squalo.jpg`
- Seashark: `img/veiculos/seashark.jpg`
- Dinghy: `img/veiculos/dinghy.jpg`
- Marquis: `img/veiculos/marquis.jpg`
- BTN Delmar: `img/veiculos/btn-delmar.jpg`
- S23: `img/veiculos/s23.jpg`
- Calder CB69 Horizon: `img/veiculos/calder-cb69-horizon.jpg`
- Reef Clipper II: `img/veiculos/reef-clipper-ii.jpg`
- Crest Kayak: `img/veiculos/crest-kayak.jpg`
- Maverick: `img/veiculos/maverick.jpg`
- Police Maverick: `img/veiculos/police-maverick.jpg`
- Buzzard: `img/veiculos/buzzard.jpg`
- Sea Sparrow: `img/veiculos/sea-sparrow.jpg`
- SuperVolito: `img/veiculos/supervolito.jpg`
- Swift: `img/veiculos/swift.jpg`
- Dodo: `img/veiculos/dodo.jpg`
- Duster: `img/veiculos/duster.jpg`
- Mammatus: `img/veiculos/mammatus.jpg`
- Nimbus: `img/veiculos/nimbus.jpg`
- Shamal: `img/veiculos/shamal.jpg`
- Jet: `img/veiculos/jet.jpg`

## Gerar o site

```
python3 ViceHub/tools/build_web.py   # embute mapa e fotos num arquivo só
```

## Aviso

Projeto de fã, sem ligação com a Rockstar Games ou a Take-Two. O mapa e as imagens do jogo pertencem aos seus donos; as posições dos locais são aproximadas. © 2026 Flow Labs Studio. Itens marcados como "comunidade" vêm de guias de jogadores e podem mudar.
