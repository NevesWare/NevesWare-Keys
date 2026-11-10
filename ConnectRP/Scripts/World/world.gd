extends Node3D
## Mundo principal do Connect RP: cidade original, ciclo dia/noite, jogador,
## carros (estacionados, trânsito da IA, garagem), pedestres, marcadores RP
## (banco, lanchonete, hospital, delegacia, posto, oficina, concessionária,
## agência de empregos), empregos com rota, HUD/minimapa, menus e multiplayer.

const PlayerScene := preload("res://Scenes/Player/player.tscn")
const START_SPAWN := Vector3(36.0, 0.4, -12.0)
const HOSPITAL_SPAWN := Vector3(-96.0, 0.4, -172.0)
const NET_RATE := 1.0 / 15.0

var player: PlayerController
var touch: TouchControls
var hud: Hud
var menu: RpMenu
var city: CityBuilder
var day_night: DayNight
var traffic: TrafficManager
var points: Array[InteractionPoint] = []
var pedestrians: Array[Pedestrian] = []
var my_car: Car = null
var waypoint: Variant = null
var remote: Dictionary = {}   # peer_id -> RemotePlayer

# emprego
var job_stage: String = ""    # "" | "pickup" | "deliver"
var job_target: Vector3 = Vector3.ZERO
var job_reward: int = 0
var _house_spots: Array[Vector3] = []
var _street_spots: Array[Vector3] = []
var _ped_blocks: Array[Vector3] = []

var _near_point: InteractionPoint
var _near_car: Car
var _auto_point: InteractionPoint
var _job_beam: MeshInstance3D
var _gps_beam: MeshInstance3D
var _rng := RandomNumberGenerator.new()
var _net_t: float = 0.0
var _ped_t: float = 0.0
var _frames: int = 0
var _profile: Dictionary
var _amb_t: float = 0.0
var _route: PackedVector3Array = PackedVector3Array()
var _route_dirty: bool = true


func _ready() -> void:
	_rng.randomize()
	_profile = GameState.quality_profile()
	CityBuilder.VIS_RANGE = _profile["vis"]
	CityBuilder.DETAILS = _profile.get("details", true)
	get_viewport().scaling_3d_scale = _profile["scale3d"]
	get_viewport().msaa_3d = int(_profile.get("msaa", 0)) as Viewport.MSAA
	if GameState.cli.has("hour"):
		GameState.hours = float(GameState.cli["hour"])

	city = CityBuilder.new()
	add_child(city)
	city.build()
	day_night = DayNight.new()
	add_child(day_night)
	day_night.setup(_profile, city)
	_add_signs()
	_collect_spots()
	Sfx.set_ambience(true)

	_spawn_player()
	_build_points()
	_spawn_parked_cars()
	traffic = TrafficManager.new()
	add_child(traffic)
	traffic.spawn(int(_profile["traffic"]), player)
	_spawn_pedestrians(int(_profile["peds"]))
	_job_beam = _make_beam(Color(1.0, 0.92, 0.7, 0.28))
	_gps_beam = _make_beam(Color(1.0, 1.0, 1.0, 0.18))

	touch = TouchControls.new()
	add_child(touch)
	touch.look_input.connect(player.camera_rig.rotate_look)
	menu = RpMenu.new()
	add_child(menu)
	menu.opened.connect(_refresh_input_lock)
	menu.closed.connect(_refresh_input_lock)
	hud = Hud.new()
	hud.world = self
	add_child(hud)
	hud.phone_pressed.connect(open_phone)
	hud.chat_sent.connect(func(t: String) -> void: Network.send_chat(GameState.player_name, t))
	hud.waypoint_set.connect(_set_waypoint)
	hud.map_toggled.connect(func(_o: bool) -> void: _refresh_input_lock())

	GameState.died.connect(_on_died)
	GameState.position_provider = func() -> Vector3: return player.global_position
	GameState.playing = true
	Network.state_received.connect(_on_remote_state)
	Network.peer_left.connect(_on_peer_left)
	Network.peer_joined.connect(func(id: int) -> void: hud.toast("Jogador #%d conectou" % id, Color(0.6, 0.85, 1.0)))
	Network.status_changed.connect(func(t: String) -> void: hud.toast(t, Color(0.6, 0.85, 1.0)))

	if GameState.has_license == false and GameState.jobs_done == 0 and GameState.saved_position == null:
		_welcome()
	_capture_map()
	_dev_cli()


func _exit_tree() -> void:
	GameState.playing = false
	Sfx.set_ambience(false)


## Foto aérea da cidade para o radar (só na 1ª vez; depois vem do cache).
func _capture_map() -> void:
	if MapCapture.texture != null:
		return
	var hidden: Array[Node3D] = []
	for c in get_children():
		if c is Node3D and c != city and c != day_night and (c as Node3D).visible:
			hidden.append(c)
			(c as Node3D).visible = false
	await MapCapture.capture(self, city, int(_profile.get("map_size", 1024)))
	for n in hidden:
		if is_instance_valid(n):
			n.visible = true


