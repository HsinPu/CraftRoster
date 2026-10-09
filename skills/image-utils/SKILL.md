---
name: image-utils
description: Deterministic image post-processing for resizing, cropping, compositing, format conversion, optimization, watermarks, and predictable pixel-level edits. Keep simple single-image operations here. For UI design-image or screenshot requests that require multiple independent cut-out assets, transparency, 2x/3x/4x density, bounding boxes, or a manifest, also load image-to-code-assets.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Image Utils

Use this skill when the task is to post-process an existing image file.

## Workflow

1. Identify the source image, target dimensions, format, compression, and destination.
2. Choose the smallest deterministic operation: resize, crop, convert, composite, watermark, or optimize.
3. Preserve the original file and write the result to a new path.
4. Verify dimensions, file size, transparency, color mode, and visual quality.

## Rules

- Do not use generative editing when deterministic image operations are enough.
- Keep aspect ratio, transparency, and compression constraints explicit.
- Prefer batch-safe operations for repeated asset preparation.
- Preserve originals unless the user explicitly requests overwrite.

## Handoff

- For generating new images, use `baoyu-image-gen`.
- For image prompt design, use `ai-image-prompt-design`.
- Load `image-to-code-assets` only for multiple independent UI cut-outs requiring transparency, density exports, source bounds, or a manifest; this Skill performs the deterministic pixel operations while that companion owns the asset contract. A single-image resize or crop remains independent. If the companion is missing, preserve completed pixel outputs and report the asset-contract stage as unavailable.
- For command execution evidence, use `terminal-ops`.
