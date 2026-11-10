class_name Minimap
extends Control
## Radar no estilo dos GTAs modernos: imagem real da cidade vista de cima
## (MapCapture), girando com a câmera, rota do GPS pelas ruas e ícones
## brancos. No modo `full` vira o mapa completo (norte para cima; tocar
## marca o GPS; arrastar move; pinça/roda dá zoom).

signal tapped
signal waypoint_set(pos: Vector3)

const FALLBACK := {
	"tower": Color(0.3, 0.32, 0.35), "commercial": Color(0.36, 0.35, 0.33), "apartments": Color(0.38, 0.37, 0.35),
	"houses": Color(0.33, 0.36, 0.31), "favela": Color(0.4, 0.35, 0.3), "field": Color(0.3, 0.36, 0.25),
}

var full: bool = false
var world_scale: float = 0.85    # pixels por metro no radar
var world: Node                  # World: player_map_state(), map_blips(), gps_route()
var _rects: Array = []
var _zoom: float = 1.0
var _pan: Vector2 = Vector2.ZERO
var _drag_from: Vector2
var _dragged: bool = false


func _ready() -> void:
	clip_contents = true
	mouse_filter = Control.MOUSE_FILTER_STOP
	_rects.append([Rect2(-320, -320, 640, 640), Color(0.24, 0.29, 0.22)])
	_rects.append([Rect2(-262, -262, 524, 460), Color(0.16, 0.16, 0.17)])
	_rects.append([Rect2(-320, 212, 640, 46), Color(0.5, 0.47, 0.4)])
	_rects.append([Rect2(-320, 258, 640, 80), Color(0.12, 0.2, 0.26)])
	for ix in range(CityBuilder.COLS):
		for iz in range(CityBuilder.ROWS):
			var c := CityBuilder.block_center(ix, iz)
			var kind := CityBuilder.block_type(ix, iz)
			var h := CityBuilder.BLOCK * 0.5
			_rects.append([Rect2(c.x - h, c.z - h, CityBuilder.BLOCK, CityBuilder.BLOCK), FALLBACK.get(kind, Color(0.34, 0.34, 0.34))])


func _process(_delta: float) -> void:
	if is_visible_in_tree():
		queue_redraw()


func _gui_input(event: InputEvent) -> void:
	if not full:
		if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
			tapped.emit()
			accept_event()
		return
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			_zoom = clampf(_zoom * 1.15, 1.0, 4.0)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			_zoom = clampf(_zoom / 1.15, 1.0, 4.0)
		elif event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				_drag_from = event.position
				_dragged = false
			elif not _dragged:
				waypoint_set.emit(_screen_to_world(event.position))
		accept_event()
	elif event is InputEventMouseMotion and (event.button_mask & MOUSE_BUTTON_MASK_LEFT):
		if event.position.distance_to(_drag_from) > 12.0:
			_dragged = true
		if _dragged:
			_pan += event.relative / (_full_scale())
		accept_event()
	elif event is InputEventMagnifyGesture:
		_zoom = clampf(_zoom * event.factor, 1.0, 4.0)
		accept_event()


func _full_scale() -> float:
	return minf(size.x, size.y) / 620.0 * _zoom


func _full_center() -> Vector2:
	return size * 0.5 + _pan * _full_scale()


func _screen_to_world(p: Vector2) -> Vector3:
	var rel := (p - _full_center()) / _full_scale()
	return Vector3(rel.x, 0.0, rel.y)


func _to_screen(wp: Vector3, origin: Vector2, rot: float, sc: float, center: Vector2) -> Vector2:
	return (Vector2(wp.x, wp.z) - origin).rotated(rot) * sc + center


