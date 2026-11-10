class_name CarVisual
extends Node3D
## Carro procedural com silhueta realista: a carroceria e a cabine são geradas
## extrudando o perfil lateral de cada modelo (capô inclinado, para-brisa,
## traseira), com vidros escuros reflexivos, faróis/lanternas emissivos, rodas
## com aro de raios e retrovisores. Frente do carro = -Z.

## len/wid: dimensões | hgt: altura da carroceria (até a linha da cintura)
## cab_*: cabine (vidros) | hood: altura relativa da frente do capô | wf/wr: inclinação
## do para-brisa / vidro traseiro (m) | wheel_r: raio da roda
const MODELS := {
	"compacto": {"len": 3.8, "wid": 1.72, "hgt": 0.62, "cab_len": 2.15, "cab_h": 0.6, "cab_off": 0.2, "wheel_r": 0.31,
		"hood": 0.8, "wf": 0.75, "wr": 0.35},
	"sedan": {"len": 4.65, "wid": 1.84, "hgt": 0.62, "cab_len": 2.5, "cab_h": 0.58, "cab_off": 0.15, "wheel_r": 0.34,
		"hood": 0.82, "wf": 0.95, "wr": 0.75},
	"picape": {"len": 5.25, "wid": 1.98, "hgt": 0.86, "cab_len": 1.95, "cab_h": 0.68, "cab_off": -0.75, "wheel_r": 0.42,
		"hood": 0.9, "wf": 0.7, "wr": 0.1, "bed": true},
	"esportivo": {"len": 4.45, "wid": 1.96, "hgt": 0.52, "cab_len": 2.1, "cab_h": 0.46, "cab_off": 0.3, "wheel_r": 0.35,
		"hood": 0.7, "wf": 1.05, "wr": 0.95},
}
const CLEARANCE := 0.26

static var _shared: Dictionary = {}

var model: String = "sedan"
var spec: Dictionary = {}
var _front_pivots: Array[Node3D] = []
var _spinners: Array[Node3D] = []
var _head_mat: StandardMaterial3D
var _tail_mat: StandardMaterial3D
var _spin: float = 0.0
var _lights_on: bool = false
var _spot: SpotLight3D


static func spec_of(m: String) -> Dictionary:
	return MODELS.get(m, MODELS["sedan"])