# ================================================================= construção

func _spawn_player() -> void:
	player = PlayerScene.instantiate() as PlayerController
	var pos: Vector3 = START_SPAWN
	if GameState.saved_position is Vector3:
		pos = GameState.saved_position + Vector3(0, 0.3, 0)
	player.position = pos
	add_child(player)
	player.visual.apply_look(GameState.look())
	player.camera_rig.set_far(_profile["far"])
	player.camera_rig.sensitivity_scale = float(GameState.settings.get("sensitivity", 1.0))
	player.vehicle_changed.connect(_on_vehicle_changed)


func _add_signs() -> void:
	var l := Label3D.new()
	l.text = "LANCHONETE"
	l.font_size = 70
	l.pixel_size = 0.02
	l.modulate = Color(1.0, 0.85, 0.2)
	l.outline_size = 6
	l.font = Ui.font(700)
	l.outline_modulate = Color(0.25, 0.05, 0.05)
	l.position = Vector3(-83.5, 5.2, 8.2)
	l.rotation_degrees.y = 180.0
	l.visibility_range_end = 150.0
	add_child(l)


func _collect_spots() -> void:
	for ix in range(CityBuilder.COLS):
		for iz in range(CityBuilder.ROWS):
			var c := CityBuilder.block_center(ix, iz)
			var kind := CityBuilder.block_type(ix, iz)
			if kind == "field":
				continue
			_ped_blocks.append(c)
			for off in [Vector3(0, 0, -25.3), Vector3(0, 0, 25.3), Vector3(-25.3, 0, 0), Vector3(25.3, 0, 0)]:
				_street_spots.append(c + off + Vector3(0, 0.12, 0))
			if kind == "houses":
				for lx in [-17.0, 0.0, 17.0]:
					for lz in [-1.0, 1.0]:
						_house_spots.append(c + Vector3(lx, 0.12, lz * 25.3))


func _make_beam(color: Color) -> MeshInstance3D:
	var m := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 1.4
	cm.bottom_radius = 1.4
	cm.height = 70.0
	cm.cap_top = false
	cm.cap_bottom = false
	cm.radial_segments = 16
	m.mesh = cm
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.material_override = mat
	m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	m.visible = false
	add_child(m)
	return m


func _add_point(id: String, title: String, pos: Vector3, color: Color, blip: String, cb: Callable,
		vehicle_only: bool = false, radius: float = 2.0) -> InteractionPoint:
	var p := InteractionPoint.new()
	p.id = id
	p.title = title
	p.color = color
	p.blip = blip
	p.on_use = cb
	p.vehicle_only = vehicle_only
	p.radius = radius
	p.position = pos
	add_child(p)
	points.append(p)
	return p


func _build_points() -> void:
	var y := CityBuilder.SLAB_H
	_add_point("banco", "Banco", Vector3(-32, y, -54.5), Color(0.3, 0.9, 0.4), "$", _bank_menu)
	_add_point("lanchonete", "Lanchonete", Vector3(-83.5, y, 7.2), Color(1.0, 0.6, 0.15), "L",
		_food_menu.bind("Lanchonete", [["Hambúrguer", 25, 45.0, 0.0], ["Refrigerante", 10, 0.0, 40.0],
			["Combo (lanche + suco)", 32, 50.0, 50.0], ["Água", 5, 0.0, 25.0]]))
	_add_point("conveniencia", "Conveniência", Vector3(-160, y, -44.5), Color(1.0, 0.6, 0.15), "L",
		_food_menu.bind("Loja de Conveniência", [["Salgado", 12, 25.0, 0.0], ["Água", 5, 0.0, 25.0],
			["Energético", 14, 5.0, 30.0]]))
	_add_point("hospital", "Hospital", Vector3(-96, y, -176), Color(1.0, 0.3, 0.3), "H", _hospital_menu)
	_add_point("delegacia", "Delegacia", Vector3(96, y, -113), Color(0.35, 0.55, 1.0), "D", _police_menu)
	_add_point("empregos", "Agência de Empregos", Vector3(32, y, -18), Color(1.0, 0.85, 0.2), "E", _jobs_menu)
	_add_point("deposito", "Depósito de Entregas", Vector3(-147, y, 13), Color(0.9, 0.7, 0.4), "P", _depot_use)
	_add_point("concessionaria", "Concessionária", Vector3(96, y, 160), Color(0.4, 0.75, 1.0), "C", _dealer_menu)
	_add_point("posto", "Posto (abastecer)", Vector3(-160, y, -28), Color(1.0, 0.35, 0.2), "G", _fuel_menu, true, 7.0)
	_add_point("oficina", "Oficina (consertar)", Vector3(-173, y, 13), Color(0.7, 0.7, 0.75), "O", _repair_menu, true, 6.0)


