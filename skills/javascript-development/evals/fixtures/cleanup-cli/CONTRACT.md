# Plain JavaScript cleanup preview

`scripts/cleanup.js` is a CommonJS Node.js utility. Given a local JSON plan, it validates the proposed relative paths and prints a dry-run preview. It must exit zero for a valid plan and nonzero for unreadable JSON or validation failure. Expected validation errors should have a concise message without an uncaught exception stack.

Run `node scripts/cleanup.js fixtures/valid-plan.json` and `node scripts/cleanup.js fixtures/invalid-plan.json` from this directory. The latter currently reports a validation error but returns a successful process status. The current smoke test covers the valid case: `node test/cleanup.test.js`.

This utility never deletes, renames, or writes any file. The `cache/example.txt` sentinel is synthetic data and must stay intact. Work on a temporary copy when checking the CLI. `apps/dashboard` is an unrelated TypeScript application, included to reflect the monorepo context; it is not an owner of this utility and no dependencies need installing.
