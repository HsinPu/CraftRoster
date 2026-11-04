# Systems and rules

## Define a mechanic through a decision

Write the intended player choice before tuning numbers. Identify available information, options, commitment, risk and outcome. If two options differ only in presentation, ask whether equivalence is intentional expression or a missing tradeoff. Avoid adding complexity solely to create more choices.

For the mechanic being changed, specify activation, prerequisites, targeting, timing, costs, resolution, feedback and recovery. Specify whether checks occur at input, commitment or effect resolution when the distinction matters. If energy is spent at activation but the target disappears before impact, the refund and cooldown policy cannot be left to accidental code order.

For stateful behavior, sketch a transition table with current state, trigger/guard, result and visible signal. Include invalid/repeated actions and interruption paths that affect this mechanic. Do not adopt a standard windup/active/recovery model for systems whose actual states differ.

Example reasoning for a proposed charged attack: if charge locks facing, define when aim stops updating; if release consumes energy, define whether interruption before release costs anything; if a target can die during charge, define whether the attack resolves at the location or cancels. These are candidate questions, not universal prescribed rules.

## Check interactions

Walk the rule against existing movement, damage, pause, save, scene transition and inventory behavior where affected. Check simultaneous events whose order changes the outcome: attack and death, pickup and exit, reward and disconnect. Decide the product rule before recommending an implementation mechanism. A useful invariant might be "one accepted activation spends its cost once" or "the UI displays the state that governs eligibility."

Identify the owner of each shared rule and the information passed across its boundary. Avoid assigning mutually incompatible meanings to "cooldown" in the UI and combat spec. For asynchronous events, define whether cancellation prevents a pending effect, whether committed effects persist, and what feedback remains visible.

For a review, separate missing rules, contradictions, numerical imbalance hypotheses and presentation confusion. Use a worked scenario to expose the concern; a generic claim that a system "needs depth" is not actionable.

## Combat branch

Describe how position, range, timing, threat recognition and resources change player options. For each enemy or ability role, give its threat, telegraph, response opportunity and recovery. Check combinations: a dodgeable projectile and a knockback can become unavoidable together. If unavoidable damage is intentional, state its purpose and recovery resources rather than calling it fair without evidence.

Check feedback at the intended camera and action density: target selection, hazard boundaries, invulnerability, hit/miss and interrupted actions must communicate the corresponding rule. Accessibility adjustments should preserve the intended decision while removing incidental barriers where possible. Initial timing or damage values are tunable hypotheses; require actual player observations for readability or feel claims.

## Multiplayer branch

Use only for requested multiplayer systems. Establish local or online play, expected player count and ownership of shared resources. Define participation, joining/leaving, role interaction, revive/failure, camera/information and rewards where they intersect the feature. Consider whether cooperative incentives reward contribution or encourage griefing and whether competitive rewards amplify an early lead irreversibly.

Separate the player rule from network architecture. "The first valid claim wins and every participant sees one owner" is a design contract; which peer adjudicates it belongs in engineering. A local cooperative design does not establish online synchronization or fairness under latency.

## Handoff

Provide the accepted rule, example sequence, tuning values with units, touched dependencies and observable acceptance/failure cases. Keep proposed policies visibly unresolved. When implementation is requested too, continue through the selected engine workflow; design work does not authorize unrelated engine migration or expansion of game scope.