func _spawn_car(model: String, paint: Color, pos: Vector3, yaw: float, owned: bool = false) -> Car:
	var car := Car.new()
	car.model = model
	car.paint = paint
	car.owned = owned
	car.position = pos
	car.rotation.y = yaw
	add_child(car)
	return car


func _spawn_parked_cars() -> void:
	var parked := [
		["compacto", 2, Vector3(16, 0.05, -5.0), PI * 0.5],
		["sedan", 0, Vector3(46, 0.05, -5.0), PI * 0.5],
		["picape", 4, Vector3(-4.9, 0.05, -20), 0.0],
		["sedan", 1, Vector3(-91, 0.05, -191.0), PI * 0.5],
		["compacto", 5, Vector3(-150, 0.05, 5.0), -PI * 0.5],
		["esportivo", 3, Vector3(101, 0.05, 187.0), PI * 0.5],
	]
	for p in parked:
		_spawn_car(p[0], GameState.CAR_COLORS[p[1]], p[2], p[3])


func _spawn_pedestrians(count: int) -> void:
	for i in range(count):
		var ped := Pedestrian.new()
		ped.setup(_pick_block_near(player.global_position, 0.0, 140.0), _rng, player)
		add_child(ped)
		pedestrians.append(ped)


func _pick_block_near(center: Vector3, min_d: float, max_d: float) -> Vector3:
	var opts: Array[Vector3] = []
	for b in _ped_blocks:
		var d := Vector2(b.x - center.x, b.z - center.z).length()
		if d >= min_d and d <= max_d:
			opts.append(b)
	if opts.is_empty():
		return _ped_blocks[_rng.randi() % _ped_blocks.size()]
	return opts[_rng.randi() % opts.size()]


# ================================================================== loop

func _process(delta: float) -> void:
	_frames += 1
	var typing := hud.is_typing()
	var in_car := player.vehicle != null
	touch.set_mode("car" if in_car else "foot")
	hud.set_vehicle_info(player.vehicle)
	_update_nearby()
	if menu.is_open or hud.is_map_open():
		hud.set_hint("")

	if not typing and not menu.is_open and not hud.is_map_open() and not GameState.dead:
		if Input.is_action_just_pressed("interact"):
			_do_interact()
		if Input.is_action_just_pressed("phone"):
			open_phone()
		if Input.is_action_just_pressed("map"):
			hud.open_map()
	if Input.is_action_just_pressed("chat") and not typing and not menu.is_open:
		hud.toggle_chat()
	if Input.is_action_just_pressed("ui_cancel"):
		if hud.is_map_open():
			hud.close_map()
		elif menu.is_open:
			menu.close()
	_refresh_input_lock()

	touch.set_active("crouch", player.stance == PlayerController.Stance.CROUCH)
	touch.set_active("prone", player.stance == PlayerController.Stance.PRONE)
	_process_job()
	_process_waypoint()
	_recycle_pedestrians(delta)
	_network_tick(delta)
	_amb_t -= delta
	if _amb_t <= 0.0:
		_amb_t = 0.5
		Sfx.update_ambience(player.camera_rig.global_position, GameState.daylight())
		_route_dirty = true
	day_night.saturation_override = 0.0 if GameState.dead else -1.0


func _refresh_input_lock() -> void:
	var locked := menu.is_open or hud.is_map_open() or GameState.dead
	touch.set_enabled(not locked)
	player.input_enabled = not locked and not hud.is_typing()


func _update_nearby() -> void:
	var pp := player.global_position
	var in_car := player.vehicle != null
	_near_point = null
	_near_car = null
	var best := 1e9
	for p in points:
		if p.vehicle_only != in_car:
			continue
		var d := Vector2(p.global_position.x - pp.x, p.global_position.z - pp.z).length()
		if d < p.radius and d < best and absf(p.global_position.y - pp.y) < 2.5:
			best = d
			_near_point = p
	if in_car:
		# posto/oficina abrem sozinhos quando o carro para no marcador
		var car := player.vehicle
		if _near_point != null and absf(car.speed) < 1.5 and _auto_point != _near_point and not menu.is_open:
			_auto_point = _near_point
			_near_point.on_use.call()
		elif _near_point == null:
			_auto_point = null
		touch.set_button_label("interact", "SAIR")
		touch.set_button_visible("interact", true)
		hud.set_hint("Pare no marcador  ·  " + _near_point.title if _near_point != null else "")
		return
	if _near_point == null:
		var best_car := 1e9
		for c in get_tree().get_nodes_in_group("cars"):
			var car := c as Car
			if car.driver != null or absf(car.speed) > 3.0:
				continue
			var d := car.global_position.distance_to(pp)
			if d < car.half_length() + 1.6 and d < best_car:
				best_car = d
				_near_car = car
	if _near_point != null:
		touch.set_button_label("interact", "USAR")
		touch.set_button_visible("interact", true)
		hud.set_hint(_near_point.title + "   ·   USAR")
	elif _near_car != null:
		touch.set_button_label("interact", "ENTRAR")
		touch.set_button_visible("interact", true)
		hud.set_hint("%s%s   ·   ENTRAR" % [_near_car.display_name(), " (seu)" if _near_car.owned else ""])
	else:
		touch.set_button_visible("interact", false)
		hud.set_hint("")


