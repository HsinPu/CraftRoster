---
name: self-improvement
description: Capture actionable lessons from recurring failures, verified improvements, or lasting user preferences. Use when a lesson can improve future decisions; separate task-local observations from authorized project memory. A single command failure or one-time correction does not automatically require a persistent entry.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Self-Improvement

Use this skill to capture repeatable lessons and mistakes.

## Workflow

1. Decide whether the observation changes a current or recurring decision. Normal control flow, such as `rg` returning no matches, is not a tool failure.
2. Keep necessary observations in task-local notes first. Distinguish the observed event, suspected cause, and verified lesson; a single timeout does not establish a general rule.
3. Before promotion, confirm reproducible evidence or an explicit lasting user preference, define its scope and exceptions, and check existing entries for duplication or supersession.
4. Persist only through the project's established memory mechanism within the authorized write scope. A read-only task remains read-only; report a useful candidate lesson without creating a memory file.
5. Record the lesson's evidence, applicable condition, and recheck trigger so later work can revise stale guidance.

## Rules

- Keep entries specific and searchable; do not manufacture a note for every command or correction.
- Keep secrets, personal data, raw credentials, and unnecessary private logs out of memory.
- Separate temporary observations, verified lessons, feature requests, and lasting preferences.
- Link or update an existing lesson rather than accumulating contradictory rules. Task-specific choices do not become universal constraints.

## Handoff

- For general repo memory patterns, context pruning, or reusable lessons, use `context-governance`.
- For a measurable idea that still needs repeated controlled experiments, use `autoresearch` before promoting it as a durable lesson.
- For code changes driven by the learning, use `code-refactoring` or the relevant stack skill.
