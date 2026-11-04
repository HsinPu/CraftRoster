---
name: game-design
description: "Design or review game concepts, vision, GDDs, mechanics, progression, economies, levels and encounters; plan playtests and give rubric-based teaching feedback. Use for player-facing design decisions across engines."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "setcodes/gamedev-skills"
  reference-license: "MIT"
  reference-revision: "096c224aa498a789fa99d476583029fcb9f538e1"
---

# Game Design

Convert the requested player experience into decisions, coherent rules and an observable way to evaluate them. Preserve the chosen genre, audience, platform and production ambition. The task determines whether to critique, explore, write, revise, specify or teach: an authorized document rewrite is writing work; a request for findings remains a review. Engine implementation is a separate scope, not forbidden when the user also requests it.

Read the supplied brief, current project instructions and relevant approved design records. Identify the artifact's reader, current milestone and authoritative definitions; a course's Concept/Vision definitions outrank a generic industry template. Keep approved facts, observed evidence, new proposals and uncertain assumptions distinguishable. Routine reversible choices can proceed with stated assumptions; resolve only missing decisions that materially change the result.

Choose the relevant resource instead of loading the full library:

| Requested work | Read |
| --- | --- |
| Concept, Vision, GDD, pitch or feature document | [Documents and design decisions](references/documents.md) |
| Mechanic, combat, stateful ability or interactions | [Systems and rules](references/systems.md) |
| Unlocks, mastery, currencies, rewards or balance model | [Progression and economy](references/progression-economy.md) |
| Level layout, encounter, onboarding or procedural content | [Levels and encounters](references/levels-encounters.md) |
| Prototype question, playtest plan or actual observations | [Playtesting and iteration](references/playtesting.md) |
| Student submission, assessment or mentoring | [Teaching feedback](references/teaching-feedback.md) |

Start from a concrete moment of play: what information is available, what the player can do, what makes the options different and how consequences become understandable. For expressive, narrative or contemplative games, use their intended experience; do not manufacture a combat loop or currency system. Pick the smallest useful artifact for the request rather than generating an entire document suite.

For a review, cite the supplied passage or observation, explain its consequence and give a correction or discriminating test. For a spec, provide starting state, action, result and affected failure/cancellation cases, with tuning units and unresolved dependencies. A numerical model establishes internal consistency under its assumptions; a playtest plan establishes no player outcomes. Never invent market evidence, completed tests, fun or balance claims.

This package works independently with supplied documents. Optional handoffs, when the requested work needs them and they are available: `godot-development` for Godot implementation, `blender-development` for asset production. Pass exact accepted rules, scale/camera requirements, relevant states and acceptance scenarios; a handoff does not install or activate another package. Do not infer an engine from asset tools.

Deliver the requested artifact in the user's language, identify material assumptions and give the next decision or test that resolves remaining uncertainty. [Evaluation cases](evals/evals.json) are assessment definitions, not executed model results. [Source provenance and the full MIT notice](references/upstream-notice.md) accompany this original adaptation.
