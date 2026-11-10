class_name RpMenu
extends CanvasLayer
## Menu de opções para toque (banco, lanchonete, celular...), visual limpo.
## open(titulo, subtitulo, opcoes) — opcoes = [[texto, Callable, habilitado?], ...]
## O texto pode ter "|" para separar o valor à direita: "Hambúrguer|R$ 25".
## O menu fecha antes de chamar a opção; para continuar no menu, a opção
## chama open() de novo.

signal opened
signal closed

const WIDTH := 500.0

var is_open: bool = false
var _dim: ColorRect
var _panel: PanelContainer
var _title: Label
var _subtitle: Label
var _list: VBoxContainer
var _scroll: ScrollContainer


func _ready() -> void:
	layer = 30
	process_mode = Node.PROCESS_MODE_ALWAYS
	_dim = ColorRect.new()
	_dim.color = Color(0, 0, 0, 0.35)
	_dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	_dim.mouse_filter = Control.MOUSE_FILTER_STOP
	_dim.gui_input.connect(func(e: InputEvent) -> void:
		if e is InputEventMouseButton and e.pressed:
			close())
	add_child(_dim)

	_panel = PanelContainer.new()
	_panel.custom_minimum_size = Vector2(WIDTH, 0)
	_panel.add_theme_stylebox_override("panel", Ui.box(Color(0.03, 0.03, 0.035, 0.88), 16, 0))
	add_child(_panel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 0)
	_panel.add_child(v)

	# cabeçalho
	var head := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		head.add_theme_constant_override("margin_" + side, 22 if side != "bottom" else 14)
	v.add_child(head)
	var hv := VBoxContainer.new()
	hv.add_theme_constant_override("separation", 2)
	head.add_child(hv)
	var hrow := HBoxContainer.new()
	hv.add_child(hrow)
	_title = Ui.label("", 26, 700)
	_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hrow.add_child(_title)
	var x := Button.new()
	x.flat = true
	x.custom_minimum_size = Vector2(44, 44)
	x.focus_mode = Control.FOCUS_NONE
	x.draw.connect(func() -> void: Ui.draw_icon(x, "close", x.size * 0.5, 9.0, Ui.TEXT_DIM))
	x.pressed.connect(close)
	hrow.add_child(x)
	_subtitle = Ui.label("", 15, 400, Ui.TEXT_DIM)
	_subtitle.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hv.add_child(_subtitle)

	var sep := ColorRect.new()
	sep.color = Ui.LINE
	sep.custom_minimum_size = Vector2(0, 1)
	v.add_child(sep)

	_scroll = ScrollContainer.new()
	_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	v.add_child(_scroll)
	_list = VBoxContainer.new()
	_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_list.add_theme_constant_override("separation", 0)
	_scroll.add_child(_list)
	var foot := Control.new()
	foot.custom_minimum_size = Vector2(0, 10)
	v.add_child(foot)
	_set_visible(false)


func _row(text: String, cb: Callable, enabled: bool) -> Button:
	var b := Button.new()
	b.custom_minimum_size = Vector2(0, 58)
	b.focus_mode = Control.FOCUS_NONE
	b.disabled = not enabled
	var normal := StyleBoxEmpty.new()
	var hover := Ui.box(Color(1, 1, 1, 0.06), 0)
	var pressed := Ui.box(Color(1, 1, 1, 0.92), 0)
	for st in ["normal", "disabled", "focus"]:
		b.add_theme_stylebox_override(st, normal)
	b.add_theme_stylebox_override("hover", hover)
	b.add_theme_stylebox_override("pressed", pressed)
	b.add_theme_stylebox_override("hover_pressed", pressed)
	var parts := text.split("|", true, 1)
	var left := Ui.label(parts[0], 19, 600, Ui.TEXT if enabled else Ui.TEXT_FAINT)
	var right := Ui.label(parts[1] if parts.size() > 1 else "", 17, 400, Ui.TEXT_DIM if enabled else Ui.TEXT_FAINT,
		HORIZONTAL_ALIGNMENT_RIGHT)
	for l in [left, right]:
		l.set_anchors_preset(Control.PRESET_FULL_RECT)
		l.offset_left = 24
		l.offset_right = -24
		l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		b.add_child(l)
	b.button_down.connect(func() -> void:
		left.add_theme_color_override("font_color", Color(0.04, 0.04, 0.05))
		right.add_theme_color_override("font_color", Color(0.04, 0.04, 0.05, 0.7)))
	b.button_up.connect(func() -> void:
		left.add_theme_color_override("font_color", Ui.TEXT)
		right.add_theme_color_override("font_color", Ui.TEXT_DIM))
	b.pressed.connect(func() -> void:
		Ui._click()
		close()
		if cb.is_valid():
			cb.call())
	var line := ColorRect.new()
	line.color = Color(1, 1, 1, 0.06)
	line.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	line.offset_top = -1
	line.offset_left = 24
	line.offset_right = -24
	line.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_child(line)
	return b


func open(title: String, subtitle: String, options: Array) -> void:
	_title.text = title
	_subtitle.text = subtitle
	_subtitle.visible = subtitle != ""
	for c in _list.get_children():
		_list.remove_child(c)
		c.queue_free()
	for opt in options:
		var enabled: bool = not (opt.size() > 2 and not bool(opt[2]))
		_list.add_child(_row(String(opt[0]), opt[1], enabled))
	var vh := _panel.get_viewport_rect().size.y
	_scroll.custom_minimum_size.y = minf(options.size() * 58.0, vh - 230.0)
	_set_visible(true)
	if not is_open:
		is_open = true
		opened.emit()
	_panel.size = Vector2.ZERO
	await get_tree().process_frame
	_panel.size = Vector2.ZERO
	var vs := _panel.get_viewport_rect().size
	_panel.position = Vector2(maxf(24.0, vs.x * 0.5 - WIDTH * 0.5), ((vs.y - _panel.size.y) * 0.5)).floor()


func close() -> void:
	if not is_open:
		return
	is_open = false
	_set_visible(false)
	closed.emit()


func _set_visible(v: bool) -> void:
	_dim.visible = v
	_panel.visible = v
