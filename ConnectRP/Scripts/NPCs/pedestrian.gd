class_name Pedestrian
extends CharacterBody3D
## Pedestre simples: caminha pela calçada em volta do quarteirão, cai quando
## leva soco ou é atropelado e depois levanta e foge correndo.

enum State { WALK, FALLEN, FLEE }

const SIDEWALK_OFFSET := 25.2

var rig: HumanoidRig
var state: State = State.WALK
var _corners: Array[Vector3] = []
var _idx: int = 0
var _dir: int = 1
var _timer: float = 0.0
var _walk_speed: float = 1.3
var _gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
var _player: Node3D
var _far: bool = false


func setup(block_center: Vector3, rng: RandomNumberGenerator, player: Node3D) -> void:
	_player = player
	relocate(block_center, rng)
	rig = HumanoidRig.new()
	rig.cheap = true
	rig.lod_distance = 90.0
	rig.has_beard = rng.randf() < 0.3
	rig.skin_color = GameState.SKIN_COLORS[rng.randi() % GameState.SKIN_COLORS.size()]
	rig.hair_color = GameState.HAIR_COLORS[rng.randi() % GameState.HAIR_COLORS.size()]
	rig.top_color = GameState.TOP_COLORS[rng.randi() % GameState.TOP_COLORS.size()]
	rig.pants_color = GameState.PANTS_COLORS[1 + rng.randi() % (GameState.PANTS_COLORS.size() - 1)]


## Leva o pedestre para a calçada de outro quarteirão (reciclagem perto do jogador).
func relocate(block_center: Vector3, rng: RandomNumberGenerator) -> void:
	state = State.WALK
	velocity = Vector3.ZERO
	var o := SIDEWALK_OFFSET
	_corners = [block_center + Vector3(-o, 0, -o), block_center + Vector3(o, 0, -o),
		block_center + Vector3(o, 0, o), block_center + Vector3(-o, 0, o)]
	_idx = rng.randi() % 4
	_dir = 1 if rng.randf() < 0.5 else -1
	var nxt := _corners[(_idx + _dir + 4) % 4]
	position = _corners[_idx].lerp(nxt, rng.randf()) + Vector3(0, 0.3, 0)
	_idx = (_idx + _dir + 4) % 4
	_walk_speed = rng.randf_range(1.1, 1.6)
	if is_inside_tree():
		global_position = position


func _ready() -> void:
	add_to_group("pedestrians")
	collision_layer = 8
	collision_mask = 1
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.32
	cap.height = 1.75
	cs.shape = cap
	cs.position.y = 0.875
	add_child(cs)
	if rig == null:
		rig = HumanoidRig.new()
		rig.cheap = true
	add_child(rig)


func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= _gravity * delta
	else:
		velocity.y = -0.5

	# longe do jogador: some e não anima (economiza CPU no celular)
	var far := _player != null and global_position.distance_squared_to(_player.global_position) > 110.0 * 110.0
	if far != _far:
		_far = far
		rig.visible = not far
	var spd := 0.0
	var prone := 0.0
	match state:
		State.FALLEN:
			_timer -= delta
			prone = 1.0
			velocity.x = move_toward(velocity.x, 0.0, 8.0 * delta)
			velocity.z = move_toward(velocity.z, 0.0, 8.0 * delta)
			if _timer <= 0.0:
				state = State.FLEE
				_timer = 6.0
		State.FLEE, State.WALK:
			spd = _walk_speed
			if state == State.FLEE:
				spd = 5.0
				_timer -= delta
				if _timer <= 0.0:
					state = State.WALK
			var target := _corners[_idx]
			var to := target - global_position
			to.y = 0.0
			if to.length() < 0.8:
				_idx = (_idx + _dir + 4) % 4
			var d := to.normalized()
			velocity.x = d.x * spd
			velocity.z = d.z * spd
			if not _far:
				rig.rotation.y = lerp_angle(rig.rotation.y, atan2(-d.x, -d.z), 1.0 - exp(-8.0 * delta))
	move_and_slide()
	if not _far:
		rig.update_animation(delta, Vector2(velocity.x, velocity.z).length(), is_on_floor(), 0.0, prone, velocity.y)


func _knock(from_dir: Vector3, force: float) -> void:
	state = State.FALLEN
	_timer = 3.0
	_dir = -_dir   # foge para o outro lado
	_idx = (_idx + _dir + 4) % 4
	var d := Vector3(from_dir.x, 0.0, from_dir.z).normalized()
	velocity.x = d.x * force
	velocity.z = d.z * force
	velocity.y = minf(force * 0.4, 5.0)
	rig.rotation.y = atan2(d.x, d.z)


func take_damage(_amount: float, from_dir: Vector3) -> void:
	if state != State.FALLEN:
		_knock(from_dir, 3.0)


func hit_by_vehicle(car: Node3D, impact_speed: float) -> void:
	if impact_speed < 1.5 or state == State.FALLEN:
		return
	var away := global_position - car.global_position
	_knock(away, clampf(impact_speed * 0.6, 3.0, 12.0))
