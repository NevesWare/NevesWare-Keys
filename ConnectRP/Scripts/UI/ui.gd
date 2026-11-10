class_name Ui
extends RefCounted
## Estilo visual único do Connect RP: limpo, monocromático (preto translúcido +
## branco), fonte Inter. Cor só quando tem função (vida baixa, por exemplo).

const BG := Color(0.03, 0.03, 0.035, 0.78)
const BG_SOFT := Color(0.03, 0.03, 0.035, 0.5)
const LINE := Color(1, 1, 1, 0.12)
const TEXT := Color(1, 1, 1, 0.94)
const TEXT_DIM := Color(1, 1, 1, 0.55)
const TEXT_FAINT := Color(1, 1, 1, 0.32)
const DANGER := Color(0.92, 0.28, 0.25)

static var _fonts: Dictionary = {}


## weight: 400 (texto), 600 (botões/títulos), 700 (números grandes)
static func font(weight: int = 400) -> Font:
	if not _fonts.has(weight):
		var path := "res://Assets/Fonts/Inter-%d.woff2" % weight
		var f: Font = load(path) if ResourceLoader.exists(path) else ThemeDB.fallback_font
		_fonts[weight] = f
	return _fonts[weight]


static func box(bg: Color, radius: int = 10, pad: int = 0, border: Color = Color(0, 0, 0, 0)) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.set_corner_radius_all(radius)
	sb.set_content_margin_all(pad)
	sb.anti_aliasing = true
	if border.a > 0.0:
		sb.border_color = border
		sb.set_border_width_all(1)
	return sb


static func label(text: String, size: int, weight: int = 400, color: Color = TEXT,
		align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_override("font", font(weight))
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.55))
	l.add_theme_constant_override("shadow_offset_x", 0)
	l.add_theme_constant_override("shadow_offset_y", 1)
	l.add_theme_constant_override("shadow_outline_size", 4)
	l.horizontal_alignment = align
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


## primary = botão branco sólido com texto preto (ação principal).
static func style_button(b: Button, primary: bool = false, size: int = 19) -> void:
	var normal := box(Color(1, 1, 1, 0.92) if primary else Color(1, 1, 1, 0.06), 10, 14)
	var hover := box(Color(1, 1, 1, 1.0) if primary else Color(1, 1, 1, 0.12), 10, 14)
	var pressed := box(Color(1, 1, 1, 0.75) if primary else Color(1, 1, 1, 0.9), 10, 14)
	var disabled := box(Color(1, 1, 1, 0.03), 10, 14)
	var focus := StyleBoxEmpty.new()
	b.add_theme_stylebox_override("normal", normal)
	b.add_theme_stylebox_override("hover", hover)
	b.add_theme_stylebox_override("pressed", pressed)
	b.add_theme_stylebox_override("hover_pressed", pressed)
	b.add_theme_stylebox_override("disabled", disabled)
	b.add_theme_stylebox_override("focus", focus)
	var fg := Color(0.05, 0.05, 0.06) if primary else TEXT
	b.add_theme_color_override("font_color", fg)
	b.add_theme_color_override("font_hover_color", fg)
	b.add_theme_color_override("font_pressed_color", Color(0.05, 0.05, 0.06))
	b.add_theme_color_override("font_hover_pressed_color", Color(0.05, 0.05, 0.06))
	b.add_theme_color_override("font_disabled_color", TEXT_FAINT)
	b.add_theme_font_override("font", font(600))
	b.add_theme_font_size_override("font_size", size)
	b.focus_mode = Control.FOCUS_NONE
	if not b.pressed.is_connected(_click):
		b.pressed.connect(_click)


static func _click() -> void:
	var tree := Engine.get_main_loop() as SceneTree
	if tree != null and tree.root.has_node("Sfx"):
		tree.root.get_node("Sfx").call("ui_click")


static func button(text: String, primary: bool = false, size: int = 19, min_h: float = 56.0) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(0, min_h)
	style_button(b, primary, size)
	return b


static func line_edit(placeholder: String, value: String = "") -> LineEdit:
	var e := LineEdit.new()
	e.placeholder_text = placeholder
	e.text = value
	e.custom_minimum_size = Vector2(0, 54)
	e.add_theme_font_override("font", font(400))
	e.add_theme_font_size_override("font_size", 20)
	e.add_theme_stylebox_override("normal", box(Color(1, 1, 1, 0.06), 10, 14, LINE))
	e.add_theme_stylebox_override("focus", box(Color(1, 1, 1, 0.1), 10, 14, Color(1, 1, 1, 0.5)))
	e.add_theme_color_override("font_color", TEXT)
	e.add_theme_color_override("font_placeholder_color", TEXT_FAINT)
	e.add_theme_color_override("caret_color", TEXT)
	return e


