class_name PlayerController
extends CharacterBody3D
## Controlador mobile: andar, correr, sprint, pular, agachar, deitar e socar.

enum Stance { STAND, CROUCH, PRONE }

@export var walk_speed: float = 1.8
@export var run_speed: float = 4.5
@export var sprint_speed: float = 7.0
@export var crouch_speed: float = 1.6
@export var crawl_speed: float = 0.9
@export var acceleration: float = 20.0
@export var deceleration: float = 25.0
@export var air_control: float = 0.3
@export var jump_velocity: float = 5.0
@export var turn_speed: float = 12.0
@export var stand_height: float = 1.8
@export var crouch_height: float = 1.2
@export var prone_height: float = 0.72
@export var punch_damage: float = 10.0
@export var punch_cooldown: float = 0.45

@onready var collision: CollisionShape3D = $CollisionShape3D
@onready var visual: HumanoidRig = $Visual
@onready var camera_rig: CameraRig = $CameraRig

var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
var stance: Stance = Stance.STAND

var _capsule: CapsuleShape3D
var _crouch_amount: float = 0.0
var _prone_amount: float = 0.0
var _punch_cd: float = 0.0
var _punch_hand: int = 0


func _ready() -> void:
    _capsule = (collision.shape as CapsuleShape3D).duplicate()
    collision.shape = _capsule
    floor_max_angle = deg_to_rad(60.0) # sobe meio-fio e degraus baixos
    floor_snap_length = 0.4
    _apply_height(stand_height)


func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y -= gravity * delta
    _punch_cd = maxf(0.0, _punch_cd - delta)

    # Posturas (toggle): agachar / deitar
    if Input.is_action_just_pressed("crouch"):
        _try_set_stance(Stance.STAND if stance == Stance.CROUCH else Stance.CROUCH)
    if Input.is_action_just_pressed("prone"):
        _try_set_stance(Stance.STAND if stance == Stance.PRONE else Stance.PRONE)

    # Pulo (se estiver agachado/deitado, o primeiro toque levanta)
    if Input.is_action_just_pressed("jump") and is_on_floor():
        if stance != Stance.STAND:
            _try_set_stance(Stance.STAND)
        else:
            velocity.y = jump_velocity

    # Soco
    if Input.is_action_just_pressed("punch") and _punch_cd <= 0.0 and stance != Stance.PRONE and is_on_floor():
        _start_punch()

    # Direção relativa à câmera (joystick analógico ou teclado)
    var input := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
    var mag := clampf(input.length(), 0.0, 1.0)
    var dir := Vector3.ZERO
    if mag > 0.01:
        dir = Vector3(input.x, 0.0, input.y).normalized().rotated(Vector3.UP, camera_rig.yaw)

    var speed := run_speed
    match stance:
        Stance.PRONE:
            speed = crawl_speed
        Stance.CROUCH:
            speed = crouch_speed
        _:
            if Input.is_action_pressed("walk") or mag < 0.5:
                speed = walk_speed
            elif Input.is_action_pressed("sprint"):
                speed = sprint_speed
    if _punch_cd > punch_cooldown - 0.3:
        speed = minf(speed, walk_speed)

    var target := dir * speed
    var rate := acceleration if mag > 0.01 else deceleration
    if not is_on_floor():
        rate *= air_control
    velocity.x = move_toward(velocity.x, target.x, rate * delta)
    velocity.z = move_toward(velocity.z, target.z, rate * delta)

    move_and_slide()

    if dir.length() > 0.1:
        var target_yaw := atan2(-dir.x, -dir.z)
        visual.rotation.y = lerp_angle(visual.rotation.y, target_yaw, clampf(turn_speed * delta, 0.0, 1.0))

    _crouch_amount = move_toward(_crouch_amount, 1.0 if stance == Stance.CROUCH else 0.0, delta * 6.0)
    _prone_amount = move_toward(_prone_amount, 1.0 if stance == Stance.PRONE else 0.0, delta * 4.0)
    visual.update_animation(delta, get_horizontal_speed(), is_on_floor(), _crouch_amount, _prone_amount, velocity.y)

    # Altura da câmera acompanha a postura
    var cam_h := 1.55
    if stance == Stance.CROUCH:
        cam_h = 1.15
    elif stance == Stance.PRONE:
        cam_h = 0.7
    camera_rig.height_offset = lerpf(camera_rig.height_offset, cam_h, 1.0 - exp(-8.0 * delta))


func get_horizontal_speed() -> float:
    return Vector2(velocity.x, velocity.z).length()


func get_stance_name() -> String:
    match stance:
        Stance.CROUCH:
            return "agachado"
        Stance.PRONE:
            return "deitado"
        _:
            return "em pé"


func _height_of(s: Stance) -> float:
    match s:
        Stance.CROUCH:
            return crouch_height
        Stance.PRONE:
            return prone_height
        _:
            return stand_height


func _try_set_stance(s: Stance) -> void:
    var h_new := _height_of(s)
    var h_cur := _capsule.height
    if h_new > h_cur + 0.01 and test_move(global_transform, Vector3(0.0, h_new - h_cur, 0.0)):
        return # sem espaço para levantar
    stance = s
    _apply_height(h_new)


func _apply_height(h: float) -> void:
    _capsule.height = h
    collision.position.y = h * 0.5


func _start_punch() -> void:
    _punch_cd = punch_cooldown
    if get_horizontal_speed() < 0.5:
        visual.rotation.y = camera_rig.yaw # soca para onde a câmera olha
    visual.play_punch(_punch_hand)
    _punch_hand = 1 - _punch_hand
    get_tree().create_timer(0.15).timeout.connect(_do_punch_hit)


func _do_punch_hit() -> void:
    var space := get_world_3d().direct_space_state
    var shape := SphereShape3D.new()
    shape.radius = 0.5
    var q := PhysicsShapeQueryParameters3D.new()
    q.shape = shape
    var fwd := -visual.global_transform.basis.z
    var h := 1.2 if stance == Stance.STAND else 0.8
    q.transform = Transform3D(Basis.IDENTITY, global_position + Vector3(0.0, h, 0.0) + fwd * 0.9)
    q.exclude = [get_rid()]
    for r in space.intersect_shape(q, 8):
        var c: Object = r["collider"]
        if c != null and c.has_method("take_damage"):
            c.call("take_damage", punch_damage, fwd)
