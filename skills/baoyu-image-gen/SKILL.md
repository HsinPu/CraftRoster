---
name: baoyu-image-gen
description: General AI image generation workflow for creating images from text prompts with provider-backed APIs such as OpenAI, Google, and DashScope. Use when the user asks to generate, create, draw, or produce images from text, with optional reference images, aspect ratios, or multiple output variants.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Baoyu Image Gen

Use this skill when the user wants an image generated from text.

## Workflow

1. Clarify the subject, style, composition, aspect ratio, and output count.
2. Convert vague intent into a concrete prompt with visible details.
3. Include reference-image, palette, lighting, and negative constraints only when useful.
4. Generate sequentially by default; use parallel variants only when comparison matters.
5. Review outputs against the original intent and refine the prompt if needed.

## Rules

- Keep generation prompts specific but not overloaded.
- Ask for missing style or aspect ratio only when it affects the result.
- Separate prompt design from API/provider troubleshooting.
- Preserve user-provided brand, character, or product constraints exactly.

## Handoff

- For prompt craft and visual direction, use `ai-image-prompt-design`.
- For adapting a supplied or already chosen prompt pattern into variants, use `ai-image-prompts-skill`; that package does not bundle an offline prompt library.
- For deterministic post-processing, use `image-utils`.
