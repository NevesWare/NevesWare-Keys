extends Node
## Sons do jogo, sintetizados na hora (nenhum arquivo de áudio de terceiros):
## motor (loop, o tom acompanha a rotação), buzina, passos, soco, batida,
## derrapagem, porta, dinheiro, interface, ambiente urbano e ondas do mar.
## Para trocar por gravações reais, basta substituir os streams em `bank`.

const RATE := 22050

var bank: Dictionary = {}
var volume: float = 1.0
var _ui_player: AudioStreamPlayer
var _amb_city: AudioStreamPlayer
var _amb_sea: AudioStreamPlayer
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_rng.seed = 4242
	bank["engine"] = _engine_loop()
	bank["horn"] = _horn()
	bank["step"] = _step()
	bank["punch"] = _punch()
	bank["whoosh"] = _whoosh()
	bank["crash"] = _crash()
	bank["skid"] = _skid()
	bank["door"] = _door()
	bank["click"] = _click()
	bank["notify"] = _notify()
	bank["money"] = _money()
	bank["error"] = _error()
	bank["city"] = _city_loop()
	bank["sea"] = _sea_loop()
	_ui_player = AudioStreamPlayer.new()
	_ui_player.volume_db = -8.0
	_ui_player.max_polyphony = 4
	add_child(_ui_player)
	_amb_city = _loop_player(bank["city"], -18.0)
	_amb_sea = _loop_player(bank["sea"], -60.0)
	volume = float(GameState.settings.get("volume", 1.0))
	apply_volume()


func apply_volume() -> void:
	var bus := AudioServer.get_bus_index("Master")
	AudioServer.set_bus_volume_db(bus, linear_to_db(maxf(volume, 0.0001)))
	AudioServer.set_bus_mute(bus, volume <= 0.001)


func _loop_player(stream: AudioStream, db: float) -> AudioStreamPlayer:
	var p := AudioStreamPlayer.new()
	p.stream = stream
	p.volume_db = db
	add_child(p)
	return p


## Liga/desliga o ambiente (só durante o jogo).
func set_ambience(on: bool) -> void:
	for p in [_amb_city, _amb_sea]:
		if on and not p.playing:
			p.play()
		elif not on:
			p.stop()


## Ajusta ambiente pela posição do ouvinte (mar perto da praia, cidade à noite mais calma).
func update_ambience(listener: Vector3, daylight: float) -> void:
	var sea := clampf(1.0 - absf(listener.z - 250.0) / 70.0, 0.0, 1.0)
	_amb_sea.volume_db = lerpf(-50.0, -10.0, sea)
	_amb_city.volume_db = lerpf(-24.0, -15.0, daylight) - sea * 8.0


func play_ui(snd: String, pitch: float = 1.0) -> void:
	_ui_player.stream = bank[snd]
	_ui_player.pitch_scale = pitch
	_ui_player.play()


func ui_click() -> void:
	play_ui("click", _rng.randf_range(0.95, 1.05))


func ui_notify() -> void:
	play_ui("notify")


## Som 3D de uma vez só, preso a um nó (ou solto numa posição).
func play_at(snd: String, parent: Node3D, db: float = 0.0, pitch: float = 1.0, max_dist: float = 45.0) -> void:
	if parent == null or not parent.is_inside_tree():
		return
	var p := AudioStreamPlayer3D.new()
	p.stream = bank[snd]
	p.volume_db = db
	p.pitch_scale = pitch
	p.max_distance = max_dist
	p.unit_size = 6.0
	p.attenuation_filter_cutoff_hz = 8000.0
	parent.add_child(p)
	p.play()
	p.finished.connect(p.queue_free)


# =============================================================== síntese

func _wav(data: PackedFloat32Array, loop: bool = false) -> AudioStreamWAV:
	var bytes := PackedByteArray()
	bytes.resize(data.size() * 2)
	for i in range(data.size()):
		bytes.encode_s16(i * 2, int(clampf(data[i], -1.0, 1.0) * 32000.0))
	var s := AudioStreamWAV.new()
	s.format = AudioStreamWAV.FORMAT_16_BITS
	s.mix_rate = RATE
	s.stereo = false
	s.data = bytes
	if loop:
		s.loop_mode = AudioStreamWAV.LOOP_FORWARD
		s.loop_begin = 0
		s.loop_end = data.size()
	return s


func _buf(seconds: float) -> PackedFloat32Array:
	var b := PackedFloat32Array()
	b.resize(int(seconds * RATE))
	return b


## Motor: pulsos de explosão (harmônicos de 30 Hz) + ronco grave filtrado.
## Duração com nº inteiro de ciclos para o loop não estalar.
func _engine_loop() -> AudioStreamWAV:
	var b := _buf(1.0)
	var lp := 0.0
	for i in range(b.size()):
		var t := float(i) / RATE
		var v := 0.0
		for k in range(1, 9):
			v += sin(TAU * 30.0 * k * t + k * 1.3) / pow(k, 0.9)
		var firing := pow(0.5 + 0.5 * sin(TAU * 60.0 * t), 6.0)
		lp += (_rng.randf_range(-1.0, 1.0) - lp) * 0.08
		b[i] = (v * 0.13 + firing * 0.35 - 0.12 + lp * 0.35) * 0.8
	return _wav(b, true)


func _horn() -> AudioStreamWAV:
	var b := _buf(0.6)
	for i in range(b.size()):
		var t := float(i) / RATE
		var env := minf(1.0, t * 40.0) * minf(1.0, (0.6 - t) * 20.0)
		var v := signf(sin(TAU * 392.0 * t)) * 0.5 + signf(sin(TAU * 494.0 * t)) * 0.5
		b[i] = v * env * 0.28
	return _filtered(b, 0.35)


