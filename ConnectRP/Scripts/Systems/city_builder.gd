class_name CityBuilder
extends Node3D
## Cidade fictícia brasileira ORIGINAL, gerada por código. SEM postes e SEM árvores.
## Grade 8x7 de quarteirões (passo 64 m): rural a oeste, residencial ao norte,
## centro com arranha-céus, favela com morro a leste, praia ao sul.

const PITCH := 64.0
const ROAD := 12.0
const BLOCK := 52.0
const FLOOR_H := 4.0
const SLAB_H := 0.12
const COLS := 8
const ROWS := 7
const FIRST := -224.0
## Distância de corte (ajustada pela qualidade gráfica antes de build()).
static var VIS_RANGE: float = 280.0
const WORLD := 300.0
const TEX_VERSION := 3
## Detalhes extras (ar-condicionado, vitrines, mobiliário urbano). Desligado na qualidade baixa.
static var DETAILS: bool = true

var _rng := RandomNumberGenerator.new()
var _tex: Dictionary = {}
var _mats: Dictionary = {}
var _meshes: Dictionary = {}
var _cur: Node3D
var _facade_mats: Array[ShaderMaterial] = []
var _night: float = -1.0
var _shop_mat: ShaderMaterial
var _ground_mats: Array[StandardMaterial3D] = []
var _body: StaticBody3D

var _favela_colors: Array[Color] = [
	Color(0.85, 0.45, 0.3), Color(0.9, 0.75, 0.35), Color(0.3, 0.6, 0.6), Color(0.9, 0.55, 0.65),
	Color(0.55, 0.75, 0.9), Color(0.95, 0.95, 0.92), Color(0.7, 0.3, 0.25), Color(0.6, 0.8, 0.5)]
var _house_colors: Array[Color] = [
	Color(1, 1, 1), Color(1, 0.95, 0.8), Color(0.95, 0.9, 0.7),
	Color(0.85, 0.92, 1.0), Color(1, 0.88, 0.9), Color(0.88, 1, 0.9)]
var _wall_colors: Array[Color] = [
	Color(0.85, 0.83, 0.78), Color(0.75, 0.55, 0.45), Color(0.6, 0.7, 0.75), Color(0.9, 0.85, 0.6)]


## Centro de um quarteirão.
static func block_center(ix: int, iz: int) -> Vector3:
	return Vector3(FIRST + ix * PITCH, 0.0, FIRST + iz * PITCH)


func build(seed_value: int = 1990) -> void:
	_rng.seed = seed_value
	_make_textures()
	_build_terrain()
	_build_roads()
	for ix in range(COLS):
		for iz in range(ROWS):
			_build_block(ix, iz)
	_build_beach()
	_build_hill()
	_build_boundaries()


# ============================================================ texturas

func _img_tex(img: Image) -> ImageTexture:
	img.generate_mipmaps()
	return ImageTexture.create_from_image(img)


func _noisy(img: Image, amount: float) -> void:
	for x in range(img.get_width()):
		for y in range(img.get_height()):
			var c := img.get_pixel(x, y)
			var n := _rng.randf_range(-amount, amount)
			img.set_pixel(x, y, Color(clampf(c.r + n, 0.0, 1.0), clampf(c.g + n, 0.0, 1.0), clampf(c.b + n, 0.0, 1.0)))


func _flat_img(color: Color, size: int, noise: float) -> Image:
	var img := Image.create(size, size, false, Image.FORMAT_RGB8)
	img.fill(color)
	_noisy(img, noise)
	return img


func _facade_img(bg: Color, wins: Array, win_col: Color, frame: Color, noise: float) -> Image:
	var img := Image.create(128, 128, false, Image.FORMAT_RGB8)
	img.fill(bg)
	for r in wins:
		var rect: Rect2i = r
		img.fill_rect(rect.grow(3), frame)
		img.fill_rect(rect, win_col)
		img.fill_rect(Rect2i(rect.position.x, rect.position.y, rect.size.x, maxi(3, rect.size.y / 5)), win_col.lightened(0.25))
	_noisy(img, noise)
	return img


## Mapa de emissão: só as janelas acendem à noite (grade cols x rows, algumas apagadas).
func _window_em(wins: Array, tint: Color, cols: int, rows: int = 1) -> ImageTexture:
	var img := Image.create(128, 128, false, Image.FORMAT_RGB8)
	img.fill(Color.BLACK)
	for r in wins:
		var rect: Rect2i = r
		var cw := rect.size.x / cols
		var rh := rect.size.y / rows
		for i in range(cols):
			for j in range(rows):
				if _rng.randf() < 0.55:
					var k := _rng.randf_range(0.55, 1.0)
					img.fill_rect(Rect2i(rect.position.x + i * cw + 3, rect.position.y + j * rh + 3, cw - 6, rh - 6),
						Color(tint.r * k, tint.g * k, tint.b * k))
	return _img_tex(img)


