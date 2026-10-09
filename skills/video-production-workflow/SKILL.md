---
name: video-production-workflow
description: Approval-gated, tool-neutral workflow for taking a video from brief or source material through treatment, script, storyboard, continuity, production planning, asset creation, edit, review, and delivery. Use when coordinating a complete video project across Agents and media Skills, or when one agent must execute the same stages sequentially with restartable artifacts.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "calesthio/OpenMontage"
  reference-license: "AGPL-3.0"
  reference-revision: "f8d94632ea9bd0057da31904acca1cefecf005dd"
---

# Video Production Workflow

Use this skill to coordinate a complete video production without assuming a specific model, provider, editor, or agent runtime.

## Start Here

1. Identify the entry mode: idea, approved script, source footage, adaptation material, or revision of an existing project.
2. Confirm purpose, audience, platform, duration, aspect ratio, language, accessibility needs, deadline, budget authority, rights, and approval owner.
3. Create or resume `video-projects/<project-id>/`; for a new project, copy [assets/project-template](assets/project-template) into that directory, then load `project-state.md` before performing stage work.
4. Discover available Agents, Skills, tools, and providers. Never claim a capability from a name alone.
5. Choose the smallest execution mode that satisfies the brief.

Before starting an unresolved stage, verify its selected Agent, Skill, or tool owner and input/output contract. Reuse an accepted artifact only when its version or content hash, approved input lineage, project constraints, rights, acceptance evidence, and approval scope still match the current project. Record that reuse in `project-state.md`; an existing file alone is not acceptance evidence. If a required stage producer is unavailable, report the bounded stage and its smallest missing companion or runtime requirement, continue independent eligible work, and keep dependent work blocked. Do not install the full media category or redo accepted stages merely to fill a role.

## Execution Modes

### Director-led multi-agent

- Keep `video-director` accountable for creative direction, gates, revision arbitration, and final review.
- Use `video-producer` for schedule, budget, assets, rights, provider planning, and checkpoint state.
- Delegate media research, casting, locations, script, storyboard, production design, camera and lighting, assistant direction, script supervision, production sound, ingest, continuity, music, VFX, motion graphics, edit, sound, color, localization, accessibility, and mastering artifacts only to suitable discovered Agents.
- Give one owner exclusive write authority for each canonical artifact at a time.
- Validate every handoff before starting dependent work.

### Sequential fallback

- When custom Agents or subagents are unavailable, keep one agent in control and execute the same stages in order.
- Load only the selected Skill for an unresolved stage when its required producer is available; accepted matching artifacts need no producer rerun. A missing optional Agent does not block a capable sequential owner, while a missing required stage capability must be recorded as a bounded blocker.
- Write the same canonical artifacts, approvals, decisions, and checkpoints used by the multi-agent mode.
- Stop at every required gate; fallback mode does not reduce approval requirements.

## Production Stages

1. **Intake, research, and media sourcing**: verify inputs, rights, audience, constraints, references, existing media, candidate asset needs, success criteria, and unknowns; produce `brief.md` and `media-library-shortlist.md` when production assets require dedicated research.
2. **Creative treatment**: define story approach, visual language, pacing, sound direction, reference principles, exclusions, and feasibility; produce `creative-treatment.md`.
3. **Script**: create or adapt the approved narrative, scenes, action, dialogue, voiceover, and timing; produce `script.md`.
4. **Storyboard, casting, location, and shot plan**: translate the script into scenes, shots, framing, camera, motion, audio, duration, assets, performers, real-world sites, and transitions; produce `storyboard.md`, `shot-list.md`, `casting-dossier.md`, and `location-dossier.md` as applicable.
5. **Visual world, camera, sound, continuity, effects, graphics, music, shooting, ingest readiness, and production plan**: translate the approved direction into producible environments, sets, props, wardrobe, materials, camera, lighting, production-audio capture, render requirements, sound cues and stems, VFX dependencies, motion graphics, music strategy, continuity, shooting order, pre-capture storage and independent-copy readiness, schedule, budget, rights, providers, and assets; produce `production-design-bible.md`, `camera-lighting-plan.md`, `production-sound-report.md`, `sound-plan.md`, `vfx-plan.md`, `motion-graphics-plan.md`, `music-plan.md`, `continuity-bible.md`, `shooting-plan.md`, a readiness-initialized `media-ingest-ledger.md`, `production-plan.md`, and `assets/manifest.md` as applicable.
6. **Capture, asset production, take logging, and ingest**: generate, source, record, or prepare approved visual, video, voice, music, sound, caption, and graphic assets; record actual coverage in `take-log.md`, maintain production-audio evidence in `production-sound-report.md`, execute and update the approved readiness plan in `media-ingest-ledger.md` to preserve source custody, and update the producer-owned asset manifest after every accepted version.
7. **Edit and picture lock**: assemble picture, provisional motion, dialogue, music, sound, captions, graphics, transitions, and timing through the available edit or code-generated workflow; produce `edit-plan.md`, edit-decision evidence, versioned cuts, and an approved picture-lock candidate before dependent finishing.
8. **VFX, graphics, sound, music, color, localization, and accessibility finishing**: complete and verify final-pixel effects, approved graphics, music integration, sound mix, conform, grade, target trims, language versions, captions, transcripts, audio description, and other approved accessible alternatives against the locked cut; update specialist plans and produce `color-finishing-plan.md`, `localization-manifest.md`, `accessibility-plan.md`, versioned stems, graphics, effects, language assets, and finishing masters as applicable.
9. **Review, mastering, and delivery**: inspect narrative clarity, continuity, rights, accessibility, locale approval, picture, color, audio, captions, technical conformance, and destination requirements; produce `review-report.md`, `delivery-manifest.md`, and approved deliverables without treating technical mastering as publication authority.

