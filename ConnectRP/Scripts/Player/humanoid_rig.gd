class_name HumanoidRig
extends Node3D
## Personagem humanoide PROVISÓRIO (hierarquia de juntas + malhas primitivas),
## animado por código (idle / andar / correr / agachar / ar).
## Para usar um modelo real (.glb com Skeleton3D + AnimationPlayer), defina
## `external_model_path`. O rig provisório é então ocultado.

@export_file("*.glb", "*.gltf", "*.tscn") var external_model_path: String = ""
@export var external_yaw_offset_deg: float = 0.0
@export var idle_animation: String = "idle"
@export var walk_animation: String = "walk"
@export var run_animation: String = "run"
@export var jump_animation: String = "jump"
@export var crouch_animation: String = "crouch"
@export var prone_animation: String = "prone"
@export var crawl_animation: String = "crawl"
@export var punch_animation: String = "punch"
## Aparência (pode ser trocada em tempo real com apply_look()).
@export var skin_color: Color = Color(0.74, 0.55, 0.42)
@export var hair_color: Color = Color(0.03, 0.03, 0.03)
@export var top_color: Color = Color(0.25, 0.15, 0.08)
@export var pants_color: Color = Color(-1, -1, -1)  # negativo = camuflado
@export var has_beard: bool = true
## NPCs: menos polígonos, sem sombra e corte por distância.
@export var cheap: bool = false
@export var lod_distance: float = 0.0

const HIP_HEIGHT := 0.98
const PUNCH_TIME := 0.4

var hips: Node3D
var spine: Node3D
var head: Node3D
var arm_l: Node3D
var arm_r: Node3D
var elbow_l: Node3D
var elbow_r: Node3D
var thigh_l: Node3D
var thigh_r: Node3D
var knee_l: Node3D
var knee_r: Node3D
var ankle_l: Node3D
var ankle_r: Node3D

var _proc_root: Node3D
var _external: Node3D
var _anim: AnimationPlayer
var _phase: float = 0.0
var _time: float = 0.0
var _move_blend: float = 0.0
var _air_blend: float = 0.0
var _land: float = 0.0
var _was_air: bool = false
var _punching: bool = false
var _punch_t: float = 0.0
var _punch_hand: int = 0


func _ready() -> void:
	_proc_root = Node3D.new()
	_proc_root.name = "ProceduralBody"
	add_child(_proc_root)
	_build_body()
	_merge_body()
	_try_load_external()


## look = {"skin": Color, "hair": Color, "top": Color, "pants": Color}
func apply_look(look: Dictionary) -> void:
	skin_color = look.get("skin", skin_color)
	hair_color = look.get("hair", hair_color)
	top_color = look.get("top", top_color)
	pants_color = look.get("pants", pants_color)
	if _proc_root == null:
		return
	for c in _proc_root.get_children():
		_proc_root.remove_child(c)
		c.queue_free()
	_build_body()
	_merge_body()


# ---------------------------------------------------------------- construção