func _make_textures() -> void:
	var warm := Color(1.0, 0.82, 0.5)
	# fachadas: albedo + máscara de janelas (vidro reflexivo) + normal
	_facade_set("glass", Color(0.2, 0.23, 0.27), [Rect2i(6, 8, 116, 108)], Color(0.1, 0.13, 0.17), Color(0.14, 0.15, 0.17), 0.01, 4, 3)
	_tex["glass_em"] = _window_em([Rect2i(6, 8, 116, 108)], Color(1.0, 0.9, 0.7), 4, 3)
	_facade_set("office", Color(0.78, 0.77, 0.74), [Rect2i(10, 42, 108, 50)], Color(0.12, 0.15, 0.19), Color(0.42, 0.42, 0.44), 0.025, 4, 1)
	_tex["office_em"] = _window_em([Rect2i(10, 42, 108, 50)], Color(0.9, 0.92, 1.0), 4)
	_facade_set("apartment", Color(0.93, 0.92, 0.88), [Rect2i(18, 30, 34, 56), Rect2i(76, 30, 34, 56)],
		Color(0.14, 0.17, 0.2), Color(0.6, 0.58, 0.55), 0.03, 1, 1, Rect2i(0, 98, 128, 6))
	_tex["apartment_em"] = _window_em([Rect2i(18, 30, 34, 56), Rect2i(76, 30, 34, 56)], warm, 1)
	_facade_set("house", Color(0.97, 0.96, 0.92), [Rect2i(40, 38, 48, 56)], Color(0.15, 0.18, 0.21), Color(0.92, 0.92, 0.9), 0.03, 1, 1)
	var ho: Image = _tex["house_img"]
	ho.fill_rect(Rect2i(22, 38, 14, 56), Color(0.28, 0.3, 0.3))
	ho.fill_rect(Rect2i(92, 38, 14, 56), Color(0.28, 0.3, 0.3))
	_tex["house"] = _img_tex(ho)
	_tex["house_em"] = _window_em([Rect2i(40, 38, 48, 56)], warm, 1)
	_facade_set("favela", Color(0.93, 0.92, 0.9), [Rect2i(52, 44, 36, 38)], Color(0.16, 0.18, 0.2), Color(0.4, 0.4, 0.4), 0.08, 1, 1)
	_tex["favela_em"] = _window_em([Rect2i(52, 44, 36, 38)], warm, 1)
	# vitrine do térreo: faixa de letreiro + 3 vidros com caixilho
	_facade_set("shop", Color(0.13, 0.13, 0.14), [Rect2i(5, 34, 118, 90)], Color(0.1, 0.12, 0.13), Color(0.08, 0.08, 0.09), 0.01, 3, 1,
		Rect2i(0, 6, 128, 20))
	_tex["shop_em"] = _window_em([Rect2i(5, 34, 118, 90)], Color(1.0, 0.86, 0.66), 3, 1)

	# superfícies (256 px, sem emendas)
	var n_fine := _noise_img(256, 0.09, 3, 11)
	var n_mid := _noise_img(256, 0.025, 4, 12)
	var n_big := _noise_img(256, 0.006, 3, 13)
	_surface("asphalt", n_fine, n_mid, n_big, _col_asphalt, 2.5)
	_surface("sidewalk", n_fine, n_mid, n_big, _col_sidewalk, 2.0, _h_sidewalk.bind(n_fine))
	_surface("grass", n_fine, n_mid, n_big, _col_grass, 1.5)
	_surface("sand", n_fine, n_mid, n_big, _col_sand, 1.2)
	_surface("roof", n_fine, n_mid, n_big, _col_roof, 1.5)
	_surface("concrete", n_fine, n_mid, n_big, _col_concrete, 1.0)

	var wave := Image.create(128, 128, false, Image.FORMAT_RGB8)
	wave.fill(Color(0.88, 0.86, 0.8))
	for x in range(128):
		var yc := 64.0 + sin(float(x) / 128.0 * TAU) * 26.0
		for y in range(128):
			if absf(float(y) - yc) < 14.0:
				wave.set_pixel(x, y, Color(0.13, 0.13, 0.14))
	_noisy(wave, 0.03)
	_tex["wave"] = _img_tex(wave)

	var crop := Image.create(64, 64, false, Image.FORMAT_RGB8)
	for y in range(64):
		var v := 1.0 if (y / 4) % 2 == 0 else 0.72
		for x in range(64):
			crop.set_pixel(x, y, Color(v, v, v))
	_tex["crop"] = _img_tex(crop)


func _col_asphalt(f: float, m: float, b: float, x: int, y: int) -> Color:
	var v := 0.11 + f * 0.07 + (m - 0.5) * 0.05 + (b - 0.5) * 0.06
	if _hash(x, y) > 0.985:
		v += 0.08
	return Color(v, v * 0.99, v * 0.97)


func _col_sidewalk(f: float, m: float, b: float, x: int, y: int) -> Color:
	var v := 0.46 + f * 0.06 + (m - 0.5) * 0.08 - maxf(0.0, b - 0.62) * 0.25
	if _grout(x, y):
		v *= 0.62
	return Color(v, v * 0.985, v * 0.96)


static func _grout(x: int, y: int) -> bool:
	return mini(x % 128, 127 - x % 128) < 2 or mini(y % 128, 127 - y % 128) < 2


func _h_sidewalk(x: int, y: int, nf: Image) -> float:
	return 0.0 if _grout(x, y) else 0.6 + nf.get_pixel(x, y).r * 0.4


func _col_grass(f: float, m: float, b: float, _x: int, _y: int) -> Color:
	var k := clampf(m * 0.7 + b * 0.5 - 0.1, 0.0, 1.0)
	var c := Color(0.17, 0.27, 0.11).lerp(Color(0.32, 0.42, 0.18), k)
	c = c.lerp(Color(0.38, 0.36, 0.22), maxf(0.0, b - 0.65) * 1.2)
	return c * (0.85 + f * 0.3)


func _col_sand(f: float, m: float, _b: float, x: int, _y: int) -> Color:
	var r := 0.5 + 0.5 * sin(float(x) * 0.25 + m * 9.0)
	var v := 0.9 + f * 0.08 + r * 0.05
	return Color(0.84 * v, 0.75 * v, 0.58 * v)


func _col_roof(f: float, m: float, b: float, _x: int, _y: int) -> Color:
	var v := 0.3 + f * 0.06 + (m - 0.5) * 0.1 - maxf(0.0, b - 0.6) * 0.2
	return Color(v, v, v * 1.02)


func _col_concrete(f: float, m: float, b: float, _x: int, _y: int) -> Color:
	var v := 0.7 + f * 0.05 + (m - 0.5) * 0.08 - maxf(0.0, b - 0.6) * 0.25
	return Color(v, v * 0.98, v * 0.95)


static func _hash(x: int, y: int) -> float:
	var h := (x * 374761393 + y * 668265263) & 0x7fffffff
	h = (h ^ (h >> 13)) * 1274126177 & 0x7fffffff
	return float(h % 10000) / 10000.0


func _noise_img(size: int, freq: float, octaves: int, seed_v: int) -> Image:
	var n := FastNoiseLite.new()
	n.seed = seed_v
	n.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	n.frequency = freq
	n.fractal_octaves = octaves
	var img := n.get_seamless_image(size, size)
	img.convert(Image.FORMAT_RGB8)
	return img


