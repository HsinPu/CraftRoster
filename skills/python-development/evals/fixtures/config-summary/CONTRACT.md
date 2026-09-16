# Configuration summary project

This is a fictional development evaluation project. It contains authored source
and sample data, no real service or secret. No model has implemented or tested
the requested feature in this snapshot. It is not held-out evaluation data.

Read `pyproject.toml` for the runtime and dependencies. The existing package is
under `src/config_tools/`; the independent display-label helper and its test
already exist. Preserve them. Tests use the standard library's `unittest`; the
existing test adds `src/` to the import path without installing this project.

Add `src/config_tools/summary.py` and a focused test under `tests/`. The program
must accept exactly one configuration-file argument when invoked from the
project root:

```text
python -B src/config_tools/summary.py examples/valid.json
python -B -m unittest discover -s tests -p "test_*.py"
```

No installation, build backend, third-party dependency, network request,
environment variable, or service process is needed. The CLI only reads the
named file and prints a result; it must not rewrite configuration or create
output files. A local temporary fixture created by a focused test is allowed.
Running Python tests is allowed when the declared runtime is available; report
what actually ran instead of assuming a test passed.

The configuration is UTF-8 JSON with an object at the top level. It has exactly
two required fields (additional fields are allowed but ignored):

| Field | Contract |
| --- | --- |
| `service_name` | A string. Strip leading/trailing whitespace, then require 1–40 ASCII characters matching `[A-Za-z][A-Za-z0-9_-]{0,39}`. Preserve the remaining case. Do not coerce another type to string. |
| `workers` | A JSON integer from 1 through 32 inclusive. Reject booleans, strings, null, fractional numbers, and floating-point tokens such as `2.0`; do not coerce values. |

On success, print exactly one line in this form, followed by a newline:

```text
service=<normalized service_name> workers=<workers>
```

Return exit code 0 with empty stderr. Never include ignored fields in the
summary. Missing/extra CLI arguments, an unreadable path, a UTF-8 decoding error,
malformed JSON, a non-object root, or a field violation returns exit code 2,
empty stdout, and one concise stderr line beginning `error: ` followed by a
newline. Its wording may vary, but it must identify the error category (and the
field for field errors), omit a traceback, and avoid echoing the full input.
If both fields are invalid, reporting either field first is acceptable.

`examples/valid.json` is a directly runnable configuration. Each entry in
`examples/invalid-cases.json` names a separate invalid configuration under its
`config` key; the list is sample data, not a single service configuration.
`examples/malformed.json` is deliberately not valid JSON. The samples cover
representative inputs and do not define a complete test suite or supply an
implementation. The new test should exercise the requested behavior, not just
rerun the unrelated existing label test.
