# Equivalent refactor review fixture

This family contains base and head source views plus a declarative `fixture-recipe.json`. A trusted setup runner creates a new isolated temporary Git repository, commits the base, applies the head overlay, and commits the head there. The evaluated reviewer receives that repository and the resulting base/head identifiers; the review itself stays read-only. Never commit in CraftRoster or another real repository, and never copy `.git` through the public fixture bundle.

This is a local display-name helper extraction. Its callers and public behavior tests are present in the base and unchanged at head. The setup harness executes those tests at both revisions. `evidence/author-verification.json`, when present, records the actual isolated Git/test observations and source digests; it is not a model result. Text hashes use `sha256-utf8-lf` (SHA-256 over UTF-8 after CRLF-to-LF normalization).

If the recipe has not been materialized, the supplied files allow a source comparison but do not prove an observed Git baseline or live runtime. No network, publication, deployment, or real profile service is involved. Judge the actual public contract and callers; do not infer defects from the presence or size of a refactor.
