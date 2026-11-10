class_name Hud
extends CanvasLayer
## HUD limpo e monocromático: radar realista + barras finas (vida, colete,
## fome, sede), dinheiro/relógio, botões-ícone (celular, chat, mapa),
## velocímetro, notificações, chat RP, mapa completo e tela de desmaio.

signal phone_pressed
signal chat_sent(text: String)
signal waypoint_set(pos: Vector3)
signal map_toggled(open: bool)

const RADAR_POS := Vector2(18, 18)
const RADAR_SIZE := Vector2(250, 165)

var world: Node
var minimap: Minimap
var full_map: Minimap

var _money: Label
var _bank: Label
var _clock: Label
var _job: Label
var _fps: Label
var _status: Control
var _speed_box: Control
var _speed: Label
var _speed_unit: Label
var _car_name: Label
var _car_bars: Control
var _car: Car
var _hint: PanelContainer
var _hint_label: Label
var _toasts: VBoxContainer
var _chat_log: VBoxContainer
var _chat_input: LineEdit
var _chat_row: HBoxContainer
var _map_layer: Control
var _faint_label: Label
var _faint_sub: Label
var _money_shown: float = -1.0


func _ready() -> void:
	layer = 5
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	# ---- radar + barras
	minimap = Minimap.new()
	minimap.world = world
	minimap.position = RADAR_POS
	minimap.size = RADAR_SIZE
	minimap.tapped.connect(open_map)
	root.add_child(minimap)
	_status = Control.new()
	_status.position = RADAR_POS + Vector2(0, RADAR_SIZE.y + 6)
	_status.size = Vector2(RADAR_SIZE.x, 22)
	_status.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_status.draw.connect(_draw_status)
	root.add_child(_status)

	# ---- canto superior direito
	var info := VBoxContainer.new()
	info.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	info.offset_left = -360
	info.offset_right = -22
	info.offset_top = 14
	info.add_theme_constant_override("separation", 0)
	info.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(info)
	_clock = Ui.label("", 15, 600, Ui.TEXT_DIM, HORIZONTAL_ALIGNMENT_RIGHT)
	_money = Ui.label("", 34, 700, Ui.TEXT, HORIZONTAL_ALIGNMENT_RIGHT)
	_bank = Ui.label("", 14, 400, Ui.TEXT_DIM, HORIZONTAL_ALIGNMENT_RIGHT)
	_job = Ui.label("", 14, 400, Ui.TEXT_DIM, HORIZONTAL_ALIGNMENT_RIGHT)
	_job.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_fps = Ui.label("", 11, 400, Ui.TEXT_FAINT, HORIZONTAL_ALIGNMENT_RIGHT)
	for l in [_clock, _money, _bank, _job, _fps]:
		info.add_child(l)

	# ---- botões-ícone
	var icons := HBoxContainer.new()
	icons.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	icons.offset_left = -190
	icons.offset_right = -22
	icons.offset_top = 150
	icons.alignment = BoxContainer.ALIGNMENT_END
	icons.add_theme_constant_override("separation", 10)
	root.add_child(icons)
	for def in [["phone", func() -> void: phone_pressed.emit()], ["chat", toggle_chat], ["map", open_map]]:
		icons.add_child(_icon_button(def[0], def[1]))

	# ---- notificações
	_toasts = VBoxContainer.new()
	_toasts.set_anchors_preset(Control.PRESET_CENTER_TOP)
	_toasts.offset_left = -270
	_toasts.offset_right = 270
	_toasts.offset_top = 20
	_toasts.add_theme_constant_override("separation", 6)
	_toasts.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_toasts)

	# ---- dica de interação (pílula)
	_hint = PanelContainer.new()
	_hint.add_theme_stylebox_override("panel", Ui.box(Color(0.03, 0.03, 0.035, 0.72), 22, 0))
	_hint.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_hint)
	var hm := MarginContainer.new()
	for side in ["left", "right"]:
		hm.add_theme_constant_override("margin_" + side, 20)
	for side in ["top", "bottom"]:
		hm.add_theme_constant_override("margin_" + side, 9)
	_hint.add_child(hm)
	_hint_label = Ui.label("", 17, 600)
	hm.add_child(_hint_label)
	_hint.visible = false

	# ---- velocímetro
	_speed_box = Control.new()
	_speed_box.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_speed_box.offset_left = -130
	_speed_box.offset_right = 130
	_speed_box.offset_top = -112
	_speed_box.offset_bottom = -12
	_speed_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_speed_box)
	_speed = Ui.label("0", 52, 700, Ui.TEXT, HORIZONTAL_ALIGNMENT_CENTER)
	_speed.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_speed.offset_bottom = 60
	_speed_box.add_child(_speed)
	_speed_unit = Ui.label("KM/H", 12, 600, Ui.TEXT_DIM, HORIZONTAL_ALIGNMENT_CENTER)
	_speed_unit.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_speed_unit.offset_top = 58
	_speed_unit.offset_bottom = 74
	_speed_box.add_child(_speed_unit)
	_car_bars = Control.new()
	_car_bars.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_car_bars.offset_top = 80
	_car_bars.offset_bottom = 84
	_car_bars.offset_left = 50
	_car_bars.offset_right = -50
	_car_bars.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_car_bars.draw.connect(_draw_car_bars)
	_speed_box.add_child(_car_bars)
	_car_name = Ui.label("", 11, 400, Ui.TEXT_FAINT, HORIZONTAL_ALIGNMENT_CENTER)
	_car_name.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_car_name.offset_top = 86
	_car_name.offset_bottom = 100
	_speed_box.add_child(_car_name)
	_speed_box.visible = false

	# ---- chat
	_chat_log = VBoxContainer.new()
	_chat_log.position = RADAR_POS + Vector2(0, RADAR_SIZE.y + 40)
	_chat_log.size = Vector2(430, 0)
	_chat_log.add_theme_constant_override("separation", 2)
	_chat_log.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_chat_log)
	_chat_row = HBoxContainer.new()
	_chat_row.set_anchors_preset(Control.PRESET_CENTER_TOP)
	_chat_row.offset_left = -290
	_chat_row.offset_right = 290
	_chat_row.offset_top = 70
	_chat_row.add_theme_constant_override("separation", 8)
	_chat_row.visible = false
	root.add_child(_chat_row)
	_chat_input = Ui.line_edit("Mensagem  ·  /me  /do  /ooc")
	_chat_input.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_chat_input.max_length = 140
	_chat_input.text_submitted.connect(func(_t: String) -> void: _send_chat())
	_chat_row.add_child(_chat_input)
	var send := Ui.button("Enviar", true, 17, 54)
	send.custom_minimum_size.x = 110
	send.pressed.connect(_send_chat)
	_chat_row.add_child(send)

	# ---- mapa completo
	_map_layer = Control.new()
	_map_layer.set_anchors_preset(Control.PRESET_FULL_RECT)
	_map_layer.visible = false
	root.add_child(_map_layer)
	var bg := ColorRect.new()
	bg.color = Color(0.02, 0.02, 0.025, 0.92)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	_map_layer.add_child(bg)
	full_map = Minimap.new()
	full_map.full = true
	full_map.world = world
	full_map.set_anchors_preset(Control.PRESET_FULL_RECT)
	full_map.waypoint_set.connect(func(p: Vector3) -> void: waypoint_set.emit(p))
	_map_layer.add_child(full_map)
	var mh := Ui.label("MAPA", 24, 700)
	mh.position = Vector2(32, 24)
	_map_layer.add_child(mh)
	var mh2 := Ui.label("Toque para marcar o GPS  ·  arraste para mover  ·  pinça para zoom", 14, 400, Ui.TEXT_DIM)
	mh2.position = Vector2(32, 56)
	_map_layer.add_child(mh2)
	var close := _icon_button("close", close_map)
	close.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	close.offset_left = -78
	close.offset_right = -26
	close.offset_top = 24
	close.offset_bottom = 76
	_map_layer.add_child(close)

	# ---- desmaio
	_faint_label = Ui.label("INCONSCIENTE", 64, 700, Ui.TEXT, HORIZONTAL_ALIGNMENT_CENTER)
	_faint_label.set_anchors_preset(Control.PRESET_CENTER)
	_faint_label.offset_left = -500
	_faint_label.offset_right = 500
	_faint_label.offset_top = -50
	_faint_label.visible = false
	root.add_child(_faint_label)
	_faint_sub = Ui.label("Levando você ao hospital…", 18, 400, Ui.TEXT_DIM, HORIZONTAL_ALIGNMENT_CENTER)
	_faint_sub.set_anchors_preset(Control.PRESET_CENTER)
	_faint_sub.offset_left = -500
	_faint_sub.offset_right = 500
	_faint_sub.offset_top = 30
	_faint_sub.visible = false
	root.add_child(_faint_sub)

	GameState.notify.connect(toast)
	Network.chat_received.connect(add_chat)


