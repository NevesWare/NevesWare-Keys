class_name MapCapture
extends RefCounted
## Gera a imagem "de satélite" do mapa: fotografa a cidade de cima com uma
## câmera ortográfica (uma vez só) e guarda em cache no aparelho.
## A imagem cobre de -EXTENT a +EXTENT metros em X e Z (norte = topo).

const EXTENT := 310.0
const VERSION := 5
const CACHE := "user://minimap_v%d_%d.png"

static var texture: Texture2D = null


static func world_rect() -> Rect2:
	return Rect2(-EXTENT, -EXTENT, EXTENT * 2.0, EXTENT * 2.0)


## Chamar logo depois de city.build(), antes de colocar carros/pessoas.
static func capture(host: Node3D, city: Node3D, size: int) -> void:
	var path := CACHE % [VERSION, size]
	if FileAccess.file_exists(path):
		var cached := Image.load_from_file(path)
		if cached != null and not cached.is_empty():
			texture = ImageTexture.create_from_image(cached)
			return
	if DisplayServer.get_name() == "headless":
		return

	# desliga cortes por distância e placas (Label3D) durante a foto
	var saved: Array = []
	_collect(city, saved)
	for e in saved:
		var gi: GeometryInstance3D = e[0]
		if gi is Label3D:
			gi.visible = false
		else:
			gi.visibility_range_end = 0.0

	var vp := SubViewport.new()
	vp.size = Vector2i(size, size)
	vp.render_target_update_mode = SubViewport.UPDATE_ONCE
	vp.msaa_3d = Viewport.MSAA_DISABLED
	host.add_child(vp)
	var cam := Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	cam.size = EXTENT * 2.0
	cam.near = 1.0
	cam.far = 500.0
	cam.position = Vector3(0, 300, 0)
	cam.rotation_degrees = Vector3(-90, 0, 0)
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.12, 0.3, 0.4)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.75, 0.75, 0.78)
	env.ambient_light_energy = 0.9
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	# tom de mapa: dessaturado e um pouco escuro (ícones brancos saltam)
	env.adjustment_enabled = true
	env.adjustment_saturation = 0.45
	env.adjustment_brightness = 0.52
	env.adjustment_contrast = 1.18
	cam.environment = env
	vp.add_child(cam)
	cam.current = true

	var tree := host.get_tree()
	for i in range(3):
		await tree.process_frame
	await RenderingServer.frame_post_draw
	var img := vp.get_texture().get_image()
	vp.queue_free()
	for e in saved:
		var gi: GeometryInstance3D = e[0]
		if gi is Label3D:
			gi.visible = e[1]
		else:
			gi.visibility_range_end = e[1]
	if img == null or img.is_empty():
		return
	img.convert(Image.FORMAT_RGB8)
	img.save_png(path)
	img.generate_mipmaps()
	texture = ImageTexture.create_from_image(img)


static func _collect(n: Node, out: Array) -> void:
	for c in n.get_children():
		if c is Label3D:
			out.append([c, c.visible])
		elif c is GeometryInstance3D:
			out.append([c, (c as GeometryInstance3D).visibility_range_end])
		_collect(c, out)