## Gera albedo + normal map de uma superfície a partir de 3 camadas de ruído.
func _surface(key: String, nf: Image, nm: Image, nb: Image, color_fn: Callable, strength: float,
		height_fn: Callable = Callable()) -> void:
	var dir := "user://texcache_v%d" % TEX_VERSION
	var pa := "%s/%s.png" % [dir, key]
	var pn := "%s/%s_n.png" % [dir, key]
	if FileAccess.file_exists(pa) and FileAccess.file_exists(pn):
		var ia := Image.load_from_file(pa)
		var inn := Image.load_from_file(pn)
		if ia != null and inn != null:
			_tex[key] = _img_tex(ia)
			_tex[key + "_n"] = _img_tex(inn)
			return
	var size := nf.get_width()
	var img := Image.create(size, size, false, Image.FORMAT_RGB8)
	var bump := Image.create(size, size, false, Image.FORMAT_RGB8)
	for y in range(size):
		for x in range(size):
			var f := nf.get_pixel(x, y).r
			var col: Color = color_fn.call(f, nm.get_pixel(x, y).r, nb.get_pixel(x, y).r, x, y)
			img.set_pixel(x, y, col.clamp())
			var hgt: float = f if not height_fn.is_valid() else float(height_fn.call(x, y))
			bump.set_pixel(x, y, Color(hgt, hgt, hgt))
	bump.bump_map_to_normal_map(strength)
	DirAccess.make_dir_recursive_absolute(dir)
	img.save_png(pa)
	bump.save_png(pn)
	_tex[key] = _img_tex(img)
	_tex[key + "_n"] = _img_tex(bump)


## Fachada: albedo, máscara de vidro (rugosidade baixa + metálico = reflete o céu)
## e normal map (janelas "afundadas" na parede).
func _facade_set(kind: String, bg: Color, wins: Array, win_col: Color, frame: Color, noise: float,
		cols: int, rows: int, band: Rect2i = Rect2i()) -> void:
	var img := Image.create(128, 128, false, Image.FORMAT_RGB8)
	img.fill(bg)
	var mask := Image.create(128, 128, false, Image.FORMAT_RGB8)
	mask.fill(Color.BLACK)
	var bump := Image.create(128, 128, false, Image.FORMAT_RGB8)
	bump.fill(Color(0.8, 0.8, 0.8))
	if band.size.x > 0:
		img.fill_rect(band, bg.darkened(0.25))
		bump.fill_rect(band, Color(1, 1, 1))
	for r in wins:
		var rect: Rect2i = r
		img.fill_rect(rect.grow(3), frame)
		bump.fill_rect(rect.grow(3), Color(0.9, 0.9, 0.9))
		var cw := rect.size.x / cols
		var rh := rect.size.y / rows
		for i in range(cols):
			for j in range(rows):
				var pane := Rect2i(rect.position.x + i * cw + 1, rect.position.y + j * rh + 1, cw - 2, rh - 2)
				var k := _rng.randf_range(0.85, 1.15)
				img.fill_rect(pane, Color(win_col.r * k, win_col.g * k, win_col.b * k))
				mask.fill_rect(pane, Color.WHITE)
				bump.fill_rect(pane, Color(0.35, 0.35, 0.35))
	_noisy(img, noise)
	_tex[kind + "_img"] = img
	_tex[kind] = _img_tex(img)
	var rough := mask.duplicate() as Image
	for y in range(128):
		for x in range(128):
			var m := mask.get_pixel(x, y).r
			rough.set_pixel(x, y, Color(1.0 - m * 0.93, 0, 0))
			mask.set_pixel(x, y, Color(m * 0.85, 0, 0))
	_tex[kind + "_rough"] = _img_tex(rough)
	_tex[kind + "_metal"] = _img_tex(mask)
	bump.bump_map_to_normal_map(3.0)
	_tex[kind + "_n"] = _img_tex(bump)


# ============================================================ materiais

func _cmat(c: Color, rough: float = 0.85) -> StandardMaterial3D:
	var key := "c|%s|%s" % [c.to_html(), rough]
	if _mats.has(key):
		return _mats[key] as StandardMaterial3D
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	_mats[key] = m
	return m


func _tmat(tex_key: String, tint: Color, scale: float, rough: float = 0.9) -> StandardMaterial3D:
	var key := "t|%s|%s|%s|%s" % [tex_key, tint.to_html(), scale, rough]
	if _mats.has(key):
		return _mats[key] as StandardMaterial3D
	var m := StandardMaterial3D.new()
	m.albedo_texture = _tex[tex_key]
	m.albedo_color = tint
	m.roughness = rough
	m.uv1_triplanar = true
	m.uv1_scale = Vector3(scale, scale, scale)
	if tex_key in ["asphalt", "sidewalk", "concrete", "wave"]:
		# "brilho da cidade" à noite (substitui a iluminação de rua sem custo de luzes)
		m.emission_enabled = true
		m.emission = Color(0.16, 0.12, 0.08)
		m.emission_energy_multiplier = 0.0
		_ground_mats.append(m)
	if _tex.has(tex_key + "_n"):
		m.normal_enabled = true
		m.normal_texture = _tex[tex_key + "_n"]
		m.normal_scale = 0.8
	m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	_mats[key] = m
	return m


const FACADE_SHADER := preload("res://Shaders/facade.gdshader")


func _facade_mat(kind: String, tint: Color) -> ShaderMaterial:
	var key := "f|%s|%s" % [kind, tint.to_html()]
	if _mats.has(key):
		return _mats[key] as ShaderMaterial
	var m := ShaderMaterial.new()
	m.shader = FACADE_SHADER
	m.set_shader_parameter("albedo_tex", _tex[kind])
	m.set_shader_parameter("tint", tint)
	if _tex.has(kind + "_metal"):
		m.set_shader_parameter("mask_tex", _tex[kind + "_metal"])
		m.set_shader_parameter("normal_tex", _tex[kind + "_n"])
	if _tex.has(kind + "_em"):
		m.set_shader_parameter("emission_tex", _tex[kind + "_em"])
		m.set_shader_parameter("emission_strength", 0.45 if kind == "glass" else 0.75)
	_facade_mats.append(m)
	_mats[key] = m
	return m


## 0 = dia, 1 = noite: acende as janelas dos prédios.
func set_night(f: float) -> void:
	f = snappedf(clampf(f, 0.0, 1.0), 0.05)
	if is_equal_approx(f, _night):
		return
	_night = f
	for m in _facade_mats:
		m.set_shader_parameter("night", f)
	if _shop_mat != null:
		_shop_mat.set_shader_parameter("night", f)
	for m in _ground_mats:
		m.emission_energy_multiplier = f


# ============================================================ primitivas

func _begin(pos: Vector3) -> void:
	_cur = Node3D.new()
	_cur.position = pos
	add_child(_cur)
	_body = StaticBody3D.new()
	_cur.add_child(_body)


func _solid(pos: Vector3, size: Vector3, mat: Material, yaw: float = 0.0, collide: bool = true) -> void:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = mat
	mi.position = pos
	mi.rotation.y = yaw
	mi.visibility_range_end = VIS_RANGE
	_cur.add_child(mi)
	if collide:
		var cs := CollisionShape3D.new()
		var bs := BoxShape3D.new()
		bs.size = size
		cs.shape = bs
		cs.position = pos
		cs.rotation.y = yaw
		_body.add_child(cs)