## Checkpoints

Use these stage states in `project-state.md`:

- `queued`: prerequisites are not yet verified.
- `active`: one owner is performing the stage.
- `awaiting-approval`: the artifact is reviewable and no dependent work may start.
- `blocked`: a named prerequisite, capability, right, or decision is missing.
- `verified`: the artifact and acceptance evidence passed the stage gate.

On every transition, record the owner, artifact version, evidence, decisions, cost to date when relevant, next eligible stage, and safe restart instruction.

## Approval Gates

Require explicit approval for:

- the creative treatment before detailed production planning;
- the script before shot-level planning;
- the storyboard, casting shortlist and human selection, location package, applicable production-design, camera-lighting, production-sound, sound, music, VFX, motion-graphics, continuity, shooting, ingest, and production plans before live capture or batch asset work;
- paid generation, licensed assets, identifiable likeness or voice use, and consequential external calls;
- external talent or location contact, contracting, permit submission, call-sheet distribution, source-media erasure, and any action involving private candidate, location, or production records;
- provider or model substitutions that change cost, rights, privacy, quality, or timing;
- picture lock before dependent color and delivery mastering;
- music commitment and clearance evidence before final mix or delivery;
- qualified linguistic review for every target locale and verified accessibility alternatives before those versions are marked approved;
- finishing lock and technical delivery manifest before final master approval;
- final render selection and any publication or distribution action.

An earlier approval does not silently authorize later gates. Record any explicit full-run authorization with its scope and exclusions.

## Tool and Provider Decisions

- Announce the capability, provider, model or variant, expected cost, input data, rights implications, and whether the call is a sample or batch before consequential execution.
- Prefer a small representative test before expensive or large batch generation.
- Preserve prompts, seeds, settings, source assets, versions, and failure notes needed for reproducibility.
- When an approved path fails, explain the failure and alternatives, recommend one, and wait for approval before substituting a materially different path.

## Artifact Contracts

Read [references/artifact-contracts.md](references/artifact-contracts.md) before creating or accepting project artifacts, and use [assets/project-template](assets/project-template) as the reusable starting set. Read [references/routing-and-approvals.md](references/routing-and-approvals.md) before delegating or deciding which gates apply. Source adaptation notes are recorded in [references/source-notes.md](references/source-notes.md).

## Handoffs