func _step() -> AudioStreamWAV:
	var b := _buf(0.12)
	var lp := 0.0
	for i in range(b.size()):
		var t := float(i) / RATE
		lp += (_rng.randf_range(-1.0, 1.0) - lp) * 0.25
		b[i] = lp * exp(-t * 45.0) * 0.9 + sin(TAU * 90.0 * t) * exp(-t * 60.0) * 0.4
	return _wav(b)


func _punch() -> AudioStreamWAV:
	var b := _buf(0.25)
	var lp := 0.0
	for i in range(b.size()):
		var t := float(i) / RATE
		lp += (_rng.randf_range(-1.0, 1.0) - lp) * 0.3
		b[i] = (sin(TAU * (120.0 - t * 200.0) * t) * 0.8 + lp * 0.6) * exp(-t * 22.0)
	return _wav(b)


func _whoosh() -> AudioStreamWAV:
	var b := _buf(0.22)
	var lp := 0.0
	for i in range(b.size()):
		var t := float(i) / RATE
		var cut := 0.05 + 0.25 * sin(PI * t / 0.22)
		lp += (_rng.randf_range(-1.0, 1.0) - lp) * cut
		b[i] = lp * sin(PI * t / 0.22) * 0.5
	return _wav(b)


func _crash() -> AudioStreamWAV:
	var b := _buf(0.9)
	var lp := 0.0
	for i in range(b.size()):
		var t := float(i) / RATE
		lp += (_rng.randf_range(-1.0, 1.0) - lp) * 0.5
		var metal := sin(TAU * 610.0 * t) * 0.15 + sin(TAU * 1130.0 * t) * 0.1
		b[i] = (lp * 0.9 + metal) * exp(-t * 6.0) + sin(TAU * 55.0 * t) * exp(-t * 14.0) * 0.6
	return _wav(b)


func _skid() -> AudioStreamWAV:
	var b := _buf(1.0)
	var bp := 0.0
	var lp := 0.0
	for i in range(b.size()):
		var t := float(i) / RATE
		var n := _rng.randf_range(-1.0, 1.0)
		lp += (n - lp) * 0.35
		bp += (lp - bp) * 0.2
		b[i] = (lp - bp) * 1.2 + sin(TAU * 900.0 * t + sin(TAU * 7.0 * t) * 3.0) * 0.06
	return _wav(b, true)


func _door() -> AudioStreamWAV:
	var b := _buf(0.3)
	var lp := 0.0
	for i in range(b.size()):
		var t := float(i) / RATE
		lp += (_rng.randf_range(-1.0, 1.0) - lp) * 0.15
		b[i] = (sin(TAU * 75.0 * t) * 0.9 + lp * 0.5) * exp(-t * 18.0)
	return _wav(b)


func _click() -> AudioStreamWAV:
	var b := _buf(0.04)
	for i in range(b.size()):
		var t := float(i) / RATE
		b[i] = sin(TAU * 1800.0 * t) * exp(-t * 160.0) * 0.5
	return _wav(b)


func _notify() -> AudioStreamWAV:
	var b := _buf(0.28)
	for i in range(b.size()):
		var t := float(i) / RATE
		var f := 880.0 if t < 0.09 else 1320.0
		b[i] = sin(TAU * f * t) * exp(-fmod(t, 0.09 if t < 0.09 else 1.0) * 18.0) * 0.25
	return _wav(b)


func _money() -> AudioStreamWAV:
	var b := _buf(0.5)
	var notes := [1046.5, 1318.5, 1568.0]
	for i in range(b.size()):
		var t := float(i) / RATE
		var v := 0.0
		for k in range(3):
			var st: float = k * 0.07
			if t >= st:
				v += sin(TAU * notes[k] * (t - st)) * exp(-(t - st) * 9.0)
		b[i] = v * 0.18
	return _wav(b)


func _error() -> AudioStreamWAV:
	var b := _buf(0.25)
	for i in range(b.size()):
		var t := float(i) / RATE
		b[i] = signf(sin(TAU * 160.0 * t)) * 0.15 * minf(1.0, (0.25 - t) * 30.0)
	return _filtered(b, 0.2)


## Ruído "marrom" com carros passando ao longe e buzinas raras.
func _city_loop() -> AudioStreamWAV:
	var b := _buf(6.0)
	var br := 0.0
	var n := b.size()
	for i in range(n):
		var t := float(i) / RATE
		br = clampf(br + _rng.randf_range(-1.0, 1.0) * 0.02, -1.0, 1.0) * 0.998
		var pass_by := 0.5 + 0.5 * sin(TAU * t / 3.0)
		b[i] = br * (0.5 + pass_by * 0.5) * 0.6
	# fade nas pontas para o loop ficar contínuo
	for i in range(2000):
		var k := float(i) / 2000.0
		b[i] *= k
		b[n - 1 - i] *= k
	return _wav(b, true)


func _sea_loop() -> AudioStreamWAV:
	var b := _buf(8.0)
	var lp := 0.0
	var n := b.size()
	for i in range(n):
		var t := float(i) / RATE
		lp += (_rng.randf_range(-1.0, 1.0) - lp) * 0.12
		var wave := pow(0.5 + 0.5 * sin(TAU * t / 4.0 - 1.2), 3.0)
		b[i] = lp * (0.15 + wave * 0.85) * 0.7
	for i in range(3000):
		var k := float(i) / 3000.0
		b[i] *= k
		b[n - 1 - i] *= k
	return _wav(b, true)


func _filtered(b: PackedFloat32Array, k: float) -> AudioStreamWAV:
	var lp := 0.0
	for i in range(b.size()):
		lp += (b[i] - lp) * k
		b[i] = lp
	return _wav(b)
