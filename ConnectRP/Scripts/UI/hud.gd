class_name Hud
extends CanvasLayer
## HUD estilo servidor RP: minimapa + barras (vida, colete, fome, sede),
## dinheiro/banco/relógio/emprego, velocímetro, notificações, chat RP,
## botões de celular/chat/mapa, mapa completo com GPS e tela de desmaio.

signal phone_pressed
signal chat_sent(text: String)
signal waypoint_set(pos: Vector3)
signal map_toggled(open: bool)

var world: Node
var minimap: Minimap
var full_map: Minimap

var _money: Label
var _bank: Label
var _clock: Label
var _job: Label
var _fps: Label
var _bars: Dictionary = {}
var _speedo: Label
var _speedo_box: PanelContainer
var _fuel_bar: ProgressBar
var _engine_bar: ProgressBar
var _car_name: Label
var _hint: Label
var _toasts: VBoxContainer
var _chat_log: VBoxContainer
var _chat_input: LineEdit
var _chat_row: HBoxContainer
var _map_layer: Control
var _faint: ColorRect
var _faint_label: Label


func _ready() -> void:
	layer = 5
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	# ---- minimapa (canto superior esquerdo) + barras
	minimap = Minimap.new()
	minimap.world = world
	minimap.position = Vector2(16, 16)
	minimap.size = Vector2(230, 170)
	minimap.tapped.connect(open_map)
	root.add_child(minimap)
	var bars := VBoxContainer.new()
	bars.position = Vector2(16, 192)
	bars.size = Vector2(230, 0)
	bars.add_theme_constant_override("separation", 4)
	bars.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(bars)
	for def in [["health", Color(0.85, 0.2, 0.2)], ["armor", Color(0.3, 0.55, 0.95)],
			["hunger", Color(0.95, 0.6, 0.15)], ["thirst", Color(0.25, 0.8, 0.95)]]:
		var row := HBoxContainer.new()
		row.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var ic := Label.new()
		ic.text = {"health": "VIDA", "armor": "COLETE", "hunger": "FOME", "thirst": "SEDE"}[def[0]]
		ic.custom_minimum_size = Vector2(58, 0)
		ic.add_theme_font_size_override("font_size", 12)
		ic.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.9))
		ic.add_theme_constant_override("shadow_offset_x", 1)
		ic.add_theme_constant_override("shadow_offset_y", 1)
		row.add_child(ic)
		var pb := _bar(def[1])
		pb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(pb)
		bars.add_child(row)
		_bars[def[0]] = [row, pb]

	# ---- canto superior direito: relógio, dinheiro, banco, emprego
	var info := VBoxContainer.new()
	info.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	info.offset_left = -330
	info.offset_right = -18
	info.offset_top = 12
	info.alignment = BoxContainer.ALIGNMENT_BEGIN
	info.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(info)
	_clock = _label(26, Color(1, 1, 1), HORIZONTAL_ALIGNMENT_RIGHT)
	_money = _label(30, Color(0.45, 1.0, 0.5), HORIZONTAL_ALIGNMENT_RIGHT)
	_bank = _label(18, Color(0.7, 0.85, 1.0), HORIZONTAL_ALIGNMENT_RIGHT)
	_job = _label(17, Color(1.0, 0.85, 0.35), HORIZONTAL_ALIGNMENT_RIGHT)
	_job.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_fps = _label(13, Color(1, 1, 1, 0.6), HORIZONTAL_ALIGNMENT_RIGHT)
	for l in [_clock, _money, _bank, _job, _fps]:
		info.add_child(l)

	# ---- botões do topo (celular, chat, mapa)
	var btns := HBoxContainer.new()
	btns.set_anchors_preset(Control.PRESET_CENTER_TOP)
	btns.offset_left = -185
	btns.offset_right = 185
	btns.offset_top = 12
	btns.add_theme_constant_override("separation", 10)
	root.add_child(btns)
	for def in [["CELULAR", func() -> void: phone_pressed.emit()], ["CHAT", toggle_chat], ["MAPA", open_map]]:
		var b := Button.new()
		b.text = def[0]
		b.focus_mode = Control.FOCUS_NONE
		b.custom_minimum_size = Vector2(110, 48)
		RpMenu.style_button(b, Color(0.4, 0.6, 1.0))
		b.add_theme_font_size_override("font_size", 18)
		b.alignment = HORIZONTAL_ALIGNMENT_CENTER
		b.pressed.connect(def[1])
		btns.add_child(b)

	# ---- notificações (centro-alto)
	_toasts = VBoxContainer.new()
	_toasts.set_anchors_preset(Control.PRESET_CENTER_TOP)
	_toasts.offset_left = -260
	_toasts.offset_right = 260
	_toasts.offset_top = 74
	_toasts.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_toasts)

	# ---- dica de interação (centro-baixo)
	_hint = _label(22, Color(1, 1, 1), HORIZONTAL_ALIGNMENT_CENTER)
	_hint.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_hint.offset_left = -300
	_hint.offset_right = 300
	_hint.offset_top = -150
	_hint.add_theme_constant_override("outline_size", 8)
	_hint.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	root.add_child(_hint)

	# ---- velocímetro (centro-baixo, só no carro)
	_speedo_box = PanelContainer.new()
	_speedo_box.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_speedo_box.offset_left = -110
	_speedo_box.offset_right = 110
	_speedo_box.offset_top = -110
	_speedo_box.offset_bottom = -14
	var sbx := StyleBoxFlat.new()
	sbx.bg_color = Color(0.03, 0.04, 0.06, 0.7)
	sbx.set_corner_radius_all(12)
	sbx.content_margin_left = 10
	sbx.content_margin_right = 10
	sbx.content_margin_top = 4
	sbx.content_margin_bottom = 6
	_speedo_box.add_theme_stylebox_override("panel", sbx)
	_speedo_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_speedo_box)
	var sv := VBoxContainer.new()
	sv.add_theme_constant_override("separation", 2)
	_speedo_box.add_child(sv)
	_car_name = _label(13, Color(0.8, 0.8, 0.85), HORIZONTAL_ALIGNMENT_CENTER)
	_speedo = _label(34, Color(1, 1, 1), HORIZONTAL_ALIGNMENT_CENTER)
	_fuel_bar = _bar(Color(1.0, 0.75, 0.2))
	_engine_bar = _bar(Color(0.6, 0.85, 0.6))
	for c in [_car_name, _speedo, _fuel_bar, _engine_bar]:
		sv.add_child(c)
	_speedo_box.visible = false

	# ---- chat RP (esquerda, abaixo das barras)
	_chat_log = VBoxContainer.new()
	_chat_log.position = Vector2(16, 268)
	_chat_log.size = Vector2(420, 0)
	_chat_log.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_chat_log)
	_chat_row = HBoxContainer.new()
	_chat_row.position = Vector2(380, 70)
	_chat_row.size = Vector2(520, 50)
	_chat_row.visible = false
	root.add_child(_chat_row)
	_chat_input = LineEdit.new()
	_chat_input.placeholder_text = "Mensagem (/me, /do, /ooc)"
	_chat_input.custom_minimum_size = Vector2(400, 48)
	_chat_input.max_length = 140
	_chat_input.add_theme_font_size_override("font_size", 20)
	_chat_input.text_submitted.connect(func(_t: String) -> void: _send_chat())
	_chat_row.add_child(_chat_input)
	var send := Button.new()
	send.text = "ENVIAR"
	send.focus_mode = Control.FOCUS_NONE
	RpMenu.style_button(send, Color(0.3, 0.8, 0.4))
	send.custom_minimum_size = Vector2(110, 48)
	send.pressed.connect(_send_chat)
	_chat_row.add_child(send)

	# ---- mapa completo
	_map_layer = Control.new()
	_map_layer.set_anchors_preset(Control.PRESET_FULL_RECT)
	_map_layer.visible = false
	root.add_child(_map_layer)
	var bg := ColorRect.new()
	bg.color = Color(0, 0, 0, 0.8)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	_map_layer.add_child(bg)
	full_map = Minimap.new()
	full_map.full = true
	full_map.world = world
	full_map.set_anchors_preset(Control.PRESET_FULL_RECT)
	full_map.offset_left = 20
	full_map.offset_top = 20
	full_map.offset_right = -20
	full_map.offset_bottom = -20
	full_map.waypoint_set.connect(func(p: Vector3) -> void: waypoint_set.emit(p))
	_map_layer.add_child(full_map)
	var mh := _label(18, Color(1, 1, 1), HORIZONTAL_ALIGNMENT_LEFT)
	mh.text = "Toque no mapa para marcar o GPS"
	mh.position = Vector2(36, 30)
	_map_layer.add_child(mh)
	var close := Button.new()
	close.text = "FECHAR MAPA"
	close.focus_mode = Control.FOCUS_NONE
	RpMenu.style_button(close, Color(1.0, 0.7, 0.12))
	close.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	close.offset_left = -220
	close.offset_right = -36
	close.offset_top = 30
	close.offset_bottom = 84
	close.pressed.connect(close_map)
	_map_layer.add_child(close)

	# ---- desmaio
	_faint = ColorRect.new()
	_faint.color = Color(0.25, 0, 0, 0.0)
	_faint.set_anchors_preset(Control.PRESET_FULL_RECT)
	_faint.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_faint)
	_faint_label = _label(54, Color(1, 0.3, 0.3), HORIZONTAL_ALIGNMENT_CENTER)
	_faint_label.set_anchors_preset(Control.PRESET_CENTER)
	_faint_label.offset_left = -400
	_faint_label.offset_right = 400
	_faint_label.text = "VOCÊ DESMAIOU"
	_faint_label.visible = false
	root.add_child(_faint_label)

	GameState.notify.connect(toast)
	Network.chat_received.connect(add_chat)


