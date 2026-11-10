extends Control
## Menu principal do Connect RP: sobrevoo da cidade ao fundo, continuar,
## novo personagem (com prévia 3D), multiplayer, configurações e sair.

const WORLD_SCENE := "res://Scenes/World/world.tscn"

var _pages: Dictionary = {}
var _status: Label
var _name_edit: LineEdit
var _ip_edit: LineEdit
var _port_edit: LineEdit
var _preview_rig: HumanoidRig
var _preview_pivot: Node3D
var _look: Dictionary = {"skin": 2, "hair": 0, "top": 0, "pants": 0}
var _pending_online: String = ""
var _fly_cam: Camera3D
var _fly_t: float = 0.0
var _swatches: Dictionary = {}


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	GameState.playing = false
	_build_backdrop()
	_build_header()
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
		_preview_pivot.rotation.y += delta * 0.5
		_preview_rig.update_animation(delta, 0.0, true, 0.0, 0.0, 0.0)
	if _fly_cam != null:
		_fly_t += delta * 0.025
		var r := 150.0
		_fly_cam.position = Vector3(cos(_fly_t) * r, 55.0 + sin(_fly_t * 2.0) * 8.0, sin(_fly_t) * r - 40.0)
		_fly_cam.look_at(Vector3(0, 12, -40), Vector3.UP)


# ------------------------------------------------------------------ layout

func _build_backdrop() -> void:
	var quality := int(GameState.settings.get("quality", 1))
	if quality >= 1 and DisplayServer.get_name() != "headless":
		# a cidade de verdade ao fundo, no fim de tarde
		GameState.hours = 17.4
		var scene := Node3D.new()
		add_child(scene)
		var prof := GameState.quality_profile()
		CityBuilder.VIS_RANGE = 320.0
		CityBuilder.DETAILS = prof.get("details", true)
		var city := CityBuilder.new()
		scene.add_child(city)
		city.build()
		var dn := DayNight.new()
		scene.add_child(dn)
		prof["shadows"] = false
		dn.setup(prof, city)
		dn.set_process(false)
		_fly_cam = Camera3D.new()
		_fly_cam.far = 600.0
		_fly_cam.fov = 55.0
		scene.add_child(_fly_cam)
		_fly_cam.current = true
	else:
		var bg := ColorRect.new()
		bg.color = Color(0.04, 0.045, 0.05)
		bg.set_anchors_preset(Control.PRESET_FULL_RECT)
		add_child(bg)
	# escurece a esquerda para o texto ler bem
	var shade := TextureRect.new()
	var grad := Gradient.new()
	grad.colors = PackedColorArray([Color(0, 0, 0, 0.88), Color(0, 0, 0, 0.55), Color(0, 0, 0, 0.1)])
	grad.offsets = PackedFloat32Array([0.0, 0.45, 1.0])
	var gt := GradientTexture2D.new()
	gt.gradient = grad
	gt.fill_from = Vector2(0, 0.5)
	gt.fill_to = Vector2(1, 0.5)
	shade.texture = gt
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.stretch_mode = TextureRect.STRETCH_SCALE
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(shade)


func _build_header() -> void:
	var row := HBoxContainer.new()
	row.position = Vector2(72, 54)
	row.add_theme_constant_override("separation", 14)
	add_child(row)
	row.add_child(Ui.label("CONNECT", 64, 700))
	var rp := Ui.label("RP", 64, 400, Ui.TEXT_DIM)
	row.add_child(rp)
	var sub := Ui.label("ROLEPLAY  ·  MUNDO ABERTO  ·  MOBILE", 14, 600, Ui.TEXT_DIM)
	sub.position = Vector2(76, 136)
	add_child(sub)
	var line := ColorRect.new()
	line.color = Color(1, 1, 1, 0.5)
	line.position = Vector2(76, 166)
	line.size = Vector2(36, 2)
	add_child(line)
	_status = Ui.label("", 15, 400, Ui.TEXT_DIM)
	_status.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	_status.offset_left = 76
	_status.offset_top = -48
	_status.offset_right = 900
	add_child(_status)
	var ver := Ui.label("Etapa 03", 12, 400, Ui.TEXT_FAINT, HORIZONTAL_ALIGNMENT_RIGHT)
	ver.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	ver.offset_left = -160
	ver.offset_right = -28
	ver.offset_top = -40
	add_child(ver)


