---
name: ai-image-prompts-skill
description: Adapt supplied or already chosen image prompt patterns into reusable variants across image generators. Use when the user wants to reuse a prompt structure, explore style variants, or improve an existing pattern; use ai-image-prompt-design when a visual brief needs a new complete prompt.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# AI Image Prompts Skill

Use this skill when the task is to adapt an existing image-generation prompt or reusable pattern. This package does not bundle an offline prompt library. Work from supplied patterns, examples already available in the conversation, or a pattern whose source can be identified; if none is available and a full prompt must be designed from a brief, use `ai-image-prompt-design` instead.

## Workflow

1. Identify the image intent, subject, medium, style, camera language, and mood.
2. Pick one or more prompt patterns that match the desired output.
3. Adapt the pattern to the user's constraints instead of copying it blindly.
4. Produce concise variants for exploration, refinement, or A/B comparison.

## Rules

- Prefer reusable prompt structures over one-off decorative wording.
- Keep model-specific syntax separate from general visual direction.
- Include negative prompts only when the generator supports them or they are useful.
- Avoid prompt bloat; each phrase should affect the visible result.

## Handoff

- For visual prompt design from scratch, use `ai-image-prompt-design`.
- For direct image generation, use `baoyu-image-gen`.
- For Stable Diffusion-specific parameters, use `stable-diffusion-image-generation`.