func _build_body() -> void:
	var skin := _mat(skin_color, 0.55)
	var hair := _mat(hair_color, 0.6)
	var jacket := _mat(top_color, 0.9, null if cheap else _fabric_tex(0.08, 0.55, 1.0))
	var tee := _mat(Color(0.5, 0.5, 0.52), 0.95, null if cheap else _fabric_tex(0.25, 0.7, 1.0))
	var camo: StandardMaterial3D
	if pants_color.r < 0.0:
		camo = _mat(Color.WHITE, 0.9, _camo_tex())
	else:
		camo = _mat(pants_color, 0.9)
	var black := _mat(Color(0.05, 0.05, 0.05), 0.8)
	var white := _mat(Color(0.95, 0.95, 0.95), 0.5)
	var red := _mat(Color(0.75, 0.05, 0.05), 0.5)
	var eye_white := _mat(Color(0.95, 0.95, 0.95), 0.3)

	hips = _joint(_proc_root, "Hips", Vector3(0, HIP_HEIGHT, 0))
	_mesh(hips, _box_mesh(Vector3(0.34, 0.2, 0.22)), camo)

	spine = _joint(hips, "Spine", Vector3(0, 0.1, 0))
	_mesh(spine, _capsule(0.175, 0.62), tee, Vector3(0, 0.28, 0), Vector3(1, 1, 0.72))
	_mesh(spine, _capsule(0.2, 0.5), jacket, Vector3(0, 0.27, 0), Vector3(1, 1, 0.72))
	_mesh(spine, _cyl(0.1, 0.05), black, Vector3(0, 0.56, 0))
	_mesh(spine, _cyl(0.05, 0.1), skin, Vector3(0, 0.61, 0))

	# Cabeça
	head = _joint(spine, "Head", Vector3(0, 0.64, 0))
	_mesh(head, _sphere(0.11), skin, Vector3(0, 0.1, 0), Vector3(1, 1.15, 1))
	_mesh(head, _sphere(0.115), hair, Vector3(0, 0.17, 0.005), Vector3(1, 0.7, 1.05))
	if has_beard:
		_mesh(head, _sphere(0.07), hair, Vector3(0, 0.03, -0.07), Vector3(1.2, 0.9, 0.8)) # barba
	_mesh(head, _box_mesh(Vector3(0.02, 0.04, 0.03)), skin, Vector3(0, 0.09, -0.112)) # nariz
	for sx in [-1.0, 1.0]:
		if cheap:
			_mesh(head, _sphere(0.012), black, Vector3(sx * 0.04, 0.12, -0.108))
			continue
		_mesh(head, _sphere(0.016), eye_white, Vector3(sx * 0.04, 0.12, -0.1))
		_mesh(head, _sphere(0.009), black, Vector3(sx * 0.04, 0.12, -0.112))
		_mesh(head, _sphere(0.025), skin, Vector3(sx * 0.11, 0.1, 0.0))

	# Braços
	for sx in [-1.0, 1.0]:
		var shoulder := _joint(spine, "Shoulder", Vector3(sx * 0.235, 0.5, 0))
		shoulder.rotation.z = sx * 0.08
		_mesh(shoulder, _sphere(0.065), jacket)
		_mesh(shoulder, _capsule(0.058, 0.3), jacket, Vector3(0, -0.15, 0))
		var elbow := _joint(shoulder, "Elbow", Vector3(0, -0.29, 0))
		_mesh(elbow, _capsule(0.05, 0.28), jacket, Vector3(0, -0.14, 0))
		_mesh(elbow, _sphere(0.045), skin, Vector3(0, -0.33, 0), Vector3(0.9, 1.3, 0.7))
		if sx < 0.0:
			arm_l = shoulder
			elbow_l = elbow
		else:
			arm_r = shoulder
			elbow_r = elbow

	# Pernas
	for sx in [-1.0, 1.0]:
		var thigh := _joint(hips, "Hip", Vector3(sx * 0.1, -0.05, 0))
		_mesh(thigh, _capsule(0.085, 0.46), camo, Vector3(0, -0.225, 0))
		var knee := _joint(thigh, "Knee", Vector3(0, -0.45, 0))
		_mesh(knee, _capsule(0.065, 0.44), camo, Vector3(0, -0.22, 0))
		_mesh(knee, _cyl(0.07, 0.07), black, Vector3(0, -0.40, 0))
		var ankle := _joint(knee, "Ankle", Vector3(0, -0.43, 0))
		_mesh(ankle, _box_mesh(Vector3(0.11, 0.08, 0.27)), white, Vector3(0, -0.01, -0.05))
		_mesh(ankle, _box_mesh(Vector3(0.112, 0.07, 0.09)), red, Vector3(0, -0.005, 0.06))
		_mesh(ankle, _box_mesh(Vector3(0.112, 0.05, 0.08)), black, Vector3(0, 0.005, -0.12))
		if sx < 0.0:
			thigh_l = thigh
			knee_l = knee
			ankle_l = ankle
		else:
			thigh_r = thigh
			knee_r = knee
			ankle_r = ankle


## Junta as peças presas a cada articulação (≈40 objetos viram 13).
func _merge_body() -> void:
	var joints: Array[Node3D] = [_proc_root]
	var i := 0
	while i < joints.size():
		for c in joints[i].get_children():
			if c is Node3D and not (c is MeshInstance3D):
				joints.append(c)
		i += 1
	for j in joints:
		MeshMerge.merge_children(j, 2)