func _do_interact() -> void:
	if player.vehicle != null:
		if absf(player.vehicle.speed) > 4.0:
			hud.toast("Diminua a velocidade para sair", Color(1, 0.8, 0.4))
			return
		player.exit_vehicle()
	elif _near_point != null:
		_near_point.on_use.call()
	elif _near_car != null:
		player.enter_vehicle(_near_car)


func _on_vehicle_changed(car: Node) -> void:
	_auto_point = null
	if car != null:
		var c := car as Car
		if c.engine_health <= 0.0:
			hud.toast("Motor quebrado — chame um guincho na oficina", Color(1, 0.4, 0.3))
		elif c.fuel <= 0.0:
			hud.toast("Sem combustível!", Color(1, 0.4, 0.3))


func _recycle_pedestrians(delta: float) -> void:
	_ped_t += delta
	if _ped_t < 2.0:
		return
	_ped_t = 0.0
	var pp := player.global_position
	for ped in pedestrians:
		if ped.global_position.distance_to(pp) > 170.0:
			ped.relocate(_pick_block_near(pp, 50.0, 120.0), _rng)


# ============================================================ mapa / minimapa

func player_map_state() -> Dictionary:
	var heading := player.visual.rotation.y
	if player.vehicle != null:
		heading = player.vehicle.global_rotation.y
	return {"pos": player.global_position, "cam_yaw": player.camera_rig.yaw, "heading": heading}


## [posição, letra, raio, preenchido, preso na borda]
func map_blips() -> Array:
	var out: Array = []
	for p in points:
		out.append([p.global_position, p.blip, 8.0, false, false])
	if my_car != null and is_instance_valid(my_car) and my_car.driver == null:
		out.append([my_car.global_position, "V", 7.0, true, false])
	for r in remote.values():
		out.append([(r as Node3D).global_position, "", 4.5, true, false])
	if waypoint is Vector3:
		out.append([waypoint, "", 6.5, true, true])
	if job_stage != "":
		out.append([job_target, "!", 9.0, true, true])
	return out


## Rota do GPS pelas ruas (grade): jogador -> cruzamento -> esquina em L -> destino.
func gps_route() -> PackedVector3Array:
	if not _route_dirty:
		return _route
	_route_dirty = false
	var target: Variant = job_target if job_stage != "" else waypoint
	_route = PackedVector3Array()
	if not target is Vector3:
		return _route
	var tg: Vector3 = target
	var pp := player.global_position
	var a := _nearest_node(pp)
	var b := _nearest_node(tg)
	_route.append(pp)
	_route.append(TrafficManager.node_pos(a))
	if a.x != b.x and a.y != b.y:
		_route.append(TrafficManager.node_pos(Vector2i(b.x, a.y)))
	_route.append(TrafficManager.node_pos(b))
	_route.append(tg)
	return _route


func _nearest_node(p: Vector3) -> Vector2i:
	return Vector2i(clampi(roundi((p.x + 256.0) / CityBuilder.PITCH), 0, TrafficManager.NODES_X - 1),
		clampi(roundi((p.z + 256.0) / CityBuilder.PITCH), 0, TrafficManager.NODES_Z - 1))


func _set_waypoint(p: Vector3) -> void:
	waypoint = p
	_route_dirty = true
	_gps_beam.position = Vector3(p.x, 35.0, p.z)
	_gps_beam.visible = true
	hud.toast("GPS marcado", Color(0.85, 0.5, 1.0))


func _process_waypoint() -> void:
	if waypoint is Vector3:
		var wp: Vector3 = waypoint
		if Vector2(wp.x - player.global_position.x, wp.z - player.global_position.z).length() < 15.0:
			waypoint = null
			_gps_beam.visible = false
			hud.toast("Você chegou ao destino", Color(0.85, 0.5, 1.0))


# =============================================================== empregos