## Tema global (fonte e estilos padrão para qualquer Control).
static func make_theme() -> Theme:
	var t := Theme.new()
	t.default_font = font(400)
	t.default_font_size = 18
	t.set_color("font_color", "Label", TEXT)
	t.set_stylebox("panel", "PanelContainer", box(BG, 14, 20))
	return t


## Ícones simples desenhados em vetor (sem imagens): phone, chat, map, horn...
static func draw_icon(ci: CanvasItem, kind: String, c: Vector2, s: float, col: Color) -> void:
	var w := maxf(2.0, s * 0.16)
	match kind:
		"phone":
			ci.draw_rect(Rect2(c + Vector2(-s * 0.42, -s * 0.75), Vector2(s * 0.84, s * 1.5)), col, false, w)
			ci.draw_line(c + Vector2(-s * 0.15, s * 0.5), c + Vector2(s * 0.15, s * 0.5), col, w)
		"chat":
			ci.draw_rect(Rect2(c + Vector2(-s * 0.75, -s * 0.6), Vector2(s * 1.5, s * 1.0)), col, false, w)
			ci.draw_colored_polygon(PackedVector2Array([c + Vector2(-s * 0.4, s * 0.38), c + Vector2(-s * 0.05, s * 0.38), c + Vector2(-s * 0.45, s * 0.8)]), col)
		"map":
			var pts := PackedVector2Array([c + Vector2(-s * 0.8, -s * 0.55), c + Vector2(-s * 0.27, -s * 0.75), c + Vector2(s * 0.27, -s * 0.55),
				c + Vector2(s * 0.8, -s * 0.75), c + Vector2(s * 0.8, s * 0.55), c + Vector2(s * 0.27, s * 0.75), c + Vector2(-s * 0.27, s * 0.55),
				c + Vector2(-s * 0.8, s * 0.75), c + Vector2(-s * 0.8, -s * 0.55)])
			ci.draw_polyline(pts, col, w, true)
			ci.draw_line(c + Vector2(-s * 0.27, -s * 0.75), c + Vector2(-s * 0.27, s * 0.55), col, w * 0.7)
			ci.draw_line(c + Vector2(s * 0.27, -s * 0.55), c + Vector2(s * 0.27, s * 0.75), col, w * 0.7)
		"close":
			ci.draw_line(c + Vector2(-s * 0.55, -s * 0.55), c + Vector2(s * 0.55, s * 0.55), col, w, true)
			ci.draw_line(c + Vector2(s * 0.55, -s * 0.55), c + Vector2(-s * 0.55, s * 0.55), col, w, true)
		"horn":
			ci.draw_colored_polygon(PackedVector2Array([c + Vector2(-s * 0.8, -s * 0.25), c + Vector2(-s * 0.3, -s * 0.25),
				c + Vector2(s * 0.35, -s * 0.75), c + Vector2(s * 0.35, s * 0.75), c + Vector2(-s * 0.3, s * 0.25), c + Vector2(-s * 0.8, s * 0.25)]), col)
			ci.draw_arc(c + Vector2(s * 0.35, 0), s * 0.45, -0.8, 0.8, 10, col, w * 0.7, true)
		"heart":
			ci.draw_circle(c + Vector2(-s * 0.28, -s * 0.15), s * 0.32, col)
			ci.draw_circle(c + Vector2(s * 0.28, -s * 0.15), s * 0.32, col)
			ci.draw_colored_polygon(PackedVector2Array([c + Vector2(-s * 0.58, -s * 0.02), c + Vector2(s * 0.58, -s * 0.02), c + Vector2(0, s * 0.62)]), col)
		"shield":
			ci.draw_colored_polygon(PackedVector2Array([c + Vector2(-s * 0.55, -s * 0.6), c + Vector2(s * 0.55, -s * 0.6),
				c + Vector2(s * 0.5, s * 0.1), c + Vector2(0, s * 0.7), c + Vector2(-s * 0.5, s * 0.1)]), col)
		"food":
			ci.draw_arc(c + Vector2(0, s * 0.05), s * 0.6, PI, TAU, 14, col, w, true)
			ci.draw_line(c + Vector2(-s * 0.62, s * 0.15), c + Vector2(s * 0.62, s * 0.15), col, w)
			ci.draw_line(c + Vector2(-s * 0.55, s * 0.45), c + Vector2(s * 0.55, s * 0.45), col, w)
		"drop":
			ci.draw_circle(c + Vector2(0, s * 0.2), s * 0.42, col)
			ci.draw_colored_polygon(PackedVector2Array([c + Vector2(-s * 0.38, s * 0.05), c + Vector2(0, -s * 0.72), c + Vector2(s * 0.38, s * 0.05)]), col)