func _cyl(pos: Vector3, radius: float, height: float, mat: Material, collide: bool = true, rot_deg: Vector3 = Vector3.ZERO) -> void:
	var mi := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = radius
	cm.bottom_radius = radius
	cm.height = height
	cm.radial_segments = 16
	mi.mesh = cm
	mi.material_override = mat
	mi.position = pos
	mi.rotation_degrees = rot_deg
	mi.visibility_range_end = VIS_RANGE
	_cur.add_child(mi)
	if collide:
		var cs := CollisionShape3D.new()
		var sh := CylinderShape3D.new()
		sh.radius = radius
		sh.height = height
		cs.shape = sh
		cs.position = pos
		cs.rotation_degrees = rot_deg
		_body.add_child(cs)


func _prism(pos: Vector3, size: Vector3, mat: Material, yaw: float = 0.0) -> void:
	var mi := MeshInstance3D.new()
	var pm := PrismMesh.new()
	pm.size = size
	mi.mesh = pm
	mi.material_override = mat
	mi.position = pos
	mi.rotation.y = yaw
	mi.visibility_range_end = VIS_RANGE
	_cur.add_child(mi)


func _sign(text: String, pos: Vector3, size: int = 80, color: Color = Color.WHITE, outline: Color = Color.BLACK) -> void:
	var l := Label3D.new()
	l.text = text
	l.font_size = size
	l.pixel_size = 0.02
	l.modulate = color
	l.outline_modulate = outline
	l.outline_size = 6
	l.font = Ui.font(700)
	l.position = pos
	l.rotation_degrees.y = 180.0 # voltado para -Z
	l.visibility_range_end = 150.0
	_cur.add_child(l)


func _world_box(pos: Vector3, size: Vector3, mat: Material, collide: bool = false, rot_deg: Vector3 = Vector3.ZERO) -> void:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = mat
	mi.position = pos
	mi.rotation_degrees = rot_deg
	add_child(mi)
	if collide:
		var body := StaticBody3D.new()
		body.position = pos
		body.rotation_degrees = rot_deg
		var cs := CollisionShape3D.new()
		var bs := BoxShape3D.new()
		bs.size = size
		cs.shape = bs
		body.add_child(cs)
		add_child(body)


func _v(st: SurfaceTool, p: Vector3, n: Vector3, uv: Vector2) -> void:
	st.set_normal(n)
	st.set_uv(uv)
	st.add_vertex(p)


## Paredes com UV em metros (1 andar = 4 m) para as janelas alinharem com o chão.
func _walls_mesh(w: float, h: float, d: float) -> ArrayMesh:
	var hx := w * 0.5
	var hz := d * 0.5
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var corners: Array[Vector2] = [Vector2(-hx, -hz), Vector2(hx, -hz), Vector2(hx, hz), Vector2(-hx, hz)]
	var normals: Array[Vector3] = [Vector3(0, 0, -1), Vector3(1, 0, 0), Vector3(0, 0, 1), Vector3(-1, 0, 0)]
	var v_top := 1.0 - h / FLOOR_H
	for i in range(4):
		var a: Vector2 = corners[i]
		var b: Vector2 = corners[(i + 1) % 4]
		var n: Vector3 = normals[i]
		var u1 := a.distance_to(b) / FLOOR_H
		var a_bot := Vector3(a.x, 0.0, a.y)
		var b_bot := Vector3(b.x, 0.0, b.y)
		var a_top := Vector3(a.x, h, a.y)
		var b_top := Vector3(b.x, h, b.y)
		_v(st, a_bot, n, Vector2(0.0, 1.0))
		_v(st, b_top, n, Vector2(u1, v_top))
		_v(st, a_top, n, Vector2(0.0, v_top))
		_v(st, a_bot, n, Vector2(0.0, 1.0))
		_v(st, b_bot, n, Vector2(u1, 1.0))
		_v(st, b_top, n, Vector2(u1, v_top))
	return st.commit()


func _facade(base: Vector3, w: float, h: float, d: float, mat: Material, yaw: float) -> void:
	var key := "w_%s_%s_%s" % [snappedf(w, 0.5), snappedf(h, 0.5), snappedf(d, 0.5)]
	var mesh: ArrayMesh
	if _meshes.has(key):
		mesh = _meshes[key]
	else:
		mesh = _walls_mesh(w, h, d)
		_meshes[key] = mesh
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = base
	mi.rotation.y = yaw
	mi.visibility_range_end = VIS_RANGE
	_cur.add_child(mi)
	var cs := CollisionShape3D.new()
	var bs := BoxShape3D.new()
	bs.size = Vector3(w, h, d)
	cs.shape = bs
	cs.position = base + Vector3(0.0, h * 0.5, 0.0)
	cs.rotation.y = yaw
	_body.add_child(cs)


## Retorna a altura. `base` = ponto no chão do centro da construção.
func _building(base: Vector3, w: float, d: float, floors: int, kind: String, tint: Color = Color.WHITE, yaw: float = 0.0, flat_roof: bool = true) -> float:
	var h := float(floors) * FLOOR_H
	_facade(base, w, h, d, _facade_mat(kind, tint), yaw)
	if flat_roof:
		var roof := _tmat("roof", Color.WHITE, 0.25)
		var trim := _tmat("concrete", Color(0.85, 0.85, 0.85), 0.5)
		_solid(base + Vector3(0.0, h + 0.1, 0.0), Vector3(w, 0.2, d), roof, yaw, false)
		# platibanda (mureta do telhado)
		_detail(base + Vector3(0.0, h + 0.55, 0.0), _ring_mesh(w + 0.3, d + 0.3, 0.9, 0.3), trim, yaw)
		if DETAILS:
			if floors >= 3:
				var units := 1 + _rng.randi() % 3
				for i in range(units):
					var off := Vector3(_rng.randf_range(-w * 0.3, w * 0.3), h + 0.2, _rng.randf_range(-d * 0.3, d * 0.3)).rotated(Vector3.UP, yaw)
					var sz := Vector3(_rng.randf_range(1.5, 3.0), _rng.randf_range(0.9, 1.6), _rng.randf_range(1.5, 3.0))
					_solid(base + off + Vector3(0, sz.y * 0.5, 0), sz, _cmat(Color(0.62, 0.63, 0.64), 0.6), yaw, false)
			if kind in ["office", "glass", "apartment"]:
				# térreo com vitrine de vidro escuro
				_solid(base + Vector3(0.0, 2.0, 0.0), Vector3(w + 0.25, 3.8, d + 0.25), _shopfront_mat(), yaw, false)
				_solid(base + Vector3(0.0, 4.05, 0.0), Vector3(w + 0.6, 0.3, d + 0.6), trim, yaw, false)
	return h


