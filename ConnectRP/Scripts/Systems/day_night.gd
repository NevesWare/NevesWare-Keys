class_name DayNight
extends Node3D
## Ciclo dia/noite: sol/lua, cores do céu, luz ambiente e neblina seguem o
## relógio do GameState. À noite as janelas da cidade acendem.

var env: Environment
var sun: DirectionalLight3D
var sky_mat: ProceduralSkyMaterial
var city: CityBuilder
var _t: float = 1.0


func setup(profile: Dictionary, p_city: CityBuilder) -> void:
	city = p_city
	sky_mat = ProceduralSkyMaterial.new()
	sky_mat.sun_angle_max = 20.0
	var sky := Sky.new()
	sky.sky_material = sky_mat
	sky.radiance_size = Sky.RADIANCE_SIZE_32
	env = Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.fog_enabled = true
	env.fog_density = profile["fog"]
	env.fog_sky_affect = 0.4
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)

	sun = DirectionalLight3D.new()
	sun.shadow_enabled = profile["shadows"]
	sun.directional_shadow_max_distance = maxf(profile["shadow_dist"], 1.0)
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
	add_child(sun)
	update_sky(true)


func _process(delta: float) -> void:
	_t += delta
	if _t > 0.25:   # não precisa atualizar todo quadro
		_t = 0.0
		update_sky(false)


func update_sky(_force: bool) -> void:
	var h := GameState.hours
	var day := GameState.daylight()
	var a := (h - 6.0) / 12.0 * PI       # 0 nascer, PI pôr do sol
	var elev := sin(a)
	var dusk := clampf(1.0 - absf(elev) * 3.5, 0.0, 1.0)
	if elev > -0.05:
		sun.rotation = Vector3(-maxf(asin(clampf(elev, 0.0, 1.0)), 0.12), deg_to_rad(-30.0) + a * 0.3, 0.0)
		sun.light_color = Color(1.0, 0.95, 0.88).lerp(Color(1.0, 0.6, 0.35), dusk)
		sun.light_energy = lerpf(0.15, 1.05, day)
	else:   # lua
		sun.rotation = Vector3(deg_to_rad(-55.0), deg_to_rad(40.0), 0.0)
		sun.light_color = Color(0.55, 0.65, 0.95)
		sun.light_energy = 0.22
	var top_day := Color(0.22, 0.42, 0.78)
	var hor_day := Color(0.66, 0.76, 0.86)
	var top_night := Color(0.01, 0.02, 0.06)
	var hor_night := Color(0.05, 0.07, 0.14)
	var hor := hor_night.lerp(hor_day, day).lerp(Color(0.95, 0.55, 0.3), dusk * 0.6)
	sky_mat.sky_top_color = top_night.lerp(top_day, day)
	sky_mat.sky_horizon_color = hor
	sky_mat.ground_horizon_color = hor
	sky_mat.ground_bottom_color = Color(0.05, 0.05, 0.06).lerp(Color(0.2, 0.18, 0.16), day)
	# luz ambiente neutra (o céu azul deixava tudo azulado); à noite azul-escuro
	env.ambient_light_color = Color(0.2, 0.23, 0.36).lerp(Color(0.6, 0.6, 0.62), day)
	env.ambient_light_energy = 1.0
	env.fog_light_color = hor.darkened(0.1)
	if city != null:
		city.set_night(1.0 - smoothstep(0.15, 0.6, day))
