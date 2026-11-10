extends Control
## Menu principal do Connect RP: continuar, novo personagem (com prévia 3D),
## multiplayer (hospedar / entrar por IP), configurações e sair.

const WORLD_SCENE := "res://Scenes/World/world.tscn"
const ACCENT := Color(1.0, 0.7, 0.12)

var _pages: Dictionary = {}
var _status: Label
var _name_edit: LineEdit
var _ip_edit: LineEdit
var _port_edit: LineEdit
var _preview_rig: HumanoidRig
var _preview_pivot: Node3D
var _look: Dictionary = {"skin": 2, "hair": 0, "top": 0, "pants": 0}
var _pending_online: String = ""


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	GameState.playing = false
	_build_background()
	_build_main()
	_build_create()
	_build_multiplayer()
	_build_settings()
	_show("main")
	Network.status_changed.connect(func(t: String) -> void: _status.text = t)
	multiplayer.connected_to_server.connect(_on_connected)
	_handle_cli()


func _process(delta: float) -> void:
	if _preview_pivot != null and _pages["create"].visible:
		_preview_pivot.rotation.y += delta * 0.6
		_preview_rig.update_animation(delta, 0.0, true, 0.0, 0.0, 0.0)


# ------------------------------------------------------------------ layout

func _build_background() -> void:
	var bg := TextureRect.new()
	var grad := Gradient.new()
	grad.colors = PackedColorArray([Color(0.06, 0.07, 0.12), Color(0.16, 0.09, 0.2), Color(0.45, 0.2, 0.12)])
	grad.offsets = PackedFloat32Array([0.0, 0.6, 1.0])
	var gt := GradientTexture2D.new()
	gt.gradient = grad
	gt.fill_from = Vector2(0, 0)
	gt.fill_to = Vector2(0.3, 1)
	bg.texture = gt
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.stretch_mode = TextureRect.STRETCH_SCALE
	add_child(bg)

	var title := Label.new()
	title.text = "CONNECT RP"
	title.add_theme_font_size_override("font_size", 86)
	title.add_theme_color_override("font_color", ACCENT)
	title.add_theme_color_override("font_outline_color", Color(0.1, 0.05, 0))
	title.add_theme_constant_override("outline_size", 14)
	title.position = Vector2(70, 50)
	add_child(title)
	var sub := Label.new()
	sub.text = "ROLEPLAY  •  MUNDO ABERTO  •  MOBILE"
	sub.add_theme_font_size_override("font_size", 22)
	sub.add_theme_color_override("font_color", Color(0.9, 0.9, 0.95))
	sub.position = Vector2(76, 160)
	add_child(sub)
	_status = Label.new()
	_status.add_theme_font_size_override("font_size", 18)
	_status.add_theme_color_override("font_color", Color(0.6, 0.85, 1.0))
	_status.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	_status.offset_left = 76
	_status.offset_top = -50
	_status.offset_right = 900
	add_child(_status)
	var ver := Label.new()
	ver.text = "Etapa 02"
	ver.add_theme_font_size_override("font_size", 14)
	ver.add_theme_color_override("font_color", Color(1, 1, 1, 0.5))
	ver.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	ver.offset_left = -120
	ver.offset_top = -34
	add_child(ver)


func _page(page_name: String) -> VBoxContainer:
	var v := VBoxContainer.new()
	v.position = Vector2(76, 215)
	v.custom_minimum_size = Vector2(420, 0)
	v.add_theme_constant_override("separation", 12)
	add_child(v)
	_pages[page_name] = v
	return v


func _btn(parent: Control, text: String, cb: Callable, accent: Color = ACCENT) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(420, 62)
	b.focus_mode = Control.FOCUS_NONE
	RpMenu.style_button(b, accent)
	b.add_theme_font_size_override("font_size", 24)
	b.pressed.connect(cb)
	parent.add_child(b)
	return b


func _caption(parent: Control, text: String) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", 18)
	l.add_theme_color_override("font_color", Color(0.85, 0.85, 0.9))
	parent.add_child(l)
	return l


