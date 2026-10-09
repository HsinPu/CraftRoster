---
name: wordpress-development
description: WordPress development and operations workflow for auditing existing sites, building or changing themes, plugins, blocks, hooks, REST integrations, WP-CLI tasks, migrations, updates, performance, permissions, security hardening, and staged releases. Use when code, configuration, content, media, URLs, SEO metadata, or production state in a WordPress site may change and the work needs discovery, backup, validation, rollback, or explicit deployment approval.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# WordPress Development

Build and operate WordPress through supported extension points while preserving the site's content, identity, editorial behavior, and recovery path.

Read `frontend-design` before planning visible theme, block, or editor web UI implementation. Backend, database, site operations, and read-only inventory without a visible UI change may use this Skill alone.

## Establish the Contract

1. Identify the requested outcome, target environment, WordPress and PHP versions, hosting constraints, repository, deployment path, access level, and decision owner.
2. Separate local, staging, and production targets. Treat an ambiguous remote target as production and remain read-only.
3. Record the preservation contract before proposing a change: URLs and slugs, IDs, publication dates and states, authors, taxonomies, revisions, media relationships and metadata, canonical and SEO fields, redirects, analytics, forms, commerce behavior, localization, and editor workflows.
4. Classify every intended action as read-only, reversible mutation, consequential migration, or destructive operation. State the approval and recovery evidence required for each non-read-only class.

## Discover Read-Only First

1. Inspect repository guidance and the existing theme, child theme, plugins, must-use plugins, blocks, hooks, REST routes, content model, roles, scheduled jobs, caches, integrations, and environment configuration.
2. Inventory core, theme, and plugin versions and statuses with non-mutating WordPress or WP-CLI queries when access permits. Never print secrets while inspecting configuration.
3. Sample representative content and media, including drafts, revisions, private content, custom post types, taxonomies, multilingual variants, SEO metadata, redirects, and large or unusual records.
4. Capture a baseline for critical URLs, editor journeys, REST contracts, permissions, scheduled tasks, Site Health, logs, response timing, queries, cache behavior, and storage before changing anything.
5. Report unknowns and access gaps. Do not infer production state from a local checkout or a screenshot.

## Choose the Supported Change Surface

- Use a theme or child theme for presentation and templates; use a block theme and `theme.json` when the site's architecture supports site editing.
- Use a plugin or must-use plugin for portable behavior, data models, integrations, scheduled work, or policy that must survive a theme change.
- Register editor blocks through block metadata and keep editor, saved markup, dynamic rendering, and migrations compatible with existing content.
- Use actions and filters to extend behavior without patching WordPress core, vendor code, or an installed third-party extension in place.
- Use the REST API for structured application boundaries. Define schemas, authentication, authorization, error behavior, compatibility, and cache semantics explicitly.
- Use WP-CLI for repeatable inspection and controlled operations. Prefer documented commands and dry-run or export modes where available.
- Use direct SQL only when supported APIs cannot meet a proven need, with prepared statements, schema evidence, a tested backup, and explicit approval.

Read [decision-guide.md](references/decision-guide.md) when selecting a change surface, planning a migration or update, or preparing a production gate.

## Plan for Recovery

1. Define acceptance criteria and invariants for content, URLs, permissions, rendering, integrations, SEO, performance, and editorial behavior.
2. Design content and schema migrations to be idempotent, restartable, observable, and safe for serialized data and partial failure.
3. Create a matched database-and-files backup set for the affected environment. Record where it is stored, how it will be restored, and who can authorize recovery.
4. Rehearse the change and restore path on staging or an isolated production-like copy. Sanitise sensitive production data used outside production.
5. Define abort thresholds, rollback or forward-repair steps, maintenance requirements, cache invalidation, and the maximum acceptable outage.

## Implement Safely

1. Keep the change minimal and follow repository-native coding, build, test, and deployment conventions.
2. Check capabilities at every privileged operation. Treat nonces as request-intent protection, not as authorization.
3. Validate or reject data against the narrowest contract, sanitize before storage when needed, use parameterized database access, and escape late for the exact output context.
4. Keep credentials, salts, application passwords, database dumps, and private content out of source control, logs, prompts, and generated artifacts.
5. Preserve backward compatibility for stored block markup, public hooks, REST responses, shortcodes, templates, and content migrations unless the approved plan explicitly retires it.
6. Make update and migration steps independently verifiable. Stop on unexpected content drift, permission changes, PHP errors, failed jobs, broken routes, or missing recovery evidence.

## Verify on Staging

1. Run relevant static checks, PHP and JavaScript tests, WordPress integration tests, and repository-native build steps.
2. Re-test representative editor and visitor journeys, roles and capabilities, REST authorization, forms, search, preview, feeds, scheduled jobs, media, localization, and accessibility.
3. Compare the preservation baseline: URL inventory, content counts and samples, metadata, media relationships, redirects, canonicals, structured data, analytics, and integration behavior.
4. Measure uncached and cached behavior separately. Check database queries, cache invalidation, scheduled work, error logs, response time, and resource use against the baseline.
5. Verify update compatibility and recovery by restoring or otherwise proving the backup set is usable in an isolated environment.

## Production Gate

Present the target revision, exact commands or deployment mechanism, backup and restore evidence, preservation comparison, test results, migration and cache plan, abort thresholds, rollback owner, monitoring window, and unresolved assumptions. Obtain explicit authorization before any production mutation.

After authorization, execute only the approved steps; record results after each checkpoint. Stop and recover when an abort threshold is crossed. Recheck critical URLs, publishing, permissions, jobs, integrations, SEO signals, logs, and performance during the agreed observation window.

## Boundaries

- Default to read-only discovery. Do not install, activate, deactivate, update, migrate, import, delete, publish, change roles, rewrite URLs, or clear production data without explicit authority for that target and operation.
- Never run destructive database commands, bulk deletion, or a live search-replace as an exploratory step. Require a scoped dry run or preview, a current backup, serialization-safe tooling, and approval.
- Preserve existing URLs, content, publication state, taxonomy, media, SEO data, and redirects unless the user explicitly approves a documented transformation.
- Do not weaken authentication, authorization, HTTPS, update policy, file permissions, auditability, or secret handling to make a change easier.
- Do not edit WordPress core or third-party package files in place. Extend or override them through supported mechanisms.
- Do not call a backup valid until its database and files belong to the same recovery point and its restore path has evidence.

## Handoff

- Use `security-code-review` for a vulnerability-focused review and `skill-security-review` for third-party Skill packages.
- Use `database-migration-workflow` when a large or zero-downtime schema or data migration needs staged compatibility and reconciliation.
- Use `deployment-operations` for the broader release mechanism, rollout observation, and incident-safe rollback.
- Use `frontend-testing`, `accessibility-testing`, and `browser-compatibility-testing` for visitor and editor interface verification.
- Use `incident-response-postmortems` after a production incident; do not continue a planned change while the site is unstable.

## Output

- Environment and access assumptions, read-only inventory, and preservation contract.
- Chosen change surface and rejected alternatives.
- Change, migration, backup, restore, rollback, and approval plan.
- Verification evidence with before-and-after comparisons.
- Explicit list of pending production or destructive actions requiring authorization.