func _shopfront_mat() -> ShaderMaterial:
	if _mats.has("shopfront"):
		return _mats["shopfront"]
	var m := _facade_mat("shop", Color.WHITE).duplicate() as ShaderMaterial
	_facade_mats.erase(m)
	m.set_shader_parameter("world_uv", true)
	m.set_shader_parameter("base_emission", 0.08)
	m.set_shader_parameter("emission_strength", 0.4)
	_mats["shopfront"] = m
	_shop_mat = m
	return m


## Anel (4 paredes finas) — mureta de telhado em uma malha só.
func _ring_mesh(w: float, d: float, h: float, t: float) -> ArrayMesh:
	var key := "ring_%s_%s_%s" % [snappedf(w, 0.5), snappedf(d, 0.5), h]
	if _meshes.has(key):
		return _meshes[key]
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var parts := [
		[Vector3(0, 0, -d * 0.5 + t * 0.5), Vector3(w, h, t)], [Vector3(0, 0, d * 0.5 - t * 0.5), Vector3(w, h, t)],
		[Vector3(-w * 0.5 + t * 0.5, 0, 0), Vector3(t, h, d)], [Vector3(w * 0.5 - t * 0.5, 0, 0), Vector3(t, h, d)]]
	for p in parts:
		var bm := BoxMesh.new()
		bm.size = p[1]
		st.append_from(bm, 0, Transform3D(Basis.IDENTITY, p[0]))
	var mesh := st.commit()
	_meshes[key] = mesh
	return mesh


func _detail(pos: Vector3, mesh: Mesh, mat: Material, yaw: float = 0.0) -> void:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	mi.rotation.y = yaw
	mi.visibility_range_end = VIS_RANGE
	_cur.add_child(mi)


func _xf(origin: Vector3, scl: Vector3) -> Transform3D:
	return Transform3D(Basis.from_scale(scl), origin)


func _multi(xforms: Array[Transform3D], color: Color) -> void:
	if xforms.is_empty():
		return
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	var bm := BoxMesh.new()
	bm.size = Vector3(1.0, 0.02, 1.0)
	mm.mesh = bm
	mm.instance_count = xforms.size()
	for i in range(xforms.size()):
		mm.set_instance_transform(i, xforms[i])
	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.material_override = _cmat(color, 1.0)
	add_child(mmi)


# ============================================================ terreno e ruas

func _build_terrain() -> void:
	_world_box(Vector3(0, -0.25, -21), Vector3(600, 0.5, 558), _tmat("grass", Color.WHITE, 0.2), true)
	_world_box(Vector3(0, 0.0, -32), Vector3(524, 0.04, 460), _tmat("asphalt", Color.WHITE, 0.25))
	# praia: areia, descida suave e fundo do mar
	_world_box(Vector3(0, 0.0, 235), Vector3(524, 0.04, 46), _tmat("sand", Color.WHITE, 0.2))
	_world_box(Vector3(0, -0.9, 262), Vector3(600, 0.3, 8.14), _tmat("sand", Color(0.9, 0.85, 0.7), 0.2), true, Vector3(10.6, 0, 0))
	_world_box(Vector3(0, -1.65, 283), Vector3(600, 0.3, 34), _tmat("sand", Color(0.7, 0.65, 0.5), 0.2), true)
	var water := ShaderMaterial.new()
	water.shader = load("res://Shaders/water.gdshader")
	var plane := PlaneMesh.new()
	plane.size = Vector2(620, 70)
	plane.subdivide_width = 48
	plane.subdivide_depth = 8
	var wm := MeshInstance3D.new()
	wm.mesh = plane
	wm.material_override = water
	wm.position = Vector3(0, -0.45, 272)
	wm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(wm)


func _build_roads() -> void:
	var yellow: Array[Transform3D] = []
	var white: Array[Transform3D] = []
	var y := 0.03
	for k in range(9):
		var rx := -256.0 + k * PITCH
		for m in range(7):
			var z0 := -256.0 + m * PITCH + 12.0
			var z1 := -256.0 + (m + 1) * PITCH - 12.0
			var seg := z1 - z0
			for off in [-0.2, 0.2]:
				yellow.append(_xf(Vector3(rx + off, y, (z0 + z1) * 0.5), Vector3(0.12, 1.0, seg)))
			var t := z0
			while t + 3.0 <= z1:
				for off in [-3.0, 3.0]:
					white.append(_xf(Vector3(rx + off, y, t + 1.5), Vector3(0.15, 1.0, 3.0)))
				t += 6.0
	for m in range(8):
		var rz := -256.0 + m * PITCH
		for k in range(8):
			var x0 := -256.0 + k * PITCH + 12.0
			var x1 := -256.0 + (k + 1) * PITCH - 12.0
			var seg := x1 - x0
			for off in [-0.2, 0.2]:
				yellow.append(_xf(Vector3((x0 + x1) * 0.5, y, rz + off), Vector3(seg, 1.0, 0.12)))
			var t := x0
			while t + 3.0 <= x1:
				for off in [-3.0, 3.0]:
					white.append(_xf(Vector3(t + 1.5, y, rz + off), Vector3(3.0, 1.0, 0.15)))
				t += 6.0
	# faixas de pedestre
	for k in range(9):
		for m in range(8):
			var rx := -256.0 + k * PITCH
			var rz := -256.0 + m * PITCH
			for sgn in [-1.0, 1.0]:
				for j in range(8):
					var o := -4.9 + j * 1.4
					white.append(_xf(Vector3(rx + o, y, rz + sgn * 8.0), Vector3(0.7, 1.0, 3.0)))
					white.append(_xf(Vector3(rx + sgn * 8.0, y, rz + o), Vector3(3.0, 1.0, 0.7)))
	_multi(yellow, Color(0.9, 0.75, 0.1))
	_multi(white, Color(0.92, 0.92, 0.92))


# ============================================================ quarteirões

