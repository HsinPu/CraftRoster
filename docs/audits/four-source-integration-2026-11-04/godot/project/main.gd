extends Node
const Session = preload("res://session.gd")
const Job = preload("res://job.gd")
const Boundary = preload("res://input_boundary.gd")
var failures: int = 0
var assertions: int = 0

func check(value: bool, label: String) -> void:
    assertions += 1
    if not value:
        failures += 1
        push_error("FAIL: " + label)
    else:
        print("PASS: " + label)

func action(name_: String, pressed: bool) -> void:
    var event := InputEventAction.new()
    event.action = name_
    event.pressed = pressed
    Input.parse_input_event(event)

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    InputMap.add_action("interact")
    InputMap.add_action("pause")
    call_deferred("run")

func run() -> void:
    var jobs: Array = [load("res://job_one.tres")]
    var destinations: Array[String] = ["clinic", "library", "workshop"]
    for index in range(3):
        var job = Job.new()
        job.job_id = "J" + str(index + 2)
        job.destination_id = destinations[index]
        jobs.append(job)
    var a = Session.new()
    var b = Session.new()
    a.configure(jobs)
    b.configure(jobs)
    check(a.definitions["J1"] == b.definitions["J1"], "definition Resource shared by two consumers")
    check(a.pickup("missing", "depot") == "unknown_job", "unknown job rejected")
    check(a.pickup("J1", "clinic") == "wrong_pickup", "wrong pickup rejected")
    for id in ["J1", "J2", "J3"]:
        check(a.pickup(id, "depot") == "picked_up", "pickup " + id)
    check(a.pickup("J4", "depot") == "capacity_full" and a.inventory.size() == 3 and a.states["J4"] == "available", "capacity overflow leaves state unchanged")
    check(a.pickup("J1", "depot") == "not_available" and a.inventory.size() == 3, "duplicate pickup rejected")
    check(b.inventory.is_empty() and b.points == 0 and b.states["J1"] == "available", "second runtime inventory isolated after first mutates")
    check(a.dropoff("J1", "clinic") == "wrong_destination" and a.points == 0 and a.inventory.size() == 3 and a.states["J1"] == "carried", "wrong destination has no state or reward effect")
    check(a.dropoff("J1", "bakery") == "delivered" and a.points == 10 and a.inventory.size() == 2, "valid delivery releases capacity and rewards")
    check(a.dropoff("J1", "bakery") == "not_carried" and a.points == 10, "double reward rejected")
    check(a.pickup("J4", "depot") == "picked_up", "freed capacity reusable")
    for id in ["J2", "J3", "J4"]:
        check(a.dropoff(id, a.definitions[id].destination_id) == "delivered", "complete " + id)
    check(a.points == 40 and a.inventory.is_empty(), "four jobs yield exactly 40 points")
    check(jobs[0].job_id == "J1" and jobs[0].reward == 10 and not jobs[0].get_property_list().any(func(p): return p.name == "delivered"), "definition retains static fields without runtime delivery state")
    check(b.pickup("J1", "depot") == "picked_up" and a.states["J1"] == "delivered", "other session can independently carry same definition")
    var reset_session = Session.new()
    reset_session.configure(jobs)
    check(reset_session.points == 0 and reset_session.inventory.is_empty() and reset_session.states["J1"] == "available", "new session reset independent")
    var boundary = Boundary.new()
    boundary.session = reset_session
    add_child(boundary)
    action("interact", true)
    await get_tree().process_frame
    await get_tree().process_frame
    check(boundary.accepted_count == 1 and reset_session.inventory.has("J1"), "synthetic input traverses actual unhandled boundary")
    boundary.selected_job = "J2"
    action("pause", true)
    await get_tree().process_frame
    await get_tree().process_frame
    check(get_tree().paused, "pause action traverses always-active input owner")
    action("interact", true)
    await get_tree().process_frame
    await get_tree().process_frame
    check(boundary.accepted_count == 1 and not reset_session.inventory.has("J2"), "paused interaction rejected")
    action("pause", false)
    action("pause", true)
    await get_tree().process_frame
    await get_tree().process_frame
    check(not get_tree().paused, "same owner resumes while tree paused")
    action("interact", true)
    await get_tree().process_frame
    await get_tree().process_frame
    check(boundary.accepted_count == 1, "held/stale press on resume rejected")
    action("interact", false)
    action("interact", true)
    await get_tree().process_frame
    await get_tree().process_frame
    check(boundary.accepted_count == 2 and reset_session.inventory.has("J2"), "release then fresh press works after resume")
    action("interact", true)
    await get_tree().process_frame
    await get_tree().process_frame
    check(boundary.accepted_count == 2, "repeat without release cannot apply action twice")
    print("FORWARD_TEST_COMPLETE assertions=", assertions, " failures=", failures)
    get_tree().quit(0 if failures == 0 else 1)