func job_status_text() -> String:
	var j := GameState.job
	var t := GameState.JOB_NAMES.get(j, j) as String
	if j == "":
		return t
	var d := int(Vector2(job_target.x - player.global_position.x, job_target.z - player.global_position.z).length())
	match j:
		"entregador":
			if job_stage == "deliver":
				return "%s: entregue o pacote (%d m)" % [t, d]
			return "%s: pegue um pacote no Depósito (P)" % t
		"taxista":
			if job_stage == "pickup":
				return "%s: busque o passageiro (%d m)" % [t, d]
			if job_stage == "deliver":
				return "%s: leve o passageiro (%d m)" % [t, d]
			return "%s: entre em um carro para iniciar" % t
	return t


func _set_job_target(stage: String, p: Vector3, reward: int) -> void:
	job_stage = stage
	job_target = p
	job_reward = reward
	_route_dirty = true
	_job_beam.visible = stage != ""
	_job_beam.position = Vector3(p.x, 35.0, p.z)


func _process_job() -> void:
	var j := GameState.job
	var pp := player.global_position
	var d := Vector2(job_target.x - pp.x, job_target.z - pp.z).length()
	if j == "entregador" and job_stage == "deliver":
		if (player.vehicle == null and d < 3.0) or (player.vehicle != null and d < 6.0 and absf(player.vehicle.speed) < 2.0):
			GameState.jobs_done += 1
			GameState.add_money(job_reward, "Entrega concluída")
			_set_job_target("", Vector3.ZERO, 0)
			hud.toast("Volte ao Depósito (P) para outra entrega", Color(1, 0.9, 0.5))
	elif j == "taxista":
		if job_stage == "" and player.vehicle != null:
			_start_taxi_pickup()
		elif job_stage != "" and player.vehicle != null and d < 7.0 and absf(player.vehicle.speed) < 2.0:
			if job_stage == "pickup":
				var dest := _random_spot(_street_spots, pp, 150.0, 450.0)
				var dist := pp.distance_to(dest)
				_set_job_target("deliver", dest, 60 + int(dist * 0.55))
				hud.toast("Passageiro embarcou. Siga o marcador amarelo!", Color(1, 0.9, 0.5))
			else:
				GameState.jobs_done += 1
				GameState.add_money(job_reward, "Corrida de táxi")
				_start_taxi_pickup()
	elif j == "" and job_stage != "":
		_set_job_target("", Vector3.ZERO, 0)


func _start_taxi_pickup() -> void:
	var p := _random_spot(_street_spots, player.global_position, 60.0, 250.0)
	_set_job_target("pickup", p, 0)
	hud.toast("Nova corrida! Busque o passageiro no marcador amarelo.", Color(1, 0.9, 0.5))


func _random_spot(list: Array[Vector3], from: Vector3, min_d: float, max_d: float) -> Vector3:
	var opts: Array[Vector3] = []
	for s in list:
		var d := s.distance_to(from)
		if d >= min_d and d <= max_d:
			opts.append(s)
	if opts.is_empty():
		return list[_rng.randi() % list.size()]
	return opts[_rng.randi() % opts.size()]


# ================================================================ menus RP

func _bank_menu() -> void:
	var gs := GameState
	menu.open("Banco", "Carteira: %s   •   Conta: %s" % [gs.fmt_money(gs.money), gs.fmt_money(gs.bank)], [
		["Depositar|R$ 100", func() -> void: gs.deposit(100); _bank_menu(), gs.money > 0],
		["Depositar tudo|" + gs.fmt_money(gs.money), func() -> void: gs.deposit(gs.money); _bank_menu(), gs.money > 0],
		["Sacar|R$ 100", func() -> void: gs.withdraw(100); _bank_menu(), gs.bank > 0],
		["Sacar|R$ 500", func() -> void: gs.withdraw(500); _bank_menu(), gs.bank > 0],
		["Sacar|R$ 1.000", func() -> void: gs.withdraw(1000); _bank_menu(), gs.bank > 0],
	])


func _food_menu(title: String, items: Array) -> void:
	var opts: Array = []
	for it in items:
		var item: Array = it
		opts.append(["%s|%s" % [item[0], GameState.fmt_money(item[1])], func() -> void:
			if GameState.pay(int(item[1]), String(item[0])):
				GameState.eat(float(item[2]))
				GameState.drink(float(item[3]))
			_food_menu(title, items)])
	menu.open(title, "Fome %d%%  •  Sede %d%%" % [int(GameState.hunger), int(GameState.thirst)], opts)


func _hospital_menu() -> void:
	var cost := 150
	menu.open("Hospital", "Vida: %d%%" % int(GameState.health), [
		["Tratamento completo|%s" % GameState.fmt_money(cost), func() -> void:
			if GameState.pay(cost, "Tratamento médico"):
				GameState.heal(100.0), GameState.health < 100.0],
	])


