class_name CarVisual
extends Node3D
## Carro provisório feito com primitivas (carroceria, cabine, rodas que giram
## e esterçam, faróis que acendem à noite). Frente do carro = -Z.

const MODELS := {
	"compacto": {"len": 3.7, "wid": 1.7, "hgt": 0.62, "cab_len": 2.0, "cab_h": 0.62, "cab_off": 0.15, "wheel_r": 0.31},
	"sedan": {"len": 4.6, "wid": 1.85, "hgt": 0.66, "cab_len": 2.3, "cab_h": 0.6, "cab_off": 0.15, "wheel_r": 0.34},
	"picape": {"len": 5.2, "wid": 2.0, "hgt": 0.85, "cab_len": 1.8, "cab_h": 0.72, "cab_off": -0.75, "wheel_r": 0.42, "bed": true},
	"esportivo": {"len": 4.4, "wid": 1.95, "hgt": 0.5, "cab_len": 1.9, "cab_h": 0.46, "cab_off": 0.35, "wheel_r": 0.34},
}
const CLEARANCE := 0.28

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
	var body_y := CLEARANCE + H * 0.5
	var paint := StandardMaterial3D.new()
	paint.albedo_color = color
	paint.metallic = 0.45
	paint.roughness = 0.3
	var dark := _shared_mat("dark", Color(0.08, 0.08, 0.09), 0.7)
	var glass := _shared_mat("glass", Color(0.08, 0.12, 0.16), 0.1)
	glass.metallic = 0.6

	# carroceria
	_box(Vector3(W, H, L), Vector3(0, body_y, 0), paint)
	# para-choques
	_box(Vector3(W + 0.04, 0.22, 0.18), Vector3(0, CLEARANCE + 0.1, -L * 0.5), dark)
	_box(Vector3(W + 0.04, 0.22, 0.18), Vector3(0, CLEARANCE + 0.1, L * 0.5), dark)
	# cabine (vidros) + teto pintado
	var cab_h: float = spec["cab_h"]
	var cab_y := CLEARANCE + H + cab_h * 0.5
	var cab_z: float = spec["cab_off"]
	_box(Vector3(W * 0.86, cab_h, spec["cab_len"]), Vector3(0, cab_y, cab_z), glass)
	_box(Vector3(W * 0.88, 0.07, float(spec["cab_len"]) * 0.92), Vector3(0, cab_y + cab_h * 0.5, cab_z), paint)
	_box(Vector3(W * 0.9, cab_h * 0.92, 0.12), Vector3(0, cab_y, cab_z), paint) # coluna central
	if spec.get("bed", false):
		var bed_z := cab_z + float(spec["cab_len"]) * 0.5 + 1.0
		_box(Vector3(W * 0.9, 0.05, 1.9), Vector3(0, CLEARANCE + H + 0.01, bed_z), dark)
	if taxi:
		var sign_mat := _shared_mat("taxi_sign", Color(1, 0.95, 0.6), 0.5)
		sign_mat.emission_enabled = true
		sign_mat.emission = Color(1, 0.9, 0.4)
		_box(Vector3(0.7, 0.18, 0.3), Vector3(0, cab_y + cab_h * 0.5 + 0.12, cab_z), sign_mat)

	# faróis e lanternas
	_head_mat = StandardMaterial3D.new()
	_head_mat.albedo_color = Color(0.95, 0.95, 0.85)
	_head_mat.emission_enabled = true
	_head_mat.emission = Color(1, 0.95, 0.8)
	_head_mat.emission_energy_multiplier = 0.0
	_tail_mat = StandardMaterial3D.new()
	_tail_mat.albedo_color = Color(0.5, 0.02, 0.02)
	_tail_mat.emission_enabled = true
	_tail_mat.emission = Color(1, 0.05, 0.05)
	_tail_mat.emission_energy_multiplier = 0.2
	for sx in [-1.0, 1.0]:
		_box(Vector3(0.36, 0.14, 0.06), Vector3(sx * (W * 0.5 - 0.28), body_y + H * 0.15, -L * 0.5 - 0.01), _head_mat)
		_box(Vector3(0.34, 0.12, 0.06), Vector3(sx * (W * 0.5 - 0.25), body_y + H * 0.15, L * 0.5 + 0.01), _tail_mat)

	# rodas
	var tire := CylinderMesh.new()
	tire.top_radius = wr
	tire.bottom_radius = wr
	tire.height = 0.26
	tire.radial_segments = 14
	var rim := CylinderMesh.new()
	rim.top_radius = wr * 0.6
	rim.bottom_radius = wr * 0.6
	rim.height = 0.27
	rim.radial_segments = 8
	var tire_mat := _shared_mat("tire", Color(0.04, 0.04, 0.04), 0.9)
	var rim_mat := _shared_mat("rim", Color(0.7, 0.7, 0.72), 0.3)
	var axle := L * 0.5 - wr * 1.55
	for wz in [-axle, axle]:
		for sx in [-1.0, 1.0]:
			var pivot := Node3D.new()
			pivot.position = Vector3(sx * (W * 0.5 - 0.12), wr, wz)
			add_child(pivot)
			var spinner := Node3D.new()
			pivot.add_child(spinner)
			for pair in [[tire, tire_mat], [rim, rim_mat]]:
				var mi := MeshInstance3D.new()
				mi.mesh = pair[0]
				mi.material_override = pair[1]
				mi.rotation_degrees.z = 90.0
				spinner.add_child(mi)
			_spinners.append(spinner)
			if wz < 0.0:
				_front_pivots.append(pivot)

	if with_spot:
		_spot = SpotLight3D.new()
		_spot.position = Vector3(0, body_y + 0.2, -L * 0.5 - 0.1)
		_spot.spot_range = 28.0
		_spot.spot_angle = 38.0
		_spot.light_energy = 3.0
		_spot.light_color = Color(1, 0.95, 0.85)
		_spot.visible = false
		add_child(_spot)


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
	_head_mat.emission_energy_multiplier = 2.5 if on else 0.0
	_tail_mat.emission_energy_multiplier = 3.0 if braking else (1.2 if on else 0.2)
	if _spot != null and on != _lights_on:
		_spot.visible = on
	_lights_on = on


func set_spot_enabled(on: bool) -> void:
	if _spot != null:
		_spot.visible = on and _lights_on
