extends Node
## Estado global do personagem (estilo servidor RP): dinheiro, banco, vida,
## fome, sede, emprego, CNH, garagem, relógio do jogo e salvamento local.

signal stats_changed
signal notify(text: String, color: Color)
signal died

const SAVE_PATH := "user://connect_rp_save.json"
const SETTINGS_PATH := "user://connect_rp_settings.json"
const DAY_MINUTES := 24.0          # minutos reais por dia de jogo
const HUNGER_MINUTES := 45.0       # minutos reais para a fome zerar
const THIRST_MINUTES := 30.0
const HOSPITAL_FEE := 200

const SKIN_COLORS: Array[Color] = [
	Color(0.96, 0.8, 0.68), Color(0.86, 0.66, 0.52), Color(0.74, 0.55, 0.42),
	Color(0.55, 0.38, 0.27), Color(0.36, 0.24, 0.17), Color(0.24, 0.16, 0.11)]
const HAIR_COLORS: Array[Color] = [
	Color(0.03, 0.03, 0.03), Color(0.25, 0.15, 0.08), Color(0.55, 0.35, 0.15),
	Color(0.85, 0.7, 0.4), Color(0.6, 0.6, 0.6)]
const TOP_COLORS: Array[Color] = [
	Color(0.25, 0.15, 0.08), Color(0.08, 0.08, 0.1), Color(0.85, 0.85, 0.85), Color(0.75, 0.1, 0.1),
	Color(0.1, 0.3, 0.7), Color(0.1, 0.5, 0.25), Color(0.95, 0.75, 0.15), Color(0.5, 0.2, 0.6)]
const PANTS_COLORS: Array[Color] = [
	Color(-1, -1, -1), Color(0.12, 0.2, 0.4), Color(0.08, 0.08, 0.09), Color(0.5, 0.45, 0.35),
	Color(0.3, 0.3, 0.32), Color(0.85, 0.85, 0.8)]   # índice 0 = camuflado
const CAR_COLORS: Array[Color] = [
	Color(0.75, 0.08, 0.08), Color(0.08, 0.2, 0.55), Color(0.92, 0.92, 0.92), Color(0.06, 0.06, 0.07),
	Color(0.55, 0.57, 0.6), Color(0.1, 0.45, 0.2), Color(0.95, 0.6, 0.1), Color(0.35, 0.1, 0.45)]

## Modelos de carro: preço, velocidade máx. (m/s), aceleração (m/s²).
const CAR_MODELS := {
	"compacto": {"name": "Compacto", "price": 8000, "max_speed": 26.0, "accel": 7.5},
	"sedan": {"name": "Sedã", "price": 15000, "max_speed": 31.0, "accel": 8.5},
	"picape": {"name": "Picape", "price": 22000, "max_speed": 28.0, "accel": 8.0},
	"esportivo": {"name": "Esportivo", "price": 45000, "max_speed": 42.0, "accel": 12.0},
}

const JOB_NAMES := {"": "Desempregado", "entregador": "Entregador", "taxista": "Taxista"}

var player_name: String = "Cidadão"
var appearance: Dictionary = {"skin": 2, "hair": 0, "top": 0, "pants": 0}
var money: int = 500
var bank: int = 3000
var health: float = 100.0
var armor: float = 0.0
var hunger: float = 100.0
var thirst: float = 100.0
var job: String = ""
var jobs_done: int = 0
var has_license: bool = false
var owned_cars: Array = []          # [{"model": "sedan", "color": 2}]
var hours: float = 9.0
var saved_position: Variant = null  # Vector3 ou null
var has_save: bool = false
var playing: bool = false
var dead: bool = false
var position_provider: Callable

var settings: Dictionary = {"quality": 1, "sensitivity": 1.0, "show_fps": true}
var cli: Dictionary = {}            # argumentos de linha de comando (testes)

var _autosave_t: float = 0.0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for a in OS.get_cmdline_user_args():
		var s := String(a).trim_prefix("--")
		var parts := s.split("=", true, 1)
		cli[parts[0]] = parts[1] if parts.size() > 1 else "1"
	_load_settings()
	has_save = FileAccess.file_exists(SAVE_PATH)
	if cli.has("screenshot"):
		_take_screenshot.call_deferred(String(cli["screenshot"]), int(cli.get("frames", "120")))


