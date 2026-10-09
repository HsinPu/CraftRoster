---
name: threejs-physics-audio
description: "Compatibility router for combined or legacy Three.js physics-and-audio requests. Use when a request explicitly couples collision or simulation events with positional sound, or still names the former combined boundary; route physics-only work to threejs-physics-simulation and audio-only work to threejs-spatial-audio."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Three.js Physics and Audio Compatibility Route

Preserve the former combined entry point while assigning simulation and audio to independent owners.

Installed alone, this Skill selects owners and defines their event contract; it does not implement both systems. Implementation needs only the selected physics or audio specialist, and needs both when simulation events drive synchronized sound. If a selected specialist is unavailable, identify the missing package and leave its implementation pending while completing the independent routing contract.

## Routing

1. Use `threejs-physics-simulation` for bodies, colliders, triggers, joints, character controllers, fixed timesteps, workers, contacts, and transform synchronization.
2. Use `threejs-spatial-audio` for listener ownership, positional sources, attenuation, HRTF, zones, mixing, autoplay restrictions, captions, and audio lifecycle.
3. Use both only when authoritative simulation or gameplay events produce synchronized sound.
4. Define a typed event boundary carrying semantic cue identity, position, intensity, material or surface, source ID, simulation tick, and deduplication key.
5. Let audio consume events without becoming simulation authority or delaying the physics step.

## Rules

- Do not place physics-engine and Web Audio lifecycle in one monolithic service.
- Do not trigger duplicate cues from predicted, reconciled, replayed, and confirmed contacts without an explicit policy.
- Keep simulation time, render interpolation, and audio scheduling distinguishable.
- Preserve this Skill for compatibility; make the two focused Skills primary in new architecture.

## Evidence

Return the selected route, event contract, timing and deduplication policy, physics and audio owners, activation behavior, synchronization tests, and independent teardown proof.
