class_name TrafficManager
extends Node3D
## Trânsito: grafo de cruzamentos da grade de ruas do CityBuilder.
## Os carros da IA andam na faixa da direita e escolhem uma rua ao chegar
## em cada cruzamento (evitando retorno). Carros longe do jogador são
## reposicionados perto dele para manter o trânsito "vivo" com poucos carros.

const NODES_X := 9          # ruas norte-sul  (x = -256 + 64*k)
const NODES_Z := 8          # ruas leste-oeste (z = -256 + 64*m)
const ORIGIN := -256.0
const LANE := 3.0
const RECYCLE_DIST := 190.0

var cars: Array[Car] = []
var player: Node3D
var _rng := RandomNumberGenerator.new()
var _recycle_t: float = 0.0


static func node_pos(n: Vector2i) -> Vector3:
	return Vector3(ORIGIN + n.x * CityBuilder.PITCH, 0.0, ORIGIN + n.y * CityBuilder.PITCH)


static func valid(n: Vector2i) -> bool:
	return n.x >= 0 and n.x < NODES_X and n.y >= 0 and n.y < NODES_Z


func neighbors(n: Vector2i) -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
		var m: Vector2i = n + d
		if valid(m):
			out.append(m)
	return out


## Ponto alvo na faixa da direita, chegando no cruzamento `to`.
func lane_point(from: Vector2i, to: Vector2i) -> Vector3:
	var a := node_pos(from)
	var b := node_pos(to)
	var d := (b - a).normalized()
	var right := Vector3(-d.z, 0.0, d.x)
	return b + right * LANE - d * 2.0


func next_node(from: Vector2i, at: Vector2i) -> Vector2i:
	var opts := neighbors(at)
	if opts.size() > 1:
		opts.erase(from)
	return opts[_rng.randi() % opts.size()]


func spawn(count: int, p_player: Node3D) -> void:
	player = p_player
	_rng.randomize()
	var models := ["compacto", "sedan", "sedan", "picape", "compacto", "esportivo"]
	for i in range(count):
		var car := Car.new()
		car.model = models[_rng.randi() % models.size()]
		car.taxi = _rng.randf() < 0.12
		car.paint = Color(0.95, 0.8, 0.1) if car.taxi else GameState.CAR_COLORS[_rng.randi() % GameState.CAR_COLORS.size()]
		add_child(car)
		cars.append(car)
		_place_near(car, player.global_position if player != null else Vector3.ZERO, 40.0, 160.0)


## Coloca o carro numa rua aleatória entre min_d e max_d do ponto.
func _place_near(car: Car, center: Vector3, min_d: float, max_d: float) -> void:
	for _try in range(30):
		var a := Vector2i(_rng.randi_range(0, NODES_X - 1), _rng.randi_range(0, NODES_Z - 1))
		var nb := neighbors(a)
		var b: Vector2i = nb[_rng.randi() % nb.size()]
		var pa := node_pos(a)
		var pb := node_pos(b)
		var d := (pb - pa).normalized()
		var right := Vector3(-d.z, 0.0, d.x)
		var p := pa.lerp(pb, _rng.randf_range(0.3, 0.7)) + right * LANE
		var dist := Vector2(p.x - center.x, p.z - center.z).length()
		if dist < min_d or dist > max_d:
			continue
		if _occupied(p, car):
			continue
		car.global_position = p + Vector3(0, 0.05, 0)
		car.rotation = Vector3(0.0, atan2(-d.x, -d.z), 0.0)
		car.velocity = Vector3.ZERO
		car.speed = 0.0
		car.start_ai(self, a, b)
		return


func _occupied(p: Vector3, except: Car) -> bool:
	for c in get_tree().get_nodes_in_group("cars"):
		if c != except and (c as Node3D).global_position.distance_to(p) < 9.0:
			return true
	return false


func _physics_process(delta: float) -> void:
	_recycle_t += delta
	if _recycle_t < 1.0 or player == null:
		return
	_recycle_t = 0.0
	var pp := player.global_position
	for car in cars:
		if not is_instance_valid(car) or not car.ai or car.driver != null:
			continue
		if car.global_position.distance_to(pp) > RECYCLE_DIST:
			_place_near(car, pp, 70.0, 150.0)
	# carros roubados/estacionados saem da lista da IA
	cars = cars.filter(func(c: Car) -> bool: return is_instance_valid(c) and (c.ai or c.driver == null))
