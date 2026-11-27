# ViceHub

Guia de fã de GTA VI para celular: mapa oficial de Leonida com 1.123 locais, marcadores próprios (carros lendários, garagens lendárias, cartas douradas), veículos, contas e informações do jogo.

O app é uma interface web (`app/src/main/assets/www`) aberta num WebView em tela cheia, travado em pé. O mesmo código vira o site depois.

## Estrutura

| Caminho | O que é |
|---|---|
| `app/src/main/java/.../MainActivity.java` | WebView em tela cheia (modo imersivo), botão voltar ligado à interface |
| `app/src/main/assets/www/index.html` | Telas do app |
| `app/src/main/assets/www/style.css` | Visual de vidro com as cores de Vice City |
| `app/src/main/assets/www/app.js` | Abertura, contas, barra de navegação embaixo (Mapa, Locais, Veículos, Guia), mapa sem sobreposição de ícones, cartão com foto, visitados, filtros, marcadores próprios |
| `app/src/main/assets/www/config.js` | Chaves do login com Google, link do Discord e servidor de contas (vazios = "em breve") |
| `app/src/main/assets/www/img/regioes/` | Fotos das regiões (imagens do GTADB) |
| `app/src/main/assets/www/data.js` | **Base de dados**: regiões, locais, categorias, veículos, garagens |
| `app/src/main/assets/www/tiles/` | Mapa oficial do jogo em tiles (níveis 0–5), do GTADB |
| `app/src/main/assets/www/gtadb/` | 1.123 locais com nome (`landmarks.js`), lista de tiles e 760 fotos do jogo, do GTADB |
| `app/src/main/assets/www/img/leonida.jpg` | Mapa inteiro numa imagem (capa) |
| `tools/import_gtadb.py` | Importa/atualiza mapa, locais e fotos do repositório do GTADB |
| `app/src/main/assets/www/img/veiculos/` | Fotos dos veículos (veja abaixo) |
| `tools/build_web.py` | Gera `web/vicehub.html` (site em um arquivo só) |

## Como compilar o APK

Abra a pasta `ViceHub` no AIDE ou no Android Studio e rode o módulo `app`. Não precisa de bibliotecas extras.

## Mapa e locais (GTADB)

O mapa, os locais e as fotos vêm do [GTADB](https://map.gtadb.org) (gtadb.org e colaboradores), licença **CC BY 4.0**: pode usar, inclusive comercialmente, desde que o crédito apareça no app (ele aparece na tela inicial e na aba Leonida). O GTADB pede para não buscar dados ao vivo do site; por isso tudo vai embutido e a atualização é pelo git:

```
git clone --depth 1 --filter=blob:none --no-checkout https://github.com/rolux/gtadb.org
cd gtadb.org && git sparse-checkout set --no-cone /LICENSE-DATA /map/data/6/ "/map/photos/6/*,ig.jpg" \
  /maps/tiles/6/day/0/ /maps/tiles/6/day/1/ /maps/tiles/6/day/2/ /maps/tiles/6/day/3/ /maps/tiles/6/day/4/ /maps/tiles/6/day/5/ && git checkout
python3 ViceHub/tools/import_gtadb.py caminho/para/gtadb.org
```

Notas próprias por local ficam em `data.js` → `notas` (chave = id do GTADB, ex.: `L172`). Coordenadas em metros a partir do canto do recorte do mapa; quadrantes de 1 km.

## Contas

Depois da abertura aparece a tela de contas: **Entrar**, **Criar conta**, **Entrar como convidado**, **Continuar com Google** e **Discord**.
- Hoje o servidor de contas é `local`: a conta fica salva só no aparelho (bom para testar, não para produção).
- Para contas de verdade, ligue um servidor (Supabase ou Firebase) e troque o adaptador `VH_AUTH` em `app.js` (seção CONTAS). O resto do app não muda.
- **Google:** preencha `googleClientId` em `config.js` e implemente o login no adaptador (no Android, pelo SDK do Google ou pelo OAuth do Supabase). Enquanto estiver vazio, o botão mostra "em breve".
- **Discord:** coloque o convite em `discordUrl` em `config.js`. Enquanto estiver vazio, o botão mostra "em breve".

## Marcadores próprios (carros lendários, garagens lendárias, cartas douradas)

O GTADB não tem colecionáveis nem veículos. Por isso o botão dourado no mapa cria marcadores: o jogador toca no mapa, escolhe a categoria (as três douradas aparecem primeiro), dá um nome, uma anotação e, se quiser, uma foto. Eles ficam no aparelho, aparecem no mapa, em Locais e no atalho **Colecionáveis**, e podem ser marcados como coletados.

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

Projeto de fã, sem ligação com a Rockstar Games ou a Take-Two. Mapa, locais e fotos: GTADB (CC BY 4.0). Imagens do jogo © Rockstar Games. © 2026 Flow Labs Studio. Itens marcados como "comunidade" vêm de guias de jogadores e podem mudar.
