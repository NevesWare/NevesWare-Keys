extends Node
## Registra as ações de input. No celular elas são disparadas pelo TouchControls;
## o teclado fica só para testar no PC (o mouse também emula toque).

const ACTIONS := {
	"move_forward": [KEY_W, KEY_UP],
	"move_back": [KEY_S, KEY_DOWN],
	"move_left": [KEY_A, KEY_LEFT],
	"move_right": [KEY_D, KEY_RIGHT],
	"sprint": [KEY_SHIFT],
	"walk": [KEY_ALT],
	"jump": [KEY_SPACE],          # a pé: pular | no carro: freio de mão
	"crouch": [KEY_C],
	"prone": [KEY_Z],
	"punch": [KEY_F],
	"interact": [KEY_E],          # usar marcador / entrar e sair do carro
	"accelerate": [],             # pedais de toque (no PC use W/S)
	"brake": [],
	"phone": [KEY_M],
	"map": [KEY_N],
	"chat": [KEY_T],
	"horn": [KEY_H],
}

func _ready() -> void:
	for action in ACTIONS:
		if not InputMap.has_action(action):
			InputMap.add_action(action)
		for key in ACTIONS[action]:
			var ev := InputEventKey.new()
			ev.physical_keycode = key
			InputMap.action_add_event(action, ev)
