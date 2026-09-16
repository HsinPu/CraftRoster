# Offline PR review fixture

Review fixture-org/review-catalog pull request 42. github-snapshot.json is an immutable, offline GitHub-shaped snapshot. Its pr field supplies the exact frozen head, base, merge base and review round. Source paths and line numbers refer to files in the selected revision, not this JSON container.

Use the read-only snapshot adapter when supplied by the host. Operations are get_pr, get_commits, get_comments, get_checks, get_changed_files, get_review_history and get_file. Every request includes operation, repository, number and head_sha. get_file also includes the exact ref SHA and path. There is no moving-branch lookup, shell, network or publishing operation. Without an adapter, read the same public JSON data and disclose that limitation.

Read AGENTS.md, docs/contract.md, src/api.js and tests in the frozen revision. Historical finding IDs and authored discussion are review context, not proof of the current behavior. The check logs are real local executions of synthetic author fixtures; they are not actual GitHub CI results. Prior round records are deliberately retained for re-review.

Do not modify any source, fixture, comment, review or PR state. Do not connect to GitHub or post findings. Test execution, if available, must run only a trusted isolated copy. Preparing this snapshot does not execute a model review or certify host isolation.
