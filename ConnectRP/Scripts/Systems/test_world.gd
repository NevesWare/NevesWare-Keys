extends Node3D
## Mundo de teste: cidade original (CityBuilder), bonecos de treino, HUD e controles de toque.

const PlayerScene := preload("res://Scenes/Player/player.tscn")

var player: PlayerController
var touch: TouchControls
var _hud_label: Label


func _ready() -> void:
    _build_environment()
    var city := CityBuilder.new()
    add_child(city)
    city.build()
    _build_dummies()
    _spawn_player()
    touch = TouchControls.new()
    add_child(touch)
    touch.look_input.connect(player.camera_rig.rotate_look)
    _build_hud()


func _process(_delta: float) -> void:
    if player == null:
        return
    touch.set_active("crouch", player.stance == PlayerController.Stance.CROUCH)
    touch.set_active("prone", player.stance == PlayerController.Stance.PRONE)
    _hud_label.text = "CONEXÃO RP — Etapa 01 (mobile)\n%s | %.1f m/s | FPS %d" % [
        player.get_stance_name(), player.get_horizontal_speed(), Engine.get_frames_per_second()]


func _build_environment() -> void:
    var sky_mat := ProceduralSkyMaterial.new()
    var sky := Sky.new()
    sky.sky_material = sky_mat
    var env := Environment.new()
    env.background_mode = Environment.BG_SKY
    env.sky = sky
    env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
    env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
    env.fog_enabled = true
    env.fog_light_color = Color(0.75, 0.82, 0.9)
    env.fog_density = 0.0025
    var we := WorldEnvironment.new()
    we.environment = env
    add_child(we)

    var sun := DirectionalLight3D.new()
    sun.rotation_degrees = Vector3(-50, -30, 0)
    sun.shadow_enabled = true
    sun.directional_shadow_max_distance = 60.0
    add_child(sun)


func _build_dummies() -> void:
    for p in [Vector3(3, 0.03, 24), Vector3(-3, 0.03, 40), Vector3(0, 0.03, 56)]:
        var d := TestDummy.new()
        d.position = p
        add_child(d)


func _spawn_player() -> void:
    player = PlayerScene.instantiate() as PlayerController
    player.position = Vector3(0, 0.1, 32) # na avenida central, entre dois cruzamentos
    add_child(player)


func _build_hud() -> void:
    var layer := CanvasLayer.new()
    _hud_label = Label.new()
    _hud_label.position = Vector2(16, 12)
    _hud_label.add_theme_font_size_override("font_size", 20)
    layer.add_child(_hud_label)
    add_child(layer)
