# CONEXÃO RP — Etapa 01 MOBILE (personagem + toque + cenário de teste)

## Abrir / testar
1. Godot 4.3+ → importe `project.godot` → F5.
2. No PC, o mouse emula o toque (arraste nos botões/joystick). Teclado de teste: WASD, Shift, Espaço, C, Z, F.

## Controles de toque (paisagem)
- Joystick flutuante: toque na metade esquerda da tela. Empurre pouco = andar; empurre mais = correr.
- Arrastar em qualquer área livre (direita): gira a câmera.
- Botões: SOCO, PULAR, CORRER (segure = sprint), AGACHAR (liga/desliga), DEITAR (liga/desliga).
- Pular enquanto agachado/deitado: primeiro levanta. Multi-toque funciona (mover + socar + câmera).

## Animações (procedurais no rig provisório)
idle, andar, correr, sprint, pular (subida/queda + amortecer ao pousar), agachar (parado/andando), deitar e engatinhar, soco alternado (esq/dir). Bonecos de treino reagem ao soco.

## Arquivos
- `project.godot` — paisagem, renderer GL Compatibility (leve para celulares), mouse emula toque
- `Autoload/input_setup.gd` — ações do InputMap
- `Scripts/UI/touch_controls.gd` — joystick, botões e câmera por toque
- `Scripts/Player/player_controller.gd` — movimento, posturas, soco
- `Scripts/Player/camera_rig.gd` — câmera 3ª pessoa
- `Scripts/Player/humanoid_rig.gd` — corpo provisório + animações + suporte a modelo real
- `Scripts/Systems/test_world.gd`, `test_dummy.gd` + `Scenes/World/test_world.tscn`, `Scenes/Player/player.tscn`

## Exportar para Android
Editor → Manage Export Templates → instale. Instale JDK 17 + Android SDK e aponte em Editor Settings → Export → Android. Project → Export → Add → Android → Export APK. Ative USB debugging e use o botão "Remote Debug" para rodar direto no celular.

## Limitações honestas
- NÃO foi executado no Godot nem em celular (não há Godot no ambiente de geração). Podem surgir erros na primeira abertura; envie e eu corrijo.
- Personagem provisório (primitivas, juntas Node3D, sem Skeleton3D). Não é o modelo realista da referência.
- Deitado: a colisão é uma cápsula curta (aproximação); corpo deitado é maior que ela.
- Soco: detecção por esfera à frente (só atinge corpos com `take_damage`). Sem vida/dano em jogadores ainda.

## Modelo real (.glb)
Coloque em `Assets/Characters/`, selecione `Visual` em `player.tscn` e preencha `External Model Path`. Nomes de animação esperados: idle, walk, run, jump, crouch, prone, crawl, punch. Se de costas, `External Yaw Offset Deg` = 180.


## Mapa (original) — cidade fictícia brasileira
Gerado por `Scripts/Systems/city_builder.gd` (sem postes e sem árvores). Grade 8x7 de quarteirões:
- Centro: arranha-céus de vidro e escritório, banco, praça central com fonte e bancos.
- Norte: bairros residenciais (casas com muro, gramado e telhado), prédios de apartamentos, hospital.
- Delegacia, concessionária, oficina, posto de gasolina, lojas com toldos.
- Leste: favela densa com becos, caixas d'água e morro em degraus (pule para subir).
- Oeste: área rural com plantações, celeiro, casa de fazenda, cercas e fardos de feno.
- Sul: calçadão (padrão de ondas), quiosques, posto salva-vidas, areia, mar e molhe.
- Faixas de pedestre e sinalização de pista em todos os cruzamentos.
NÃO foi usado nenhum asset do GTA San Andreas. O FBX enviado (mapa de Los Santos) é conteúdo da Rockstar e não entra no projeto.
Limitação: ~600+ objetos; use o FPS do HUD para medir. Otimização (LOD, MultiMesh/mesclagem, chunks) fica para a Etapa 13.
Para sair: o mundo tem paredes invisíveis a 300 m do centro.