## Teste: --screenshot=arquivo.png --frames=N salva a tela após N quadros e fecha.
func _take_screenshot(path: String, frames: int) -> void:
	for i in range(frames):
		await get_tree().process_frame
	get_viewport().get_texture().get_image().save_png(path)
	print("screenshot salvo: ", path)
	get_tree().quit()


func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST or what == NOTIFICATION_APPLICATION_PAUSED:
		if playing:
			save_game()


func _process(delta: float) -> void:
	if not playing:
		return
	hours = fmod(hours + delta * 24.0 / (DAY_MINUTES * 60.0), 24.0)
	hunger = maxf(0.0, hunger - delta * 100.0 / (HUNGER_MINUTES * 60.0))
	thirst = maxf(0.0, thirst - delta * 100.0 / (THIRST_MINUTES * 60.0))
	if (hunger <= 0.0 or thirst <= 0.0) and not dead:
		damage(delta * 0.6)
	_autosave_t += delta
	if _autosave_t > 60.0:
		_autosave_t = 0.0
		save_game()


# ------------------------------------------------------------------ economia

static func fmt_money(v: int) -> String:
	var s := str(absi(v))
	var out := ""
	while s.length() > 3:
		out = "." + s.substr(s.length() - 3) + out
		s = s.substr(0, s.length() - 3)
	return ("-R$ " if v < 0 else "R$ ") + s + out


func add_money(v: int, reason: String = "") -> void:
	money += v
	stats_changed.emit()
	if reason != "":
		toast("+%s  %s" % [fmt_money(v), reason], Color(0.4, 1.0, 0.5))


## Paga em dinheiro; se faltar, completa com o banco (cartão).
func pay(v: int, reason: String = "") -> bool:
	if money + bank < v:
		toast("Saldo insuficiente (%s)" % fmt_money(v), Color(1.0, 0.4, 0.35))
		return false
	var from_cash := mini(money, v)
	money -= from_cash
	bank -= v - from_cash
	stats_changed.emit()
	if reason != "":
		toast("-%s  %s" % [fmt_money(v), reason], Color(1.0, 0.75, 0.3))
	return true


func deposit(v: int) -> void:
	v = mini(v, money)
	if v <= 0:
		toast("Sem dinheiro na carteira", Color(1.0, 0.4, 0.35))
		return
	money -= v
	bank += v
	stats_changed.emit()
	toast("Depositado %s" % fmt_money(v), Color(0.5, 0.8, 1.0))


func withdraw(v: int) -> void:
	v = mini(v, bank)
	if v <= 0:
		toast("Saldo bancário zerado", Color(1.0, 0.4, 0.35))
		return
	bank -= v
	money += v
	stats_changed.emit()
	toast("Sacado %s" % fmt_money(v), Color(0.5, 0.8, 1.0))


# --------------------------------------------------------------- necessidades

func eat(amount: float) -> void:
	hunger = minf(100.0, hunger + amount)
	stats_changed.emit()


func drink(amount: float) -> void:
	thirst = minf(100.0, thirst + amount)
	stats_changed.emit()


func heal(amount: float) -> void:
	health = minf(100.0, health + amount)
	stats_changed.emit()


func damage(amount: float) -> void:
	if dead:
		return
	var absorbed := minf(armor, amount * 0.7)
	armor -= absorbed
	health = maxf(0.0, health - (amount - absorbed))
	stats_changed.emit()
	if health <= 0.0:
		dead = true
		died.emit()


func revive_at_hospital() -> void:
	dead = false
	health = 100.0
	hunger = maxf(hunger, 60.0)
	thirst = maxf(thirst, 60.0)
	var fee := mini(HOSPITAL_FEE, money + bank)
	if fee > 0:
		pay(fee, "Conta do hospital")
	stats_changed.emit()


func set_job(j: String) -> void:
	job = j
	stats_changed.emit()
	toast("Emprego: %s" % JOB_NAMES.get(j, j), Color(1.0, 0.85, 0.3))


func toast(text: String, color: Color = Color.WHITE) -> void:
	notify.emit(text, color)


# ---------------------------------------------------------------------- tempo

func clock_text() -> String:
	var h := int(hours)
	var m := int((hours - h) * 60.0)
	return "%02d:%02d" % [h, m]


## 0 = noite fechada, 1 = dia claro.
func daylight() -> float:
	var a := (hours - 6.0) / 12.0 * PI
	return clampf(sin(a) * 2.2 + 0.25, 0.0, 1.0)


# ---------------------------------------------------------------- aparência

func skin_color() -> Color:
	return SKIN_COLORS[int(appearance.get("skin", 2)) % SKIN_COLORS.size()]