func _police_menu() -> void:
	var gs := GameState
	menu.open("Delegacia", "Documentos e segurança", [
		["Tirar CNH|R$ 300" if not gs.has_license else "CNH|emitida", func() -> void:
			if gs.pay(300, "Emissão de CNH"):
				gs.has_license = true
				gs.toast("CNH emitida! Agora você pode comprar carros.", Color(0.5, 1, 0.6)), not gs.has_license],
		["Colete balístico|R$ 400", func() -> void:
			if gs.pay(400, "Colete"):
				gs.armor = 100.0
				gs.stats_changed.emit(), gs.armor < 100.0],
		["Registrar ocorrência (RP)", func() -> void:
			Network.send_chat(gs.player_name, "/do registra uma ocorrência na delegacia.")],
	])


func _jobs_menu() -> void:
	var gs := GameState
	menu.open("Agência de Empregos", "Emprego atual: %s  •  Serviços feitos: %d" % [gs.JOB_NAMES.get(gs.job, gs.job), gs.jobs_done], [
		["Entregador|pacotes", func() -> void:
			gs.set_job("entregador")
			_set_job_target("", Vector3.ZERO, 0), gs.job != "entregador"],
		["Taxista|precisa de carro", func() -> void:
			gs.set_job("taxista")
			_set_job_target("", Vector3.ZERO, 0), gs.job != "taxista"],
		["Pedir demissão", func() -> void:
			gs.set_job("")
			_set_job_target("", Vector3.ZERO, 0), gs.job != ""],
	])


func _depot_use() -> void:
	if GameState.job != "entregador":
		hud.toast("Contrate-se como Entregador na Agência de Empregos (E)", Color(1, 0.8, 0.4))
		return
	if job_stage != "":
		hud.toast("Você já está com um pacote!", Color(1, 0.8, 0.4))
		return
	var dest := _random_spot(_house_spots, player.global_position, 80.0, 420.0)
	var dist := player.global_position.distance_to(dest)
	_set_job_target("deliver", dest, 80 + int(dist * 0.5))
	hud.toast("Pacote coletado! Entregue no marcador amarelo (%s)." % GameState.fmt_money(job_reward), Color(1, 0.9, 0.5))


func _dealer_menu() -> void:
	var gs := GameState
	var opts: Array = []
	for m in gs.CAR_MODELS:
		var key: String = m
		var info: Dictionary = gs.CAR_MODELS[key]
		opts.append(["%s  ·  %d km/h|%s" % [info["name"], int(info["max_speed"] * 3.6), gs.fmt_money(info["price"])],
			_dealer_colors.bind(key), gs.has_license])
	var sub := "Pagamento no débito (carteira + banco)."
	if not gs.has_license:
		sub = "Você precisa de CNH (tire na Delegacia — D)."
	menu.open("Concessionária", sub, opts)


func _dealer_colors(model: String) -> void:
	var gs := GameState
	var names := ["Vermelho", "Azul", "Branco", "Preto", "Prata", "Verde", "Laranja", "Roxo"]
	var opts: Array = []
	for i in range(gs.CAR_COLORS.size()):
		var idx := i
		opts.append([names[i] + "|" + gs.fmt_money(int(gs.CAR_MODELS[model]["price"])), func() -> void: _buy_car(model, idx)])
	menu.open(gs.CAR_MODELS[model]["name"], "Escolha a cor", opts)


func _buy_car(model: String, color_idx: int) -> void:
	var gs := GameState
	var info: Dictionary = gs.CAR_MODELS[model]
	if not gs.pay(int(info["price"]), "Compra: " + String(info["name"])):
		return
	gs.owned_cars.append({"model": model, "color": color_idx})
	gs.save_game()
	_summon_owned(gs.owned_cars.size() - 1, Vector3(96, 0.05, 187.0), PI * 0.5)
	hud.toast("Seu carro está na rua em frente à concessionária!", Color(0.5, 1, 0.6))


func _fuel_menu() -> void:
	var car := player.vehicle
	if car == null:
		return
	var cost := car.refuel_cost()
	menu.open("Posto", "Tanque: %d%%" % int(car.fuel), [
		["Encher o tanque|%s" % GameState.fmt_money(cost), func() -> void:
			if GameState.pay(cost, "Combustível"):
				car.fuel = 100.0, car.fuel < 99.0],
	])


func _repair_menu() -> void:
	var car := player.vehicle
	if car == null:
		return
	var cost := car.repair_cost()
	menu.open("Oficina", "Motor: %d%%" % int(car.engine_health), [
		["Consertar motor|%s" % GameState.fmt_money(cost), func() -> void:
			if GameState.pay(cost, "Conserto"):
				car.engine_health = 100.0, car.engine_health < 99.0],
	])


# ================================================================== celular