func _joint(parent: Node3D, joint_name: String, pos: Vector3) -> Node3D:
	var j := Node3D.new()
	j.name = joint_name
	j.position = pos
	parent.add_child(j)
	return j


func _mesh(parent: Node3D, mesh: Mesh, mat: Material, pos: Vector3 = Vector3.ZERO, scl: Vector3 = Vector3.ONE) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	mi.scale = scl
	if cheap:
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	if lod_distance > 0.0:
		mi.visibility_range_end = lod_distance
	parent.add_child(mi)
	return mi


func _capsule(radius: float, height: float) -> CapsuleMesh:
	var m := CapsuleMesh.new()
	m.radius = radius
	m.height = maxf(height, radius * 2.0 + 0.001)
	m.radial_segments = 8 if cheap else 16
	m.rings = 3 if cheap else 6
	return m


func _sphere(radius: float) -> SphereMesh:
	var m := SphereMesh.new()
	m.radius = radius
	m.height = radius * 2.0
	m.radial_segments = 8 if cheap else 16
	m.rings = 4 if cheap else 8
	return m


func _cyl(radius: float, height: float) -> CylinderMesh:
	var m := CylinderMesh.new()
	m.top_radius = radius
	m.bottom_radius = radius
	m.height = height
	m.radial_segments = 8 if cheap else 16
	return m


func _box_mesh(size: Vector3) -> BoxMesh:
	var m := BoxMesh.new()
	m.size = size
	return m


func _mat(color: Color, rough: float, tex: Texture2D = null) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = rough
	if tex != null:
		m.albedo_texture = tex
		m.uv1_scale = Vector3(3, 3, 1)
	return m


static var _tex_cache: Dictionary = {}


func _fabric_tex(freq: float, lo: float, hi: float) -> NoiseTexture2D:
	var key := "f%s_%s_%s" % [freq, lo, hi]
	if not _tex_cache.has(key):
		_tex_cache[key] = _make_fabric_tex(freq, lo, hi)
	return _tex_cache[key]


func _make_fabric_tex(freq: float, lo: float, hi: float) -> NoiseTexture2D:
	var n := FastNoiseLite.new()
	n.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	n.frequency = freq
	var g := Gradient.new()
	g.offsets = PackedFloat32Array([0.0, 1.0])
	g.colors = PackedColorArray([Color(lo, lo, lo), Color(hi, hi, hi)])
	var t := NoiseTexture2D.new()
	t.noise = n
	t.color_ramp = g
	t.width = 256
	t.height = 256
	t.seamless = true
	return t


func _camo_tex() -> NoiseTexture2D:
	if not _tex_cache.has("camo"):
		_tex_cache["camo"] = _make_camo_tex()
	return _tex_cache["camo"]


func _make_camo_tex() -> NoiseTexture2D:
	var n := FastNoiseLite.new()
	n.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	n.frequency = 0.02
	var g := Gradient.new()
	g.interpolation_mode = Gradient.GRADIENT_INTERPOLATE_CONSTANT
	g.offsets = PackedFloat32Array([0.0, 0.3, 0.55, 0.8])
	g.colors = PackedColorArray([
		Color(0.12, 0.17, 0.10), Color(0.22, 0.29, 0.14),
		Color(0.40, 0.36, 0.22), Color(0.06, 0.07, 0.06)])
	var t := NoiseTexture2D.new()
	t.noise = n
	t.color_ramp = g
	t.width = 256
	t.height = 256
	t.seamless = true
	return t


# ------------------------------------------------------------ modelo externo

func _try_load_external() -> void:
	if external_model_path == "" or not ResourceLoader.exists(external_model_path):
		return
	var res := load(external_model_path)
	if res is PackedScene:
		_external = (res as PackedScene).instantiate() as Node3D
		if _external == null:
			return
		_external.rotation.y = deg_to_rad(external_yaw_offset_deg)
		add_child(_external)
		_proc_root.visible = false
		_anim = _find_anim(_external)


func _find_anim(node: Node) -> AnimationPlayer:
	if node is AnimationPlayer:
		return node
	for c in node.get_children():
		var r := _find_anim(c)
		if r != null:
			return r
	return null