func _icon_button(kind: String, cb: Callable) -> Button:
	var b := Button.new()
	b.custom_minimum_size = Vector2(52, 52)
	b.focus_mode = Control.FOCUS_NONE
	b.add_theme_stylebox_override("normal", Ui.box(Color(0.03, 0.03, 0.035, 0.6), 26))
	b.add_theme_stylebox_override("hover", Ui.box(Color(0.1, 0.1, 0.11, 0.7), 26))
	b.add_theme_stylebox_override("pressed", Ui.box(Color(1, 1, 1, 0.9), 26))
	b.add_theme_stylebox_override("hover_pressed", Ui.box(Color(1, 1, 1, 0.9), 26))
	b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	b.draw.connect(func() -> void:
		var col := Color(0.05, 0.05, 0.06) if b.is_pressed() else Ui.TEXT
		Ui.draw_icon(b, kind, b.size * 0.5, 12.0, col))
	b.button_down.connect(b.queue_redraw)
	b.button_up.connect(b.queue_redraw)
	b.pressed.connect(Ui._click)
	b.pressed.connect(cb)
	return b


func _process(delta: float) -> void:
	var gs := GameState
	_clock.text = "%s  ·  %s" % [gs.weekday_text(), gs.clock_text()]
	# o dinheiro "rola" até o valor novo
	if _money_shown < 0.0:
		_money_shown = gs.money
	_money_shown = lerpf(_money_shown, float(gs.money), 1.0 - exp(-8.0 * delta))
	if absf(_money_shown - gs.money) < 1.0:
		_money_shown = gs.money
	_money.text = GameState.fmt_money(int(round(_money_shown)))
	_bank.text = "Banco  " + GameState.fmt_money(gs.bank)
	_fps.visible = bool(gs.settings.get("show_fps", true))
	if _fps.visible:
		_fps.text = "%d FPS" % Engine.get_frames_per_second()
	if world != null:
		_job.text = world.job_status_text()
	_status.queue_redraw()
	_faint_label.visible = gs.dead
	_faint_sub.visible = gs.dead
	if _speed_box.visible:
		_car_bars.queue_redraw()