## Tipo de cada quarteirão (público: usado pelo minimapa, NPCs e empregos).
static func block_type(ix: int, iz: int) -> String:
	var special := {
		"2,1": "hospital", "5,2": "police", "3,3": "bank", "4,3": "plaza",
		"1,3": "gas", "1,4": "oficina", "5,6": "dealer"}
	var key := "%d,%d" % [ix, iz]
	if special.has(key):
		return special[key]
	if iz == 6:
		if ix >= 2 and ix <= 5:
			return "commercial"
		if ix >= 6:
			return "houses"
		return "field"
	if ix <= 1:
		return "field"
	if ix >= 6:
		return "favela" if (iz >= 1 and iz <= 5) else "houses"
	if iz >= 2 and iz <= 5:
		if ix == 3 or ix == 4:
			return "tower"
		return "commercial"
	if iz == 1 and (ix == 3 or ix == 4):
		return "apartments"
	return "houses"


func _build_block(ix: int, iz: int) -> void:
	var cx := FIRST + ix * PITCH
	var cz := FIRST + iz * PITCH
	var kind := block_type(ix, iz)
	_begin(Vector3(cx, 0.0, cz))
	if kind != "field":
		_solid(Vector3(0, SLAB_H * 0.5, 0), Vector3(BLOCK, SLAB_H, BLOCK), _tmat("sidewalk", Color.WHITE, 0.5))
		# meio-fio de concreto claro
		_detail(Vector3(0, SLAB_H * 0.5 + 0.005, 0), _ring_mesh(BLOCK + 0.1, BLOCK + 0.1, SLAB_H + 0.02, 0.35),
			_tmat("concrete", Color.WHITE, 0.5))
		if DETAILS:
			_street_props()
	match kind:
		"tower": _fill_tower()
		"commercial": _fill_commercial()
		"apartments": _fill_apartments()
		"houses": _fill_houses()
		"favela": _fill_favela()
		"hospital": _fill_hospital()
		"police": _fill_police()
		"bank": _fill_bank()
		"gas": _fill_gas()
		"oficina": _fill_oficina()
		"dealer": _fill_dealer()
		"plaza": _fill_plaza()
		"field": _fill_field()


## Mobiliário urbano na calçada: lixeiras e frades (balizadores) — sem postes.
func _street_props() -> void:
	var bin_mat := _cmat(Color(0.12, 0.14, 0.13), 0.6)
	var bollard := _cmat(Color(0.2, 0.2, 0.21), 0.5)
	for side in range(4):
		var a := side * PI * 0.5
		for k in range(2):
			if _rng.randf() < 0.5:
				var along := _rng.randf_range(-18.0, 18.0)
				var p := Vector3(along, 0, 25.85).rotated(Vector3.UP, a)
				_solid(Vector3(p.x, SLAB_H + 0.45, p.z), Vector3(0.55, 0.9, 0.55), bin_mat, a, true)
		for k in range(3):
			var p2 := Vector3(-24.6 + k * 0.9, 0, 25.85).rotated(Vector3.UP, a)
			_cyl(Vector3(p2.x, SLAB_H + 0.4, p2.z), 0.09, 0.8, bollard, false)


func _pick_color(list: Array[Color]) -> Color:
	return list[_rng.randi() % list.size()]


func _fill_tower() -> void:
	var spots: Array[Vector2] = [Vector2(-13, -13), Vector2(13, -12), Vector2(-12, 13), Vector2(13, 13)]
	for s in spots:
		if _rng.randf() < 0.85:
			var w := _rng.randf_range(16.0, 22.0)
			var d := _rng.randf_range(16.0, 22.0)
			var fl := _rng.randi_range(8, 24)
			var kind := "glass" if _rng.randf() < 0.55 else "office"
			_building(Vector3(s.x, SLAB_H, s.y), w, d, fl, kind)


func _fill_commercial() -> void:
	for sx in [-12.5, 12.5]:
		for sz in [-12.5, 12.5]:
			var fl := _rng.randi_range(2, 4)
			var kind := "office" if _rng.randf() < 0.5 else "apartment"
			_building(Vector3(sx, SLAB_H, sz), 22, 22, fl, kind, _pick_color(_house_colors))
			# toldo colorido na fachada voltada ao centro do quarteirão
			var awn := _cmat(Color(0.75, 0.15, 0.15) if _rng.randf() < 0.5 else Color(0.15, 0.4, 0.7))
			_solid(Vector3(sx, SLAB_H + 3.2, sz + (-11.9 if sz < 0.0 else 11.9)), Vector3(18, 0.2, 1.4), awn, 0.0, false)


func _fill_apartments() -> void:
	_building(Vector3(-12, SLAB_H, 0), 20, 44, _rng.randi_range(5, 8), "apartment", _pick_color(_house_colors))
	_building(Vector3(14, SLAB_H, 0), 16, 44, _rng.randi_range(6, 9), "apartment", _pick_color(_house_colors))


func _fill_houses() -> void:
	var lawn := _cmat(Color(0.35, 0.55, 0.3))
	for lx in [-17.0, 0.0, 17.0]:
		for lz in [-12.5, 12.5]:
			var front: float = signf(lz)
			var wc := _cmat(_pick_color(_wall_colors))
			var y := SLAB_H + 0.65
			_solid(Vector3(lx - 7.5, y, lz), Vector3(0.25, 1.3, 23), wc)
			_solid(Vector3(lx + 7.5, y, lz), Vector3(0.25, 1.3, 23), wc)
			_solid(Vector3(lx, y, lz - front * 11.5), Vector3(15, 1.3, 0.25), wc)
			_solid(Vector3(lx - 4.5, y, lz + front * 11.5), Vector3(6, 1.3, 0.25), wc)
			_solid(Vector3(lx + 4.5, y, lz + front * 11.5), Vector3(6, 1.3, 0.25), wc)
			_solid(Vector3(lx, SLAB_H + 0.02, lz), Vector3(14.5, 0.04, 22.5), lawn, 0.0, false)
			var w := _rng.randf_range(8.0, 10.0)
			var d := _rng.randf_range(7.0, 9.0)
			var fl := _rng.randi_range(1, 2)
			var hz: float = float(lz) - front * 2.0
			var h := _building(Vector3(lx, SLAB_H, hz), w, d, fl, "house", _pick_color(_house_colors), 0.0, false)
			var roof := _cmat(Color(0.62, 0.28, 0.18) if _rng.randf() < 0.7 else Color(0.4, 0.4, 0.42))
			_prism(Vector3(lx, SLAB_H + h + 0.9, hz), Vector3(w + 0.8, 1.8, d + 0.8), roof)


