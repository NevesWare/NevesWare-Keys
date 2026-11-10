class_name Minimap
extends Control
## Minimapa (gira com a câmera, jogador no centro) ou mapa completo (norte
## para cima; tocar marca o GPS). Desenhado a partir do layout do CityBuilder.

signal tapped
signal waypoint_set(pos: Vector3)

const COLORS := {
	"tower": Color(0.36, 0.4, 0.5), "commercial": Color(0.55, 0.5, 0.45), "apartments": Color(0.6, 0.56, 0.5),
	"houses": Color(0.45, 0.55, 0.4), "favela": Color(0.7, 0.45, 0.32), "hospital": Color(0.85, 0.85, 0.88),
	"police": Color(0.35, 0.45, 0.75), "bank": Color(0.75, 0.65, 0.3), "plaza": Color(0.4, 0.62, 0.4),
	"gas": Color(0.75, 0.35, 0.3), "oficina": Color(0.5, 0.5, 0.55), "dealer": Color(0.45, 0.6, 0.75),
	"field": Color(0.48, 0.6, 0.3),
}

var full: bool = false
var world_scale: float = 0.55   # pixels por metro no minimapa
var world: Node                 # World: fornece player_map_state() e map_blips()
var _rects: Array = []          # [Rect2 (x,z), Color]


func _ready() -> void:
	clip_contents = true
	mouse_filter = Control.MOUSE_FILTER_STOP
	_rects.append([Rect2(-320, -320, 640, 640), Color(0.28, 0.42, 0.24)])
	_rects.append([Rect2(-262, -262, 524, 460), Color(0.17, 0.17, 0.19)])
	_rects.append([Rect2(262, -250, 40, 440), Color(0.5, 0.4, 0.3)])
	_rects.append([Rect2(-320, 198, 640, 14), Color(0.8, 0.78, 0.7)])
	_rects.append([Rect2(-320, 212, 640, 46), Color(0.86, 0.78, 0.58)])
	_rects.append([Rect2(-320, 258, 640, 80), Color(0.15, 0.4, 0.62)])
	for ix in range(CityBuilder.COLS):
		for iz in range(CityBuilder.ROWS):
			var c := CityBuilder.block_center(ix, iz)
			var kind := CityBuilder.block_type(ix, iz)
			var h := CityBuilder.BLOCK * 0.5
			_rects.append([Rect2(c.x - h, c.z - h, CityBuilder.BLOCK, CityBuilder.BLOCK), COLORS.get(kind, Color.GRAY)])


func _process(_delta: float) -> void:
	if is_visible_in_tree():
		queue_redraw()


func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if full:
			var w := _screen_to_world(event.position)
			waypoint_set.emit(w)
		else:
			tapped.emit()
		accept_event()


func _full_params() -> Array:
	var s := minf(size.x, size.y) / 620.0
	return [size * 0.5 - Vector2(0, -20) * s, s]   # centro do mapa em (0, -20)


func _screen_to_world(p: Vector2) -> Vector3:
	var fp := _full_params()
	var rel: Vector2 = (p - fp[0]) / float(fp[1])
	return Vector3(rel.x, 0.0, rel.y)


func _draw() -> void:
	if world == null:
		return
	var st: Dictionary = world.player_map_state()
	var ppos: Vector3 = st["pos"]
	var cam_yaw: float = st["cam_yaw"]
	var heading: float = st["heading"]
	var center := size * 0.5
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.05, 0.06, 0.08, 0.9))

	var origin := Vector2(ppos.x, ppos.z)
	var rot := cam_yaw
	var sc := world_scale
	var screen_center := center
	if full:
		var fp := _full_params()
		screen_center = fp[0]
		sc = fp[1]
		origin = Vector2.ZERO
		rot = 0.0
	draw_set_transform(screen_center, rot, Vector2(sc, sc))
	for r in _rects:
		var rect: Rect2 = r[0]
		draw_rect(Rect2(rect.position - origin, rect.size), r[1])
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

	var font := ThemeDB.fallback_font
	# blips: [pos, cor, letra, tamanho]
	for b in world.map_blips():
		var wp: Vector3 = b[0]
		var sp := (Vector2(wp.x, wp.z) - origin).rotated(rot) * sc + screen_center
		var col: Color = b[1]
		var rad: float = (b[3] if b.size() > 3 else 9.0) * (1.25 if full else 1.0)
		if not full:
			var lim := center - Vector2(rad, rad)
			var rel := sp - center
			if absf(rel.x) > lim.x or absf(rel.y) > lim.y:
				if b.size() > 4 and b[4]:   # alvo importante: fica preso na borda
					sp = center + rel.limit_length(1e6).clamp(-lim, lim)
				else:
					continue
		draw_circle(sp, rad + 2.0, Color(0, 0, 0, 0.7))
		draw_circle(sp, rad, col)
		var letter := String(b[2])
		if letter != "":
			draw_string(font, sp + Vector2(-rad, rad * 0.45), letter, HORIZONTAL_ALIGNMENT_CENTER, rad * 2.0,
				int(rad * 1.3), Color(0.05, 0.05, 0.05))

	# seta do jogador
	var pc := center if not full else Vector2(ppos.x, ppos.z) * sc + screen_center
	var ang := heading - rot if not full else heading
	var fwd := Vector2(-sin(ang), -cos(ang))
	var side := Vector2(-fwd.y, fwd.x)
	var tip := pc + fwd * 11.0
	var pts := PackedVector2Array([tip, pc - fwd * 7.0 + side * 7.0, pc - fwd * 3.0, pc - fwd * 7.0 - side * 7.0])
	draw_colored_polygon(pts, Color(1, 1, 1))
	draw_polyline(PackedVector2Array([pts[0], pts[1], pts[2], pts[3], pts[0]]), Color(0, 0, 0), 2.0, true)

	if not full:
		# "N" indicando o norte
		var n := Vector2(0, -1).rotated(rot) * (minf(size.x, size.y) * 0.5 - 14.0) + center
		draw_circle(n, 11.0, Color(0, 0, 0, 0.7))
		draw_string(font, n + Vector2(-11, 6), "N", HORIZONTAL_ALIGNMENT_CENTER, 22, 16, Color(1, 0.85, 0.3))
		draw_rect(Rect2(Vector2.ZERO, size), Color(1, 1, 1, 0.5), false, 2.0)
