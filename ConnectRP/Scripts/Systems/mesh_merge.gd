class_name MeshMerge
extends RefCounted
## Junta as MeshInstance3D filhas diretas de um nó numa única MeshInstance3D
## (uma superfície por material). Menos objetos = menos draw calls no celular
## e evita o limite de objetos do renderizador Web (a cena sumia no navegador
## com mais de ~1000 objetos).


## Retorna a malha criada (ou null se não havia o que juntar).
static func merge_children(parent: Node3D, min_count: int = 2) -> MeshInstance3D:
	var groups: Dictionary = {}       # [Material, formato] -> Array[MeshInstance3D]
	var order: Array = []
	var total := 0
	var shadow := GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var vis_end := 0.0
	for c in parent.get_children():
		if not (c is MeshInstance3D):
			continue
		var mi := c as MeshInstance3D
		if mi.mesh == null or mi.material_override == null or not mi.visible:
			continue
		# formatos de vértice diferentes (com/sem UV) não podem ir na mesma superfície
		var key := [mi.material_override, _format_key(mi.mesh)]
		if not groups.has(key):
			groups[key] = []
			order.append(key)
		groups[key].append(mi)
		total += 1
		if mi.cast_shadow != GeometryInstance3D.SHADOW_CASTING_SETTING_OFF:
			shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		vis_end = maxf(vis_end, mi.visibility_range_end)
	if total < min_count:
		return null

	var mesh := ArrayMesh.new()
	for key in order:
		var mat: Material = key[0]
		var st := SurfaceTool.new()
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		var has_uv := true
		for mi in groups[key]:
			var m: Mesh = (mi as MeshInstance3D).mesh
			for si in range(m.get_surface_count()):
				if m is ArrayMesh and ((m as ArrayMesh).surface_get_format(si) & Mesh.ARRAY_FORMAT_TEX_UV) == 0:
					has_uv = false   # malhas primitivas sempre têm UV
				st.append_from(m, si, (mi as MeshInstance3D).transform)
		if has_uv and _needs_tangents(mat):
			st.generate_tangents()
		st.commit(mesh)
		mesh.surface_set_material(mesh.get_surface_count() - 1, mat)

	var out := MeshInstance3D.new()
	out.name = "Merged"
	out.mesh = mesh
	out.cast_shadow = shadow
	out.visibility_range_end = vis_end
	parent.add_child(out)
	for key in order:
		for mi in groups[key]:
			parent.remove_child(mi)
			mi.queue_free()
	return out


static func _format_key(m: Mesh) -> int:
	if m is ArrayMesh and (m as ArrayMesh).get_surface_count() > 0:
		return (m as ArrayMesh).surface_get_format(0) & (Mesh.ARRAY_FORMAT_TEX_UV | Mesh.ARRAY_FORMAT_NORMAL | Mesh.ARRAY_FORMAT_TANGENT | Mesh.ARRAY_FORMAT_COLOR)
	return -1   # malhas primitivas (box, cilindro...) têm todas o mesmo formato


static func _needs_tangents(mat: Material) -> bool:
	if mat is ShaderMaterial:
		return true
	if mat is StandardMaterial3D:
		return (mat as StandardMaterial3D).normal_enabled
	return false
