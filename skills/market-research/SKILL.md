---
name: market-research
description: Decision-focused market research workflow for defining a market question, collecting current demand and competitor evidence, resolving source conflicts, and producing a confidence-labeled decision memo. Use when product, positioning, launch, audience, or investment decisions require market evidence rather than general web research or unsupported estimates.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "affaan-m/ECC"
  reference-license: "MIT"
  reference-revision: "ed387446052dfbc6b52de149406b70efa65edc59"
---

# Market Research

Turn current market evidence into a decision-ready recommendation.

## Workflow

1. Define the decision, target audience, geography, language, units or currency, as-of date, time horizon, market boundary, and excluded questions.
2. Convert the decision into falsifiable research questions and evidence requirements.
3. Check whether the supplied source ledger covers the defined questions, market boundary, and as-of date. Use `web-research-ops` only for missing current-source retrieval and qualification; use `agent-reach-ops` for a required platform-specific collection path. A sufficient current ledger needs no new collection.
4. Build a claim-to-source ledger with canonical locators, evidence-family lineage, relevant dates, support or contradiction status, and a limitation for every material claim. Separate observed facts, estimates, interpretations, and recommendations.
5. Compare customer signals, alternatives, competitors, switching constraints, and evidence against the status quo.
6. Resolve conflicts by checking definitions, publication, update, observation, measurement, and requested as-of dates, methodology, sample, source lineage, incentives, and market boundary.
7. Produce a decision memo with confidence, missing evidence, downside risks, and the next reversible action.

## Decision Memo

Include:

- decision and market boundary;
- strongest demand and counter-evidence;
- competitor and alternative matrix;
- confirmed facts, estimates, and inferences;
- confidence by claim and unresolved conflicts;
- recommendation, rejected options, and next validation step.

## Evidence Rules

- Preserve canonical URLs, publishers, precise locators, publication and update dates, observation and measurement periods, requested as-of dates, definitions, source lineage, and material methodology limits.
- Prefer direct customer, regulatory, company, transaction, or first-party product evidence when available.
- Treat syndications, press rewrites, and summaries of the same announcement, dataset, or study as one evidence family, not independent corroboration.
- Do not convert a vendor estimate into a verified fact.
- Do not hide evidence that weakens the preferred recommendation.
- Recheck time-sensitive claims immediately before a consequential decision.
- Record a paid, private, blocked, or unavailable source with its reason, allowed fallback, and confidence cap. Do not treat an inaccessible source as proof that the missing fact does not exist.

## References

- Read [references/research-brief-and-evidence.md](references/research-brief-and-evidence.md) when creating the research brief, evidence ledger, competitor matrix, or final decision memo.

## Boundaries

- Keep market definitions, competitor interpretation, sizing methods, confidence, and the decision memo here. Keep current-source retrieval and qualification with `web-research-ops`; consume its ledger instead of handing collection back and forth because a claim concerns a market.
- Do not present TAM, SAM, or SOM without an explicit sizing method and defensible inputs.
- Do not write campaign copy, a brand voice profile, or an implementation specification inside the research memo.
- Stop when a required paid source, private customer record, or legal interpretation is unavailable or unauthorized; report the gap and the smallest reversible next step rather than bypassing access controls.

## Handoff

- Use `web-research-ops` only when the evidence ledger lacks current-source discovery, verification, or citation capture needed for the decision.
- Use `agent-reach-ops` when evidence must be collected from platform-specific social, video, code, or RSS sources.
- Use `solution-discovery` when the evidence must inform a product or implementation direction.
- Use `spec-flow` after a market-backed product direction is approved and needs executable requirements.
- Use `brand-voice` when the confirmed audience and positioning should shape a reusable voice profile.
- Use `article-writing` when the research should become a sourced long-form publication.