func _play(anim_name: String) -> void:
	if _anim != null and _anim.has_animation(anim_name) and _anim.current_animation != anim_name:
		_anim.play(anim_name, 0.2)


# ------------------------------------------------------------------ animação

## hand: 0 = braço esquerdo, 1 = braço direito.
func play_punch(hand: int) -> void:
	_punch_hand = hand
	_punch_t = 0.0
	_punching = true


func _update_external(speed: float, on_floor: bool, crouch: float, prone: float) -> void:
	if _punching:
		_play(punch_animation)
	elif prone > 0.5:
		_play(prone_animation if speed < 0.15 else crawl_animation)
	elif crouch > 0.5:
		_play(crouch_animation)
	elif not on_floor:
		_play(jump_animation)
	elif speed < 0.15:
		_play(idle_animation)
	elif speed < 3.0:
		_play(walk_animation)
	else:
		_play(run_animation)


func _rx(n: Node3D, target: float, k: float) -> void:
	n.rotation.x = lerpf(n.rotation.x, target, k)


func _ry(n: Node3D, target: float, k: float) -> void:
	n.rotation.y = lerpf(n.rotation.y, target, k)


func _rz(n: Node3D, target: float, k: float) -> void:
	n.rotation.z = lerpf(n.rotation.z, target, k)


## Extensão do soco: recuo (preparação) -> golpe rápido -> retorno suave.
func _punch_extension(t: float) -> float:
	if t < 0.25:
		return -0.3 * sin(t / 0.25 * PI * 0.5)
	if t < 0.5:
		return lerpf(-0.3, 1.0, smoothstep(0.0, 1.0, (t - 0.25) / 0.25))
	return 1.0 - smoothstep(0.0, 1.0, (t - 0.5) / 0.5)