func _edit(parent: Control, placeholder: String, value: String) -> LineEdit:
	var e := LineEdit.new()
	e.placeholder_text = placeholder
	e.text = value
	e.custom_minimum_size = Vector2(420, 54)
	e.add_theme_font_size_override("font_size", 22)
	parent.add_child(e)
	return e


func _show(page_name: String) -> void:
	for k in _pages:
		_pages[k].visible = k == page_name
	if _pages.has("create_preview"):
		_pages["create_preview"].visible = page_name == "create"


func _build_main() -> void:
	var v := _page("main")
	var cont := _btn(v, "CONTINUAR", _continue)
	cont.disabled = not GameState.has_save
	_btn(v, "NOVO PERSONAGEM", func() -> void: _show("create"))
	_btn(v, "MULTIPLAYER", func() -> void: _show("multiplayer"), Color(0.4, 0.65, 1.0))
	_btn(v, "CONFIGURAÇÕES", func() -> void: _show("settings"), Color(0.6, 0.6, 0.7))
	_btn(v, "SAIR", func() -> void: get_tree().quit(), Color(0.8, 0.3, 0.3))


func _build_create() -> void:
	var v := _page("create")
	v.add_theme_constant_override("separation", 8)
	_caption(v, "Nome do personagem")
	_name_edit = _edit(v, "Ex.: João Silva", "")
	_name_edit.max_length = 24
	for def in [["Pele", "skin", GameState.SKIN_COLORS], ["Cabelo", "hair", GameState.HAIR_COLORS],
			["Camisa / jaqueta", "top", GameState.TOP_COLORS], ["Calça", "pants", GameState.PANTS_COLORS]]:
		_caption(v, def[0])
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 6)
		v.add_child(row)
		var colors: Array = def[2]
		for i in range(colors.size()):
			var idx := i
			var key: String = def[1]
			var sw := Button.new()
			sw.custom_minimum_size = Vector2(46, 40)
			sw.focus_mode = Control.FOCUS_NONE
			var c: Color = colors[i]
			var sb := StyleBoxFlat.new()
			sb.bg_color = c if c.r >= 0.0 else Color(0.25, 0.3, 0.18)
			sb.set_corner_radius_all(8)
			sb.border_color = Color.WHITE
			sb.set_border_width_all(2)
			sw.add_theme_stylebox_override("normal", sb)
			sw.add_theme_stylebox_override("hover", sb)
			sw.add_theme_stylebox_override("pressed", sb)
			if c.r < 0.0:
				sw.text = "CAMU"
				sw.add_theme_font_size_override("font_size", 11)
			sw.pressed.connect(func() -> void:
				_look[key] = idx
				_preview_rig.apply_look(GameState.look_from(_look)))
			row.add_child(sw)
	var row2 := HBoxContainer.new()
	row2.add_theme_constant_override("separation", 10)
	v.add_child(row2)
	var back := _btn(row2, "VOLTAR", func() -> void: _show("main"), Color(0.6, 0.6, 0.7))
	back.custom_minimum_size = Vector2(160, 58)
	var go := _btn(row2, "CRIAR E JOGAR", _create_and_play, Color(0.3, 0.85, 0.4))
	go.custom_minimum_size = Vector2(250, 58)

	# prévia 3D girando
	var svc := SubViewportContainer.new()
	svc.stretch = true
	svc.set_anchors_preset(Control.PRESET_CENTER_RIGHT)
	svc.offset_left = -520
	svc.offset_right = -80
	svc.offset_top = -260
	svc.offset_bottom = 300
	add_child(svc)
	var vp := SubViewport.new()
	vp.own_world_3d = true
	vp.transparent_bg = true
	svc.add_child(vp)
	var cam := Camera3D.new()
	cam.position = Vector3(0, 1.05, 3.1)
	cam.fov = 45.0
	vp.add_child(cam)
	var light := DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-35, 25, 0)
	vp.add_child(light)
	var env := WorldEnvironment.new()
	env.environment = Environment.new()
	env.environment.background_mode = Environment.BG_CLEAR_COLOR
	env.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.environment.ambient_light_color = Color(0.55, 0.55, 0.6)
	vp.add_child(env)
	_preview_pivot = Node3D.new()
	vp.add_child(_preview_pivot)
	_preview_rig = HumanoidRig.new()
	_preview_rig.rotation.y = PI
	_preview_pivot.add_child(_preview_rig)
	_preview_rig.apply_look(GameState.look_from(_look))
	_pages["create_preview"] = svc


