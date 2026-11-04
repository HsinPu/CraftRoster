# Progression and economy

## Identify the arc

Determine what progression should change: knowledge, expressive options, mastery, narrative access, build variety or power. Match the arc to the actual game; larger numbers and repeated rewards are not automatic improvements. For a bounded request such as the opening sessions, map capabilities and decisions over that horizon rather than inventing a complete endgame.

For each stage, record what becomes available, how the player discovers it, the prerequisite, the meaningful new decision and the recovery path after failure or an early poor purchase. Distinguish a hard gate from a recommendation. Check that required knowledge can be acquired before a challenge demands it and that a player who falls behind can still progress.

## Build a flow model

For each in-scope resource, define unit, ownership, sources, sinks, storage cap, conversions, persistence and reset/loss. Mark sources as renewable, finite or conditional. Track when earnings occur and when spending is possible; a positive end-of-session balance can hide an unaffordable mandatory purchase mid-session.

A simple deterministic ledger can resolve a concrete uncertainty:

`next balance = current balance + earned rewards - purchases - losses`, bounded by the actual cap and rounding rules.

Use representative paths rather than one optimistic average: a normal run, repeated failure, delayed purchasing and a high-yield repeatable route. Show assumptions about action rate, success and session length with units. If stochastic outcomes matter, include a plausible range or distribution only when justified; do not label an arbitrary random simulation as measured player behavior.

Illustrative proposal, not a default balance: a player starts with 0 tokens, each completed room grants 8, and a key costs 20. With no other source or sink, the key becomes affordable after three completions, leaving 4. If the same mandatory key is charged again after each failed door attempt, recovery now depends on renewable access to rooms. That dependency must be deliberate and tested. Change the values and paths to the user's actual economy.

## Diagnose failure modes

Check first-purchase affordability, repeated purchases, stranded currency, negative or overflow states, stockpiling beyond useful sinks and conversions that enable profit loops. Look for one route that dominates rewards without the intended challenge. Examine whether a one-time source can be spent before a mandatory gate and permanently trap progress.

For power progression, check whether stronger players earn faster, buy upgrades sooner and compound the lead. For skill progression, check whether rewards reward learning or merely repetition. A high average earning rate can conceal large variation or long unproductive periods; show the limitation of the chosen model.

When monetization is explicitly in scope, identify what is sold and how it changes fairness, pace, information or availability. Preserve the selected business model while testing its consequences. Do not introduce a store, randomized purchase or retention mechanism into an unrelated economy request.

## Tune against a question

Choose a specific uncertainty, such as whether the second unlock arrives before the initial tool feels exhausted. Name the variable that changes that interval, its plausible range and what else it affects. Use sensitivity analysis when it changes a decision: if both low and high earnings reach the unlock at the same point, another variable may matter more.

Keep the source of truth for values clear. Present a compact table of resource flows, progression gates and representative paths, plus assumptions and edge cases. Distinguish arithmetic checks from actual telemetry. Link [playtesting](playtesting.md) to evaluate comprehension, perceived grind, meaningful choices and motivation that a ledger cannot establish.
