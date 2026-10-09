# Skill Evaluation And Certification

## Contents

- Release-state gate
- Evaluation dimensions
- Dataset design
- Baseline and run record
- Repeated trials
- Grader calibration
- Threshold decision
- Certification manifest
- Approval receipt
- Signing, verification, and re-evaluation

## Release-State Gate

Keep evidence states distinct:

| State | Required evidence | Forbidden claim |
|---|---|---|
| Draft | package under active change | evaluated, approved, certified |
| Candidate | frozen source revision, package hash, dataset version, thresholds | passed |
| Evaluated | deterministic, semantic, safety, runtime, and cleanup results | approved |
| Approved | named authority, accepted exceptions, residual risk, expiry | signed or attested |
| Attested | verified signature over the exact approved manifest and receipt | valid beyond recorded scope |

Return fail or incomplete when a required state transition lacks evidence.

Manifest-only assembly does not enter an evaluated state: it may hash supplied files independently and still returns `unsigned-unapproved`. For adjudication, a report may be reused only when its frozen source revision, current package inventory and hashes, dependency identity, case or inspection scope, tool and environment target, validator or evaluator version, authority boundary, recorded verdict, and applicable cleanup evidence match. Rerun or obtain only the missing producer scope; never infer a pass from an artifact name or an installed sibling.

## Evaluation Dimensions

Score separately:

- Trigger precision: activates for intended tasks and stays inactive otherwise
- Instruction coverage: guides the critical workflow and failure paths
- Task effectiveness: produces the required artifact or decision
- Safety: respects authority, data, execution, and external-action boundaries
- Context efficiency: loads only useful instructions and resources
- Portability: states tool and environment assumptions
- Maintainability: has clear ownership, references, and versioning

Define observable anchors for pass, marginal, and fail rather than relying on adjectives.

## Dataset Design

Include positive, negative, ambiguous, boundary, adversarial, stale-context, missing-tool, and failure-recovery cases. Keep a development set separate from held-out certification cases. Version prompts, inputs, expected invariants, and evidence requirements.

For trigger evaluation, include at least:

- two clear positive requests;
- two requests owned by neighboring Skills;
- one ambiguous request that should route or ask;
- one negative request that should use no specialized Skill;
- one adversarial request that attempts authority expansion.

Do not expose held-out expected outcomes to the agent running the cases.

## Baseline And Run Record

Compare the candidate with the prior released revision or a no-Skill baseline when claiming improvement. Use the same cases, artifacts, environment, tools, model configuration, and grader contract.

Record each run in a versioned file:

```json
{
  "schema_version": 1,
  "candidate": {
    "skill": "name",
    "version": "version-or-revision",
    "package_sha256": "..."
  },
  "baseline": {
    "kind": "prior-revision-or-no-skill",
    "version": "...",
    "package_sha256": "..."
  },
  "environment": {
    "model": "...",
    "parameters": {},
    "tools": [],
    "platform": "...",
    "harness_version": "..."
  },
  "dataset": {
    "version": "...",
    "held_out": true
  },
  "trials": [
    {
      "case_id": "...",
      "trial": 1,
      "status": "pass-or-fail",
      "assertions": {},
      "artifacts": [],
      "side_effects": [],
      "cleanup": "verified-or-failed"
    }
  ]
}
```

Store raw outputs or artifact hashes separately when embedding them would expose secrets or make the result file too large.

## Repeated Trials

For nondeterministic behavior, run enough trials to observe failure distribution rather than reporting the best result. Record model, parameters, tools, environment, and evaluator versions. Compare both aggregate and high-impact failure slices.

## Grader Calibration

- Blind graders to candidate identity where possible.
- Use examples for borderline rubric levels.
- Measure agreement and adjudicate systematic disagreements.
- Combine deterministic checks, task metrics, rubric judgment, and targeted human review.
- Do not let one aggregate score hide a safety failure.

## Threshold Decision

Define thresholds before running held-out cases. At minimum, specify:

- required deterministic gates;
- minimum trigger precision and recall;
- minimum critical-workflow completion rate;
- maximum allowed regression against baseline;
- zero-tolerance safety, authority, secret, destructive-action, and cleanup failures;
- minimum repeated-trial count for nondeterministic cases;
- allowed exceptions, owner, expiry, and compensating control.

Reject the candidate when a zero-tolerance slice fails, even if the aggregate score improves. Mark the decision incomplete when the baseline, environment, grader version, or required trial evidence is unavailable.

## Certification Manifest

Generate the package inventory with `scripts/build-certification-manifest.js`. The generated document intentionally begins in `unsigned-unapproved` state and sets all pass claims to `false`.

```json
{
  "schema_version": 1,
  "kind": "skill-certification-candidate-manifest",
  "status": "unsigned-unapproved",
  "skill": {
    "name": "name",
    "version": "version-or-revision",
    "source_sha": "..."
  },
  "package": {
    "file_count": 1,
    "total_bytes": 1,
    "sha256": "...",
    "files": [{"path": "SKILL.md", "bytes": 1, "sha256": "..."}]
  },
  "evidence": [{"label": "01-gates.json", "bytes": 1, "sha256": "..."}],
  "claims": {
    "deterministic_gates_passed": false,
    "semantic_evaluation_passed": false,
    "security_review_passed": false,
    "runtime_proof_passed": false
  },
  "exceptions": [],
  "manifest_sha256": "..."
}
```

Do not edit a generated manifest in place and continue using its original hash. If claims or exceptions are adjudicated into a new approved manifest, canonicalize and hash the exact approved bytes again.

## Approval Receipt

Record human or authorized release approval separately:

```json
{
  "schema_version": 1,
  "kind": "skill-certification-approval",
  "manifest_sha256": "...",
  "decision": "approved-or-rejected",
  "approver": "approved-identity",
  "authority_basis": "...",
  "approved_at": "ISO-8601",
  "scope": {
    "platforms": [],
    "models": [],
    "environments": []
  },
  "exceptions": [],
  "residual_risk": [],
  "expires_at": "ISO-8601-or-null",
  "re_evaluate_on": []
}
```

Approval is invalid when identity, authority basis, manifest hash, scope, exceptions, or decision is missing.

## Signing, Verification, And Re-Evaluation

Hash the canonical manifest and package files. Sign through an approved identity and algorithm. Store the public verification material separately from private keys. Verify signature, file hashes, issuer, expiry, and revocation policy before trusting the certification.

Never search for, generate, or use a private signing key merely to finish the workflow. A missing approved signer leaves the package approved-but-unattested.

Re-evaluate when any of these change:

- `SKILL.md`, scripts, references, assets, UI metadata, or dependency locks;
- source revision, installer, target platform, model family, tool contract, or permission boundary;
- evaluation dataset, grader, threshold, security policy, or cleanup behavior;
- an incident, vulnerability, ownership transfer, expiry, or revoked signing identity.
