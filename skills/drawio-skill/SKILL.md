---
name: drawio-skill
description: Diagram generation workflow for turning text or rough ideas into draw.io diagrams and exportable visual assets. Use when a flowchart, architecture diagram, or visual explanation needs to be created or updated.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Draw.io Skill

Use this skill to create or update diagrams.

## Workflow

1. Identify the diagram type and its audience.
2. Keep nodes, edges, and labels minimal and readable.
3. Preserve the meaning before polishing the layout.
4. Write an editable `.drawio` file containing draw.io XML; retain it alongside any requested export. If the task is only a text plan, label that output as a plan rather than an editable diagram.
5. For PNG, SVG, or PDF delivery, identify an available draw.io-compatible application, CLI, or renderer and verify its supported export options before using it. The Skill package supplies instructions, not that runtime; do not invent export commands or install a renderer automatically.
6. Verify the exported diagram is legible at the target size. If no compatible renderer is available, deliver the editable source and record the export and visual check as unavailable; do not claim the requested rendered format is complete.

## Rules

- Prefer simple, explicit structure over decorative complexity.
- Keep labels short.
- Preserve editing flexibility when possible.

## Handoff

- For document-heavy presentation work, use `presentation-ops`.
- For Markdown-to-doc conversion, use `word-document-ops`.
