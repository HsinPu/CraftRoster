extends Node
var session
var selected_job: String = "J1"
var location: String = "depot"
var operation: String = "pickup"
var armed: bool = true
var last_result: String = ""
var accepted_count: int = 0

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS

func set_paused(value: bool) -> void:
    get_tree().paused = value
    armed = false

func _input(event: InputEvent) -> void:
    if event.is_action_pressed("pause", false):
        set_paused(not get_tree().paused)
        get_viewport().set_input_as_handled()

func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_released("interact"):
        armed = true
        return
    if not event.is_action_pressed("interact", false):
        return
    if get_tree().paused or not armed:
        return
    armed = false
    if operation == "pickup":
        last_result = session.pickup(selected_job, location)
    else:
        last_result = session.dropoff(selected_job, location)
    if last_result in ["picked_up", "delivered"]:
        accepted_count += 1
    get_viewport().set_input_as_handled()