func _label(size: int, color: Color, align: HorizontalAlignment) -> Label:
	var l := Label.new()
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.85))
	l.add_theme_constant_override("shadow_offset_x", 2)
	l.add_theme_constant_override("shadow_offset_y", 2)
	l.horizontal_alignment = align
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


func _bar(color: Color) -> ProgressBar:
	var pb := ProgressBar.new()
	pb.show_percentage = false
	pb.custom_minimum_size = Vector2(0, 11)
	pb.max_value = 100.0
	pb.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0, 0, 0, 0.6)
	bg.set_corner_radius_all(3)
	var fg := StyleBoxFlat.new()
	fg.bg_color = color
	fg.set_corner_radius_all(3)
	pb.add_theme_stylebox_override("background", bg)
	pb.add_theme_stylebox_override("fill", fg)
	return pb


func _process(_delta: float) -> void:
	var gs := GameState
	_clock.text = gs.clock_text()
	_money.text = GameState.fmt_money(gs.money)
	_bank.text = "Banco: " + GameState.fmt_money(gs.bank)
	_bars["health"][1].value = gs.health
	_bars["armor"][1].value = gs.armor
	_bars["armor"][0].visible = gs.armor > 0.0
	_bars["hunger"][1].value = gs.hunger
	_bars["thirst"][1].value = gs.thirst
	_fps.visible = bool(gs.settings.get("show_fps", true))
	if _fps.visible:
		_fps.text = "FPS %d" % Engine.get_frames_per_second()
	if world != null:
		_job.text = world.job_status_text()
	var faint_on := gs.dead
	_faint.color.a = lerpf(_faint.color.a, 0.7 if faint_on else 0.0, 0.08)
	_faint_label.visible = faint_on


