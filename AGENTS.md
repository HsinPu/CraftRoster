# Repository Agent Guidance

## Project Architecture

- CraftRoster is a catalog and distribution layer for Skills and custom Agents, not an Agent runtime or an application UI.
- Canonical Skill instructions live in `skills/<name>/SKILL.md`. `scripts/data/skill-catalog.json` owns categories, tags, dependencies, and routes; `scripts/data/install-bundles.json` owns user-facing installation purposes.
- `agents.json`, `skills.json`, `adapters/`, and generated TSV indexes are derived artifacts. Keep their generators and canonical inputs authoritative.
- Installer entrypoints are `scripts/setup.ps1` / `setup.sh` for interactive selection and `scripts/install.ps1` / `install.sh` for parameter-based installation. Development uses Node.js 22+; ordinary installation does not require Node.js.

## Task Workflow and Knowledge

- Start each task by reading root `AGENTS.md`, `MEMORY.md`, and `README.md`. Create a missing knowledge file from verified repository evidence.
- At completion, review and update these documents as needed. Keep `AGENTS.md` focused on durable architecture and working rules; keep `MEMORY.md` focused on verified decisions and lessons. Remove obsolete or duplicated knowledge.
- Read `DESIGN.md` before designing or changing an actual UI. If absent, record only established design evidence and mark unresolved choices explicitly. Catalog research alone does not establish a product design system.
- Keep research proposals clearly separate from installed capabilities. Do not change catalog membership, install upstream tools, or enable hooks merely because a source was researched.
- For cross-platform interface work, distinguish the product target OS, actual UI framework, and execution host. Check each existing Skill's documented scope; an Electron or iOS-specific name does not establish native Windows/macOS coverage.
- Purpose-bundle membership and Skill mode names do not grant execution permissions. Keep read-only roles read-only and match runtime, accessibility and performance claims to the evidence actually obtained.
- `ui-improvement` owns existing-interface quality across declared platforms; load only relevant framework references. `frontend-design-review` remains the web review entry, and native source fixtures are not complete buildable apps or runtime evidence.
- When changing shared reviewer recommendations, compare final installation plans. Preserve web-specific support explicitly in `web-interface` when it becomes conditional on a cross-platform role.
- Review README headings, internal links, installation instructions, version information, and feature claims after relevant changes. Preserve valid existing content and use relative repository links.

## Versioning and Git

- Use the existing `package.json` version and semantic versioning: MAJOR for incompatible changes, MINOR for compatible features, PATCH for bug or compatibility fixes. Update `CHANGELOG.md` and affected README information with substantive code changes. Documentation-only work does not increase the version.
- Commit only changes belonging to the completed task, including its documentation and version updates. Do not automatically push; a new explicit push request is required.

## Custom Agent Routing

- When a task benefits from delegation, select the best matching available custom Agent from its name and description. The user does not need to name the Agent explicitly.
- Delegate bounded, independent work such as codebase exploration, research, review, testing, or log analysis when doing so improves speed or keeps noisy intermediate output out of the main task.
- Keep simple or tightly coupled work in the main task. Do not spawn an Agent only because one is available.
- Prefer read-only Agents for exploration, research, and review. For implementation, give each Agent a distinct ownership boundary and never assign overlapping writes to the same files.
- Wait for required Agent results, verify important claims, and return one consolidated answer. If no suitable custom Agent is available, continue in the main task.

## Catalog Editing

- Treat `agents/<role>.md` as the canonical Agent source. Do not edit generated files under `adapters/` directly.
- Keep Agent role names unique and flat. Skills belong under `skills/<name>/SKILL.md`.
- After changing canonical Agent definitions, run `npm run generate:agents` before validation.

## Verification

- Run `npm run validate` after changing Agents, Skills, adapters, catalogs, installers, or README catalog metadata.
- Run relevant focused checks for changed executable behavior. A case definition or a structural pass does not establish actual runtime or visual success.
- Inspect `git diff --check` and the final Git status before handing off changes.