func build(p_model: String, color: Color, taxi: bool = false, with_spot: bool = false) -> void:
	model = p_model
	spec = spec_of(model)
	var L: float = spec["len"]
	var W: float = spec["wid"]
	var H: float = spec["hgt"]
	var wr: float = spec["wheel_r"]
	var cl := CLEARANCE
	var belt := cl + H
	var cab_len: float = spec["cab_len"]
	var cab_h: float = spec["cab_h"]
	var cab_off: float = spec["cab_off"]
	var zf := cab_off - cab_len * 0.5      # base do para-brisa
	var zr := cab_off + cab_len * 0.5      # base do vidro traseiro
	var wf: float = spec["wf"]
	var wrr: float = spec["wr"]

	var paint := StandardMaterial3D.new()
	paint.albedo_color = color
	paint.metallic = 0.55
	paint.roughness = 0.22
	paint.metallic_specular = 0.7
	paint.cull_mode = BaseMaterial3D.CULL_DISABLED
	var glass := _shared_mat("glass", Color(0.03, 0.04, 0.05), 0.04)
	glass.metallic = 0.9
	glass.cull_mode = BaseMaterial3D.CULL_DISABLED
	var dark := _shared_mat("trim", Color(0.05, 0.05, 0.055), 0.55)
	dark.cull_mode = BaseMaterial3D.CULL_DISABLED

	# ---- carroceria (perfil lateral extrudado)
	var hood_y := cl + H * float(spec["hood"])
	var body := _orient(PackedVector2Array([
		Vector2(-L * 0.5 + 0.12, cl), Vector2(L * 0.5 - 0.1, cl), Vector2(L * 0.5, cl + 0.18),
		Vector2(L * 0.5 - 0.02, belt - 0.08), Vector2(L * 0.5 - 0.12, belt),
		Vector2(zf, belt), Vector2(-L * 0.5 + 0.35, hood_y), Vector2(-L * 0.5 + 0.04, hood_y - 0.1),
		Vector2(-L * 0.5, cl + 0.2)]))
	_add_mesh(_extrude(body, W * 0.5), paint)

	# ---- cabine: estrutura pintada + vidros
	var top := belt + cab_h
	var cab := _orient(PackedVector2Array([Vector2(zf, belt - 0.02), Vector2(zr, belt - 0.02), Vector2(zr - wrr, top),
		Vector2(zf + wf, top)]))
	_add_mesh(_extrude(cab, W * 0.42), paint)
	var inset := _shrink(cab, 0.07)
	_add_mesh(_extrude(inset, W * 0.42 + 0.012), glass)          # vidros laterais
	_add_mesh(_edge_panel(cab[3], cab[0], W * 0.40, 0.012), glass)  # para-brisa
	_add_mesh(_edge_panel(cab[1], cab[2], W * 0.40, 0.012), glass)  # vidro traseiro
	# coluna B
	_box(Vector3(W * 0.845, cab_h * 0.85, 0.09), Vector3(0, belt + cab_h * 0.45, cab_off + 0.05), paint)

	if spec.get("bed", false):
		var bed_len := L * 0.5 - zr - 0.1
		var bz := zr + bed_len * 0.5 + 0.05
		_box(Vector3(W * 0.86, 0.04, bed_len), Vector3(0, belt - 0.32, bz), dark)
		for sx in [-1.0, 1.0]:
			_box(Vector3(0.06, 0.36, bed_len), Vector3(sx * W * 0.45, belt - 0.15, bz), paint)
		_box(Vector3(W * 0.9, 0.36, 0.06), Vector3(0, belt - 0.15, L * 0.5 - 0.05), paint)

	# para-choques, grade e soleiras
	_box(Vector3(W + 0.02, 0.2, 0.16), Vector3(0, cl + 0.12, -L * 0.5 + 0.06), dark)
	_box(Vector3(W + 0.02, 0.2, 0.16), Vector3(0, cl + 0.12, L * 0.5 - 0.06), dark)
	_box(Vector3(W * 0.5, 0.12, 0.04), Vector3(0, cl + 0.32, -L * 0.5 + 0.01), dark)
	for sx in [-1.0, 1.0]:
		_box(Vector3(0.05, 0.08, L * 0.5), Vector3(sx * (W * 0.5 + 0.005), cl + 0.05, 0), dark)
		# retrovisores
		_box(Vector3(0.18, 0.1, 0.1), Vector3(sx * (W * 0.5 + 0.06), belt + 0.08, zf + 0.25), paint)
	if taxi:
		var sign_mat := _shared_mat("taxi_sign", Color(1, 0.95, 0.75), 0.4)
		sign_mat.emission_enabled = true
		sign_mat.emission = Color(1, 0.9, 0.5)
		sign_mat.emission_energy_multiplier = 1.5
		_box(Vector3(0.62, 0.15, 0.26), Vector3(0, top + 0.08, cab_off), sign_mat)

	# ---- faróis (fino, moderno) e lanterna em LED de ponta a ponta
	_head_mat = StandardMaterial3D.new()
	_head_mat.albedo_color = Color(0.85, 0.88, 0.9)
	_head_mat.metallic = 0.6
	_head_mat.roughness = 0.1
	_head_mat.emission_enabled = true
	_head_mat.emission = Color(1, 0.97, 0.9)
	_head_mat.emission_energy_multiplier = 0.0
	_tail_mat = StandardMaterial3D.new()
	_tail_mat.albedo_color = Color(0.35, 0.02, 0.02)
	_tail_mat.roughness = 0.2
	_tail_mat.emission_enabled = true
	_tail_mat.emission = Color(1, 0.04, 0.03)
	_tail_mat.emission_energy_multiplier = 0.3
	for sx in [-1.0, 1.0]:
		_box(Vector3(0.42, 0.07, 0.05), Vector3(sx * (W * 0.5 - 0.3), hood_y - 0.06, -L * 0.5 + 0.03), _head_mat)
	_box(Vector3(W * 0.9, 0.06, 0.04), Vector3(0, belt - 0.12, L * 0.5 - 0.02), _tail_mat)

	# ---- rodas: pneu + aro com raios
	var tire := CylinderMesh.new()
	tire.top_radius = wr
	tire.bottom_radius = wr
	tire.height = 0.24
	tire.radial_segments = 18
	var rim := CylinderMesh.new()
	rim.top_radius = wr * 0.64
	rim.bottom_radius = wr * 0.64
	rim.height = 0.25
	rim.radial_segments = 14
	var spoke := BoxMesh.new()
	spoke.size = Vector3(0.255, wr * 1.15, 0.05)
	var tire_mat := _shared_mat("tire", Color(0.035, 0.035, 0.035), 0.92)
	var rim_mat := _shared_mat("rim", Color(0.55, 0.56, 0.58), 0.25)
	rim_mat.metallic = 0.9
	var hub_mat := _shared_mat("hub", Color(0.08, 0.08, 0.09), 0.5)
	var axle := L * 0.5 - wr * 1.75
	for wz in [-axle, axle]:
		for sx in [-1.0, 1.0]:
			var pivot := Node3D.new()
			pivot.position = Vector3(sx * (W * 0.5 - 0.14), wr, wz)
			add_child(pivot)
			var spinner := Node3D.new()
			pivot.add_child(spinner)
			for pair in [[tire, tire_mat], [rim, hub_mat]]:
				var mi := MeshInstance3D.new()
				mi.mesh = pair[0]
				mi.material_override = pair[1]
				mi.rotation_degrees.z = 90.0
				spinner.add_child(mi)
			for k in range(5):
				var sp := MeshInstance3D.new()
				sp.mesh = spoke
				sp.material_override = rim_mat
				sp.rotation.x = k * TAU / 5.0
				spinner.add_child(sp)
			_spinners.append(spinner)
			if wz < 0.0:
				_front_pivots.append(pivot)

	if with_spot:
		_spot = SpotLight3D.new()
		_spot.position = Vector3(0, hood_y, -L * 0.5 - 0.1)
		_spot.rotation_degrees.x = -4.0
		_spot.spot_range = 32.0
		_spot.spot_angle = 36.0
		_spot.spot_attenuation = 0.8
		_spot.light_energy = 3.5
		_spot.light_color = Color(1, 0.96, 0.88)
		_spot.visible = false
		add_child(_spot)


