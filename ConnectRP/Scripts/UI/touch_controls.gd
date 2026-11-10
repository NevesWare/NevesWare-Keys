class_name TouchControls
extends CanvasLayer
## Controles de toque: joystick flutuante (metade esquerda), botões de ação
## (direita) e arrastar na tela livre para girar a câmera. Multi-toque.
## Dispara as ações do InputMap (move_*, jump, crouch, prone, punch, sprint,
## interact, accelerate, brake). Dois layouts: a pé ("foot") e no carro ("car").

signal look_input(relative: Vector2)

const JOY_RADIUS := 95.0
const DEAD_ZONE := 0.12
const JOY_REGION := 0.45 # fração esquerda da tela onde nasce o joystick
const JOY_TOP := 0.3     # acima disso (minimapa) não nasce joystick

# ação, texto, distância da borda direita, distância da borda inferior, raio
const LAYOUTS := {
	"foot": [
		["punch", "SOCO", 120.0, 130.0, 64.0],
		["jump", "PULAR", 250.0, 85.0, 54.0],
		["sprint", "CORRER", 80.0, 270.0, 48.0],
		["crouch", "AGACHAR", 230.0, 215.0, 44.0],
		["prone", "DEITAR", 345.0, 150.0, 40.0],
		["interact", "USAR", 200.0, 340.0, 50.0],
	],
	"car": [
		["accelerate", "ACELERAR", 110.0, 140.0, 70.0],
		["brake", "FREIO / RÉ", 265.0, 90.0, 56.0],
		["jump", "FREIO MÃO", 255.0, 235.0, 46.0],
		["interact", "SAIR", 95.0, 300.0, 46.0],
	],
}

var BUTTONS: Array = LAYOUTS["foot"]
var mode: String = "foot"
## false = ignora toques (menu aberto).
var enabled: bool = true
var _labels: Dictionary = {}      # ação -> texto alternativo
var _hidden: Dictionary = {}      # ação -> true se escondido

var _canvas: Control
var _size: Vector2 = Vector2(1280, 720)
var _touches: Dictionary = {}     # índice do toque -> papel ("joy", "look", "btn:N")
var _joy_center: Vector2 = Vector2.ZERO
var _joy_knob: Vector2 = Vector2.ZERO
var _joy_active: bool = false
var _pressed: Dictionary = {}     # ação -> bool (visual)
var _active: Dictionary = {}      # ação -> bool (destaque de toggle)
var _axis_last: Dictionary = {}


func _ready() -> void:
	layer = 10
	_canvas = Control.new()
	_canvas.set_anchors_preset(Control.PRESET_FULL_RECT)
	_canvas.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_canvas.draw.connect(_on_draw)
	add_child(_canvas)
	get_viewport().size_changed.connect(_on_resize)
	_on_resize()


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		_release_all()


func set_mode(m: String) -> void:
	if m == mode or not LAYOUTS.has(m):
		return
	_release_all()
	mode = m
	BUTTONS = LAYOUTS[m]
	_canvas.queue_redraw()


func set_enabled(on: bool) -> void:
	if on == enabled:
		return
	enabled = on
	if not on:
		_release_all()
	_canvas.visible = on


func set_button_label(action: String, text: String) -> void:
	if _labels.get(action, "") != text:
		_labels[action] = text
		_canvas.queue_redraw()


func set_button_visible(action: String, vis: bool) -> void:
	if _hidden.get(action, false) == vis:
		_hidden[action] = not vis
		if not vis and _pressed.get(action, false):
			_pressed[action] = false
			_set_action(action, false)
		_canvas.queue_redraw()


func set_active(action: String, on: bool) -> void:
	if _active.get(action, false) != on:
		_active[action] = on
		if _canvas != null:
			_canvas.queue_redraw()


func _rest_pos() -> Vector2:
	return Vector2(170.0, _size.y - 170.0)


func _btn_pos(i: int) -> Vector2:
	return Vector2(_size.x - float(BUTTONS[i][2]), _size.y - float(BUTTONS[i][3]))


func _on_resize() -> void:
	_size = get_viewport().get_visible_rect().size
	if not _joy_active:
		_joy_center = _rest_pos()
		_joy_knob = _joy_center
	if _canvas != null:
		_canvas.queue_redraw()


# --------------------------------------------------------------------- input

func _input(event: InputEvent) -> void:
	if not enabled:
		return
	if event is InputEventScreenTouch:
		if event.pressed:
			_on_down(event.index, event.position)
		else:
			_on_up(event.index)
	elif event is InputEventScreenDrag:
		_on_drag(event.index, event.position, event.relative)