func _page(page_name: String) -> VBoxContainer:
	var v := VBoxContainer.new()
	v.position = Vector2(76, 196)
	v.custom_minimum_size = Vector2(400, 0)
	v.add_theme_constant_override("separation", 10)
	add_child(v)
	_pages[page_name] = v
	return v


func _btn(parent: Control, text: String, cb: Callable, primary: bool = false) -> Button:
	var b := Ui.button(text, primary, 18, 56)
	b.custom_minimum_size.x = 400
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	b.pressed.connect(cb)
	parent.add_child(b)
	return b


func _caption(parent: Control, text: String) -> Label:
	var l := Ui.label(text.to_upper(), 12, 600, Ui.TEXT_DIM)
	parent.add_child(l)
	return l


func _show(page_name: String) -> void:
	for k in _pages:
		_pages[k].visible = k == page_name
	if _pages.has("create_preview"):
		_pages["create_preview"].visible = page_name == "create"


func _build_main() -> void:
	var v := _page("main")
	var cont := _btn(v, "Continuar", _continue, true)
	cont.disabled = not GameState.has_save
	if not GameState.has_save:
		Ui.style_button(cont, false, 18)
	_btn(v, "Novo personagem", func() -> void: _show("create"), not GameState.has_save)
	_btn(v, "Multiplayer", func() -> void: _show("multiplayer"))
	_btn(v, "Configurações", func() -> void: _show("settings"))
	if not OS.has_feature("web"):
		_btn(v, "Sair", func() -> void: get_tree().quit())


func _build_create() -> void:
	var v := _page("create")
	v.add_theme_constant_override("separation", 6)
	_caption(v, "Nome do personagem")
	_name_edit = Ui.line_edit("Ex.: João Silva")
	_name_edit.max_length = 24
	v.add_child(_name_edit)
	for def in [["Pele", "skin", GameState.SKIN_COLORS], ["Cabelo", "hair", GameState.HAIR_COLORS],
			["Camisa / jaqueta", "top", GameState.TOP_COLORS], ["Calça", "pants", GameState.PANTS_COLORS]]:
		var sp := Control.new()
		sp.custom_minimum_size = Vector2(0, 4)
		v.add_child(sp)
		_caption(v, def[0])
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 8)
		v.add_child(row)
		var colors: Array = def[2]
		var key: String = def[1]
		_swatches[key] = []
		for i in range(colors.size()):
			var idx := i
			var sw := Button.new()
			sw.custom_minimum_size = Vector2(40, 40)
			sw.focus_mode = Control.FOCUS_NONE
			var c: Color = colors[i]
			sw.draw.connect(func() -> void:
				var center := sw.size * 0.5
				var selected := int(_look.get(key, 0)) == idx
				if c.r < 0.0:
					sw.draw_circle(center, 15.0, Color(0.27, 0.3, 0.2))
					sw.draw_circle(center + Vector2(-5, -4), 5.0, Color(0.16, 0.2, 0.12))
					sw.draw_circle(center + Vector2(5, 5), 6.0, Color(0.4, 0.37, 0.25))
				else:
					sw.draw_circle(center, 15.0, c)
				sw.draw_arc(center, 18.5, 0.0, TAU, 32, Color(1, 1, 1, 0.95 if selected else 0.18), 2.0 if selected else 1.0, true))
			for st in ["normal", "hover", "pressed", "focus", "hover_pressed"]:
				sw.add_theme_stylebox_override(st, StyleBoxEmpty.new())
			sw.pressed.connect(func() -> void:
				Ui._click()
				_look[key] = idx
				for o in _swatches[key]:
					(o as Control).queue_redraw()
				_preview_rig.apply_look(GameState.look_from(_look)))
			_swatches[key].append(sw)
			row.add_child(sw)
	var sp2 := Control.new()
	sp2.custom_minimum_size = Vector2(0, 8)
	v.add_child(sp2)
	var row2 := HBoxContainer.new()
	row2.add_theme_constant_override("separation", 10)
	v.add_child(row2)
	var back := Ui.button("Voltar", false, 18, 56)
	back.custom_minimum_size.x = 140
	back.pressed.connect(func() -> void: _show("main"))
	row2.add_child(back)
	var go := Ui.button("Criar e jogar", true, 18, 56)
	go.custom_minimum_size.x = 250
	go.pressed.connect(_create_and_play)
	row2.add_child(go)

	# prévia 3D girando (cartão à direita)
	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", Ui.box(Color(0.03, 0.03, 0.035, 0.55), 18, 0))
	card.set_anchors_preset(Control.PRESET_CENTER_RIGHT)
	card.offset_left = -470
	card.offset_right = -70
	card.offset_top = -270
	card.offset_bottom = 290
	add_child(card)
	var svc := SubViewportContainer.new()
	svc.stretch = true
	card.add_child(svc)
	var vp := SubViewport.new()
	vp.own_world_3d = true
	vp.transparent_bg = true
	vp.msaa_3d = Viewport.MSAA_4X
	svc.add_child(vp)
	var cam := Camera3D.new()
	cam.position = Vector3(0, 1.0, 3.3)
	cam.fov = 42.0
	vp.add_child(cam)
	var light := DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-30, 35, 0)
	light.light_energy = 1.2
	vp.add_child(light)
	var rim := DirectionalLight3D.new()
	rim.rotation_degrees = Vector3(-10, 200, 0)
	rim.light_energy = 0.6
	vp.add_child(rim)
	var env := WorldEnvironment.new()
	env.environment = Environment.new()
	env.environment.background_mode = Environment.BG_CLEAR_COLOR
	env.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.environment.ambient_light_color = Color(0.5, 0.5, 0.52)
	env.environment.tonemap_mode = Environment.TONE_MAPPER_ACES
	vp.add_child(env)
	_preview_pivot = Node3D.new()
	vp.add_child(_preview_pivot)
	_preview_rig = HumanoidRig.new()
	_preview_rig.rotation.y = PI
	_preview_pivot.add_child(_preview_rig)
	_preview_rig.apply_look(GameState.look_from(_look))
	_pages["create_preview"] = card


