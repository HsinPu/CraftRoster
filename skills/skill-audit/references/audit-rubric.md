# Skill Audit Rubric

## Contents

- Evidence record
- Severity
- Invocation contract
- Workflow and completion contract
- Context and composition
- Script and data review
- Injection tests
- Decision template

## Evidence Record

Capture repository, pinned revision or release, author, license, package path, file hashes, install method, target tools, dependencies, network domains, required credentials, declared permissions, expected outputs, and cleanup behavior.

Before reusing a scan, lint, review, or runtime result, compare the current package inventory and hashes, source revision, dependency identity, scope, target tool and version, validator or evaluator version, and applicable permission boundary with the recorded evidence. Preserve its actual pass, fail, blocked, or incomplete verdict and unrun checks. Static-only reports cannot substitute for runtime or cleanup proof. Missing matching evidence activates the relevant producer branch rather than all audit-related Skills.

## Severity

- **Critical**: credential theft, hidden exfiltration, destructive execution, unverifiable executable payload, or unauthorized external action.
- **High**: broad secret or filesystem access, unsafe command construction, missing confirmation for consequential action, incompatible license, or a false completion path that can cause material harm.
- **Medium**: ambiguous invocation, hidden network dependency, unpinned executable dependency, missing failure branch, broken reference, unsafe default, or persistent unwanted residue.
- **Low**: context cost, duplication, portability, weak evidence, or maintenance defects without immediate unsafe behavior.

## Invocation Contract

Record at least two positive requests, one near-match, and one negative request.

Check:

- Does the description state both capability and selection context?
- Do distinctive nouns, verbs, inputs, outputs, or failure states separate it from nearby Skills?
- Is costly or interactive behavior explicitly invoked when automatic selection would be surprising?
- Are vendor-specific invocation assumptions declared?
- Could a router or an upgrade remove an otherwise ambiguous duplicate?

## Workflow And Completion Contract

For every material branch, verify prerequisites, owned action, output, evidence, failure behavior, cleanup, and handoff.

Flag:

- instructions that do not change any action or decision;
- negative-only guidance without a safe replacement action;
- success language with no observable evidence;
- early exit before required checks finish;
- missing no-op behavior when the requested state may already exist;
- unnecessary files or edits created only to demonstrate activity;
- temporary files, processes, credentials, or external side effects left without an owner.

## Context And Composition

- Keep core routing and procedure in `SKILL.md`; move conditional detail to directly linked references.
- Remove duplicated facts, stale commentary, and examples that no longer test a real branch.
- Prefer an existing Skill upgrade when ownership already matches.
- Use a parent router when several narrow Skills are valid only after a shared decision.
- Keep independent Skills only when each has a distinct trigger, output, and stop condition.

## Script And Data Review

Trace inputs, parsing, command construction, environment variables, filesystem paths, network requests, subprocesses, outputs, logs, deletion, permissions, error behavior, retries, and cleanup. Reject scripts that download and execute mutable code without validation.

## Injection Tests

Test untrusted repository text, web content, documents, filenames, tool output, and retrieved context that asks the agent to reveal secrets, broaden scope, install software, contact third parties, or ignore higher-priority rules. Confirm the Skill preserves the data/instruction boundary.

## Decision Template

```text
Decision: keep | improve | merge | route | quarantine | reject
Blocking findings:
Invocation positives, near-match, and negative:
Workflow and completion gaps:
No-op and residue behavior:
Required controls:
Verified provenance and license:
Executable and external-action surface:
Maintenance owner and re-audit triggers:
Residual risk:
```