func _on_down(index: int, pos: Vector2) -> void:
	for i in range(BUTTONS.size()):
		if _hidden.get(String(BUTTONS[i][0]), false):
			continue
		if pos.distance_to(_btn_pos(i)) <= float(BUTTONS[i][4]) * 1.2:
			var action := String(BUTTONS[i][0])
			_touches[index] = "btn:%d" % i
			_pressed[action] = true
			_set_action(action, true)
			_canvas.queue_redraw()
			return
	if pos.x < _size.x * JOY_REGION and pos.y > _size.y * JOY_TOP and not _joy_active:
		_touches[index] = "joy"
		_joy_active = true
		_joy_center = pos
		_joy_knob = pos
		_canvas.queue_redraw()
		return
	_touches[index] = "look"


func _on_drag(index: int, pos: Vector2, rel: Vector2) -> void:
	var role: String = _touches.get(index, "")
	if role == "joy":
		var off := (pos - _joy_center).limit_length(JOY_RADIUS)
		_joy_knob = _joy_center + off
		var v := off / JOY_RADIUS
		if v.length() < DEAD_ZONE:
			v = Vector2.ZERO
		_apply_axes(v)
		_canvas.queue_redraw()
	elif role == "look":
		look_input.emit(rel)


func _on_up(index: int) -> void:
	var role: String = _touches.get(index, "")
	_touches.erase(index)
	if role == "joy":
		_joy_active = false
		_joy_center = _rest_pos()
		_joy_knob = _joy_center
		_apply_axes(Vector2.ZERO)
	elif role.begins_with("btn:"):
		var bi := int(role.substr(4))
		if bi >= BUTTONS.size():
			return
		var action := String(BUTTONS[bi][0])
		_pressed[action] = false
		_set_action(action, false)
	_canvas.queue_redraw()


func _release_all() -> void:
	_touches.clear()
	_joy_active = false
	_joy_center = _rest_pos()
	_joy_knob = _joy_center
	_apply_axes(Vector2.ZERO)
	for lay in LAYOUTS.values():
		for b in lay:
			if _pressed.get(String(b[0]), false):
				_pressed[String(b[0])] = false
				_set_action(String(b[0]), false)
	if _canvas != null:
		_canvas.queue_redraw()


func _apply_axes(v: Vector2) -> void:
	_axis("move_right", maxf(v.x, 0.0))
	_axis("move_left", maxf(-v.x, 0.0))
	_axis("move_back", maxf(v.y, 0.0))
	_axis("move_forward", maxf(-v.y, 0.0))


func _axis(action: String, strength: float) -> void:
	if is_equal_approx(float(_axis_last.get(action, 0.0)), strength):
		return
	_axis_last[action] = strength
	_set_action(action, strength > 0.0, strength)


func _set_action(action: String, pressed: bool, strength: float = 1.0) -> void:
	var ev := InputEventAction.new()
	ev.action = action
	ev.pressed = pressed
	ev.strength = strength if pressed else 0.0
	Input.parse_input_event(ev)


# -------------------------------------------------------------------- desenho

func _accent(action: String) -> Color:
	match action:
		"punch": return Color(0.96, 0.3, 0.25)
		"jump": return Color(0.3, 0.85, 0.45)
		"sprint": return Color(1.0, 0.8, 0.2)
		"crouch": return Color(0.3, 0.65, 1.0)
		"interact": return Color(1.0, 0.95, 0.95)
		"accelerate": return Color(0.3, 0.85, 0.45)
		"brake": return Color(0.96, 0.3, 0.25)
		_: return Color(0.72, 0.48, 1.0)