func _fill_favela() -> void:
	var tank := _cmat(Color(0.2, 0.45, 0.75))
	for i in range(5):
		for j in range(5):
			if _rng.randf() < 0.2:
				continue
			var x := -20.0 + i * 10.0 + _rng.randf_range(-0.5, 0.5)
			var z := -20.0 + j * 10.0 + _rng.randf_range(-0.5, 0.5)
			var w := _rng.randf_range(6.0, 7.4)
			var d := _rng.randf_range(6.0, 7.4)
			var h := _building(Vector3(x, SLAB_H, z), w, d, _rng.randi_range(1, 4), "favela",
				_pick_color(_favela_colors), _rng.randf_range(-0.1, 0.1))
			if _rng.randf() < 0.45:
				_cyl(Vector3(x + _rng.randf_range(-1.5, 1.5), SLAB_H + h + 1.0, z), 0.8, 1.2, tank, false)


# ------------------------------------------------------------ especiais

func _fill_hospital() -> void:
	var white := Color(0.97, 0.97, 0.97)
	var red := _cmat(Color(0.85, 0.1, 0.1))
	_building(Vector3(0, SLAB_H, 0), 34, 26, 6, "office", white)
	_solid(Vector3(0, SLAB_H + 3.6, -16.5), Vector3(12, 0.4, 7), _cmat(white), 0.0, false)
	_solid(Vector3(-5.5, SLAB_H + 1.8, -19), Vector3(0.6, 3.6, 0.6), _cmat(white))
	_solid(Vector3(5.5, SLAB_H + 1.8, -19), Vector3(0.6, 3.6, 0.6), _cmat(white))
	_solid(Vector3(0, SLAB_H + 16, -13.2), Vector3(1.4, 5, 0.3), red, 0.0, false)
	_solid(Vector3(0, SLAB_H + 16, -13.2), Vector3(5, 1.4, 0.3), red, 0.0, false)
	_sign("HOSPITAL", Vector3(0, SLAB_H + 21, -13.4), 100, Color(0.8, 0.1, 0.1), Color.WHITE)


func _fill_police() -> void:
	_building(Vector3(0, SLAB_H, -4), 30, 20, 3, "office", Color(0.85, 0.9, 1.0))
	_solid(Vector3(0, SLAB_H + 8, -14.1), Vector3(30.2, 1.0, 0.1), _cmat(Color(0.1, 0.2, 0.6)), 0.0, false)
	_sign("DELEGACIA", Vector3(0, SLAB_H + 10.0, -14.3), 90, Color.WHITE, Color(0.1, 0.2, 0.6))
	_solid(Vector3(0, SLAB_H + 0.015, 17), Vector3(40, 0.03, 14), _cmat(Color(0.15, 0.15, 0.17)), 0.0, false)


func _fill_bank() -> void:
	_building(Vector3(0, SLAB_H, -6), 24, 24, 16, "glass")
	_sign("BANCO", Vector3(0, SLAB_H + 14, -18.2), 110, Color(1.0, 0.85, 0.2), Color.BLACK)
	_building(Vector3(0, SLAB_H, 17), 40, 16, 2, "office", Color(0.9, 0.9, 0.95))


func _fill_gas() -> void:
	var red := _cmat(Color(0.8, 0.12, 0.1))
	_building(Vector3(0, SLAB_H, -18), 14, 8, 1, "house", Color.WHITE)
	_solid(Vector3(0, SLAB_H + 5, 4), Vector3(24, 0.5, 14), red, 0.0, false)
	for px in [-10.0, 10.0]:
		for pz in [-1.0, 9.0]:
			_solid(Vector3(px, SLAB_H + 2.5, pz), Vector3(0.7, 5, 0.7), _cmat(Color(0.9, 0.9, 0.9)))
	for px in [-4.0, 4.0]:
		for pz in [2.0, 6.0]:
			_solid(Vector3(px, SLAB_H + 0.8, pz), Vector3(0.9, 1.6, 0.6), red)
	_sign("POSTO", Vector3(0, SLAB_H + 5.0, -3.1), 50, Color.WHITE, Color(0.5, 0.05, 0.05))


func _fill_oficina() -> void:
	var door := _cmat(Color(0.12, 0.12, 0.14))
	_building(Vector3(-13, SLAB_H, -8), 22, 16, 2, "office", Color(0.7, 0.72, 0.75))
	_building(Vector3(13, SLAB_H, -8), 18, 16, 2, "office", Color(0.9, 0.95, 1.0))
	_solid(Vector3(-13, SLAB_H + 2.2, -16.1), Vector3(8, 4, 0.2), door, 0.0, false)
	_solid(Vector3(13, SLAB_H + 2.2, -16.1), Vector3(8, 4, 0.2), door, 0.0, false)
	_sign("OFICINA", Vector3(-13, SLAB_H + 6.6, -16.3), 70, Color(1.0, 0.85, 0.2), Color.BLACK)
	var tire := _cmat(Color(0.05, 0.05, 0.05))
	for i in range(3):
		_cyl(Vector3(0, SLAB_H + 0.15 + i * 0.3, 14), 0.4, 0.28, tire, false, Vector3.ZERO)
	_solid(Vector3(3, SLAB_H + 0.45, 14), Vector3(0.8, 0.9, 0.8), tire, 0.0, true)


func _fill_dealer() -> void:
	_building(Vector3(0, SLAB_H, -12), 36, 18, 2, "glass")
	_sign("CONCESSIONÁRIA", Vector3(0, SLAB_H + 6.5, -21.2), 64, Color.WHITE, Color(0.1, 0.2, 0.5))
	var plat := _cmat(Color(0.8, 0.8, 0.85))
	for px in [-10.0, 0.0, 10.0]:
		_cyl(Vector3(px, SLAB_H + 0.15, 10), 2.2, 0.3, plat, true)


