class_name CameraRig
extends Node3D
## Câmera em terceira pessoa para toque: recebe movimento de arrastar (rotate_look),
## tem suavização e colisão com paredes (SpringArm3D). Pode seguir outro alvo
## (carro) com distância/altura próprias e se alinhar sozinha atrás do veículo.

@export var height_offset: float = 1.55
@export var distance: float = 4.0
@export var shoulder_offset: float = 0.4
@export var touch_sensitivity: float = 0.006
@export var follow_smoothing: float = 18.0
@export var min_pitch: float = -1.1
@export var max_pitch: float = 0.5

var yaw: float = 0.0
var pitch: float = -0.25
var sensitivity_scale: float = 1.0

var _owner_body: Node3D
var _target: Node3D
var _arm: SpringArm3D
var _camera: Camera3D
var _idle_look: float = 10.0
var _vehicle_mode: bool = false


func _ready() -> void:
	_owner_body = get_parent() as Node3D
	_target = _owner_body
	top_level = true
	process_mode = Node.PROCESS_MODE_ALWAYS
	_arm = $SpringArm3D
	_camera = $SpringArm3D/Camera3D

	var shape := SphereShape3D.new()
	shape.radius = 0.25
	_arm.shape = shape
	_arm.margin = 0.2
	_arm.spring_length = distance
	_arm.collision_mask = 1
	if _owner_body is CollisionObject3D:
		_arm.add_excluded_object((_owner_body as CollisionObject3D).get_rid())

	_camera.h_offset = shoulder_offset
	_camera.far = 350.0
	_camera.current = true
	global_position = _target.global_position + Vector3(0.0, height_offset, 0.0)


func get_camera() -> Camera3D:
	return _camera


func set_far(v: float) -> void:
	if _camera != null:
		_camera.far = v


## Segue um veículo (ou volta ao jogador com target = null).
func follow_vehicle(target: Node3D) -> void:
	_vehicle_mode = target != null
	_target = target if target != null else _owner_body
	_arm.spring_length = 7.5 if _vehicle_mode else distance
	_camera.h_offset = 0.0 if _vehicle_mode else shoulder_offset
	height_offset = 2.1 if _vehicle_mode else 1.55
	if _vehicle_mode:
		pitch = -0.28
		yaw = target.global_rotation.y


## Chamado pelo TouchControls (sinal look_input).
func rotate_look(rel: Vector2) -> void:
	var k := touch_sensitivity * sensitivity_scale
	yaw -= rel.x * k
	pitch = clampf(pitch - rel.y * k, min_pitch, max_pitch)
	_idle_look = 0.0


func _process(delta: float) -> void:
	if _target == null or not is_instance_valid(_target):
		_target = _owner_body
	_idle_look += delta
	var goal := _target.global_position + Vector3(0.0, height_offset, 0.0)
	var smooth := 30.0 if _vehicle_mode else follow_smoothing
	global_position = global_position.lerp(goal, 1.0 - exp(-smooth * delta))
	if _vehicle_mode and _idle_look > 1.2:
		var spd: float = _target.get("speed") if _target.get("speed") != null else 0.0
		if absf(spd) > 2.0:
			var behind := _target.global_rotation.y + (PI if spd < -2.0 else 0.0)
			yaw = lerp_angle(yaw, behind, 1.0 - exp(-2.5 * delta))
			pitch = lerpf(pitch, -0.22, 1.0 - exp(-1.5 * delta))
	rotation.y = yaw
	_arm.rotation.x = pitch