func _on_draw() -> void:
	var c := _canvas
	# ---- joystick
	c.draw_circle(_joy_center, JOY_RADIUS, Color(0.05, 0.06, 0.1, 0.35))
	c.draw_arc(_joy_center, JOY_RADIUS, 0.0, TAU, 64, Color(1, 1, 1, 0.5), 4.0, true)
	c.draw_arc(_joy_center, JOY_RADIUS * 0.62, 0.0, TAU, 48, Color(1, 1, 1, 0.15), 2.0, true)
	for dir in [Vector2.UP, Vector2.RIGHT, Vector2.DOWN, Vector2.LEFT]:
		var perp := Vector2(-dir.y, dir.x)
		var tip: Vector2 = _joy_center + dir * (JOY_RADIUS - 14.0)
		var pts := PackedVector2Array([tip - dir * 8.0 + perp * 7.0, tip, tip - dir * 8.0 - perp * 7.0])
		c.draw_polyline(pts, Color(1, 1, 1, 0.55), 3.0, true)
	c.draw_circle(_joy_knob + Vector2(0, 3), 40.0, Color(0, 0, 0, 0.25))
	c.draw_circle(_joy_knob, 40.0, Color(0.9, 0.95, 1.0, 0.55))
	c.draw_circle(_joy_knob, 26.0, Color(0.35, 0.7, 1.0, 0.85))
	c.draw_arc(_joy_knob, 33.0, PI * 1.15, PI * 1.85, 16, Color(1, 1, 1, 0.5), 3.0, true)

	# ---- botões de ação
	var font := ThemeDB.fallback_font
	for i in range(BUTTONS.size()):
		var action := String(BUTTONS[i][0])
		if _hidden.get(action, false):
			continue
		var r := float(BUTTONS[i][4])
		var p := _btn_pos(i)
		var col := _accent(action)
		var down: bool = _pressed.get(action, false)
		var on: bool = _active.get(action, false)
		var rr := r * (0.93 if down else 1.0)
		c.draw_circle(p + Vector2(0, 4), rr, Color(0, 0, 0, 0.25))
		c.draw_circle(p, rr, Color(0.06, 0.07, 0.1, 0.75 if down else 0.55))
		if down or on:
			c.draw_circle(p, rr - 4.0, Color(col.r, col.g, col.b, 0.4 if down else 0.3))
		c.draw_arc(p, rr - 2.0, 0.0, TAU, 48, Color(col.r, col.g, col.b, 0.95), 4.0, true)
		c.draw_arc(p, rr - 10.0, PI * 1.15, PI * 1.85, 24, Color(1, 1, 1, 0.28), 3.0, true)
		_draw_icon(action, p + Vector2(0, -rr * 0.12), rr * 0.4)
		c.draw_string(font, Vector2(p.x - rr, p.y + rr * 0.68), String(_labels.get(action, BUTTONS[i][1])),
			HORIZONTAL_ALIGNMENT_CENTER, rr * 2.0, 14, Color(1, 1, 1, 0.92))


func _draw_icon(action: String, o: Vector2, s: float) -> void:
	var c := _canvas
	var w := Color(1, 1, 1, 0.95)
	match action:
		"jump":
			for k in range(2):
				var y := s * (0.05 + 0.65 * k) - s * 0.3
				c.draw_polyline(PackedVector2Array([o + Vector2(-s, y + s * 0.6), o + Vector2(0, y - s * 0.2), o + Vector2(s, y + s * 0.6)]), w, 5.0, true)
		"sprint":
			for k in range(2):
				var x := s * (-0.45 + 0.8 * k)
				c.draw_polyline(PackedVector2Array([o + Vector2(x - s * 0.35, -s * 0.8), o + Vector2(x + s * 0.35, 0), o + Vector2(x - s * 0.35, s * 0.8)]), w, 5.0, true)
		"punch":
			c.draw_rect(Rect2(o + Vector2(-s * 0.8, -s * 0.2), Vector2(s * 1.6, s * 1.0)), w)
			for k in range(4):
				c.draw_circle(o + Vector2(-s * 0.6 + k * s * 0.4, -s * 0.25), s * 0.22, w)
			c.draw_circle(o + Vector2(-s * 0.85, s * 0.25), s * 0.22, w)
			c.draw_rect(Rect2(o + Vector2(-s * 0.5, s * 0.8), Vector2(s * 1.0, s * 0.3)), Color(1, 1, 1, 0.6))
		"crouch":
			c.draw_circle(o + Vector2(0, -s * 0.9), s * 0.25, w)
			c.draw_polyline(PackedVector2Array([o + Vector2(0, -s * 0.6), o + Vector2(-s * 0.25, 0), o + Vector2(s * 0.4, s * 0.1), o + Vector2(s * 0.4, s * 0.8)]), w, 5.0, true)
			c.draw_line(o + Vector2(0, -s * 0.4), o + Vector2(s * 0.45, -s * 0.2), w, 4.0, true)
		"accelerate":
			c.draw_colored_polygon(PackedVector2Array([o + Vector2(0, -s), o + Vector2(s * 0.85, s * 0.5), o + Vector2(-s * 0.85, s * 0.5)]), w)
		"brake":
			c.draw_colored_polygon(PackedVector2Array([o + Vector2(0, s * 0.8), o + Vector2(s * 0.85, -s * 0.6), o + Vector2(-s * 0.85, -s * 0.6)]), w)
		"interact":
			c.draw_arc(o, s * 0.8, 0.0, TAU, 24, w, 4.0, true)
			c.draw_circle(o, s * 0.3, w)
		"prone":
			c.draw_circle(o + Vector2(-s * 0.85, s * 0.05), s * 0.22, w)
			c.draw_polyline(PackedVector2Array([o + Vector2(-s * 0.6, s * 0.15), o + Vector2(s * 0.9, s * 0.3)]), w, 5.0, true)
			c.draw_polyline(PackedVector2Array([o + Vector2(-s * 0.4, s * 0.15), o + Vector2(-s * 0.2, -s * 0.25), o + Vector2(s * 0.15, 0)]), w, 4.0, true)
			c.draw_line(o + Vector2(-s, s * 0.6), o + Vector2(s, s * 0.6), Color(1, 1, 1, 0.5), 3.0, true)
