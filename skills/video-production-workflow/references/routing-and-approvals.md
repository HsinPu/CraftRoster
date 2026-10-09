# Video Production Routing and Approvals

## Contents

- Team sizing
- Role boundaries
- Delegation contract
- Approval matrix
- Sequential fallback

## Team Sizing

| Production shape | Recommended team |
|---|---|
| Simple clip, existing script, or deterministic template | Video director using relevant Skills |
| Typical short or explainer | Video director, screenwriter when needed, storyboard artist |
| Long-form, multi-scene, recurring characters, or paid generation | Video director, video producer, screenwriter, storyboard artist, continuity supervisor |
| Stock-, archive-, or existing-library-heavy production | Add media library researcher before acquisition; producer retains rights and asset-manifest ownership |
| Live-action or performance-led production | Add casting director and location manager during preparation; add first assistant director, script supervisor, production sound mixer, and media ingest manager when crew, coverage, capture, or source-custody complexity justifies them |
| Environment-, wardrobe-, prop-, or brand-world-heavy production | Add production designer |
| Camera-, lighting-, capture-, or renderer-critical production | Add cinematographer |
| Multi-source, revision-heavy, long-form, or delivery-critical edit | Add video editor |
| Dialogue-, music-, ambience-, effects-, or mix-critical production | Add sound designer |
| Music-led, multi-cue, custom-composed, generated, or rights-sensitive production | Add music supervisor; keep sound integration with sound designer |
| Tracking-, keying-, cleanup-, simulation-, CG-, or composite-heavy shots | Add VFX supervisor |
| Title-, typography-, diagram-, chart-, UI-, or brand-animation-heavy production | Add motion-graphics designer |
| Color-managed, look-critical, HDR or multi-display finishing | Add colorist after conform and picture lock |
| Multiple destinations, technical variants, or formal master-QC requirements | Add delivery mastering specialist after picture, sound, color, caption, and effects lock |
| Multiple locales, dubbing, translated graphics, or language-specific metadata | Add audiovisual localization producer and qualified locale reviewers |
| Captions plus transcripts, audio description, sign-language, sensory-safe alternatives, or accessible playback requirements | Add media accessibility producer from brief or script stage rather than waiting for delivery |
| Brand campaign or cross-medium creative system | Add creative director above the video-specific team |

Select roles from current runtime descriptions. Missing optional roles must not block sequential execution.

## Role Boundaries

- **Creative director** owns cross-medium creative principles and visual-quality direction.
- **Video director** owns the video's creative interpretation, team routing, revision arbitration, and final creative recommendation.
- **Video producer** owns feasibility, schedule, budget, providers, rights, assets, approvals, and restartable state.
- **Media library researcher** owns attributable, technically eligible, rights-aware production-asset candidates and a current shortlist; the producer owns acquisition, clearance, spend, and `assets/manifest.md`.
- **Casting director** owns the role breakdown, authorized candidate evidence, fair evaluation rubric, shortlist, and consent or rights state; accountable humans own final selection, employment, contracting, and likeness authorization.
- **Location manager** owns real-world site requirements, candidate and recce evidence, access, permit, logistics, condition, and restoration readiness; production design owns generated environments and qualified humans own specialist safety decisions.
- **Screenwriter** owns the script's narrative structure, scenes, visible action, dialogue, and voiceover.
- **Storyboard artist** owns narrative shot decomposition, composition, blocking, screen direction, transitions, and provisional camera or movement intent.
- **Production designer** owns the baseline producible visual world, environment, set, prop, wardrobe, material, signage, and asset-design specifications.
- **Cinematographer** turns the approved shot intent into executable camera, lens, movement, focus, lighting, exposure, capture or render specifications and visual-technical review.
- **First assistant director** owns shooting order, call packages, department readiness, coverage progress, deviations, and daily production records; creative, financial, labor, and live safety authority remain with their accountable owners.
- **Script supervisor** owns take-level script, dialogue, action, timing, slate, approved deviation, and captured-coverage evidence; the continuity supervisor owns the visual-state baseline and the editor owns selection and cut decisions.
- **Production sound mixer** owns production-audio acquisition planning, take metadata, sync and quality evidence, and handoff; the sound designer owns post-production design, cleanup, stems, mix, and loudness.
- **Media ingest manager** owns source custody, verified copies, checksums, proxy and dailies lineage, quarantine, and handoff receipts; the producer, editor, colorist, sound designer, and mastering specialist retain their respective decisions.
- **Continuity supervisor** owns the continuity baseline and audits planned and generated material against it.
- **VFX supervisor** owns the shot-effects breakdown, plates and camera-data requirements, compositing dependencies, version review, provenance, and final-pixel evidence; camera execution and visual-world design remain upstream.
- **Motion-graphics designer** owns visible informational and brand graphics, animated typography, reusable motion components, graphics variants, and render contracts; edit structure and integrated VFX remain separate.
- **Music supervisor** owns the music brief, spotting, sourcing or commission route, candidate and version decisions, beat structure, and clearance evidence; the sound designer owns integration and mix.
- **Sound designer** owns the sonic plan, cue sheet, sound assets, stem strategy, picture-aware mix requirements, and sound QC evidence.
- **Video editor** owns source-to-timeline decisions, edit structure, selects, cut versions, audiovisual assembly, revision evidence, and picture lock; approved specialist outputs are placed rather than silently redesigned.
- **Colorist** owns post-conform color management, look execution, shot matching, target trims, and color-finishing evidence; capture intent, design palette, and edit timing remain upstream.
- **Audiovisual localization producer** owns locale matrices, context kits, version mappings, rights, and qualified linguistic review; translators, performers, sound, motion, accessibility, and mastering owners retain their specialist work.
- **Media accessibility producer** owns the accessible-media requirement matrix, acceptance criteria, qualified review evidence, exceptions, accepted-asset references, and delivery mappings; specialist Skills or qualified providers create the alternative assets, interface accessibility remains with the accessibility expert, and same-language caption mechanics remain with the subtitle and caption Skill.
- **Delivery mastering specialist** owns locked-source technical masters, variants, transforms, manifests, checksums, and conformance evidence; this role never recuts, regrades, remixes, rewrites, uploads, or publishes.