func _build_multiplayer() -> void:
	var v := _page("multiplayer")
	_caption(v, "Usa o personagem salvo (ou crie um antes).\nTodos na mesma rede Wi-Fi / hotspot.")
	_caption(v, "IP do servidor (para entrar)")
	_ip_edit = _edit(v, "192.168.0.10", "127.0.0.1")
	_caption(v, "Porta")
	_port_edit = _edit(v, "7777", str(Network.DEFAULT_PORT))
	_btn(v, "HOSPEDAR (Wi-Fi local)", _host, Color(0.3, 0.85, 0.4))
	_btn(v, "ENTRAR", _join, Color(0.4, 0.65, 1.0))
	_btn(v, "VOLTAR", func() -> void: _show("main"), Color(0.6, 0.6, 0.7))


func _build_settings() -> void:
	var v := _page("settings")
	_caption(v, "Qualidade gráfica (baixa = mais FPS no celular)")
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	v.add_child(row)
	var names := ["BAIXA", "MÉDIA", "ALTA"]
	var btns: Array[Button] = []
	for i in range(3):
		var b := _btn(row, names[i], func() -> void: pass, Color(0.4, 0.65, 1.0))
		b.custom_minimum_size = Vector2(136, 58)
		btns.append(b)
	var refresh := func() -> void:
		for j in range(btns.size()):
			btns[j].text = names[j] + (" ✓" if int(GameState.settings["quality"]) == j else "")
	for i in range(3):
		var qi := i
		btns[i].pressed.connect(func() -> void:
			GameState.settings["quality"] = qi
			GameState.save_settings()
			refresh.call())
	refresh.call()
	_btn(v, "VOLTAR", func() -> void: _show("main"), Color(0.6, 0.6, 0.7))


# ------------------------------------------------------------------ ações

func _continue() -> void:
	if GameState.load_game():
		_enter_world()


func _create_and_play() -> void:
	GameState.new_game(_name_edit.text, _look)
	GameState.save_game()
	_enter_world()


func _ensure_character() -> void:
	if not GameState.load_game():
		GameState.new_game(_name_edit.text if _name_edit.text != "" else "Cidadão", _look)


func _host() -> void:
	_ensure_character()
	var err := Network.host(int(_port_edit.text))
	if err != OK:
		_status.text = "Não foi possível abrir o servidor (erro %d)" % err
		return
	_enter_world()


func _join() -> void:
	_ensure_character()
	var err := Network.join(_ip_edit.text.strip_edges(), int(_port_edit.text))
	if err != OK:
		_status.text = "Erro ao conectar (%d)" % err
		return
	_pending_online = "join"


func _on_connected() -> void:
	if _pending_online == "join":
		_pending_online = ""
		_enter_world()


func _enter_world() -> void:
	get_tree().change_scene_to_file(WORLD_SCENE)


## --autostart (novo jogo)  --continue  --autohost  --autojoin=IP  --name=Nome
func _handle_cli() -> void:
	var cli := GameState.cli
	if cli.has("name"):
		_name_edit.text = String(cli["name"])
	if cli.has("page"):
		_show(String(cli["page"]))
	if cli.has("autostart"):
		GameState.new_game(_name_edit.text, _look)
		_enter_world.call_deferred()
	elif cli.has("continue"):
		_continue.call_deferred()
	elif cli.has("autohost"):
		_host.call_deferred()
	elif cli.has("autojoin"):
		_ip_edit.text = String(cli["autojoin"])
		_join.call_deferred()