func look() -> Dictionary:
	return look_from(appearance)


static func look_from(ap: Dictionary) -> Dictionary:
	return {
		"skin": SKIN_COLORS[int(ap.get("skin", 2)) % SKIN_COLORS.size()],
		"hair": HAIR_COLORS[int(ap.get("hair", 0)) % HAIR_COLORS.size()],
		"top": TOP_COLORS[int(ap.get("top", 0)) % TOP_COLORS.size()],
		"pants": PANTS_COLORS[int(ap.get("pants", 0)) % PANTS_COLORS.size()],
	}


# ----------------------------------------------------------------- salvamento

func new_game(p_name: String, ap: Dictionary) -> void:
	player_name = p_name.strip_edges() if p_name.strip_edges() != "" else "Cidadão"
	appearance = ap.duplicate()
	money = 500
	bank = 3000
	health = 100.0
	armor = 0.0
	hunger = 100.0
	thirst = 100.0
	job = ""
	jobs_done = 0
	has_license = false
	owned_cars = []
	hours = 9.0
	saved_position = null
	dead = false


func save_game() -> void:
	if position_provider.is_valid():
		var p: Variant = position_provider.call()
		if p is Vector3:
			saved_position = p
	var pos: Array = []
	if saved_position is Vector3:
		var v: Vector3 = saved_position
		pos = [v.x, v.y, v.z]
	var data := {
		"version": 2, "name": player_name, "appearance": appearance,
		"money": money, "bank": bank, "health": health, "armor": armor,
		"hunger": hunger, "thirst": thirst, "job": job, "jobs_done": jobs_done,
		"license": has_license, "cars": owned_cars, "hours": hours, "pos": pos,
	}
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f == null:
		return
	f.store_string(JSON.stringify(data, "\t"))
	has_save = true


func load_game() -> bool:
	if not FileAccess.file_exists(SAVE_PATH):
		return false
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if f == null:
		return false
	var d: Variant = JSON.parse_string(f.get_as_text())
	if not d is Dictionary:
		return false
	player_name = String(d.get("name", "Cidadão"))
	var ap: Variant = d.get("appearance", {})
	if ap is Dictionary:
		appearance = {}
		for k in ap:
			appearance[k] = int(ap[k])
	money = int(d.get("money", 500))
	bank = int(d.get("bank", 3000))
	health = float(d.get("health", 100.0))
	armor = float(d.get("armor", 0.0))
	hunger = float(d.get("hunger", 100.0))
	thirst = float(d.get("thirst", 100.0))
	job = String(d.get("job", ""))
	jobs_done = int(d.get("jobs_done", 0))
	has_license = bool(d.get("license", false))
	owned_cars = d.get("cars", []) if d.get("cars", []) is Array else []
	hours = float(d.get("hours", 9.0))
	var pos: Variant = d.get("pos", [])
	saved_position = Vector3(pos[0], pos[1], pos[2]) if pos is Array and pos.size() == 3 else null
	if health <= 0.0:
		health = 50.0
	dead = false
	return true


func _load_settings() -> void:
	if not FileAccess.file_exists(SETTINGS_PATH):
		return
	var f := FileAccess.open(SETTINGS_PATH, FileAccess.READ)
	var d: Variant = JSON.parse_string(f.get_as_text()) if f != null else null
	if d is Dictionary:
		for k in d:
			settings[k] = d[k]
	settings["quality"] = int(settings.get("quality", 1))


func save_settings() -> void:
	var f := FileAccess.open(SETTINGS_PATH, FileAccess.WRITE)
	if f != null:
		f.store_string(JSON.stringify(settings))


## Valores dependentes da qualidade gráfica escolhida (0 baixa, 1 média, 2 alta).
func quality_profile() -> Dictionary:
	match int(settings.get("quality", 1)):
		0:
			return {"scale3d": 0.7, "shadows": false, "shadow_dist": 0.0, "vis": 170.0, "far": 210.0,
				"fog": 0.006, "peds": 8, "traffic": 5}
		2:
			return {"scale3d": 1.0, "shadows": true, "shadow_dist": 60.0, "vis": 280.0, "far": 350.0,
				"fog": 0.0025, "peds": 20, "traffic": 12}
		_:
			return {"scale3d": 0.85, "shadows": true, "shadow_dist": 40.0, "vis": 230.0, "far": 280.0,
				"fog": 0.0038, "peds": 14, "traffic": 8}