Do not merge two roles merely to reduce message count when their decisions could conflict. Do not create a separate role when a scoped Skill and one artifact owner are enough.

## Delegation Contract

Provide each delegated role:

```text
Objective:
Approved inputs and versions:
Owned artifact:
Read-only dependencies:
Decisions the role may make:
Decisions requiring approval:
Acceptance criteria:
Required evidence:
Stop conditions:
```

The video director validates the artifact contract. The video producer validates operational readiness, rights, cost, and checkpoint state. Neither validation replaces the accountable approval owner.

## Approval Matrix

| Gate | Required artifact or evidence | Default decision owner |
|---|---|---|
| Direction | `brief.md`, `creative-treatment.md`, alternatives and tradeoffs | User or accountable creative owner |
| Narrative | Approved `script.md`, runtime estimate, unresolved claims or rights | User or content owner |
| Production lock | Storyboard, shot list, applicable casting, location, production-design, camera-lighting, production-sound, sound, music, VFX, motion-graphics, continuity, shooting, ingest and production plans, cost range, qualified-human safety routes | User or production owner |
| Consequential generation | Provider, model, inputs, data handling, rights, estimated cost, sample or batch | User or budget and rights owner |
| Substitution | Failure evidence, alternatives, cost, quality, privacy, rights, schedule impact | Owner of the affected constraint |
| Picture lock | Approved edit-plan version, cut review, downstream VFX, graphics, sound, music, color, caption, and delivery handoffs | User or accountable creative owner |
| Music commitment | Approved cues and versions, rights evidence, cost, territories, media, term, restrictions, unresolved legal review | User or budget and rights owner |
| Finishing lock | Approved picture, VFX, graphics, music, sound, color, caption, rights, and specialist review evidence | User or accountable creative owner |
| Locale and accessibility lock | Approved source version, locale manifest, qualified linguistic review, accessibility plan, alternative assets, player evidence, exceptions, and exact downstream mappings | User or accountable content and accessibility owner |
| Technical delivery | Review report, delivery manifest, source lineage, checksums, variant QC, accepted exceptions, chosen masters | User or release owner |

Stop the turn at a required human gate unless the current project state records explicit authorization covering that exact gate.

## Sequential Fallback

When delegation is unavailable:

1. Keep one current stage and one canonical artifact owner identity: `sequential-runner`.
2. Verify the selected Agent, Skill, or tool capability and load only the Skills needed for the unresolved stage. If a required producer is missing, name that stage and its minimum companion requirement; keep dependent work blocked while continuing independent eligible work.
3. Reuse an accepted artifact only when its version or hash, approved input lineage, constraints, rights, acceptance evidence, and approval scope match the current project. Otherwise complete and validate the artifact before advancing. Record reuse rather than rerunning a valid producer.
4. Record the same gates, evidence, versions, costs, and rights used in multi-agent mode.
5. Ask for specialist review only when the risk or acceptance criteria require expertise not available in the current runtime.

Sequential execution changes who performs the work, not the workflow contract or approval standard.
