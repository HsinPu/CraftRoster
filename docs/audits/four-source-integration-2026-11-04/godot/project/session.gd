extends RefCounted
const CAPACITY := 3
var definitions: Dictionary = {}
var states: Dictionary = {}
var inventory: Array[String] = []
var points: int = 0

func configure(jobs: Array) -> void:
    definitions.clear()
    states.clear()
    inventory.clear()
    points = 0
    for job in jobs:
        definitions[job.job_id] = job
        states[job.job_id] = "available"

func pickup(job_id: String, location: String) -> String:
    if not definitions.has(job_id):
        return "unknown_job"
    if states[job_id] != "available":
        return "not_available"
    if location != definitions[job_id].pickup_id:
        return "wrong_pickup"
    if inventory.size() >= CAPACITY:
        return "capacity_full"
    inventory.append(job_id)
    states[job_id] = "carried"
    return "picked_up"

func dropoff(job_id: String, location: String) -> String:
    if not definitions.has(job_id):
        return "unknown_job"
    if states[job_id] != "carried" or not inventory.has(job_id):
        return "not_carried"
    if location != definitions[job_id].destination_id:
        return "wrong_destination"
    inventory.erase(job_id)
    states[job_id] = "delivered"
    points += definitions[job_id].reward
    return "delivered"