func _draw_status() -> void:
	var gs := GameState
	var c := _status
	var w := c.size.x
	var gap := 4.0
	var hw := (w - gap) * 0.62
	_bar(c, Rect2(0, 0, hw, 5), gs.health / 100.0, Ui.DANGER if gs.health < 30.0 else Color(1, 1, 1, 0.92))
	_bar(c, Rect2(hw + gap, 0, w - hw - gap, 5), gs.armor / 100.0, Color(0.75, 0.8, 0.88, 0.9))
	var y := 12.0
	var half := (w - gap) * 0.5
	Ui.draw_icon(c, "food", Vector2(6, y + 3), 5.0, Ui.TEXT_DIM)
	_bar(c, Rect2(16, y, half - 16, 4), gs.hunger / 100.0, Ui.DANGER if gs.hunger < 15.0 else Color(1, 1, 1, 0.7))
	Ui.draw_icon(c, "drop", Vector2(half + gap + 6, y + 2), 5.0, Ui.TEXT_DIM)
	_bar(c, Rect2(half + gap + 16, y, half - 16, 4), gs.thirst / 100.0, Ui.DANGER if gs.thirst < 15.0 else Color(1, 1, 1, 0.7))


func _bar(c: CanvasItem, r: Rect2, v: float, col: Color) -> void:
	c.draw_rect(r, Color(0, 0, 0, 0.5))
	c.draw_rect(Rect2(r.position, Vector2(r.size.x * clampf(v, 0.0, 1.0), r.size.y)), col)


