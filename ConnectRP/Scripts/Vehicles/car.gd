class_name Car
extends CharacterBody3D
## Carro arcade leve para celular: aceleração, ré, freio de mão (derrapagem),
## esterço dependente da velocidade, combustível, dano no motor, colisão com
## paredes/carros/pedestres e IA simples de trânsito (segue as ruas da grade).
##
## Camadas de colisão: 1 mundo | 2 carros da IA | 4 carros parados/do jogador | 8 personagens.

signal destroyed(car: Car)

const LAYER_WORLD := 1
const LAYER_AI := 2
const LAYER_CAR := 4
const LAYER_CHAR := 8

@export var model: String = "sedan"
@export var paint: Color = Color(0.75, 0.08, 0.08)
@export var taxi: bool = false

var visual: CarVisual
var spec: Dictionary
var stats: Dictionary
var speed: float = 0.0
var steer: float = 0.0
var fuel: float = 100.0
var engine_health: float = 100.0
var driver: Node3D = null
var owned: bool = false
var plate: String = ""
var lights_on: bool = false
var braking: bool = false

# IA de trânsito
var ai: bool = false
var traffic: TrafficManager = null
var _ai_from: Vector2i
var _ai_to: Vector2i
var _ai_wait: float = 0.0
var _ai_ghost: float = 0.0
var _ai_cruise: float = 11.0

var _gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
var _grounded: bool = true
var _ray := PhysicsRayQueryParameters3D.new()
var _hit_cd: float = 0.0


func _ready() -> void:
	add_to_group("cars")
	stats = GameState.CAR_MODELS.get(model, GameState.CAR_MODELS["sedan"])
	spec = CarVisual.spec_of(model)
	visual = CarVisual.new()
	add_child(visual)
	visual.build(model, paint, taxi, true)
	var cs := CollisionShape3D.new()
	var box := BoxShape3D.new()
	var h: float = float(spec["hgt"]) + float(spec["cab_h"])
	box.size = Vector3(spec["wid"], h, spec["len"])
	cs.shape = box
	cs.position.y = CarVisual.CLEARANCE + 0.06 + h * 0.5
	add_child(cs)
	motion_mode = CharacterBody3D.MOTION_MODE_FLOATING
	wall_min_slide_angle = 0.0
	_ray.collision_mask = LAYER_WORLD
	_ray.exclude = [get_rid()]
	if plate == "":
		plate = "%s%s%s-%d%d%d%d" % [char(65 + randi() % 26), char(65 + randi() % 26), char(65 + randi() % 26),
			randi() % 10, randi() % 10, randi() % 10, randi() % 10]
	_apply_layers()


func half_width() -> float:
	return float(spec.get("wid", 1.8)) * 0.5


func half_length() -> float:
	return float(spec.get("len", 4.5)) * 0.5


func display_name() -> String:
	return String(stats.get("name", model))


func _apply_layers() -> void:
	if ai and driver == null:
		collision_layer = LAYER_AI
		collision_mask = LAYER_WORLD | LAYER_CAR | LAYER_CHAR
	else:
		collision_layer = LAYER_CAR
		collision_mask = LAYER_WORLD | LAYER_AI | LAYER_CAR | LAYER_CHAR


func set_driver(d: Node3D) -> void:
	driver = d
	if d != null:
		ai = false          # o jogador assumiu o carro (a IA para de dirigir)
	_apply_layers()


func start_ai(manager: TrafficManager, from: Vector2i, to: Vector2i) -> void:
	traffic = manager
	ai = true
	_ai_from = from
	_ai_to = to
	_ai_cruise = randf_range(9.0, 13.0)
	_apply_layers()


# ------------------------------------------------------------------- física

func _physics_process(delta: float) -> void:
	var throttle := 0.0
	var steer_in := 0.0
	var handbrake := false
	var ai_brake := false
	_hit_cd = maxf(0.0, _hit_cd - delta)

	if driver != null:
		var fwd_in := maxf(Input.get_action_strength("accelerate"), Input.get_action_strength("move_forward"))
		var back_in := maxf(Input.get_action_strength("brake"), Input.get_action_strength("move_back"))
		throttle = fwd_in - back_in
		steer_in = Input.get_action_strength("move_right") - Input.get_action_strength("move_left")
		handbrake = Input.is_action_pressed("jump")
	elif ai and traffic != null:
		var r := _ai_drive(delta)
		throttle = r.x
		steer_in = r.y
		ai_brake = r.z > 0.5
	else:
		handbrake = true   # estacionado

	if fuel <= 0.0 or engine_health <= 0.0:
		throttle = 0.0

	var max_speed: float = stats.get("max_speed", 30.0)
	var accel: float = stats.get("accel", 8.0)
	var brake_force := 22.0
	braking = false
	if ai_brake:
		speed = move_toward(speed, 0.0, brake_force * delta)
		braking = true
	elif throttle > 0.05:
		if speed < -0.5:
			speed = move_toward(speed, 0.0, brake_force * delta)
			braking = true
		else:
			# aceleração diminui perto da velocidade máxima
			var k := 1.0 - clampf(speed / max_speed, 0.0, 1.0) * 0.6
			speed = move_toward(speed, max_speed * throttle, accel * k * delta)
	elif throttle < -0.05:
		if speed > 0.5:
			speed = move_toward(speed, 0.0, brake_force * delta)
			braking = true
		else:
			speed = move_toward(speed, -9.0 * -throttle, accel * 0.6 * delta)
	else:
		speed = move_toward(speed, 0.0, (2.0 + absf(speed) * 0.08) * delta)
	if handbrake:
		speed = move_toward(speed, 0.0, 14.0 * delta)
		braking = braking or absf(speed) > 0.5

	var spd_ratio := clampf(absf(speed) / max_speed, 0.0, 1.0)
	var steer_max := lerpf(0.62, 0.16, spd_ratio)
	steer = move_toward(steer, steer_in * steer_max, 3.5 * delta)
	var wheelbase := float(spec.get("len", 4.5)) * 0.62
	if _grounded and absf(speed) > 0.05:
		var yaw_rate := speed * tan(steer) / wheelbase
		if handbrake and absf(speed) > 6.0:
			yaw_rate *= 1.6
		rotation.y -= yaw_rate * delta

	var fwd := -global_transform.basis.z
	var lateral := 0.0
	if handbrake and absf(speed) > 6.0:
		lateral = steer * absf(speed) * 0.25   # derrapagem leve
	var right := global_transform.basis.x
	velocity.x = fwd.x * speed - right.x * lateral
	velocity.z = fwd.z * speed - right.z * lateral

	_update_vertical(delta)
	var pre_speed := speed
	move_and_slide()
	_handle_collisions(pre_speed, fwd)
	speed = Vector2(velocity.x, velocity.z).dot(Vector2(fwd.x, fwd.z))
	if absf(speed - pre_speed) < 0.05:
		speed = pre_speed

	if driver != null:
		fuel = maxf(0.0, fuel - absf(throttle) * delta * 0.055)
		driver.global_position = global_position + Vector3(0, 0.6, 0)

	lights_on = GameState.daylight() < 0.4
	visual.set_lights(lights_on, braking)
	visual.set_spot_enabled(driver != null)
	visual.update_wheels(delta, speed, steer)