func open_phone() -> void:
	var gs := GameState
	menu.open("Celular", "%s  •  %s  •  %s" % [gs.player_name, gs.clock_text(), gs.JOB_NAMES.get(gs.job, gs.job)], [
		["Mapa / GPS", hud.open_map],
		["Garagem (%d)" % gs.owned_cars.size(), _garage_menu],
		["Saldo bancário|%s" % gs.fmt_money(gs.bank), func() -> void: pass, false],
		["Limpar GPS", func() -> void:
			waypoint = null
			_gps_beam.visible = false, waypoint != null],
		["Salvar jogo", func() -> void:
			gs.save_game()
			hud.toast("Jogo salvo", Color(0.6, 1, 0.6))],
		["Configurações", _settings_menu],
		["Sair para o menu", _quit_to_menu],
	])


func _garage_menu() -> void:
	var gs := GameState
	var opts: Array = []
	for i in range(gs.owned_cars.size()):
		var idx := i
		var c: Dictionary = gs.owned_cars[i]
		var info: Dictionary = gs.CAR_MODELS.get(String(c.get("model", "sedan")), gs.CAR_MODELS["sedan"])
		opts.append(["%s|chamar" % info["name"], func() -> void: _summon_near_player(idx)])
	var sub := "Seus veículos aparecem na rua mais próxima." if not opts.is_empty() else "Você ainda não tem carros. Visite a Concessionária (C)."
	menu.open("Garagem", sub, opts)


func _summon_near_player(idx: int) -> void:
	if player.vehicle != null:
		hud.toast("Saia do veículo primeiro", Color(1, 0.8, 0.4))
		return
	var pp := player.global_position
	# rua mais próxima (grade de 64 m)
	var rx := roundf((pp.x + 256.0) / CityBuilder.PITCH) * CityBuilder.PITCH - 256.0
	var rz := roundf((pp.z + 256.0) / CityBuilder.PITCH) * CityBuilder.PITCH - 256.0
	var pos: Vector3
	var yaw: float
	if absf(pp.x - rx) < absf(pp.z - rz):
		var side := 1.0 if pp.x > rx else -1.0
		pos = Vector3(rx + side * 4.9, 0.05, pp.z)
		yaw = 0.0 if side > 0.0 else PI
	else:
		var side := 1.0 if pp.z > rz else -1.0
		pos = Vector3(pp.x, 0.05, rz + side * 4.9)
		yaw = -PI * 0.5 if side > 0.0 else PI * 0.5
	_summon_owned(idx, pos, yaw)
	hud.toast("Seu carro chegou (marcador azul V no mapa)", Color(0.5, 0.8, 1.0))


func _summon_owned(idx: int, pos: Vector3, yaw: float) -> void:
	if my_car != null and is_instance_valid(my_car) and my_car.driver == null:
		my_car.queue_free()
	var c: Dictionary = GameState.owned_cars[idx]
	my_car = _spawn_car(String(c.get("model", "sedan")), GameState.CAR_COLORS[int(c.get("color", 0)) % GameState.CAR_COLORS.size()], pos, yaw, true)


func _settings_menu() -> void:
	var gs := GameState
	var q := int(gs.settings.get("quality", 1))
	var names := ["Baixa", "Média", "Alta"]
	var opts: Array = []
	for i in range(3):
		var qi := i
		opts.append(["Gráficos|%s%s" % [names[i], "  •" if q == i else ""], func() -> void:
			gs.settings["quality"] = qi
			gs.save_settings()
			gs.toast("Qualidade aplicada ao reabrir o mapa", Color(0.8, 0.9, 1.0))
			_settings_menu(), q != i])
	var sens := float(gs.settings.get("sensitivity", 1.0))
	opts.append(["Sensibilidade da câmera|%.2fx" % sens, func() -> void:
		var ns := sens + 0.25
		if ns > 2.0:
			ns = 0.5
		gs.settings["sensitivity"] = ns
		player.camera_rig.sensitivity_scale = ns
		gs.save_settings()
		_settings_menu()])
	var vol := float(gs.settings.get("volume", 1.0))
	opts.append(["Volume|%d%%" % int(vol * 100.0), func() -> void:
		var nv := vol + 0.25
		if nv > 1.01:
			nv = 0.0
		gs.settings["volume"] = nv
		Sfx.volume = nv
		Sfx.apply_volume()
		gs.save_settings()
		_settings_menu()])
	opts.append(["Mostrar FPS|%s" % ("sim" if gs.settings.get("show_fps", true) else "não"), func() -> void:
		gs.settings["show_fps"] = not bool(gs.settings.get("show_fps", true))
		gs.save_settings()
		_settings_menu()])
	menu.open("Configurações", "", opts)


func _quit_to_menu() -> void:
	GameState.save_game()
	GameState.playing = false
	Network.leave()
	get_tree().change_scene_to_file("res://Scenes/UI/main_menu.tscn")


