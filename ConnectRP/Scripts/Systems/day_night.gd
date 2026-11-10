class_name DayNight
extends Node3D
## Iluminação cinematográfica: céu com nuvens (shader), sol/lua, tonemapping
## ACES, bloom, color grading, neblina atmosférica e ciclo dia/noite ligado ao
## relógio do GameState. À noite as janelas da cidade acendem.

const SKY_SHADER := preload("res://Shaders/sky.gdshader")

var env: Environment
var sun: DirectionalLight3D
var sky_mat: ShaderMaterial
var city: CityBuilder
var _t: float = 1.0
var _cloud: float = 0.0
## Saturação extra (0 = preto e branco). O World usa no desmaio.
var saturation_override: float = -1.0


func setup(profile: Dictionary, p_city: CityBuilder) -> void:
	city = p_city
	sky_mat = ShaderMaterial.new()
	sky_mat.shader = SKY_SHADER
	var sky := Sky.new()
	sky.sky_material = sky_mat
	sky.radiance_size = Sky.RADIANCE_SIZE_64
	env = Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = 1.12
	env.tonemap_white = 6.0
	env.fog_enabled = true
	env.fog_density = profile["fog"]
	env.fog_sky_affect = 0.25
	env.fog_aerial_perspective = 0.4
	if profile.get("glow", true):
		env.glow_enabled = true
		env.glow_intensity = 0.55
		env.glow_strength = 0.9
		env.glow_bloom = 0.04
		env.glow_hdr_threshold = 1.1
		env.glow_blend_mode = Environment.GLOW_BLEND_MODE_SOFTLIGHT
	env.adjustment_enabled = true
	env.adjustment_contrast = 1.08
	env.adjustment_saturation = 0.95
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)

	sun = DirectionalLight3D.new()
	sun.shadow_enabled = profile["shadows"]
	sun.directional_shadow_max_distance = maxf(profile["shadow_dist"], 1.0)
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS if profile.get("shadow_splits", false) \
		else DirectionalLight3D.SHADOW_ORTHOGONAL
	sun.shadow_blur = 1.5
	sun.shadow_bias = 0.04
	sun.shadow_normal_bias = 1.2
	sun.light_angular_distance = 0.6
	add_child(sun)
	update_sky()


func _process(delta: float) -> void:
	_t += delta
	_cloud += delta * 0.004
	if _t > 0.2:
		_t = 0.0
		update_sky()


func update_sky() -> void:
	var h := GameState.hours
	var day := GameState.daylight()
	var a := (h - 6.0) / 12.0 * PI       # 0 nascer, PI pôr do sol
	var elev := sin(a)
	var golden := clampf(1.0 - absf(elev) * 3.0, 0.0, 1.0)
	if elev > -0.05:
		sun.rotation = Vector3(-maxf(asin(clampf(elev, 0.0, 1.0)), 0.1), deg_to_rad(-35.0) + a * 0.35, 0.0)
		sun.light_color = Color(1.0, 0.96, 0.9).lerp(Color(1.0, 0.62, 0.35), golden)
		sun.light_energy = lerpf(0.2, 1.35, day)
	else:   # lua
		sun.rotation = Vector3(deg_to_rad(-50.0), deg_to_rad(40.0), 0.0)
		sun.light_color = Color(0.6, 0.7, 1.0)
		sun.light_energy = 0.12

	var top := Color(0.015, 0.02, 0.05).lerp(Color(0.16, 0.36, 0.72), day)
	var hor := Color(0.04, 0.05, 0.1).lerp(Color(0.66, 0.76, 0.86), day)
	hor = hor.lerp(Color(1.0, 0.58, 0.32), golden * 0.65 * smoothstep(-0.1, 0.25, elev))
	sky_mat.set_shader_parameter("top_color", top)
	sky_mat.set_shader_parameter("horizon_color", hor)
	sky_mat.set_shader_parameter("ground_color", hor.darkened(0.55))
	sky_mat.set_shader_parameter("cloud_light", Color(0.12, 0.13, 0.17).lerp(Color(1, 1, 1), day).lerp(Color(1.0, 0.75, 0.55), golden * 0.6))
	sky_mat.set_shader_parameter("cloud_shadow", Color(0.05, 0.06, 0.09).lerp(Color(0.6, 0.65, 0.73), day))
	sky_mat.set_shader_parameter("night", 1.0 - smoothstep(0.1, 0.45, day))
	sky_mat.set_shader_parameter("cloud_offset", _cloud)

	env.ambient_light_color = Color(0.17, 0.19, 0.29).lerp(Color(0.6, 0.63, 0.68), day).lerp(Color(0.72, 0.6, 0.52), golden * 0.35)
	env.ambient_light_energy = lerpf(1.0, 1.35, day)
	env.fog_light_color = hor.lerp(Color(0.5, 0.55, 0.6), 0.3)
	env.glow_hdr_threshold = lerpf(0.7, 1.1, day)    # à noite janelas e faróis brilham
	env.adjustment_saturation = 0.95 if saturation_override < 0.0 else saturation_override
	if city != null:
		city.set_night(1.0 - smoothstep(0.15, 0.6, day))
