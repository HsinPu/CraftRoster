---
name: context-governance
description: Context and lessons governance workflow for managing agent memory, context budget, and skill navigation. Use when a workflow needs to keep notes, prune repetition, or maintain reusable project memory.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Context Governance

Use this skill to keep agent work focused and reusable.

## Workflow

1. Keep only notes that change a decision; distinguish temporary task state from a durable lesson.
2. Drop repeated context that no longer changes the decision.
3. Separate memory, task notes, and final deliverables.
4. Review nearby skills before inventing a new pattern.
5. Promote a lesson only after checking its evidence, scope, exceptions, and existing entries. Prefer a small number of clear memory entries over long narratives.

## Rules

- Keep context short and searchable.
- Persist reusable guidance only when reproducible evidence or an explicit lasting preference supports it, using the existing memory mechanism within authorized write scope. Honor read-only requests and keep secrets and unnecessary private data out of entries.
- Record the applicable condition and recheck trigger; one incident or task-specific preference is not a permanent rule.
- Avoid duplicating the same lesson in multiple places.

## Handoff

- For task-level learning logs, use `self-improvement`.
- For multi-step planning or execution tracking, use `todo-first`.
- For a compact, evidence-linked continuation record across sessions or tools, use `session-handoff`.
