class_name TestDummy
extends StaticBody3D
## Boneco de treino: reage a socos (take_damage) e conta os acertos.

var _pivot: Node3D
var _mat: StandardMaterial3D
var _label: Label3D
var _hits: int = 0


func _ready() -> void:
    var cs := CollisionShape3D.new()
    var cap := CapsuleShape3D.new()
    cap.radius = 0.4
    cap.height = 1.8
    cs.shape = cap
    cs.position.y = 0.9
    add_child(cs)

    _pivot = Node3D.new()
    add_child(_pivot)
    _mat = StandardMaterial3D.new()
    _mat.albedo_color = Color(0.85, 0.75, 0.3)
    var mi := MeshInstance3D.new()
    var cm := CapsuleMesh.new()
    cm.radius = 0.4
    cm.height = 1.8
    mi.mesh = cm
    mi.material_override = _mat
    mi.position.y = 0.9
    _pivot.add_child(mi)

    _label = Label3D.new()
    _label.text = "Acertos: 0"
    _label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
    _label.position.y = 2.3
    _label.pixel_size = 0.005
    add_child(_label)


func take_damage(_amount: float, from_dir: Vector3) -> void:
    _hits += 1
    _label.text = "Acertos: %d" % _hits
    _mat.albedo_color = Color(1.0, 0.2, 0.2)
    var axis := Vector3.UP.cross(from_dir)
    if axis.length() > 0.001:
        _pivot.basis = Basis(axis.normalized(), 0.35)
    var tw := create_tween()
    tw.set_parallel(true)
    tw.tween_property(_pivot, "basis", Basis.IDENTITY, 0.4)
    tw.tween_property(_mat, "albedo_color", Color(0.85, 0.75, 0.3), 0.4)