func set_vehicle_info(car: Car) -> void:
	_speedo_box.visible = car != null
	if car == null:
		return
	_speedo.text = "%d km/h" % int(absf(car.speed) * 3.6)
	_car_name.text = "%s  •  %s" % [car.display_name(), car.plate]
	_fuel_bar.value = car.fuel
	_engine_bar.value = car.engine_health


func set_hint(text: String) -> void:
	_hint.text = text


func toast(text: String, color: Color = Color.WHITE) -> void:
	var l := _label(20, color, HORIZONTAL_ALIGNMENT_CENTER)
	l.text = text
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_toasts.add_child(l)
	while _toasts.get_child_count() > 4:
		_toasts.get_child(0).free()
	var tw := l.create_tween()
	tw.tween_interval(3.0)
	tw.tween_property(l, "modulate:a", 0.0, 0.8)
	tw.tween_callback(l.queue_free)


func add_chat(sender: String, text: String) -> void:
	var l := Label.new()
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size = Vector2(420, 0)
	l.add_theme_font_size_override("font_size", 17)
	l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.9))
	l.add_theme_constant_override("shadow_offset_x", 1)
	l.add_theme_constant_override("shadow_offset_y", 1)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if text.begins_with("/me "):
		l.text = "* %s %s" % [sender, text.substr(4)]
		l.add_theme_color_override("font_color", Color(0.85, 0.6, 1.0))
	elif text.begins_with("/do "):
		l.text = "* %s (( %s ))" % [text.substr(4), sender]
		l.add_theme_color_override("font_color", Color(0.6, 0.85, 1.0))
	elif text.begins_with("/ooc "):
		l.text = "(( [OOC] %s: %s ))" % [sender, text.substr(5)]
		l.add_theme_color_override("font_color", Color(0.75, 0.75, 0.75))
	else:
		l.text = "%s diz: %s" % [sender, text]
		l.add_theme_color_override("font_color", Color(1, 1, 1))
	_chat_log.add_child(l)
	while _chat_log.get_child_count() > 6:
		_chat_log.get_child(0).free()
	var tw := l.create_tween()
	tw.tween_interval(14.0)
	tw.tween_property(l, "modulate:a", 0.0, 1.0)
	tw.tween_callback(l.queue_free)


func toggle_chat() -> void:
	_chat_row.visible = not _chat_row.visible
	if _chat_row.visible:
		_chat_input.grab_focus()
	else:
		_chat_input.release_focus()


func is_typing() -> bool:
	return _chat_row.visible and _chat_input.has_focus()


func _send_chat() -> void:
	var t := _chat_input.text.strip_edges()
	_chat_input.text = ""
	_chat_row.visible = false
	_chat_input.release_focus()
	if t != "":
		chat_sent.emit(t)


func open_map() -> void:
	_map_layer.visible = true
	map_toggled.emit(true)


func close_map() -> void:
	_map_layer.visible = false
	map_toggled.emit(false)


func is_map_open() -> bool:
	return _map_layer.visible