## Mantém o carro "assentado" no chão (sobe meio-fio de calçada) sem rolar.
func _update_vertical(delta: float) -> void:
	var space := get_world_3d().direct_space_state
	var origin := global_position + Vector3(0, 1.2, 0)
	_ray.from = origin
	_ray.to = origin + Vector3(0, -4.0, 0)
	var hit := space.intersect_ray(_ray)
	_grounded = false
	if not hit.is_empty():
		var gy: float = hit["position"].y
		var dy := gy - global_position.y
		if dy > -0.3 and dy < 0.5 and velocity.y <= 0.5:
			_grounded = true
			velocity.y = clampf(dy / delta * 0.6, -6.0, 6.0)
	if not _grounded:
		velocity.y -= _gravity * delta
	if global_position.y < -20.0:
		global_position.y = 2.0
		velocity = Vector3.ZERO


func _handle_collisions(pre_speed: float, fwd: Vector3) -> void:
	for i in range(get_slide_collision_count()):
		var col := get_slide_collision(i)
		var n := col.get_normal()
		if absf(n.y) > 0.6:
			continue
		var other := col.get_collider()
		var impact := absf(pre_speed) * absf(n.dot(fwd))
		if other != null and other.has_method("hit_by_vehicle"):
			if _hit_cd <= 0.0:
				other.call("hit_by_vehicle", self, absf(pre_speed))
				_hit_cd = 0.6
			continue
		if impact > 6.0 and _hit_cd <= 0.0:
			_hit_cd = 0.4
			var was_ok := engine_health > 0.0
			engine_health = maxf(0.0, engine_health - (impact - 6.0) * 1.3)
			if driver != null:
				Input.vibrate_handheld(int(clampf(impact * 8.0, 40.0, 250.0)))
				if impact > 18.0:
					GameState.damage((impact - 18.0) * 0.8)
				if was_ok and engine_health <= 0.0:
					GameState.toast("Motor quebrado! Leve à oficina.", Color(1, 0.4, 0.3))


# ------------------------------------------------------------------------ IA

## Retorna Vector3(throttle, steer, freio).
func _ai_drive(delta: float) -> Vector3:
	var target := traffic.lane_point(_ai_from, _ai_to)
	var to := target - global_position
	to.y = 0.0
	if to.length() < 6.0:
		var nxt := traffic.next_node(_ai_from, _ai_to)
		_ai_from = _ai_to
		_ai_to = nxt
		target = traffic.lane_point(_ai_from, _ai_to)
		to = target - global_position
		to.y = 0.0
	var desired := atan2(-to.x, -to.z)
	var diff := wrapf(desired - rotation.y, -PI, PI)
	var steer_in := clampf(-diff * 2.2, -1.0, 1.0)
	var cruise := _ai_cruise if absf(diff) < 0.25 else 5.5

	# obstáculo à frente? (carros e pessoas)
	var blocked := false
	if _ai_ghost > 0.0:
		_ai_ghost -= delta
	else:
		var space := get_world_3d().direct_space_state
		var fwd := -global_transform.basis.z
		var o := global_position + Vector3(0, 0.8, 0) + fwd * half_length()
		var q := PhysicsRayQueryParameters3D.create(o, o + fwd * (3.5 + absf(speed) * 0.7),
			LAYER_AI | LAYER_CAR | LAYER_CHAR, [get_rid()])
		blocked = not space.intersect_ray(q).is_empty()
	if blocked:
		_ai_wait += delta
		if _ai_wait > 4.0:
			_ai_wait = 0.0
			_ai_ghost = 1.5
		return Vector3(0.0, steer_in, 1.0)
	_ai_wait = 0.0
	var throttle := clampf((cruise - speed) * 0.4, -1.0, 1.0)
	if throttle < 0.0:
		return Vector3(0.0, steer_in, 1.0 if speed > cruise + 1.0 else 0.0)
	return Vector3(throttle, steer_in, 0.0)


# -------------------------------------------------------------------- serviço

func refuel_cost() -> int:
	return int(ceil((100.0 - fuel) * 6.0))


func repair_cost() -> int:
	return int(ceil((100.0 - engine_health) * 9.0))
