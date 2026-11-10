extends Node
## Multiplayer básico (ENet): um jogador hospeda (servidor + jogador) e os
## outros entram pelo IP. Sincroniza posição/animação/veículo dos jogadores e
## o chat RP. O servidor retransmite as mensagens entre clientes.
## Economia e inventário ainda são locais (ver README: "Próximas etapas").

signal peer_joined(id: int)
signal peer_left(id: int)
signal state_received(id: int, state: Dictionary)
signal chat_received(sender: String, text: String)
signal status_changed(text: String)

const DEFAULT_PORT := 7777
const MAX_PLAYERS := 32

var online: bool = false
var is_host: bool = false


func _ready() -> void:
	multiplayer.peer_connected.connect(func(id: int) -> void: peer_joined.emit(id))
	multiplayer.peer_disconnected.connect(func(id: int) -> void: peer_left.emit(id))
	multiplayer.connected_to_server.connect(func() -> void: status_changed.emit("Conectado ao servidor"))
	multiplayer.connection_failed.connect(_on_failed)
	multiplayer.server_disconnected.connect(_on_server_lost)


func host(port: int = DEFAULT_PORT) -> Error:
	var p := ENetMultiplayerPeer.new()
	var err := p.create_server(port, MAX_PLAYERS)
	if err != OK:
		return err
	multiplayer.multiplayer_peer = p
	online = true
	is_host = true
	status_changed.emit("Servidor aberto na porta %d" % port)
	return OK


func join(ip: String, port: int = DEFAULT_PORT) -> Error:
	var p := ENetMultiplayerPeer.new()
	var err := p.create_client(ip, port)
	if err != OK:
		return err
	multiplayer.multiplayer_peer = p
	online = true
	is_host = false
	status_changed.emit("Conectando a %s:%d..." % [ip, port])
	return OK


func leave() -> void:
	if multiplayer.multiplayer_peer != null:
		multiplayer.multiplayer_peer.close()
	multiplayer.multiplayer_peer = OfflineMultiplayerPeer.new()
	online = false
	is_host = false


func is_connected_to_game() -> bool:
	return online and multiplayer.multiplayer_peer != null \
		and multiplayer.multiplayer_peer.get_connection_status() == MultiplayerPeer.CONNECTION_CONNECTED


func my_id() -> int:
	return multiplayer.get_unique_id() if online else 1


func send_state(state: Dictionary) -> void:
	if is_connected_to_game():
		_rpc_state.rpc(state)


func send_chat(sender: String, text: String) -> void:
	if is_connected_to_game():
		_rpc_chat.rpc(sender, text)
	else:
		chat_received.emit(sender, text)


@rpc("any_peer", "call_remote", "unreliable_ordered")
func _rpc_state(state: Dictionary) -> void:
	state_received.emit(multiplayer.get_remote_sender_id(), state)


@rpc("any_peer", "call_local", "reliable")
func _rpc_chat(sender: String, text: String) -> void:
	chat_received.emit(sender.left(24), text.left(160))


func _on_failed() -> void:
	status_changed.emit("Falha ao conectar")
	leave()


func _on_server_lost() -> void:
	status_changed.emit("Servidor desconectou")
	leave()