func _draw_car_bars() -> void:
	if _car == null:
		return
	var c := _car_bars
	var w := c.size.x
	var half := (w - 6.0) * 0.5
	_bar(c, Rect2(0, 0, half, 3), _car.fuel / 100.0, Ui.DANGER if _car.fuel < 15.0 else Color(1, 1, 1, 0.8))
	_bar(c, Rect2(half + 6.0, 0, half, 3), _car.engine_health / 100.0, Ui.DANGER if _car.engine_health < 25.0 else Color(1, 1, 1, 0.8))


func set_vehicle_info(car: Car) -> void:
	_car = car
	_speed_box.visible = car != null
	if car == null:
		return
	_speed.text = str(int(absf(car.speed) * 3.6))
	_car_name.text = "%s  ·  %s" % [car.display_name().to_upper(), car.plate]


func set_hint(text: String) -> void:
	_hint.visible = text != ""
	if text == "" or _hint_label.text == text:
		return
	_hint_label.text = text
	_hint.reset_size()
	await get_tree().process_frame
	var vs := _hint.get_viewport_rect().size
	_hint.position = Vector2((vs.x - _hint.size.x) * 0.5, vs.y - 196.0)


func toast(text: String, _color: Color = Color.WHITE) -> void:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", Ui.box(Color(0.03, 0.03, 0.035, 0.78), 12, 0))
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	p.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	var m := MarginContainer.new()
	m.add_theme_constant_override("margin_left", 18)
	m.add_theme_constant_override("margin_right", 18)
	m.add_theme_constant_override("margin_top", 9)
	m.add_theme_constant_override("margin_bottom", 9)
	p.add_child(m)
	var l := Ui.label(text, 16, 600, Ui.TEXT, HORIZONTAL_ALIGNMENT_CENTER)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	if text.length() > 48:
		l.custom_minimum_size.x = 480
	m.add_child(l)
	_toasts.add_child(p)
	while _toasts.get_child_count() > 3:
		_toasts.get_child(0).free()
	p.modulate.a = 0.0
	var tw := p.create_tween()
	tw.tween_property(p, "modulate:a", 1.0, 0.18)
	tw.tween_interval(3.2)
	tw.tween_property(p, "modulate:a", 0.0, 0.5)
	tw.tween_callback(p.queue_free)
	Sfx.ui_notify()


func add_chat(sender: String, text: String) -> void:
	var l := Ui.label("", 15, 400)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size = Vector2(430, 0)
	if text.begins_with("/me "):
		l.text = "* %s %s" % [sender, text.substr(4)]
		l.add_theme_font_override("font", Ui.font(600))
		l.add_theme_color_override("font_color", Color(0.85, 0.85, 0.9))
	elif text.begins_with("/do "):
		l.text = "* %s  (%s)" % [text.substr(4), sender]
		l.add_theme_font_override("font", Ui.font(600))
		l.add_theme_color_override("font_color", Color(0.85, 0.85, 0.9))
	elif text.begins_with("/ooc "):
		l.text = "(( %s: %s ))" % [sender, text.substr(5)]
		l.add_theme_color_override("font_color", Ui.TEXT_DIM)
	else:
		l.text = "%s: %s" % [sender, text]
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
