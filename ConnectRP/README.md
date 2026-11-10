# Connect RP — Etapa 02 (mobile, Godot 4.3)

Roleplay em mundo aberto para celular, no estilo dos servidores RP (MTA / FiveM),
numa **cidade brasileira fictícia e original** (centro com arranha-céus, favela no
morro, bairros residenciais, zona rural e praia).

> O mapa **não** é uma cópia do San Andreas nem usa nada da Rockstar (modelos,
> texturas, nomes, mapa). Isso seria violação de direitos autorais e faria o app
> ser removido das lojas. O jogo segue o *gênero* (mundo aberto + RP), com mapa próprio.

## Abrir / testar
1. Godot **4.3** → Importar → `ConnectRP/project.godot` → F5.
2. No PC o mouse emula o toque. Teclado de teste:
   WASD mover/dirigir · Shift correr · Espaço pular/freio de mão · C agachar · Z deitar
   · F soco · **E usar / entrar e sair do carro** · M celular · N mapa · T chat · Esc fecha.

## O que tem na Etapa 02
| Sistema | Como funciona |
|---|---|
| Menu principal | Continuar, novo personagem (nome + pele/cabelo/roupa com prévia 3D), multiplayer, gráficos |
| Veículos | 4 modelos (Compacto, Sedã, Picape, Esportivo). Física arcade: aceleração, ré, freio de mão com derrapagem, combustível, dano no motor, faróis à noite |
| Trânsito | Carros da IA andam na faixa da direita pela grade de ruas, freiam para carros/pessoas e são reciclados perto do jogador |
| Pedestres | Andam pelas calçadas, caem com soco/atropelamento, levantam e fogem |
| Economia RP | Carteira + banco (depositar/sacar), pagamentos no débito |
| Necessidades | Fome e sede caem com o tempo; zeradas tiram vida. Desmaio → hospital (R$ 200) |
| Marcadores | Banco ($), Lanchonete/Conveniência (L), Hospital (H), Delegacia (D: CNH e colete), Agência de Empregos (E), Depósito (P), Concessionária (C), Posto (G) e Oficina (O) — os dois últimos abrem ao parar o carro no marcador |
| Empregos | **Entregador** (pega pacote no depósito e entrega em casas) e **Taxista** (busca e leva passageiros). Pagamento pela distância |
| Garagem | Carros comprados ficam salvos; chame pelo celular e ele aparece na rua mais próxima |
| HUD | Minimapa que gira com a câmera, barras de vida/colete/fome/sede, dinheiro, relógio, velocímetro, notificações |
| Mapa + GPS | Toque no minimapa ou em MAPA; tocar no mapa marca o GPS (feixe roxo no mundo) |
| Dia e noite | 1 dia = 24 min reais. À noite as janelas dos prédios acendem e os carros ligam os faróis |
| Chat RP | Fala normal, `/me`, `/do`, `/ooc` |
| Multiplayer | Wi-Fi local / hotspot: um hospeda, os outros entram pelo IP (porta 7777). Sincroniza posição, animação, roupa, carro e chat |
| Salvamento | Automático a cada 60 s, ao sair e ao minimizar o app |
| Gráficos | Baixa / Média / Alta (resolução 3D, sombras, distância de visão, nº de carros e pedestres) |

## Controles de toque
- **A pé:** joystick (metade esquerda, parte de baixo), arrastar à direita gira a câmera,
  SOCO, PULAR, CORRER, AGACHAR, DEITAR e o botão contextual USAR/ENTRAR.
- **No carro:** joystick vira o volante, ACELERAR, FREIO/RÉ, FREIO DE MÃO, SAIR.
  A câmera volta sozinha para trás do carro quando você para de arrastar.
- Botões no topo: CELULAR (mapa, garagem, salvar, configurações), CHAT e MAPA.

## Gerar o APK
**Automático (sem instalar nada):** cada push que mexe em `ConnectRP/` roda o workflow
`.github/workflows/connectrp-android.yml`. Baixe o APK em *GitHub → Actions → execução →
Artifacts → ConnectRP-debug-apk*. Também pode rodar manualmente (*Run workflow*).

**Manual:** Editor → Manage Export Templates (instalar) · JDK 17 + Android SDK em
Editor Settings → Export → Android · Project → Export → **Android** (preset já incluso,
com permissão de internet para o multiplayer) → Export APK.

## Multiplayer (como testar)
1. Todos no mesmo Wi-Fi (ou um celular roteando hotspot).
2. Quem hospeda: MULTIPLAYER → HOSPEDAR. O IP aparece nas configurações de Wi-Fi do aparelho.
3. Os outros: MULTIPLAYER → digite o IP → ENTRAR.

## Estrutura
```
Autoload/   input_setup.gd · game_state.gd (dinheiro, status, relógio, save) · network.gd (ENet + chat)
Scenes/     UI/main_menu.tscn · World/world.tscn · Player/player.tscn
Scripts/
  World/world.gd            mundo: spawns, marcadores, empregos, celular, rede
  Player/                   player_controller · humanoid_rig (aparência) · camera_rig
  Vehicles/                 car.gd (física + IA) · car_visual.gd (modelo procedural)
  NPCs/pedestrian.gd        pedestres
  Systems/                  city_builder · traffic_manager · day_night · interaction_point
  UI/                       hud · minimap · rp_menu · touch_controls · main_menu
  Multiplayer/remote_player.gd
```

## Testes automáticos (linha de comando)
```
godot -- --screenshot=tela.png --frames=120          # salva a tela e fecha
godot res://Scenes/World/world.tscn -- --drive --throttle=1 --hour=21 --debug
godot -- --autohost        |   godot -- --autojoin=127.0.0.1
```
Outros: `--pos=x,y,z --yaw=graus --job=taxista --license --map --phone --menu=banco`.

## Limitações honestas
- Validado no **Godot 4.3** (Linux, renderer Compatibility por software): sem erros de script,
  telas conferidas por screenshot, multiplayer testado com 2 instâncias na mesma máquina.
  **Ainda não rodou em celular real** — o FPS precisa ser medido no aparelho (HUD mostra FPS).
- O workflow do APK foi escrito mas não executado aqui; se falhar, mande o log.
- Personagens e carros são provisórios (primitivas). Dá para trocar por modelos `.glb`
  (veja `Assets/Characters/LEIA-ME.txt`).
- Sem sons ainda.
- Multiplayer é P2P em rede local: dinheiro/inventário ficam no aparelho de cada um
  (um servidor RP "de verdade" precisa de servidor dedicado com banco de dados — Etapa 04).
- Pedestres e trânsito não são sincronizados entre jogadores.

## Próximas etapas sugeridas
3. Sons (motor, buzina, passos, ambiente) e rádio no carro · modelos `.glb` de personagem/carro.
4. Servidor dedicado (Godot headless) com contas e economia autoritativa — base para um RP online.
5. Polícia e procurado, mais empregos (mecânico, gari, paramédico), casas para comprar, inventário.
6. Mapa maior em chunks (rodovia, segunda cidade, aeroporto) com LOD/MultiMesh para celulares fracos.