func update_animation(delta: float, speed: float, on_floor: bool, crouch: float, prone: float, vel_y: float) -> void:
	if _punching:
		_punch_t += delta / PUNCH_TIME
		if _punch_t >= 1.0:
			_punch_t = 1.0
			_punching = false

	if _external != null:
		_update_external(speed, on_floor, crouch, prone)
		return

	_time += delta
	if on_floor and _was_air:
		_land = 1.0
	_was_air = not on_floor
	_land = move_toward(_land, 0.0, delta * 5.0)

	var moving := speed > 0.15 and on_floor
	if moving:
		var rate := 3.0 + speed * 1.1
		if prone > 0.5:
			rate = 2.5 + speed * 2.0
		_phase += delta * rate
	_move_blend = lerpf(_move_blend, 1.0 if moving else 0.0, 1.0 - exp(-10.0 * delta))
	_air_blend = lerpf(_air_blend, 0.0 if on_floor else 1.0, 1.0 - exp(-12.0 * delta))

	var k := 1.0 - exp(-(40.0 if _punching else 22.0) * delta) # suavização das poses
	var amp := clampf(speed / 6.0, 0.0, 1.0)
	var mv := _move_blend
	var swing := (0.3 + 0.65 * amp) * 0.9 * mv
	var s := sin(_phase)
	var c := cos(_phase)
	var breath := sin(_time * 1.6)
	var air := _air_blend
	var rise := clampf(vel_y / 4.0, 0.0, 1.0)
	var cr := clampf(crouch + _land * 0.4 * (1.0 - crouch), 0.0, 1.0)

	# ---- pose em pé / agachado / correndo / pulando
	var tl := s * swing + cr * 1.0 + air * (rise * 0.9 + (1.0 - rise) * 0.25)
	var tr := -s * swing + cr * 1.0 + air * (rise * 0.2 - (1.0 - rise) * 0.1)
	var kl := -maxf(0.0, c) * swing * 1.3 - cr * 1.8 - air * (rise * 1.2 + (1.0 - rise) * 0.2)
	var kr := -maxf(0.0, -c) * swing * 1.3 - cr * 1.8 - air * (rise * 0.5 + (1.0 - rise) * 0.1)
	var anl := clampf(-(tl + kl) * 0.6, -0.8, 0.8)
	var anr := clampf(-(tr + kr) * 0.6, -0.8, 0.8)
	var al := -s * swing * 0.9
	var ar := s * swing * 0.9
	var al_z := -0.08 - breath * 0.01
	var ar_z := 0.08 + breath * 0.01
	var elb := 0.15 + amp * 0.9 * mv
	var el := elb
	var er := elb
	al = lerpf(al, rise * 2.2 + (1.0 - rise) * 0.4, air)
	ar = lerpf(ar, rise * 2.2 + (1.0 - rise) * 0.4, air)
	al_z -= air * 0.4
	ar_z += air * 0.4
	var sp_x := -amp * 0.25 * mv - cr * 0.2 + breath * 0.012
	var sp_y := s * 0.28 * mv
	var hp_y := -s * 0.1 * mv
	var hp_z := s * 0.04 * mv + sin(_time * 0.7) * 0.015 * (1.0 - mv)
	var hd_x := amp * 0.15 * mv + cr * 0.1
	var hips_y := HIP_HEIGHT - cr * 0.35 - absf(s) * 0.03 * mv

	# ---- soco (sobrepõe a pose em pé)
	if _punching:
		var pw := _punch_extension(_punch_t)
		var pc := clampf(pw, 0.0, 1.0)
		var guard := sin(_punch_t * PI) * 0.7
		if _punch_hand == 0:
			al = lerpf(al, 1.5, pw)
			al_z = lerpf(al_z, 0.0, pc)
			el = lerpf(1.6, 0.05, pc)
			ar = lerpf(ar, 0.9, guard)
			er = lerpf(er, 1.8, guard)
			sp_y = -0.55 * pw
		else:
			ar = lerpf(ar, 1.5, pw)
			ar_z = lerpf(ar_z, 0.0, pc)
			er = lerpf(1.6, 0.05, pc)
			al = lerpf(al, 0.9, guard)
			el = lerpf(el, 1.8, guard)
			sp_y = 0.55 * pw
		hp_y = -sp_y * 0.5
		sp_x -= 0.15 * pc

	# ---- pose deitado (de bruços, engatinhando)
	var pcr := sin(_phase)
	var p_tl := pcr * 0.35 * mv
	var p_tr := -pcr * 0.35 * mv
	var p_kl := -0.4 - maxf(0.0, pcr) * 0.5 * mv
	var p_kr := -0.4 - maxf(0.0, -pcr) * 0.5 * mv
	var p_al := 2.4 + pcr * 0.5 * mv
	var p_ar := 2.4 - pcr * 0.5 * mv
	var p_el := 0.9 + maxf(0.0, -pcr) * 0.5 * mv
	var p_er := 0.9 + maxf(0.0, pcr) * 0.5 * mv

	# ---- mistura + suavização
	_rx(thigh_l, lerpf(tl, p_tl, prone), k)
	_rx(thigh_r, lerpf(tr, p_tr, prone), k)
	_rx(knee_l, lerpf(kl, p_kl, prone), k)
	_rx(knee_r, lerpf(kr, p_kr, prone), k)
	_rx(ankle_l, lerpf(anl, -0.9, prone), k)
	_rx(ankle_r, lerpf(anr, -0.9, prone), k)
	_rx(arm_l, lerpf(al, p_al, prone), k)
	_rx(arm_r, lerpf(ar, p_ar, prone), k)
	_rz(arm_l, lerpf(al_z, -0.15, prone), k)
	_rz(arm_r, lerpf(ar_z, 0.15, prone), k)
	_rx(elbow_l, lerpf(el, p_el, prone), k)
	_rx(elbow_r, lerpf(er, p_er, prone), k)
	_rx(spine, lerpf(sp_x, 0.0, prone), k)
	_ry(spine, lerpf(sp_y, 0.0, prone), k)
	_ry(hips, lerpf(hp_y, 0.0, prone), k)
	_rz(hips, lerpf(hp_z, 0.0, prone), k)
	_rx(head, lerpf(hd_x, 1.2, prone), k)
	_ry(head, lerpf(-(sp_y + hp_y) * 0.6, 0.0, prone), k)
	hips.position.y = lerpf(hips.position.y, lerpf(hips_y, HIP_HEIGHT, prone), k)

	# Corpo inteiro deita para frente (cabeça no -Z, rosto para baixo)
	_proc_root.rotation.x = -PI * 0.5 * prone
	_proc_root.position = Vector3(0.0, 0.16 * prone, 0.8 * prone)
