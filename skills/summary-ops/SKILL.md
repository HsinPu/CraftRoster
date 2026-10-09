---
name: summary-ops
description: Summarize supplied text, accessible pages, local text files, or an existing transcript into faithful concise notes. Use for source summaries and quick triage; raw audio or video speech-to-text belongs to audio-transcription before summarization.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Summary Ops

Use this skill when the goal is to compress long content into usable notes.

## When To Use

- Summarize articles, pages, existing transcripts, or long text files
- Extract accessible page text or use a supplied transcript before compressing it
- Produce short notes for research triage or review
- Convert long content into a machine-readable summary when needed

## Workflow

1. Identify the available text and whether the user wants a summary or extract-only output. An existing transcript is sufficient input; a summary-only task needs no transcription companion.
2. Read the supplied text, accessible page, or existing transcript and preserve its source locator. Do not fetch a different source merely because a URL is available.
3. If only raw audio or video speech is available, use `audio-transcription` with an available local or API engine; retain its timestamps, uncertain segments, and source evidence before summarizing. If that extraction path is unavailable, report the missing prerequisite instead of inventing a transcript.
4. Keep the summary short, factual, and faithful to the available text. Identify any transcript limitations that affect it.
5. If the task needs deep research or cross-source reading, hand off to `web-research-ops`.

## Rules

- Preserve names, numbers, and quoted claims carefully.
- Do not invent missing context.
- Distinguish summary from transcript.

## Quality Gate

- The output is concise and source-faithful.
- Key points, names, and numbers survive compression.
- The user can tell what was summarized and what was extracted.

## Handoff

- For speech-to-text from raw audio or video, use `audio-transcription`; this branch is needed only when no usable transcript is available.
- For cross-source web research, use `web-research-ops`.
- For channel-specific derivatives from an approved source rather than a simple summary, use `content-repurposing`.
- For faithful document-to-Markdown conversion, use `document-to-markdown`.
- For Markdown cleanup after extraction or summarization, use `markdown-writer`.
