class_name CameraRig
extends Node3D
## Câmera em terceira pessoa para toque: recebe movimento de arrastar (rotate_look),
## tem suavização e colisão com paredes (SpringArm3D).

@export var height_offset: float = 1.55
@export var distance: float = 4.0
@export var shoulder_offset: float = 0.4
@export var touch_sensitivity: float = 0.006
@export var follow_smoothing: float = 18.0
@export var min_pitch: float = -1.1
@export var max_pitch: float = 0.5

var yaw: float = 0.0
var pitch: float = -0.25

var _target: Node3D
var _arm: SpringArm3D
var _camera: Camera3D


func _ready() -> void:
    _target = get_parent() as Node3D
    top_level = true
    _arm = $SpringArm3D
    _camera = $SpringArm3D/Camera3D

    var shape := SphereShape3D.new()
    shape.radius = 0.25
    _arm.shape = shape
    _arm.margin = 0.2
    _arm.spring_length = distance
    if _target is CollisionObject3D:
        _arm.add_excluded_object((_target as CollisionObject3D).get_rid())

    _camera.h_offset = shoulder_offset
    _camera.far = 350.0
    _camera.current = true
    global_position = _target.global_position + Vector3(0.0, height_offset, 0.0)


## Chamado pelo TouchControls (sinal look_input).
func rotate_look(rel: Vector2) -> void:
    yaw -= rel.x * touch_sensitivity
    pitch = clampf(pitch - rel.y * touch_sensitivity, min_pitch, max_pitch)


func _process(delta: float) -> void:
    var goal := _target.global_position + Vector3(0.0, height_offset, 0.0)
    global_position = global_position.lerp(goal, 1.0 - exp(-follow_smoothing * delta))
    rotation.y = yaw
    _arm.rotation.x = pitch
