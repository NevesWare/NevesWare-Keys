class_name InteractionPoint
extends Node3D
## Marcador de interação (estilo servidor RP): círculo luminoso no chão,
## seta girando e nome. O World detecta o jogador por distância e mostra o
## botão de USAR; ao tocar, chama `on_use`.

var id: String = ""
var title: String = ""
var prompt: String = "USAR"
var color: Color = Color(1.0, 0.75, 0.15)
var radius: float = 2.0
var vehicle_only: bool = false   # só aparece dentro do carro (posto, oficina)
var blip: String = ""            # letra no minimapa
var on_use: Callable

var _arrow: Node3D
var _t: float = 0.0


func _ready() -> void:
	add_to_group("interaction_points")
	color = Color(1.0, 1.0, 1.0)   # marcadores neutros (visual limpo)
	var ring_mat := StandardMaterial3D.new()
	ring_mat.albedo_color = Color(color.r, color.g, color.b, 0.22)
	ring_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	ring_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	ring_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	var ring := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = radius * 0.55
	cm.bottom_radius = radius * 0.55
	cm.height = 0.9 if not vehicle_only else 0.4
	cm.cap_top = false
	cm.cap_bottom = false
	cm.radial_segments = 24
	ring.mesh = cm
	ring.material_override = ring_mat
	ring.position.y = cm.height * 0.5
	ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	ring.visibility_range_end = 120.0
	add_child(ring)

	var floor_mat := ring_mat.duplicate() as StandardMaterial3D
	floor_mat.albedo_color = Color(color.r, color.g, color.b, 0.12)
	var disc := MeshInstance3D.new()
	var dm := CylinderMesh.new()
	dm.top_radius = radius * 0.55
	dm.bottom_radius = radius * 0.55
	dm.height = 0.02
	dm.radial_segments = 24
	disc.mesh = dm
	disc.material_override = floor_mat
	disc.position.y = 0.02
	disc.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	disc.visibility_range_end = 120.0
	add_child(disc)

	_arrow = Node3D.new()
	_arrow.position.y = 2.0
	add_child(_arrow)
	var arrow_mat := StandardMaterial3D.new()
	arrow_mat.albedo_color = color
	arrow_mat.emission_enabled = true
	arrow_mat.emission = color
	arrow_mat.emission_energy_multiplier = 0.4
	var am := MeshInstance3D.new()
	var pm := PrismMesh.new()
	pm.size = Vector3(0.5, 0.5, 0.12)
	am.mesh = pm
	am.material_override = arrow_mat
	am.rotation_degrees.z = 180.0
	am.visibility_range_end = 120.0
	_arrow.add_child(am)

	var label := Label3D.new()
	label.text = title
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.font_size = 56
	label.font = Ui.font(600)
	label.outline_size = 8
	label.pixel_size = 0.008
	label.position.y = 2.75
	label.modulate = Color.WHITE
	label.outline_modulate = Color(0, 0, 0, 0.6)
	label.visibility_range_end = 45.0
	label.no_depth_test = false
	add_child(label)


func _process(delta: float) -> void:
	_t += delta
	_arrow.rotation.y = _t * 2.0
	_arrow.position.y = 2.0 + sin(_t * 3.0) * 0.12
