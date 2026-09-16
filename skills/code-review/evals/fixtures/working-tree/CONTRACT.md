# Current working-tree review fixture

This family is a declarative source fixture, not an initialized repository. A trusted setup runner must create a fresh isolated temporary Git repository from `fixture-recipe.json` before the read-only review begins. Never initialize or commit in CraftRoster, a user's repository, or a model-selected destination. Do not copy a `.git` directory into the task bundle.

Apply the recipe in order: copy the base files, create the fixed local baseline commit, copy and stage the index overlay, copy the worktree overlay without staging, and add the new files without staging. Supply the resulting repository as the review workspace. The source-view folders are setup inputs and must not appear as unrelated files inside that repository. Reviewers should inspect the actual Git index, worktree, new files, guidance, callers, and tests after setup. Without setup, describe source comparisons as fixture evidence rather than claiming observed Git status.

The project is a synthetic inventory-reservation library with a local preview command. It has no payment, network, database, or deployment integration. The setup runner may execute only these repository-authored tests and local preview. The evaluated review remains read-only; it must not repair, stage, commit, publish, or deploy. Public normal-path tests are intentionally ordinary project tests, not private evaluation answers.

`evidence/author-verification.json`, when present, records actual author-harness observations and scoped source hashes. It is evidence about this synthetic fixture, not a model result. Text hashes use SHA-256 over UTF-8 with CRLF normalized to LF (`sha256-utf8-lf`).
