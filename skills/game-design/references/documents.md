# Documents and design decisions

## Find the document's job

Before editing, identify what this reader needs to decide: whether to pursue the idea, whether a feature fits the vision, what to implement, or what to test. Reuse supplied headings and vocabulary. Treat a brief's approved constraints as constraints; do not fill a gap by claiming an unapproved design is final.

When exploring a concept, describe the player role, the recurring activity or expressive possibility, the meaningful tension and the reason the intended audience might care. Demonstrate the hook with an example: the player observes something, makes a choice and experiences a consequence. A list of genres or features cannot substitute for this example. References should explain the specific aspect being borrowed or contrasted; they do not establish originality or market demand.

Compare alternatives only when they change the experience or major uncertainty. For each candidate, state the player benefit, dependency and cheapest informative test. Recommend based on the supplied goals and constraints. Do not discard the user's scope merely to fit an arbitrary project duration or solo-developer budget.

## Concept branch

Produce a readable explanation of the game and its current stage: player promise, intended audience/platform when known, concrete activity, differentiator and boundaries. Show a representative session or moment. Mark the feature needed to test the hook and the assumptions that could invalidate it. Avoid inserting a full technical architecture, revenue forecast or content inventory unless requested.

Repair a vague concept by asking what the player actually does and why a repeated action changes their next decision. For a narrative or creative work, describe expression, interpretation or discovery rather than imposing a win/loss condition. If competing concepts target different audiences, say so instead of ranking them on one invented universal score.

## Vision branch

Describe the player fantasy, intended emotions, tone and boundaries. Turn each design pillar into a decision rule: explain what it supports, a plausible feature it would reject and a tradeoff it accepts. "Exploration" alone gives little guidance; "the player can infer a new route from environmental evidence before receiving an explicit marker" can guide actual choices, if that is the intended experience.

Tie aesthetic direction to readability, atmosphere and production constraints. Keep reference images, approved assets and speculative art direction distinguishable. Review proposed features against the pillars using concrete consequences; do not claim alignment because both use the same adjectives. If two pillars conflict, state the conflict and a possible priority for the user's decision.

## GDD branch

Organize around the game's actual interacting systems. Establish a glossary for shared terms, then document rules, state changes, data/tuning, progression/content, player feedback and exceptions at the granularity implementers need. Link shared rules rather than maintaining divergent copies in combat, economy and UI sections. Track unresolved rules with their downstream dependency, not an undifferentiated question list.

Walk a representative sequence across systems: enter activity, make a choice, spend or gain something, fail or succeed, leave and re-enter. Check that resource consumption, checkpointing, rewards and displayed feedback agree. For revisions, identify the canonical changed rule and update its consumers; do not silently redefine the product from one local suggestion.

Keep engine architecture separate unless a hybrid design/engineering spec is requested. An implementation detail can resolve a constraint, but players need a rule such as "progress is saved after completing the room," not a file layout masquerading as a design decision.

## Feature-spec branch

Describe purpose and the existing system it extends. State triggers, preconditions, legal targets, transitions, costs, feedback, cancellation and persistence only where relevant. Include one normal example and affected boundaries. Exposed tuning values need units and a rationale or hypothesis. Link [systems](systems.md) for precise interaction rules and [progression/economy](progression-economy.md) for resource effects.

Make acceptance usable: "Given a locked ability and insufficient currency, activating purchase changes neither balance nor unlock state and displays the defined reason." Specify the intended denial feedback rather than inventing it as an approved decision. A spec can be complete for implementation while balance remains untested.

## Pitch and review branches

For an external pitch, separate delivered capability, prototype evidence, production plans and the requested support. Verify current competitor or market claims when included; if research is unavailable, omit unsupported comparisons or label them as questions. Never fabricate traction, uniqueness, budget commitments or partner interest.

For critique, group findings by their effect on the document's job. Name a contradiction before stylistic polish. A concern should include evidence, impact and a practical revision or test; subjective preference should remain labeled. For an authorized rewrite, preserve valid decisions and the writer's voice while correcting the actual issue. Deliver only the requested scope, with any unresolved material assumptions visible.