func _fill_plaza() -> void:
	_solid(Vector3(0, SLAB_H + 0.02, 0), Vector3(46, 0.04, 46), _tmat("wave", Color.WHITE, 0.25), 0.0, false)
	_cyl(Vector3(0, SLAB_H + 0.35, 0), 4.5, 0.7, _cmat(Color(0.7, 0.7, 0.72)), true)
	var water := StandardMaterial3D.new()
	water.albedo_color = Color(0.2, 0.55, 0.8)
	water.roughness = 0.1
	_cyl(Vector3(0, SLAB_H + 0.36, 0), 4.0, 0.72, water, false)
	_cyl(Vector3(0, SLAB_H + 1.5, 0), 0.5, 3.0, _cmat(Color(0.6, 0.6, 0.62)), true)
	var wood := _cmat(Color(0.5, 0.33, 0.2))
	for i in range(8):
		var a := float(i) / 8.0 * TAU
		_solid(Vector3(cos(a) * 9.0, SLAB_H + 0.25, sin(a) * 9.0), Vector3(2.6, 0.5, 0.8), wood, -a - PI * 0.5)
	for cxp in [-17.0, 17.0]:
		for czp in [-17.0, 17.0]:
			_solid(Vector3(cxp, SLAB_H + 0.2, czp), Vector3(4, 0.4, 4), _cmat(Color(0.8, 0.3, 0.5)))
	_sign("PRAÇA CENTRAL", Vector3(0, SLAB_H + 1.2, -22), 60, Color.WHITE, Color(0.1, 0.3, 0.2))


func _fill_field() -> void:
	var fence := _cmat(Color(0.5, 0.35, 0.2))
	_solid(Vector3(-25.5, 0.55, 0), Vector3(0.15, 1.1, 52), fence)
	_solid(Vector3(25.5, 0.55, 0), Vector3(0.15, 1.1, 52), fence)
	_solid(Vector3(0, 0.55, -25.5), Vector3(52, 1.1, 0.15), fence)
	var crops: Array[Color] = [Color(0.55, 0.8, 0.25), Color(0.95, 0.8, 0.3), Color(0.45, 0.65, 0.25)]
	var barn := _rng.randf() < 0.5
	if barn:
		var h := _building(Vector3(-10, 0, -10), 14, 22, 2, "house", Color(0.62, 0.2, 0.18), 0.0, false)
		_prism(Vector3(-10, h + 1.5, -10), Vector3(14.8, 3, 22.8), _cmat(Color(0.3, 0.3, 0.32)))
		var h2 := _building(Vector3(14, 0, -12), 9, 8, 1, "house", Color(1, 0.95, 0.8), 0.0, false)
		_prism(Vector3(14, h2 + 0.9, -12), Vector3(9.8, 1.8, 8.8), _cmat(Color(0.62, 0.28, 0.18)))
		_solid(Vector3(-12, 0.03, 16), Vector3(18, 0.06, 18), _tmat("crop", crops[0], 0.25), 0.0, false)
		_solid(Vector3(14, 0.03, 16), Vector3(18, 0.06, 18), _tmat("crop", crops[1], 0.25), 0.0, false)
		var hay := _cmat(Color(0.85, 0.75, 0.35))
		for i in range(4):
			_cyl(Vector3(2 + i * 2.0, 0.6, -2), 0.6, 1.2, hay, true, Vector3(0, 0, 90))
	else:
		_solid(Vector3(-12, 0.03, -10), Vector3(18, 0.06, 28), _tmat("crop", crops[2], 0.25), 0.0, false)
		_solid(Vector3(12, 0.03, -10), Vector3(18, 0.06, 28), _tmat("crop", crops[0], 0.25), 0.0, false)
		_solid(Vector3(-12, 0.03, 16), Vector3(18, 0.06, 14), _tmat("crop", crops[1], 0.25), 0.0, false)
		_solid(Vector3(12, 0.03, 16), Vector3(18, 0.06, 14), _tmat("crop", crops[2], 0.25), 0.0, false)


# ============================================================ praia, morro, limites

func _build_beach() -> void:
	_begin(Vector3.ZERO)
	# calçadão (padrão de ondas)
	_solid(Vector3(0, SLAB_H * 0.5, 205), Vector3(524, SLAB_H, 14), _tmat("wave", Color.WHITE, 0.25))
	var colors: Array[Color] = [Color(0.9, 0.3, 0.2), Color(0.2, 0.6, 0.8), Color(0.95, 0.75, 0.2), Color(0.3, 0.7, 0.4), Color(0.8, 0.4, 0.7)]
	for i in range(5):
		var x := -180.0 + i * 90.0
		_solid(Vector3(x, 1.5, 222), Vector3(5, 3, 4), _cmat(Color(0.95, 0.93, 0.88)))
		_solid(Vector3(x, 3.15, 222), Vector3(6.5, 0.3, 5.5), _cmat(colors[i]), 0.0, false)
	# posto salva-vidas
	var red := _cmat(Color(0.85, 0.15, 0.1))
	for px in [-62.0, -58.0]:
		for pz in [230.0, 234.0]:
			_solid(Vector3(px, 1.5, pz), Vector3(0.5, 3, 0.5), _cmat(Color(0.9, 0.9, 0.9)))
	_solid(Vector3(-60, 3.15, 232), Vector3(5, 0.3, 5), _cmat(Color(0.9, 0.9, 0.9)))
	_solid(Vector3(-60, 4.5, 232), Vector3(3, 2.4, 3), red)
	# molhe de concreto no mar
	_solid(Vector3(100, -0.4, 270), Vector3(4, 1.2, 40), _cmat(Color(0.65, 0.65, 0.67)))


func _build_hill() -> void:
	_begin(Vector3.ZERO)
	var earth := _tmat("grass", Color(0.6, 0.5, 0.4), 0.2)
	for i in range(5):
		var x0 := 262.0 + i * 7.5
		var sx := WORLD - x0
		var top := float(i + 1)
		_solid(Vector3(x0 + sx * 0.5, top * 0.5, -30), Vector3(sx, top, 440), earth)
		var z := -240.0
		while z < 190.0:
			if _rng.randf() < 0.3:
				_building(Vector3(x0 + 3.75 + _rng.randf_range(-0.4, 0.4), top, z), 4.2, 4.2,
					_rng.randi_range(1, 2), "favela", _pick_color(_favela_colors))
			z += 8.0


func _build_boundaries() -> void:
	var body := StaticBody3D.new()
	add_child(body)
	var big := 2.0 * WORLD + 40.0
	var defs: Array = [
		[Vector3(0, 50, -WORLD - 10), Vector3(big, 100, 20)],
		[Vector3(0, 50, WORLD + 10), Vector3(big, 100, 20)],
		[Vector3(-WORLD - 10, 50, 0), Vector3(20, 100, big)],
		[Vector3(WORLD + 10, 50, 0), Vector3(20, 100, big)]]
	for d in defs:
		var cs := CollisionShape3D.new()
		var bs := BoxShape3D.new()
		bs.size = d[1]
		cs.shape = bs
		cs.position = d[0]
		body.add_child(cs)
