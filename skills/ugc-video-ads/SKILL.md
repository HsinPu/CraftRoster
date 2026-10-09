---
name: ugc-video-ads
description: Create UGC-style ad concepts and scripts with hooks, creator personas, product moments, evidence-backed claims, objections, calls to action, and platform-specific shot notes. This Skill can produce those text deliverables independently; a finished video requires the selected generation, storyboard, or editing stages.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# UGC Video Ads

Use this skill when the task is to create a UGC-style ad video concept or script.

Concept and script work is independent. For a requested finished video, select only the production stages still needed after checking accepted scripts and assets: shot planning, avatar or other approved generation, and final editing. The handoffs below are conditional on that selected path; they do not imply that every media Skill must be installed.

## Workflow

1. Capture product, offer, target customer, platform, funnel stage, compliance constraints, and proof points.
2. Identify the core angle: pain point, transformation, review, comparison, demo, objection handling, or founder story.
3. Define creator persona, setting, tone, camera style, and authenticity cues.
4. Write hook, body, product moment, proof, objection answer, and CTA.
5. Add shot notes for B-roll, product close-ups, captions, overlays, and cutaways.
6. Produce variants for different hooks, personas, objections, or platform lengths.

## Rules

- Make the ad feel like a real creator recommendation, not a polished brand manifesto.
- Tie every claim to evidence, demo footage, testimonial, or visible product behavior.
- Keep regulated claims, health claims, finance claims, and before/after claims conservative unless substantiated.
- Avoid fabricating testimonials, reviews, creator identity, or real customer results.
- Optimize for the platform's native style and retention pattern.

## Handoff

- For generic short-form scripts, use `short-video-script`.
- For AI avatar or talking-head generation, use `avatar-video-generation`.
- For shot breakdowns, use `storyboard-creation`.
- For final clip edits, use `video-edit`.