func _draw() -> void:
	if world == null:
		return
	var st: Dictionary = world.player_map_state()
	var ppos: Vector3 = st["pos"]
	var center := size * 0.5
	var origin := Vector2(ppos.x, ppos.z)
	var rot: float = st["cam_yaw"]
	var sc := world_scale
	var sc_center := center + Vector2(0, size.y * 0.12)   # jogador um pouco abaixo do centro
	if full:
		sc = _full_scale()
		sc_center = _full_center()
		origin = Vector2.ZERO
		rot = 0.0
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.1, 0.13, 0.15))

	# ---- terreno (imagem de satélite ou fallback vetorial)
	draw_set_transform(sc_center, rot, Vector2(sc, sc))
	if MapCapture.texture != null:
		var r := MapCapture.world_rect()
		draw_texture_rect(MapCapture.texture, Rect2(r.position - origin, r.size), false)
	else:
		for rr in _rects:
			var rect: Rect2 = rr[0]
			draw_rect(Rect2(rect.position - origin, rect.size), rr[1])
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

	# ---- rota do GPS
	var route: PackedVector3Array = world.gps_route()
	if route.size() >= 2:
		var pts := PackedVector2Array()
		for p in route:
			pts.append(_to_screen(p, origin, rot, sc, sc_center))
		draw_polyline(pts, Color(0, 0, 0, 0.55), 7.0, true)
		draw_polyline(pts, Color(1, 1, 1, 0.92), 4.0, true)

	# ---- ícones
	var font := Ui.font(700)
	for b in world.map_blips():
		var sp := _to_screen(b[0], origin, rot, sc, sc_center)
		var rad: float = (b[2] if b.size() > 2 else 8.0) * (1.2 if full else 1.0)
		var sticky: bool = b.size() > 4 and b[4]
		if not full:
			var lim := Vector2(size.x - rad - 4.0, size.y - rad - 4.0)
			var mn := Vector2(rad + 4.0, rad + 4.0)
			if sp.x < mn.x or sp.y < mn.y or sp.x > lim.x or sp.y > lim.y:
				if not sticky:
					continue
				sp = sp.clamp(mn, lim)
		var letter: String = b[1]
		var filled: bool = b.size() > 3 and b[3]
		if filled:
			draw_circle(sp, rad + 1.5, Color(0, 0, 0, 0.6))
			draw_circle(sp, rad, Color(1, 1, 1, 0.95))
			_letter(font, sp, rad, letter, Color(0.05, 0.05, 0.06))
		else:
			draw_circle(sp, rad + 1.0, Color(0.04, 0.04, 0.05, 0.85))
			draw_arc(sp, rad, 0.0, TAU, 20, Color(1, 1, 1, 0.9), 1.6, true)
			_letter(font, sp, rad, letter, Color(1, 1, 1, 0.95))

	# ---- jogador
	var pc := sc_center if not full else _to_screen(ppos, origin, rot, sc, sc_center)
	var ang: float = (st["heading"] - rot) if not full else st["heading"]
	var fwd := Vector2(-sin(ang), -cos(ang))
	var side := Vector2(-fwd.y, fwd.x)
	var pts2 := PackedVector2Array([pc + fwd * 11.0, pc - fwd * 7.0 + side * 7.5, pc - fwd * 3.5, pc - fwd * 7.0 - side * 7.5])
	var outline := PackedVector2Array()
	for p in pts2:
		outline.append(pc + (p - pc) * 1.3)
	draw_colored_polygon(outline, Color(0, 0, 0, 0.7))
	draw_colored_polygon(pts2, Color(1, 1, 1))

	if not full:
		var n := Vector2(0, -1).rotated(rot)
		var edge := sc_center + n * 2000.0
		var npos := edge.clamp(Vector2(12, 12), size - Vector2(12, 12))
		draw_circle(npos, 9.0, Color(0.04, 0.04, 0.05, 0.85))
		draw_string(font, npos + Vector2(-9, 4.5), "N", HORIZONTAL_ALIGNMENT_CENTER, 18, 12, Color(1, 1, 1))
		draw_rect(Rect2(Vector2.ZERO, size), Color(0, 0, 0, 0.8), false, 3.0)
		draw_rect(Rect2(Vector2(1.5, 1.5), size - Vector2(3, 3)), Color(1, 1, 1, 0.12), false, 1.0)


func _letter(font: Font, p: Vector2, rad: float, letter: String, col: Color) -> void:
	if letter == "":
		return
	var fs := int(rad * 1.15)
	draw_string(font, p + Vector2(-rad, fs * 0.36), letter, HORIZONTAL_ALIGNMENT_CENTER, rad * 2.0, fs, col)
