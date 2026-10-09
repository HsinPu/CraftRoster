---
name: video-edit
description: Local video editing workflow for trimming, concatenating, resizing, compressing, converting, extracting audio, and inspecting media files with tools such as ffmpeg. Use when editing existing videos or preparing clips for sharing, social platforms, documentation, or downstream video generation.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Video Edit

Use this skill when the task is to modify an existing video file.

## Workflow

1. Identify the source file, target output, required format, and quality constraints; for a larger production, load the approved edit plan, shot list, asset manifest, and latest review report first.
2. Decide whether the edit is trim, concat, resize, crop, compress, convert, overlay, or audio extraction.
3. Preserve the original file and write the result to a new versioned output path.
4. Verify duration, resolution, codec, audio track, file size, captions, requested edit points, and platform constraints after export.
5. Return the command or edit revision, input and output versions, evidence, and any timecoded defects or unresolved notes to the review-report owner; update that artifact only when explicitly assigned its write ownership.

## Rules

- Prefer lossless or stream-copy operations when only cutting or remuxing.
- Re-encode only when changing codec, resolution, speed, overlays, or filters.
- Keep platform constraints explicit, such as aspect ratio, max file size, and duration.
- Do not treat a technically valid export as final creative approval; keep review and delivery gates distinct.
- Do not use this skill for generating new animated videos from code; use `remotion-video-toolkit`.

## Handoff

- For a complete governed production, use `video-production-workflow`; return versioned outputs and verification evidence without overwriting accepted source media or renders.
- For vlog edit structure, B-roll planning, titles, thumbnails, and platform packaging, use `vlog-production`.
- For programmatic video generation, use `remotion-video-toolkit`.
- For speech-to-text from media, use `audio-transcription`; this Skill may first extract or normalize the audio.
- For summarizing accessible source text or an existing transcript, use `summary-ops`.
- For command execution and evidence, use `terminal-ops`.
