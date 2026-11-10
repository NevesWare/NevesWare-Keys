class_name RemotePlayer
extends Node3D
## Outro jogador na rede: recebe estado ~15x/s e interpola posição e animação.
## Quando ele está dirigindo mostra um carro "fantasma" (sem colisão).

var peer_id: int = 0
var rig: HumanoidRig
var car_vis: CarVisual
var _car_key: String = ""
var _label: Label3D
var _target_pos: Vector3
var _target_yaw: float = 0.0
var _speed: float = 0.0
var _on_floor: bool = true
var _stance: int = 0
var _crouch: float = 0.0
var _prone: float = 0.0
var _look_key: String = ""
var _has_state: bool = false
var last_seen: float = 0.0


func _ready() -> void:
	rig = HumanoidRig.new()
	rig.cheap = true
	add_child(rig)
	_label = Label3D.new()
	_label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	_label.position.y = 2.15
	_label.pixel_size = 0.006
	_label.font_size = 48
	_label.outline_size = 10
	_label.modulate = Color(0.6, 0.85, 1.0)
	_label.visibility_range_end = 60.0
	add_child(_label)


func apply_state(st: Dictionary) -> void:
	last_seen = 0.0
	_target_pos = st.get("p", global_position)
	_target_yaw = float(st.get("y", 0.0))
	_speed = float(st.get("s", 0.0))
	_on_floor = bool(st.get("f", true))
	_stance = int(st.get("st", 0))
	_label.text = "%s [%d]" % [String(st.get("n", "?")), peer_id]
	var ap: Variant = st.get("ap", {})
	if ap is Dictionary:
		var key := str(ap)
		if key != _look_key:
			_look_key = key
			rig.apply_look(GameState.look_from(ap))
	var c: Variant = st.get("c", null)
	var ck := ""
	if c is Array and c.size() >= 2:
		ck = "%s|%s" % [c[0], c[1]]
	if ck != _car_key:
		_car_key = ck
		if car_vis != null:
			car_vis.queue_free()
			car_vis = null
		if ck != "":
			car_vis = CarVisual.new()
			add_child(car_vis)
			car_vis.build(String(c[0]), Color.html(String(c[1])), c.size() > 2 and bool(c[2]))
	rig.visible = car_vis == null
	if not _has_state:
		_has_state = true
		global_position = _target_pos
		rotation.y = _target_yaw


func _process(delta: float) -> void:
	last_seen += delta
	if not _has_state:
		return
	var k := 1.0 - exp(-12.0 * delta)
	global_position = global_position.lerp(_target_pos, k)
	if car_vis != null:
		car_vis.rotation.y = lerp_angle(car_vis.rotation.y, _target_yaw, k)
		car_vis.update_wheels(delta, _speed, 0.0)
		car_vis.set_lights(GameState.daylight() < 0.4)
		_label.position.y = 2.4
	else:
		rig.rotation.y = lerp_angle(rig.rotation.y, _target_yaw, k)
		_label.position.y = 2.15
		_crouch = move_toward(_crouch, 1.0 if _stance == 1 else 0.0, delta * 6.0)
		_prone = move_toward(_prone, 1.0 if _stance == 2 else 0.0, delta * 4.0)
		rig.update_animation(delta, _speed, _on_floor, _crouch, _prone, 0.0)