func _welcome() -> void:
	hud.toast("Bem-vindo(a) ao Connect RP, %s!" % GameState.player_name, Color(1, 0.85, 0.3))
	hud.toast("Arranje um emprego na Agência (E, marcador amarelo à frente).", Color(1, 1, 1))


# ==================================================================== morte

func _on_died() -> void:
	if player.vehicle != null:
		player.exit_vehicle()
	menu.close()
	_refresh_input_lock()
	await get_tree().create_timer(3.5).timeout
	player.teleport(HOSPITAL_SPAWN)
	GameState.revive_at_hospital()
	hud.toast("Você acordou no hospital.", Color(1, 0.6, 0.6))
	_refresh_input_lock()


# =============================================================== multiplayer

func _network_tick(delta: float) -> void:
	if not Network.online:
		return
	_net_t += delta
	if _net_t >= NET_RATE:
		_net_t = 0.0
		var car := player.vehicle
		var st := {
			"n": GameState.player_name,
			"p": car.global_position if car != null else player.global_position,
			"y": car.global_rotation.y if car != null else player.visual.rotation.y,
			"s": absf(car.speed) if car != null else player.get_horizontal_speed(),
			"f": player.is_on_floor(),
			"st": int(player.stance),
			"ap": GameState.appearance,
			"c": [car.model, car.paint.to_html(false), car.taxi] if car != null else null,
		}
		Network.send_state(st)
	for id in remote.keys():
		var r: RemotePlayer = remote[id]
		if r.last_seen > 6.0:
			r.queue_free()
			remote.erase(id)


func _on_remote_state(id: int, st: Dictionary) -> void:
	if not remote.has(id):
		var r := RemotePlayer.new()
		r.peer_id = id
		add_child(r)
		remote[id] = r
	(remote[id] as RemotePlayer).apply_state(st)


func _on_peer_left(id: int) -> void:
	if remote.has(id):
		(remote[id] as RemotePlayer).queue_free()
		remote.erase(id)
		hud.toast("Jogador #%d saiu" % id, Color(0.6, 0.85, 1.0))


# ======================================================= testes (linha de comando)

## --pos=x,y,z  --yaw=G  --hour=H  --drive [--throttle=0..1 --steer=0..1]
## --job=taxista  --license  --map  --phone  --menu=banco
## (--screenshot=arquivo.png --frames=N fica no GameState)
func _dev_cli() -> void:
	var cli := GameState.cli
	if cli.has("pos"):
		var v := String(cli["pos"]).split(",")
		player.teleport(Vector3(float(v[0]), float(v[1]), float(v[2])))
	if cli.has("yaw"):
		player.camera_rig.yaw = deg_to_rad(float(cli["yaw"]))
	if cli.has("job"):
		GameState.set_job(String(cli["job"]))
	if cli.has("license"):
		GameState.has_license = true
	if cli.has("drive") or cli.has("menu") or cli.has("map") or cli.has("phone"):
		await get_tree().create_timer(0.5).timeout
	if cli.has("drive"):
		var best: Car = null
		for c in get_tree().get_nodes_in_group("cars"):
			if best == null or (c as Car).global_position.distance_to(player.global_position) < best.global_position.distance_to(player.global_position):
				best = c
		if best != null:
			best.ai = false
			player.enter_vehicle(best)
			if cli.has("throttle"):
				Input.action_press("accelerate", float(cli["throttle"]))
			if cli.has("steer"):
				Input.action_press("move_right", float(cli["steer"]))
	if cli.has("menu"):
		for p in points:
			if p.id == String(cli["menu"]):
				p.on_use.call()
	if cli.has("phone"):
		open_phone()
	if cli.has("debug"):
		get_tree().create_timer(5.0).timeout.connect(_debug_dump, CONNECT_ONE_SHOT)
	if cli.has("map"):
		_set_waypoint(Vector3(96, 0, 160))
		hud.open_map()


func _debug_dump() -> void:
	var moving := 0
	var on_road := 0
	for c in traffic.cars:
		if absf(c.speed) > 2.0:
			moving += 1
		var lx := fposmod(c.global_position.x + 256.0, CityBuilder.PITCH)
		var lz := fposmod(c.global_position.z + 256.0, CityBuilder.PITCH)
		if minf(lx, CityBuilder.PITCH - lx) < 6.5 or minf(lz, CityBuilder.PITCH - lz) < 6.5:
			on_road += 1
	print("[debug] t=%.0fs carros IA=%d andando=%d na_rua=%d pedestres=%d jogador=%s vida=%d" % [
		Time.get_ticks_msec() / 1000.0, traffic.cars.size(), moving, on_road, pedestrians.size(),
		player.global_position.snapped(Vector3.ONE), int(GameState.health)])
	get_tree().create_timer(5.0).timeout.connect(_debug_dump, CONNECT_ONE_SHOT)
