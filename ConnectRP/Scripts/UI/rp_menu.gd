class_name RpMenu
extends CanvasLayer
## Menu de opções grande, próprio para toque (banco, lanchonete, celular...).
## open(titulo, subtitulo, opcoes) — opcoes = [[texto, Callable, habilitado?], ...]
## O menu fecha antes de chamar a opção; para "continuar" no menu, a opção
## pode chamar open() de novo.

signal opened
signal closed

var is_open: bool = false
var _dim: ColorRect
var _panel: PanelContainer
var _title: Label
var _subtitle: Label
var _list: VBoxContainer


func _ready() -> void:
	layer = 30
	process_mode = Node.PROCESS_MODE_ALWAYS
	_dim = ColorRect.new()
	_dim.color = Color(0, 0, 0, 0.45)
	_dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	_dim.mouse_filter = Control.MOUSE_FILTER_STOP
	_dim.gui_input.connect(func(e: InputEvent) -> void:
		if e is InputEventMouseButton and e.pressed:
			close())
	add_child(_dim)

	_panel = PanelContainer.new()
	_panel.custom_minimum_size = Vector2(520, 0)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.06, 0.07, 0.1, 0.96)
	sb.border_color = Color(1.0, 0.7, 0.12)
	sb.border_width_top = 4
	sb.corner_radius_top_left = 14
	sb.corner_radius_top_right = 14
	sb.corner_radius_bottom_left = 14
	sb.corner_radius_bottom_right = 14
	sb.content_margin_left = 22
	sb.content_margin_right = 22
	sb.content_margin_top = 18
	sb.content_margin_bottom = 18
	_panel.add_theme_stylebox_override("panel", sb)
	add_child(_panel)

	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	_panel.add_child(v)
	_title = Label.new()
	_title.add_theme_font_size_override("font_size", 30)
	_title.add_theme_color_override("font_color", Color(1.0, 0.78, 0.2))
	v.add_child(_title)
	_subtitle = Label.new()
	_subtitle.add_theme_font_size_override("font_size", 18)
	_subtitle.add_theme_color_override("font_color", Color(0.8, 0.82, 0.88))
	_subtitle.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(_subtitle)

	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(0, 80)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	v.add_child(scroll)
	_list = VBoxContainer.new()
	_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_list.add_theme_constant_override("separation", 8)
	scroll.add_child(_list)

	var close_btn := _make_button("FECHAR", Color(0.3, 0.3, 0.35))
	close_btn.pressed.connect(close)
	v.add_child(close_btn)
	_set_visible(false)


static func style_button(b: Button, accent: Color) -> void:
	for st in ["normal", "hover", "pressed", "disabled", "focus"]:
		var sb := StyleBoxFlat.new()
		sb.bg_color = accent.darkened(0.55) if st != "pressed" else accent.darkened(0.25)
		if st == "disabled":
			sb.bg_color = Color(0.15, 0.15, 0.17)
		if st == "focus":
			sb.bg_color = Color(0, 0, 0, 0)
			sb.draw_center = false
		sb.border_color = accent
		sb.border_width_left = 3
		sb.corner_radius_top_left = 10
		sb.corner_radius_top_right = 10
		sb.corner_radius_bottom_left = 10
		sb.corner_radius_bottom_right = 10
		sb.content_margin_left = 16
		sb.content_margin_right = 16
		b.add_theme_stylebox_override(st, sb)
	b.add_theme_font_size_override("font_size", 22)
	b.add_theme_color_override("font_disabled_color", Color(0.5, 0.5, 0.5))


func _make_button(text: String, accent: Color) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(0, 58)
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	b.focus_mode = Control.FOCUS_NONE
	style_button(b, accent)
	return b


func open(title: String, subtitle: String, options: Array) -> void:
	_title.text = title
	_subtitle.text = subtitle
	_subtitle.visible = subtitle != ""
	for c in _list.get_children():
		c.queue_free()
	for opt in options:
		var b := _make_button(String(opt[0]), Color(1.0, 0.7, 0.12))
		var cb: Callable = opt[1]
		b.disabled = opt.size() > 2 and not bool(opt[2])
		b.pressed.connect(func() -> void:
			close()
			if cb.is_valid():
				cb.call())
		_list.add_child(b)
	var vh := _panel.get_viewport_rect().size.y
	var scroll := _list.get_parent() as ScrollContainer
	scroll.custom_minimum_size.y = minf(options.size() * 66.0, vh - 250.0)
	_set_visible(true)
	if not is_open:
		is_open = true
		opened.emit()
	_panel.size = Vector2.ZERO
	await get_tree().process_frame
	_panel.size = Vector2.ZERO
	_panel.position = ((_panel.get_viewport_rect().size - _panel.size) * 0.5).floor()


func close() -> void:
	if not is_open:
		return
	is_open = false
	_set_visible(false)
	closed.emit()


func _set_visible(v: bool) -> void:
	_dim.visible = v
	_panel.visible = v
