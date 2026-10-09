---
name: remotion-video-toolkit
description: Programmatic video creation guidance for Remotion and React, covering compositions, timing, animation, captions, audio, rendering, and reusable video templates. Use when creating data-driven videos, product demos, animated explainers, or video generation pipelines with Remotion.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Remotion Video Toolkit

Use this skill when the task is to build videos with code.

## Workflow

1. Define the video goal, duration, aspect ratio, and target platform; when part of a larger production, load the approved edit plan, shot list, asset manifest, and continuity requirements first.
2. Break the video into stable scenes, timing blocks, and reusable compositions that preserve shot and asset IDs.
3. Plan and validate assets for text, images, audio, captions, charts, or screen recordings.
4. Keep animation timing deterministic and easy to preview.
5. Render to a new versioned output instead of overwriting an accepted render.
6. Verify the render output, duration, resolution, codec, audio sync, captions, continuity, and final export format; return structured evidence and timecoded issues to the review-report owner, updating that artifact only when explicitly assigned its write ownership.

## Rules

- Prefer reusable compositions over one-off timelines.
- Keep scene timing explicit; avoid magic frame numbers without names.
- Treat audio, captions, and visual transitions as first-class timeline elements.
- Use data-driven templates when the video will be regenerated with new inputs.
- Preserve the mapping from approved shots and assets to compositions so a changed dependency can invalidate only the affected renders.
- Do not use Remotion for simple trim/resize/convert tasks; use `video-edit` instead.

## Handoff

- For a complete governed production, use `video-production-workflow`; return the versioned render, render settings, source revision, and review evidence to the project artifact set.
- For local video trimming, compression, and conversion, use `video-edit`.
- Keep frame-driven composition structure and render timing in this Skill. Use `react-ui-patterns` or `frontend-design` only when the work also includes a browser player or product interface that needs React or visible-UI guidance.
- Use `animation-best-practices` only for browser UI motion and interaction timing in that interface; a video-only composition does not require the frontend baseline.