func _build_multiplayer() -> void:
	var v := _page("multiplayer")
	var info := Ui.label("Usa o personagem salvo (ou crie um antes).\nTodos na mesma rede Wi-Fi ou hotspot.", 15, 400, Ui.TEXT_DIM)
	v.add_child(info)
	if OS.has_feature("web"):
		info.text = "O multiplayer por IP não funciona no navegador.\nUse o app Android para jogar com amigos."
	_caption(v, "IP do servidor")
	_ip_edit = Ui.line_edit("192.168.0.10", "127.0.0.1")
	v.add_child(_ip_edit)
	_caption(v, "Porta")
	_port_edit = Ui.line_edit("7777", str(Network.DEFAULT_PORT))
	v.add_child(_port_edit)
	var sp := Control.new()
	sp.custom_minimum_size = Vector2(0, 6)
	v.add_child(sp)
	_btn(v, "Entrar", _join, true)
	_btn(v, "Hospedar partida", _host)
	_btn(v, "Voltar", func() -> void: _show("main"))


func _build_settings() -> void:
	var v := _page("settings")
	_caption(v, "Qualidade gráfica")
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	v.add_child(row)
	var names := ["Baixa", "Média", "Alta"]
	var btns: Array[Button] = []
	for i in range(3):
		var b := Ui.button(names[i], false, 17, 52)
		b.custom_minimum_size.x = 128
		row.add_child(b)
		btns.append(b)
	var refresh := func() -> void:
		for j in range(btns.size()):
			Ui.style_button(btns[j], int(GameState.settings["quality"]) == j, 17)
	for i in range(3):
		var qi := i
		btns[i].pressed.connect(func() -> void:
			GameState.settings["quality"] = qi
			GameState.save_settings()
			refresh.call())
	refresh.call()
	var note := Ui.label("Baixa: mais FPS em celulares simples.\nAlta: sombras, bloom e antisserrilhado.", 14, 400, Ui.TEXT_FAINT)
	v.add_child(note)
	var sp := Control.new()
	sp.custom_minimum_size = Vector2(0, 6)
	v.add_child(sp)
	_btn(v, "Voltar", func() -> void: _show("main"))


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
	if OS.has_feature("web"):
		_status.text = "Multiplayer indisponível na versão de navegador"
		return
	_ensure_character()
	var err := Network.host(int(_port_edit.text))
	if err != OK:
		_status.text = "Não foi possível abrir o servidor (erro %d)" % err
		return
	_enter_world()


func _join() -> void:
	if OS.has_feature("web"):
		_status.text = "Multiplayer indisponível na versão de navegador"
		return
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


## --autostart (novo jogo)  --continue  --autohost  --autojoin=IP  --name=Nome  --page=create
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