- Use `gallery-researcher` and `web-research-ops` for attributable visual and factual research.
- Use a discovered `media-library-researcher` when the production needs attributable, technically eligible, rights-aware footage, image, audio, stock, or archive candidates; acquisition and `assets/manifest.md` remain with the producer and accountable approvers.
- Use a discovered `casting-director` for casting breakdowns, authorized audition evidence, shortlists, consent and rights state; final selection, employment, contracting, and identifiable likeness decisions remain human-owned.
- Use a discovered `location-manager` for real-world site research, recce evidence, permit and access readiness, logistics, condition records, and restoration handoff; generated environments remain with production design.
- Use `short-video-script` for short social scripts and a discovered `screenwriter` for broader narrative screenplay ownership.
- Use `storyboard-creation` and a discovered `storyboard-artist` for shot-level planning.
- Use a discovered `production-designer` to define environments, sets, props, wardrobe, materials, signage, and asset specifications.
- Use a discovered `cinematographer` to own camera, lens, movement, lighting, exposure, capture, render, and visual-technical planning.
- Use a discovered `first-assistant-director` for shooting order, call packages, department readiness, coverage progress, and daily production reporting when live capture or coordinated crews require it; qualified humans retain live set and safety authority.
- Use a discovered `script-supervisor` for take-level script, dialogue, action, timing, slate, approved deviations, and captured-coverage evidence; the visual continuity supervisor retains the visual-state baseline.
- Use a discovered `production-sound-mixer` for synchronized production dialogue, room tone, wild tracks, take metadata, and acquisition-quality evidence; post-production design and mix remain with the sound designer.
- Use a discovered `media-ingest-manager` for source custody, verified copies, checksums, proxies, dailies lineage, quarantine, and editorial handoff; selection, grading, rights, and delivery mastering remain separate.
- Use a discovered `vfx-supervisor` for shot-effects breakdowns, plate and camera-data requirements, compositing dependencies, version review, and final-pixel evidence.
- Use a discovered `motion-graphics-designer` for titles, lower thirds, callouts, diagrams, charts, interface sequences, kinetic type, reusable components, and graphics render contracts.
- Use `ai-video-prompting` and `ai-video-generation` for generative clips.
- Use `image-generator`, `ai-image-prompt-design`, and `image-utils` for still assets.
- Use a discovered `music-supervisor` when selection, commission or generation routes, beat structure, cue versions, and rights evidence need dedicated ownership; the sound designer still owns integration and mix.
- Use a discovered `sound-designer` with `audio-generation`, `text-to-speech`, and `audio-transcription` for cue planning, sound assets, stems, mix strategy, and sound QC.
- Use `subtitle-captions` only for same-language subtitle or caption authoring, timing, file-format mechanics, and caption QC; do not route audio description, sign-language, clean-audio, or sensory-safe variants through that Skill.
- Use a discovered `video-editor` with `remotion-video-toolkit` for deterministic programmatic composition and `video-edit` for timeline execution, existing-footage edits, versioned cuts, and picture lock.
- Use a discovered `colorist` after conform and picture lock for color management, look execution, shot matching, target trims, and color-finishing QC.
- Use a discovered `audiovisual-localization-producer` for locale matrices, translation context, dubbing or voiceover coordination, on-screen text, metadata, rights, and qualified linguistic review.
- Use a discovered `media-accessibility-producer` from brief or script stage to own requirements, acceptance criteria, qualified review, exceptions, accepted-asset references, and delivery mappings for captions, descriptive transcripts, audio description, sign-language, sensory-safe alternatives, clean audio, or accessible playback. Route actual asset creation to the appropriate writing, caption, audio, video, performer, or qualified accessibility provider; use `accessibility-expert` only for the player or product interface.
- Use a discovered `delivery-mastering-specialist` only for locked productions that need multiple technical masters or complex delivery evidence; publication remains a separately authorized action.

## Rules

- Do not skip stages merely because a tool can produce a video from one prompt.
- Do not create assets before their purpose, shot, continuity requirements, rights, and acceptance criteria are recorded.
- Do not allow generated output to silently redefine the approved script, treatment, product appearance, brand, or continuity baseline.
- Do not begin color finishing or delivery mastering from an unapproved cut, and do not allow technical mastering to become an unrecorded recut, regrade, remix, or caption rewrite.
- Do not let a schedule, generated recommendation, or missing specialist override consent, labor, permit, privacy, accessibility, or safety controls. Stunts, intimacy, weapons, animals, vehicles, water, heights, pyrotechnics, minors, medical response, and comparable high-risk work require qualified human ownership.
- Do not erase source media after ingest, accept a locale without qualified linguistic review, or mark an accessibility alternative complete without evidence from the actual asset and target playback path.
- Preserve source media and accepted artifacts; write revisions and renders as new versions.
- Keep the workflow useful for short, long-form, live-action, animated, AI-generated, and hybrid productions by varying team size rather than changing the contracts.
