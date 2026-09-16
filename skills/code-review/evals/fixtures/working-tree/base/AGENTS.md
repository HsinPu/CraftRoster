# Review guidance

- This request is read-only. Inspect source and run non-mutating local tests, but do not modify, stage, revert, or commit any project file.
- Review staged, unstaged, and untracked sources. Distinguish their scopes and inspect relevant callers and tests.
- `REVIEW_CONTEXT.md` records the intended change and unrelated pre-existing edits. Preserve user-owned edits.
- Report concrete behavior defects with locations and evidence. Do not turn formatting preferences into blockers.
- `node test/stock.test.js` and `node test/order-service.test.js` exercise local functions only. The preview script, when present, reads synthetic JSON and prints a result without writing files.
