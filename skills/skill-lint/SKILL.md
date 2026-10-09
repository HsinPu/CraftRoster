---
name: skill-lint
description: Run deterministic static validation for a Skill package, including SKILL.md frontmatter, folder naming, resource links, package shape, generated catalog consistency, contracts, eval schema, provenance locks, and repository-native gates. Use after creating or editing a Skill and before semantic audit or release; do not use it as proof of runtime behavior, security, or task effectiveness.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Skill Lint

Validate observable package rules without changing the package or claiming semantic quality.

## Workflow

1. Freeze the target path, repository guidance, expected platform format, and current diff.
2. Parse frontmatter and verify the portable `name` and `description` fields. Apply repository-specific fields such as `license` and `metadata` only when that repository requires them.
3. Verify kebab-case naming, folder-to-name equality, one regular `SKILL.md`, directly linked resources, normalized relative paths, and absence of broken or escaping links.
4. Check that the description states the owned capability and selection context, and that body instructions, resources, scripts, and handoffs are reachable and non-duplicative.
5. Run the narrowest available package validator, then the repository-native gates.
6. Record source revision, complete package inventory and file hashes, dependency identity, inspected scope, target platform and tool version, validator version, every command, exit status, finding location, and unavailable check. Mark runtime or permission fields not applicable for static checks. This binding lets later audit or release stages verify evidence against the current package; report pass only for checks that actually ran.

## Portable Package Checks

- Resolve the platform's official Skill validation helper instead of assuming a fixed home-directory path.
- When the official Codex `skill-creator` bundle is available, run its `quick_validate.py <skill-directory>` helper.
- Treat a missing Python dependency or unavailable helper as an unrun check, not a passing check.
- Check Markdown links and referenced files without following symlinks outside the Skill directory.
- Flag package-level README, changelog, or installation documents unless they are actual runtime inputs.

## CraftRoster Gates

From the repository root:

```bash
npm run validate:skill-catalog
npm run validate:skill-contracts
npm run validate:skill-evals
npm run verify:skill-sources
npm run audit:skill-originality
npm run validate
git diff --check
```

If an authorized Skill edit makes generated metadata stale, return the required authoring step `npm run generate:skills`, then rerun the gates. Do not mutate generated files during a read-only lint request.

## Finding Format

For each failure, report:

- gate and severity;
- exact file and field, link, or command;
- expected invariant and observed value;
- smallest correction;
- whether the correction requires regeneration or another review.

End with `pass`, `fail`, or `incomplete`. An incomplete verdict must name the unavailable checks.

## Rules

- Prefer precise structural findings over style-only comments.
- Keep checks deterministic and repeatable.
- Treat description as the primary trigger surface.
- Do not call a Skill safe, effective, or certified from lint alone.
- Do not rewrite the Skill unless the user asked for a fix.

## Handoff

- For security-focused review, use `skill-security-review`.
- For authoring or redesigning a skill, use `skill-creator-design`.
- For controlled execution of bundled scripts or representative tasks, use `skill-executor`.
- For broader package quality and provenance review, use `skill-audit`.
- For fast read-only inventory and suspicious-surface triage, use `skill-scan` before lint when the package is unfamiliar.