# ---------------------------------------------------------------- geometria

## Extruda um polígono do perfil (x = Z do carro, y = altura) com meia-largura hw.
func _extrude(poly: PackedVector2Array, hw: float) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var n := poly.size()
	# laterais (contorno)
	for i in range(n):
		var a := poly[i]
		var b := poly[(i + 1) % n]
		var d := b - a
		var nrm := Vector3(0.0, -d.x, d.y).normalized()   # normal para fora (perfil anti-horário)
		var p0 := Vector3(-hw, a.y, a.x)
		var p1 := Vector3(hw, a.y, a.x)
		var p2 := Vector3(hw, b.y, b.x)
		var p3 := Vector3(-hw, b.y, b.x)
		for v in [p0, p1, p2, p0, p2, p3]:
			st.set_normal(nrm)
			st.add_vertex(v)
	# tampas (lados esquerdo e direito do carro)
	var tris := Geometry2D.triangulate_polygon(poly)
	for side in [-1.0, 1.0]:
		for i in range(0, tris.size(), 3):
			for k in range(3):
				var p := poly[tris[i + k]]
				st.set_normal(Vector3(side, 0, 0))
				st.add_vertex(Vector3(side * hw, p.y, p.x))
	return st.commit()


## Painel fino de vidro ao longo de uma aresta do perfil (para-brisa / traseiro).
func _edge_panel(a: Vector2, b: Vector2, hw: float, out: float) -> ArrayMesh:
	var d := (b - a).normalized()
	var nrm := Vector2(d.y, -d.x)
	var a2 := a + d * 0.06 + nrm * out
	var b2 := b - d * 0.06 + nrm * out
	var poly := PackedVector2Array([a2, b2, b2 - nrm * 0.03, a2 - nrm * 0.03])
	return _extrude(_orient(poly), hw)


func _shrink(poly: PackedVector2Array, amount: float) -> PackedVector2Array:
	var res := Geometry2D.offset_polygon(poly, -amount)
	return _orient(res[0]) if not res.is_empty() else poly


## Mesma orientação dos perfis escritos à mão (anti-horário com Y para cima).
func _orient(poly: PackedVector2Array) -> PackedVector2Array:
	if Geometry2D.is_polygon_clockwise(poly):
		poly.reverse()
	return poly


func _add_mesh(mesh: Mesh, mat: Material) -> void:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	add_child(mi)


func _shared_mat(key: String, c: Color, rough: float) -> StandardMaterial3D:
	if not _shared.has(key):
		var m := StandardMaterial3D.new()
		m.albedo_color = c
		m.roughness = rough
		_shared[key] = m
	return _shared[key]


func _box(size: Vector3, pos: Vector3, mat: Material) -> void:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = mat
	mi.position = pos
	add_child(mi)


# ------------------------------------------------------------------ estado

func update_wheels(delta: float, speed: float, steer: float) -> void:
	var wr: float = spec.get("wheel_r", 0.34)
	_spin = wrapf(_spin - speed * delta / wr, -TAU, TAU)
	for s in _spinners:
		s.rotation.x = _spin
	for p in _front_pivots:
		p.rotation.y = -steer


func set_lights(on: bool, braking: bool = false) -> void:
	if _head_mat == null:
		return
	_head_mat.emission_energy_multiplier = 4.0 if on else 0.0
	_tail_mat.emission_energy_multiplier = 4.5 if braking else (1.6 if on else 0.3)
	if _spot != null and on != _lights_on:
		_spot.visible = on
	_lights_on = on


func set_spot_enabled(on: bool) -> void:
	if _spot != null:
		_spot.visible = on and _lights_on
