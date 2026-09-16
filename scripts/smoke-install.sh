#!/usr/bin/env bash
set -euo pipefail

log_pass() { printf 'PASS %s\n' "$1"; }
fail() { printf 'FAIL %s\n' "$1" >&2; exit 1; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
INSTALLER="$REPO_ROOT/scripts/install.sh"
EXPECTED_REPO="HsinPu/CraftRoster"
LEGACY_REPO="HsinPu/Autoverse-Ai-Agent-Skills"
LEGACY_SKILL_FIXTURE="$REPO_ROOT/tests/fixtures/legacy-skills/terminal-ops"
EXPECTED_SKILLS="$(node -e "console.log(require(process.argv[1]).skills.length)" "$REPO_ROOT/skills.json")"
EXPECTED_AGENTS="$(node -e "console.log(require(process.argv[1]).agents.length)" "$REPO_ROOT/agents.json")"

if [[ "$#" -gt 1 ]]; then
  fail "Usage: scripts/smoke-install.sh [--full|--quick|--dependencies]"
fi

case "${1:-}" in
  "") SMOKE_MODE="${CRAFTROSTER_SMOKE_MODE:-full}" ;;
  --full) SMOKE_MODE="full" ;;
  --quick) SMOKE_MODE="quick" ;;
  --dependencies) SMOKE_MODE="dependencies" ;;
  *) fail "Unknown option: $1. Usage: scripts/smoke-install.sh [--full|--quick|--dependencies]" ;;
esac

case "$SMOKE_MODE" in
  full)
    EXPECTED_PROJECT_SKILLS="$EXPECTED_SKILLS"
    EXPECTED_PROJECT_AGENTS="$EXPECTED_AGENTS"
    ;;
  quick|dependencies)
    EXPECTED_PROJECT_SKILLS=1
    EXPECTED_PROJECT_AGENTS=1
    ;;
  *) fail "CRAFTROSTER_SMOKE_MODE must be full, quick, or dependencies" ;;
esac
TEMP_BASE="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
SMOKE_ROOT="$(mktemp -d "$TEMP_BASE/craftroster-install-smoke-XXXXXXXX")"
PROJECT_ROOT="$SMOKE_ROOT/project"
LAST_OUTPUT=""
ORIGINAL_TEST_MODE_SET=0
ORIGINAL_TEST_MODE=""
ORIGINAL_TEST_FAULT_SET=0
ORIGINAL_TEST_FAULT=""
if [[ "${CRAFTROSTER_INSTALL_TEST_MODE+set}" == "set" ]]; then
  ORIGINAL_TEST_MODE_SET=1
  ORIGINAL_TEST_MODE="$CRAFTROSTER_INSTALL_TEST_MODE"
fi
if [[ "${CRAFTROSTER_INSTALL_TEST_FAULT+set}" == "set" ]]; then
  ORIGINAL_TEST_FAULT_SET=1
  ORIGINAL_TEST_FAULT="$CRAFTROSTER_INSTALL_TEST_FAULT"
fi
unset CRAFTROSTER_INSTALL_TEST_MODE CRAFTROSTER_INSTALL_TEST_FAULT

restore_test_environment() {
  if [[ "$ORIGINAL_TEST_MODE_SET" -eq 1 ]]; then
    export CRAFTROSTER_INSTALL_TEST_MODE="$ORIGINAL_TEST_MODE"
  else
    unset CRAFTROSTER_INSTALL_TEST_MODE
  fi
  if [[ "$ORIGINAL_TEST_FAULT_SET" -eq 1 ]]; then
    export CRAFTROSTER_INSTALL_TEST_FAULT="$ORIGINAL_TEST_FAULT"
  else
    unset CRAFTROSTER_INSTALL_TEST_FAULT
  fi
}

cleanup() {
  local resolved
  resolved="$(cd "$SMOKE_ROOT" 2>/dev/null && pwd -P || true)"
  case "$resolved" in
    "$TEMP_BASE"/craftroster-install-smoke-*) ;;
    "") return ;;
    *) printf 'Refusing to clean unexpected smoke root: %s\n' "$resolved" >&2; return 1 ;;
  esac
  if [[ -L "$SMOKE_ROOT" ]]; then
    printf 'Refusing to clean symlink smoke root: %s\n' "$SMOKE_ROOT" >&2
    return 1
  fi
  rm -rf -- "$SMOKE_ROOT"
}

on_exit() {
  local exit_status="$1" cleanup_status
  trap - EXIT
  set +e
  cleanup
  cleanup_status=$?
  restore_test_environment
  if [[ "$cleanup_status" -ne 0 ]]; then
    printf 'FAIL smoke cleanup failed for %s\n' "$SMOKE_ROOT" >&2
    exit_status=1
  fi
  exit "$exit_status"
}
trap 'on_exit "$?"' EXIT

if [[ "${CRAFTROSTER_SMOKE_TEST_FAIL_AFTER_SETUP:-}" == "enabled" ]]; then
  fail "injected smoke failure after setup"
fi

run_installer() {
  local label="$1"
  shift
  if ! LAST_OUTPUT="$(bash "$INSTALLER" "$@" 2>&1)"; then
    printf '%s\n' "$LAST_OUTPUT" >&2
    fail "$label"
  fi
  log_pass "$label"
}

expect_failure() {
  local label="$1" expected="$2" exit_code
  shift 2
  set +e
  LAST_OUTPUT="$(bash "$INSTALLER" "$@" 2>&1)"
  exit_code=$?
  set -e
  [[ "$exit_code" -ne 0 ]] || fail "$label unexpectedly succeeded"
  [[ "$LAST_OUTPUT" == *"$expected"* ]] || {
    printf '%s\n' "$LAST_OUTPUT" >&2
    fail "$label did not report '$expected'"
  }
  log_pass "$label"
}

assert_equal() {
  local actual="$1" expected="$2" label="$3"
  [[ "$actual" == "$expected" ]] || fail "$label expected $expected, got $actual"
}

write_skill_dependency_index() {
  local source_root="$1" rows="${2:-}"
  mkdir -p "$source_root/scripts/data"
  printf 'skill\tdependency\tkind\twhen\n%s' "$rows" > "$source_root/scripts/data/install-skill-dependencies.tsv"
}

mutate_json_string() {
  local file="$1" field="$2" value="$3"
  node - "$file" "$field" "$value" <<'NODE'
const fs = require('fs');

const [file, field, value] = process.argv.slice(2);
const metadata = JSON.parse(fs.readFileSync(file, 'utf8'));
metadata[field] = value;
fs.writeFileSync(file, `${JSON.stringify(metadata, null, 2)}\n`);
NODE
}

delete_json_field() {
  local file="$1" field="$2"
  node - "$file" "$field" <<'NODE'
const fs = require('fs');

const [file, field] = process.argv.slice(2);
const metadata = JSON.parse(fs.readFileSync(file, 'utf8'));
delete metadata[field];
fs.writeFileSync(file, `${JSON.stringify(metadata, null, 2)}\n`);
NODE
}

single_file_skill_digest() {
  local file="$1" digest_namespace="$2"
  node - "$file" "$digest_namespace" <<'NODE'
const crypto = require('crypto');
const fs = require('fs');

const [file, digestNamespace] = process.argv.slice(2);
const content = fs.readFileSync(file);
const hash = crypto.createHash('sha256');
hash.update(Buffer.from(`${digestNamespace}\0SKILL.md\0${content.length}\0`));
hash.update(content);
hash.update(Buffer.from([0]));
process.stdout.write(hash.digest('hex'));
NODE
}

assert_metadata() {
  local file="$1" component="$2" component_name="$3" ownership_target="$4" adapter="$5" label="$6"
  [[ -f "$file" && ! -L "$file" ]] || fail "$label metadata is missing or not a regular file: $file"
  if ! node - "$file" "$component" "$component_name" "$ownership_target" "$adapter" "$EXPECTED_REPO" <<'NODE'
const fs = require('fs');

const [file, component, componentName, target, adapter, expectedRepo] = process.argv.slice(2);
let metadata;
try {
  metadata = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (error) {
  console.error(`${file}: ${error.message}`);
  process.exit(1);
}

const expected = {
  source: 'local-checkout',
  repo: expectedRepo,
  branch: 'main',
  component,
  name: componentName,
  target,
};
if (component === 'agent') {
  expected.id = componentName;
  expected.adapter = adapter;
}

for (const [key, value] of Object.entries(expected)) {
  if (metadata[key] !== value) {
    console.error(`${file}: expected ${key}=${JSON.stringify(value)}, got ${JSON.stringify(metadata[key])}`);
    process.exit(1);
  }
}
NODE
  then
    fail "$label metadata fields do not match the installed profile"
  fi
}

assert_skill_content_digest() {
  local installed_root="$1" label="$2"
  if ! node - "$installed_root" <<'NODE'
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = process.argv[2];
const metadataPath = path.join(root, '.skill-meta.json');
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
if (!/^[0-9a-f]{64}$/.test(metadata.contentSha256 || '')) {
  console.error(`${metadataPath}: contentSha256 must be lowercase 64-character hexadecimal`);
  process.exit(1);
}

const relativePaths = [];
function walk(current, prefix = '') {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(current, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`symbolic link is not hashable: ${relativePath}`);
    }
    if (entry.isDirectory()) {
      walk(absolutePath, relativePath);
    } else if (entry.isFile() && relativePath !== '.skill-meta.json') {
      relativePaths.push(relativePath);
    }
  }
}
walk(root);
relativePaths.sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));

const hash = crypto.createHash('sha256');
hash.update(Buffer.from('craftroster-skill-content-v1\0'));
for (const relativePath of relativePaths) {
  const content = fs.readFileSync(path.join(root, ...relativePath.split('/')));
  hash.update(Buffer.from(relativePath));
  hash.update(Buffer.from([0]));
  hash.update(Buffer.from(String(content.length)));
  hash.update(Buffer.from([0]));
  hash.update(content);
  hash.update(Buffer.from([0]));
}
const actual = hash.digest('hex');
if (actual !== metadata.contentSha256) {
  console.error(`${metadataPath}: expected contentSha256=${actual}, got ${metadata.contentSha256}`);
  process.exit(1);
}
NODE
  then
    fail "$label Skill content digest is missing or invalid"
  fi
}

assert_skill_profile() {
  local destination_root="$1" skill_name="$2" ownership_target="$3" label="$4"
  local installed_root="$destination_root/$skill_name"
  assert_metadata "$installed_root/.skill-meta.json" "skill" "$skill_name" "$ownership_target" "" "$label"
  assert_skill_content_digest "$installed_root" "$label"
  cmp -s "$REPO_ROOT/skills/$skill_name/SKILL.md" "$installed_root/SKILL.md" ||
    fail "$label Skill content does not match its catalog source"
}

assert_agent_profile() {
  local installed_file="$1" agent_name="$2" ownership_target="$3" adapter="$4" label="$5"
  assert_metadata "$installed_file.craftroster.json" "agent" "$agent_name" "$ownership_target" "$adapter" "$label"
  local suffix="${installed_file##*/$agent_name}"
  cmp -s "$REPO_ROOT/adapters/$adapter/$agent_name$suffix" "$installed_file" ||
    fail "$label Agent content does not match the $adapter adapter"
}

count_skill_dirs() {
  local root="$1" count=0 dir
  shopt -s nullglob
  for dir in "$root"/*; do
    [[ -f "$dir/SKILL.md" ]] && count=$((count + 1))
  done
  shopt -u nullglob
  printf '%s' "$count"
}

count_skill_metadata() {
  find "$1" -mindepth 2 -maxdepth 2 -type f -name '.skill-meta.json' -print | wc -l | tr -d ' '
}

count_profile_files() {
  find "$1" -maxdepth 1 -type f -name "$2" -print | wc -l | tr -d ' '
}

count_output_lines() {
  local pattern="$1"
  printf '%s\n' "$LAST_OUTPUT" | grep -Ec "$pattern" || true
}

export HOME="$SMOKE_ROOT/home"
export CODEX_HOME="$HOME/.codex"
export XDG_CONFIG_HOME="$HOME/.config"
export OPENCODE_CONFIG_DIR="$XDG_CONFIG_HOME/opencode"
mkdir -p "$HOME" "$PROJECT_ROOT"

expect_failure "Bash missing option value" "Missing value for --target" --target
expect_failure "Bash option token is not a value" "Missing value for --target" --target -h
expect_failure "Bash strict Skill name" "Invalid Skill Name" \
  --target codex --type skill --name 'Bad Name' --source-dir "$REPO_ROOT" --dry-run
expect_failure "Bash strict repository coordinate" "Invalid GitHub repository" \
  --target codex --type skill --name terminal-ops --repo owner/repo/extra --source-dir "$REPO_ROOT" --dry-run
expect_failure "Bash strict branch name" "Invalid branch" \
  --target codex --type skill --name terminal-ops --branch 'main branch' --source-dir "$REPO_ROOT" --dry-run
export CRAFTROSTER_INSTALL_TEST_FAULT=skill-commit-after-backup
expect_failure "Bash fault injection requires test gate" "requires CRAFTROSTER_INSTALL_TEST_MODE=enabled" \
  --target codex --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dry-run
unset CRAFTROSTER_INSTALL_TEST_FAULT
export CRAFTROSTER_INSTALL_TEST_MODE=true
expect_failure "Bash test gate has strict value" "must be unset or exactly 'enabled'" \
  --target codex --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dry-run
unset CRAFTROSTER_INSTALL_TEST_MODE

CANONICAL_DIGEST_EXPECTED='b2554ea43bb23e6a7765c32462897815f250cd749467357ddf4ac94478fec3dc'
CANONICAL_SOURCE_ROOT="$SMOKE_ROOT/canonical-digest-source"
CANONICAL_SKILL_ROOT="$CANONICAL_SOURCE_ROOT/skills/canonical-digest-fixture"
CANONICAL_DESTINATION_ROOT="$SMOKE_ROOT/canonical-digest-destination"
CANONICAL_NONASCII_NAME="$(printf '\350\263\207\346\226\231.txt')"
mkdir -p "$CANONICAL_SKILL_ROOT/nested"
write_skill_dependency_index "$CANONICAL_SOURCE_ROOT"
printf '%s\n' '---' 'name: canonical-digest-fixture' 'description: Canonical digest fixture.' 'license: Apache-2.0' '---' > "$CANONICAL_SKILL_ROOT/SKILL.md"
printf 'alpha\n' > "$CANONICAL_SKILL_ROOT/nested/plain.txt"
printf '\350\267\250\345\271\263\345\217\260\n' > "$CANONICAL_SKILL_ROOT/nested/$CANONICAL_NONASCII_NAME"
printf '\000\001\002\012\015\377\200\101' > "$CANONICAL_SKILL_ROOT/binary.dat"
run_installer "canonical cross-platform Skill digest fixture" \
  --target claude --type skill --name canonical-digest-fixture --source-dir "$CANONICAL_SOURCE_ROOT" --dir "$CANONICAL_DESTINATION_ROOT"
CANONICAL_DIGEST_ACTUAL="$(node -e 'const fs=require("fs"); console.log(JSON.parse(fs.readFileSync(process.argv[1], "utf8")).contentSha256)' "$CANONICAL_DESTINATION_ROOT/canonical-digest-fixture/.skill-meta.json")"
assert_equal "$CANONICAL_DIGEST_ACTUAL" "$CANONICAL_DIGEST_EXPECTED" "canonical nested/binary/non-ASCII Skill digest"
log_pass "canonical nested, binary, and non-ASCII Skill digest"

DEPENDENCY_SOURCE="$SMOKE_ROOT/dependency-source"
for fixture_name in root-skill left-skill right-skill base-skill conditional-skill optional-skill optional-base; do
  mkdir -p "$DEPENDENCY_SOURCE/skills/$fixture_name"
  printf '%s\n' '---' "name: $fixture_name" 'description: Dependency installation fixture.' 'license: Apache-2.0' '---' > "$DEPENDENCY_SOURCE/skills/$fixture_name/SKILL.md"
done
mkdir -p "$DEPENDENCY_SOURCE/skills/base-skill/references"
printf 'shared dependency evidence\n' > "$DEPENDENCY_SOURCE/skills/base-skill/references/proof.md"
printf 'Read [proof](../base-skill/references/proof.md).\n' >> "$DEPENDENCY_SOURCE/skills/left-skill/SKILL.md"
DEPENDENCY_ROWS=$'conditional-skill\troot-skill\tconditional\tOnly when root orchestration is requested.\nleft-skill\tbase-skill\trequired\t-\noptional-base\troot-skill\toptional\t-\noptional-skill\toptional-base\trequired\t-\nright-skill\tbase-skill\trequired\t-\nroot-skill\tconditional-skill\tconditional\tOnly when conditional output is requested.\nroot-skill\tleft-skill\trequired\t-\nroot-skill\toptional-skill\toptional\t-\nroot-skill\tright-skill\trequired\t-\n'
write_skill_dependency_index "$DEPENDENCY_SOURCE" "$DEPENDENCY_ROWS"
printf 'type\tcategory\tname\nskill\tlibrary\tbase-skill\nskill\tlibrary\tconditional-skill\nskill\tlibrary\tleft-skill\nskill\tlibrary\toptional-base\nskill\tlibrary\toptional-skill\nskill\tlibrary\tright-skill\nskill\tchosen\troot-skill\n' > "$DEPENDENCY_SOURCE/scripts/data/install-category-index.tsv"
DEPENDENCY_DRY_ROOT="$SMOKE_ROOT/dependency-dry-run"
run_installer "required dependency diamond dry run" \
  --target claude --name root-skill --source-dir "$DEPENDENCY_SOURCE" --dir "$DEPENDENCY_DRY_ROOT" --dry-run
DEPENDENCY_ORDER="$(printf '%s\n' "$LAST_OUTPUT" | awk '/^DRY-RUN install Skill / { printf "%s%s", separator, $4; separator="," }')"
assert_equal "$DEPENDENCY_ORDER" 'base-skill,left-skill,right-skill,root-skill' 'dependency topological order and diamond deduplication'
[[ "$LAST_OUTPUT" == *'Optional dependency not auto-installed: root-skill -> optional-skill'* ]] || fail 'Optional dependency was not explained in dry run'
[[ ! -e "$DEPENDENCY_DRY_ROOT" ]] || fail 'Dependency dry run wrote the destination'
DEPENDENCY_PROJECT="$SMOKE_ROOT/dependency-project"
run_installer "cross-category required dependencies in both project profiles" \
  --target project --category chosen --source-dir "$DEPENDENCY_SOURCE" --dir "$DEPENDENCY_PROJECT"
for relative_root in .agents/skills .claude/skills; do
  installed_root="$DEPENDENCY_PROJECT/$relative_root"
  assert_equal "$(count_skill_dirs "$installed_root")" 4 'required closure count'
  cmp -s "$installed_root/left-skill/../base-skill/references/proof.md" "$DEPENDENCY_SOURCE/skills/base-skill/references/proof.md" || fail 'Installed sibling resource is missing or changed'
  for not_selected in conditional-skill optional-skill optional-base; do
    [[ ! -e "$installed_root/$not_selected" ]] || fail "$not_selected was installed automatically"
  done
done
run_installer "matching owned dependencies update" \
  --target project --name root-skill --source-dir "$DEPENDENCY_SOURCE" --dir "$DEPENDENCY_PROJECT"
run_installer "full dependency inventory remains deduplicated" \
  --target claude --source-dir "$DEPENDENCY_SOURCE" --dir "$DEPENDENCY_DRY_ROOT" --dry-run
assert_equal "$(count_output_lines '^DRY-RUN install Skill ')" 7 'full dependency inventory count'

OPTIONAL_EXPLICIT_ROOT="$SMOKE_ROOT/optional-explicit"
run_installer 'explicit optional target installs only its own required closure' \
  --target claude --name optional-skill --source-dir "$DEPENDENCY_SOURCE" --dir "$OPTIONAL_EXPLICIT_ROOT"
assert_equal "$(count_skill_dirs "$OPTIONAL_EXPLICIT_ROOT")" 2 'explicit optional target and required base count'
for fixture_name in optional-skill optional-base; do
  cmp -s "$OPTIONAL_EXPLICIT_ROOT/$fixture_name/SKILL.md" "$DEPENDENCY_SOURCE/skills/$fixture_name/SKILL.md" || fail "Explicit $fixture_name source differs"
done
[[ ! -e "$OPTIONAL_EXPLICIT_ROOT/root-skill" ]] || fail 'Optional back-edge expanded the root'

OPTIONAL_FOREIGN_ROOT="$SMOKE_ROOT/optional-foreign"
OPTIONAL_FOREIGN="$OPTIONAL_FOREIGN_ROOT/optional-skill"
mkdir -p "$OPTIONAL_FOREIGN"
printf 'foreign optional content' > "$OPTIONAL_FOREIGN/user.txt"
run_installer 'force on owner preserves unselected optional foreign files' \
  --target claude --name root-skill --source-dir "$DEPENDENCY_SOURCE" --dir "$OPTIONAL_FOREIGN_ROOT" --force
assert_equal "$(cat "$OPTIONAL_FOREIGN/user.txt")" 'foreign optional content' 'foreign optional content preserved'
[[ ! -e "$OPTIONAL_FOREIGN/SKILL.md" && ! -e "$OPTIONAL_FOREIGN/.skill-meta.json" ]] || fail 'Optional source or metadata was written'
[[ ! -e "$OPTIONAL_FOREIGN_ROOT/optional-base" ]] || fail 'Unselected optional required closure was installed'

DEPENDENCY_FOREIGN="$SMOKE_ROOT/dependency-foreign"
FOREIGN_BASE="$DEPENDENCY_FOREIGN/.claude/skills/base-skill"
mkdir -p "$FOREIGN_BASE"
printf 'foreign content' > "$FOREIGN_BASE/user.txt"
expect_failure 'foreign dependency blocks every project profile' 'no matching CraftRoster metadata' \
  --target project --name root-skill --source-dir "$DEPENDENCY_SOURCE" --dir "$DEPENDENCY_FOREIGN"
[[ ! -e "$DEPENDENCY_FOREIGN/.agents" ]] || fail 'Foreign dependency left a partial first-profile install'
assert_equal "$(cat "$FOREIGN_BASE/user.txt")" 'foreign content' 'foreign dependency preserved'

DEPENDENCY_MODIFIED="$SMOKE_ROOT/dependency-modified"
run_installer 'prepare owned dependency' \
  --target claude --name base-skill --source-dir "$DEPENDENCY_SOURCE" --dir "$DEPENDENCY_MODIFIED"
MODIFIED_PROOF="$DEPENDENCY_MODIFIED/base-skill/references/proof.md"
printf 'local change' > "$MODIFIED_PROOF"
expect_failure 'modified dependency blocks installation' 'installed Skill content has changed since the last CraftRoster install' \
  --target claude --name root-skill --source-dir "$DEPENDENCY_SOURCE" --dir "$DEPENDENCY_MODIFIED"
assert_equal "$(count_skill_dirs "$DEPENDENCY_MODIFIED")" 1 'modified dependency no partial install'
assert_equal "$(cat "$MODIFIED_PROOF")" 'local change' 'modified dependency preserved'
run_installer 'explicit force resets modified dependency' \
  --target claude --name root-skill --source-dir "$DEPENDENCY_SOURCE" --dir "$DEPENDENCY_MODIFIED" --force
cmp -s "$MODIFIED_PROOF" "$DEPENDENCY_SOURCE/skills/base-skill/references/proof.md" || fail 'Forced dependency not restored'

DEPENDENCY_INVALID_ROOT="$SMOKE_ROOT/dependency-invalid"
for invalid_case in cycle unknown owner optional-unknown optional-condition kind self duplicate malformed extra empty condition nul; do
  case "$invalid_case" in
    cycle) invalid_rows="$DEPENDENCY_ROWS"$'base-skill\troot-skill\trequired\t-\n'; expected_message='Required Skill dependency cycle' ;;
    unknown) invalid_rows=$'root-skill\tmissing-skill\trequired\t-\n'; expected_message='Skill not found in archive: missing-skill' ;;
    owner) invalid_rows=$'missing-skill\tbase-skill\trequired\t-\n'; expected_message='Skill not found in archive: missing-skill' ;;
    optional-unknown) invalid_rows=$'root-skill\tmissing-skill\toptional\t-\n'; expected_message='Skill not found in archive: missing-skill' ;;
    optional-condition) invalid_rows=$'root-skill\toptional-skill\toptional\tSometimes\n'; expected_message='contains an invalid value' ;;
    kind) invalid_rows=$'root-skill\tbase-skill\trecommended\t-\n'; expected_message='contains an invalid value' ;;
    self) invalid_rows=$'root-skill\troot-skill\trequired\t-\n'; expected_message='self dependency' ;;
    duplicate) invalid_rows="$DEPENDENCY_ROWS"$'root-skill\tleft-skill\trequired\t-\n'; expected_message='duplicate dependency' ;;
    malformed) invalid_rows=$'root-skill\tbase-skill\trequired\n'; expected_message='must contain skill, dependency, kind, and when' ;;
    extra) invalid_rows=$'root-skill\tbase-skill\trequired\t-\textra\n'; expected_message='contains an invalid value' ;;
    empty) invalid_rows=$'root-skill\tbase-skill\tconditional\t\n'; expected_message='contains an invalid value' ;;
    condition) invalid_rows=$'root-skill\tbase-skill\tconditional\t-\n'; expected_message='contains an invalid value' ;;
    nul) invalid_rows="$DEPENDENCY_ROWS"; expected_message='contains a NUL byte' ;;
  esac
  write_skill_dependency_index "$DEPENDENCY_SOURCE" "$invalid_rows"
  if [[ "$invalid_case" == "nul" ]]; then printf '\0' >> "$DEPENDENCY_SOURCE/scripts/data/install-skill-dependencies.tsv"; fi
  expect_failure "invalid dependency $invalid_case" "$expected_message" \
    --target claude --name root-skill --source-dir "$DEPENDENCY_SOURCE" --dir "$DEPENDENCY_INVALID_ROOT"
  [[ ! -e "$DEPENDENCY_INVALID_ROOT" ]] || fail "Invalid dependency $invalid_case wrote to the destination"
done
printf 'skill\tdependency\tkind\n' > "$DEPENDENCY_SOURCE/scripts/data/install-skill-dependencies.tsv"
expect_failure 'invalid dependency header' 'invalid header' \
  --target claude --name root-skill --source-dir "$DEPENDENCY_SOURCE" --dir "$DEPENDENCY_INVALID_ROOT"
[[ ! -e "$DEPENDENCY_INVALID_ROOT" ]] || fail 'Invalid dependency header wrote to the destination'
rm -- "$DEPENDENCY_SOURCE/scripts/data/install-skill-dependencies.tsv"
expect_failure 'missing dependency index refuses incomplete source' 'Skill dependency index not found' \
  --target claude --name root-skill --source-dir "$DEPENDENCY_SOURCE" --dir "$DEPENDENCY_INVALID_ROOT"
[[ ! -e "$DEPENDENCY_INVALID_ROOT" ]] || fail 'Missing dependency index wrote to the destination'
write_skill_dependency_index "$DEPENDENCY_SOURCE" "$DEPENDENCY_ROWS"

BYTE_READER_FAILURE_BIN="$SMOKE_ROOT/byte-reader-failure-bin"
mkdir -p "$BYTE_READER_FAILURE_BIN"
printf '#!/bin/sh\nexit 71\n' > "$BYTE_READER_FAILURE_BIN/od"
chmod +x "$BYTE_READER_FAILURE_BIN/od"
PATH="$BYTE_READER_FAILURE_BIN:$PATH" expect_failure 'dependency byte inspection failure' 'Cannot inspect Skill dependency index bytes' \
  --target claude --name root-skill --source-dir "$DEPENDENCY_SOURCE" --dir "$DEPENDENCY_INVALID_ROOT"
[[ ! -e "$DEPENDENCY_INVALID_ROOT" ]] || fail 'Dependency byte inspection failure wrote to the destination'

ALTERNATE_DEPENDENCY_ROOT="$HOME/.agents/skills"
run_installer 'prepare alternate-root owned dependency' \
  --target codex --name base-skill --source-dir "$DEPENDENCY_SOURCE" --dir "$ALTERNATE_DEPENDENCY_ROOT"
expect_failure 'required dependency split roots refuse before writes' 'Required Skill dependency uses different roots' \
  --target codex --name root-skill --source-dir "$DEPENDENCY_SOURCE"
[[ ! -e "$CODEX_HOME/skills/root-skill" ]] || fail 'Split-root plan installed the requesting Skill'
[[ ! -e "$CODEX_HOME/skills/base-skill" ]] || fail 'Split-root plan duplicated its dependency'
cmp -s "$ALTERNATE_DEPENDENCY_ROOT/base-skill/references/proof.md" "$DEPENDENCY_SOURCE/skills/base-skill/references/proof.md" || fail 'Alternate-root dependency changed'
log_pass 'Bash dependency closure, references, conditional and optional selection, ownership, and placement'
if [[ "$SMOKE_MODE" == "dependencies" ]]; then
  log_pass 'Bash dependency smoke passed; remaining installer scenarios not run.'
  exit 0
fi

CATEGORY_INDEX="$REPO_ROOT/scripts/data/install-category-index.tsv"
BROWSER_SKILL_COUNT="$(awk -F '\t' '$1 == "skill" && $2 == "browser-automation" { count++ } END { print count + 0 }' "$CATEGORY_INDEX")"
FINANCE_AGENT_COUNT="$(awk -F '\t' '$1 == "agent" && $2 == "finance" { count++ } END { print count + 0 }' "$CATEGORY_INDEX")"
CATEGORY_SKILL_ROOT="$SMOKE_ROOT/category-skill-project"
CATEGORY_AGENT_ROOT="$SMOKE_ROOT/category-agent-project"
mkdir -p "$CATEGORY_SKILL_ROOT" "$CATEGORY_AGENT_ROOT"

expect_failure "Skill category and name conflict" "Name and Category cannot be used together" \
  --target project --type skill --name browser-automation --category browser-automation --source-dir "$REPO_ROOT" --dir "$CATEGORY_SKILL_ROOT"
expect_failure "invalid Skill category" "Available Skill categories" \
  --target project --type skill --category missing-category --source-dir "$REPO_ROOT" --dir "$CATEGORY_SKILL_ROOT"
run_installer "project Skill category dry run" \
  --target project --type skill --category browser-automation --source-dir "$REPO_ROOT" --dir "$CATEGORY_SKILL_ROOT" --dry-run
[[ "$LAST_OUTPUT" == *"Selected $BROWSER_SKILL_COUNT skill component(s) from category 'browser-automation'"* ]] ||
  fail "Skill category dry run did not report the selected component count"
[[ -z "$(find "$CATEGORY_SKILL_ROOT" -mindepth 1 -maxdepth 1 -print -quit)" ]] ||
  fail "Skill category dry run wrote to the destination"
run_installer "project Skill category install" \
  --target project --type skill --category browser-automation --source-dir "$REPO_ROOT" --dir "$CATEGORY_SKILL_ROOT"
for root in "$CATEGORY_SKILL_ROOT/.agents/skills" "$CATEGORY_SKILL_ROOT/.claude/skills"; do
  assert_equal "$(count_skill_dirs "$root")" "$((BROWSER_SKILL_COUNT + 1))" "$root browser-automation category plus required Python baseline count"
  [[ -f "$root/python-development/SKILL.md" ]] || fail "Browser category did not install the required Python baseline in $root"
done

run_installer "project Agent category install" \
  --target project --type agent --category finance --source-dir "$REPO_ROOT" --dir "$CATEGORY_AGENT_ROOT"
CATEGORY_AGENT_ROOTS=(
  "$CATEGORY_AGENT_ROOT/.codex/agents"
  "$CATEGORY_AGENT_ROOT/.claude/agents"
  "$CATEGORY_AGENT_ROOT/.cursor/agents"
  "$CATEGORY_AGENT_ROOT/.github/agents"
  "$CATEGORY_AGENT_ROOT/.opencode/agents"
)
CATEGORY_AGENT_PATTERNS=('*.toml' '*.md' '*.md' '*.agent.md' '*.md')
for ((index = 0; index < ${#CATEGORY_AGENT_ROOTS[@]}; index++)); do
  assert_equal "$(count_profile_files "${CATEGORY_AGENT_ROOTS[$index]}" "${CATEGORY_AGENT_PATTERNS[$index]}")" "$FINANCE_AGENT_COUNT" "Agent category profile $index count"
done
[[ ! -d "$CATEGORY_AGENT_ROOT/.agents/skills/subagent-architecture" ]] ||
  fail "Agent category install unexpectedly installed the companion Skill"
log_pass "Bash Skill and Agent category installs"

if [[ "$SMOKE_MODE" == "quick" ]]; then
  run_installer "project all Skills install" \
    --target project --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$PROJECT_ROOT"
  run_installer "project all Agents install" \
    --target project --type agent --name code-reviewer --source-dir "$REPO_ROOT" --dir "$PROJECT_ROOT"
else
  run_installer "project all Skills install" \
    --target project --type skill --source-dir "$REPO_ROOT" --dir "$PROJECT_ROOT"
  run_installer "project all Agents install" \
    --target project --type agent --source-dir "$REPO_ROOT" --dir "$PROJECT_ROOT"
fi

for root in "$PROJECT_ROOT/.agents/skills" "$PROJECT_ROOT/.claude/skills"; do
  assert_equal "$(count_skill_dirs "$root")" "$EXPECTED_PROJECT_SKILLS" "$root Skill count"
  assert_equal "$(count_skill_metadata "$root")" "$EXPECTED_PROJECT_SKILLS" "$root Skill metadata count"
  assert_skill_profile "$root" "terminal-ops" "project" "$root representative"
done

PROFILE_ROOTS=(
  "$PROJECT_ROOT/.codex/agents"
  "$PROJECT_ROOT/.claude/agents"
  "$PROJECT_ROOT/.cursor/agents"
  "$PROJECT_ROOT/.github/agents"
  "$PROJECT_ROOT/.opencode/agents"
)
PROFILE_PATTERNS=('*.toml' '*.md' '*.md' '*.agent.md' '*.md')
PROFILE_SUFFIXES=('.toml' '.md' '.md' '.agent.md' '.md')
PROFILE_ADAPTERS=('codex' 'claude' 'cursor' 'copilot' 'opencode')
for ((index = 0; index < ${#PROFILE_ROOTS[@]}; index++)); do
  assert_equal "$(count_profile_files "${PROFILE_ROOTS[$index]}" "${PROFILE_PATTERNS[$index]}")" "$EXPECTED_PROJECT_AGENTS" "Agent profile $index count"
  assert_equal "$(count_profile_files "${PROFILE_ROOTS[$index]}" '*.craftroster.json')" "$EXPECTED_PROJECT_AGENTS" "Agent profile $index metadata count"
  assert_agent_profile \
    "${PROFILE_ROOTS[$index]}/code-reviewer${PROFILE_SUFFIXES[$index]}" \
    "code-reviewer" \
    "project" \
    "${PROFILE_ADAPTERS[$index]}" \
    "Agent profile $index representative"
done
log_pass "project profile counts, source content, and parsed ownership metadata"

run_installer "project Skill update" \
  --target project --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$PROJECT_ROOT"
assert_equal "$(count_output_lines '^OK  update Skill ')" 2 "project Skill update count"

run_installer "project Agent update" \
  --target project --type agent --name code-reviewer --source-dir "$REPO_ROOT" --dir "$PROJECT_ROOT"
assert_equal "$(count_output_lines '^OK  update Agent ')" 5 "project Agent update count"

rm -f -- "$PROJECT_ROOT/.codex/agents/code-reviewer.toml"
run_installer "project Agent repair" \
  --target project --type agent --name code-reviewer --source-dir "$REPO_ROOT" --dir "$PROJECT_ROOT"
assert_equal "$(count_output_lines '^OK  repair Agent ')" 1 "project Agent repair count"
assert_equal "$(count_output_lines '^OK  update Agent ')" 4 "project unaffected Agent update count"
[[ -f "$PROJECT_ROOT/.codex/agents/code-reviewer.toml" ]] || fail "project Agent repair did not restore the file"

SKILL_COLLISION_ROOT="$SMOKE_ROOT/project-skill-collision"
SKILL_COLLISION_FILE="$SKILL_COLLISION_ROOT/.claude/skills/python-development/SKILL.md"
SKILL_SENTINEL='FOREIGN-SKILL-SENTINEL: this directory is not owned by CraftRoster'
mkdir -p "$(dirname "$SKILL_COLLISION_FILE")"
printf '%s\n' "$SKILL_SENTINEL" > "$SKILL_COLLISION_FILE"
SKILL_COLLISION_CHECKSUM="$(cksum < "$SKILL_COLLISION_FILE")"
expect_failure "project Skill ownership collision" "no matching CraftRoster metadata" \
  --target project --type skill --name python-development --source-dir "$REPO_ROOT" --dir "$SKILL_COLLISION_ROOT"
assert_equal "$(cksum < "$SKILL_COLLISION_FILE")" "$SKILL_COLLISION_CHECKSUM" "foreign Skill sentinel checksum"
assert_equal "$(cat "$SKILL_COLLISION_FILE")" "$SKILL_SENTINEL" "foreign Skill sentinel content"
[[ ! -e "$SKILL_COLLISION_ROOT/.claude/skills/python-development/.skill-meta.json" ]] || fail "Skill collision added ownership metadata to foreign content"
[[ ! -e "$SKILL_COLLISION_ROOT/.agents/skills/python-development" ]] || fail "Skill collision left a partial first-profile install"

AGENT_COLLISION_ROOT="$SMOKE_ROOT/project-agent-collision"
AGENT_COLLISION_FILE="$AGENT_COLLISION_ROOT/.opencode/agents/code-reviewer.md"
AGENT_SENTINEL='FOREIGN-AGENT-SENTINEL: this file is not owned by CraftRoster'
mkdir -p "$(dirname "$AGENT_COLLISION_FILE")"
printf '%s\n' "$AGENT_SENTINEL" > "$AGENT_COLLISION_FILE"
AGENT_COLLISION_CHECKSUM="$(cksum < "$AGENT_COLLISION_FILE")"
expect_failure "project Agent ownership collision" "no matching CraftRoster metadata" \
  --target project --type agent --name code-reviewer --source-dir "$REPO_ROOT" --dir "$AGENT_COLLISION_ROOT"
assert_equal "$(cksum < "$AGENT_COLLISION_FILE")" "$AGENT_COLLISION_CHECKSUM" "foreign Agent sentinel checksum"
assert_equal "$(cat "$AGENT_COLLISION_FILE")" "$AGENT_SENTINEL" "foreign Agent sentinel content"
[[ ! -e "$AGENT_COLLISION_FILE.craftroster.json" ]] || fail "Agent collision added ownership metadata to foreign content"
for partial in \
  '.codex/agents/code-reviewer.toml' \
  '.claude/agents/code-reviewer.md' \
  '.cursor/agents/code-reviewer.md' \
  '.github/agents/code-reviewer.agent.md'; do
  [[ ! -e "$AGENT_COLLISION_ROOT/$partial" ]] || fail "Agent collision left a partial profile install: $partial"
done

SKILL_OWNERSHIP_ROOT="$SMOKE_ROOT/skill-ownership-matrix"
run_installer "Skill ownership matrix baseline install" \
  --target claude --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$SKILL_OWNERSHIP_ROOT"
OWNED_SKILL_ROOT="$SKILL_OWNERSHIP_ROOT/terminal-ops"
OWNED_SKILL_FILE="$OWNED_SKILL_ROOT/SKILL.md"
OWNED_SKILL_META="$OWNED_SKILL_ROOT/.skill-meta.json"
OWNED_SKILL_BASELINE_META="$(cat "$OWNED_SKILL_META")"
OWNED_SKILL_BASELINE_CHECKSUM="$(cksum < "$OWNED_SKILL_FILE")"

SKILL_METADATA_FIELDS=('repo' 'component' 'name' 'target' 'contentSha256')
SKILL_METADATA_VALUES=('foreign/repository' 'agent' 'python-development' 'codex' 'invalid-digest')
SKILL_METADATA_MESSAGES=('installed from' 'ownership metadata does not match' 'ownership metadata does not match' 'ownership metadata does not match' 'contentSha256 is not a valid lowercase 64-character SHA-256 digest')
for ((index = 0; index < ${#SKILL_METADATA_FIELDS[@]}; index++)); do
  printf '%s\n' "$OWNED_SKILL_BASELINE_META" > "$OWNED_SKILL_META"
  mutate_json_string "$OWNED_SKILL_META" "${SKILL_METADATA_FIELDS[$index]}" "${SKILL_METADATA_VALUES[$index]}"
  expect_failure "Skill ownership ${SKILL_METADATA_FIELDS[$index]} mismatch" "${SKILL_METADATA_MESSAGES[$index]}" \
    --target claude --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$SKILL_OWNERSHIP_ROOT"
  assert_equal "$(cksum < "$OWNED_SKILL_FILE")" "$OWNED_SKILL_BASELINE_CHECKSUM" "Skill ownership ${SKILL_METADATA_FIELDS[$index]} mismatch content checksum"
done

printf '%s\n' "$OWNED_SKILL_BASELINE_META" > "$OWNED_SKILL_META"
delete_json_field "$OWNED_SKILL_META" contentSha256
expect_failure "Skill unverified missing content digest refusal" "does not match a verified legacy Skill release" \
  --target claude --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$SKILL_OWNERSHIP_ROOT"
assert_equal "$(cksum < "$OWNED_SKILL_FILE")" "$OWNED_SKILL_BASELINE_CHECKSUM" "unverified missing digest preserved Skill content"

LEGACY_SKILL_DIGEST="$(single_file_skill_digest "$OWNED_SKILL_FILE" 'autoverse-skill-content-v1')"
printf '%s\n' "$OWNED_SKILL_BASELINE_META" > "$OWNED_SKILL_META"
mutate_json_string "$OWNED_SKILL_META" contentSha256 "$LEGACY_SKILL_DIGEST"
run_installer "Skill legacy digest namespace migration" \
  --target claude --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$SKILL_OWNERSHIP_ROOT"
assert_equal "$(count_output_lines '^OK  migrate-update Skill ')" 1 "Skill legacy digest migration count"
assert_skill_profile "$SKILL_OWNERSHIP_ROOT" terminal-ops claude "legacy digest migrated Skill"

printf '%s\n' "$OWNED_SKILL_BASELINE_META" > "$OWNED_SKILL_META"
mutate_json_string "$OWNED_SKILL_META" repo "$LEGACY_REPO"
mutate_json_string "$OWNED_SKILL_META" contentSha256 "$LEGACY_SKILL_DIGEST"
run_installer "Skill legacy repository migration" \
  --target claude --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$SKILL_OWNERSHIP_ROOT"
assert_equal "$(count_output_lines '^OK  migrate-update Skill ')" 1 "Skill legacy repository migration count"
assert_skill_profile "$SKILL_OWNERSHIP_ROOT" terminal-ops claude "legacy repository migrated Skill"

printf '%s\n' "$OWNED_SKILL_BASELINE_META" > "$OWNED_SKILL_META"
mutate_json_string "$OWNED_SKILL_META" repo "$LEGACY_REPO"
expect_failure "Skill explicit repository disables transition" "installed from '$LEGACY_REPO'" \
  --target claude --type skill --name terminal-ops --repo "$EXPECTED_REPO" --source-dir "$REPO_ROOT" --dir "$SKILL_OWNERSHIP_ROOT"
assert_equal "$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).repo)' "$OWNED_SKILL_META")" "$LEGACY_REPO" "explicit repository refusal preserved legacy Skill owner"

LEGACY_SKILL_ROOT="$SMOKE_ROOT/legacy-skill-migration"
mkdir -p "$LEGACY_SKILL_ROOT"
cp -R "$LEGACY_SKILL_FIXTURE" "$LEGACY_SKILL_ROOT/"
LEGACY_SKILL_TARGET="$LEGACY_SKILL_ROOT/terminal-ops"
node - "$LEGACY_SKILL_TARGET/.skill-meta.json" "$LEGACY_REPO" <<'NODE'
const fs = require('fs');
const [file, repo] = process.argv.slice(2);
fs.writeFileSync(file, `${JSON.stringify({
  source: 'local-checkout',
  repo,
  branch: 'main',
  name: 'terminal-ops',
  agent: 'vscode',
  installedAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}, null, 2)}\n`);
NODE
printf '\nLOCAL_DRIFT_SENTINEL\n' >> "$LEGACY_SKILL_TARGET/SKILL.md"
expect_failure "legacy Skill schema local drift refusal" "does not match a verified legacy Skill release" \
  --target copilot --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$LEGACY_SKILL_ROOT"
grep -Fq LOCAL_DRIFT_SENTINEL "$LEGACY_SKILL_TARGET/SKILL.md" || fail "legacy Skill drift was not preserved"
cp "$LEGACY_SKILL_FIXTURE/SKILL.md" "$LEGACY_SKILL_TARGET/SKILL.md"
CRLF_SOURCE_ROOT="$SMOKE_ROOT/crlf-legacy-manifest-source"
mkdir -p "$CRLF_SOURCE_ROOT/skills" "$CRLF_SOURCE_ROOT/scripts/data"
write_skill_dependency_index "$CRLF_SOURCE_ROOT"
cp -R "$REPO_ROOT/skills/terminal-ops" "$CRLF_SOURCE_ROOT/skills/"
awk '{ sub(/\r$/, ""); printf "%s\r\n", $0 }' \
  "$REPO_ROOT/scripts/data/legacy-skill-content-sha256.tsv" \
  > "$CRLF_SOURCE_ROOT/scripts/data/legacy-skill-content-sha256.tsv"
run_installer "legacy Skill schema migration with CRLF digest manifest" \
  --target copilot --type skill --name terminal-ops --source-dir "$CRLF_SOURCE_ROOT" --dir "$LEGACY_SKILL_ROOT"
assert_equal "$(count_output_lines '^OK  migrate-update Skill ')" 1 "legacy Skill schema CRLF manifest migration count"
assert_skill_profile "$LEGACY_SKILL_ROOT" terminal-ops copilot "legacy schema migrated Skill"

printf '{\n' > "$OWNED_SKILL_META"
expect_failure "Skill malformed ownership metadata" "strict flat JSON object" \
  --target claude --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$SKILL_OWNERSHIP_ROOT"
assert_equal "$(cksum < "$OWNED_SKILL_FILE")" "$OWNED_SKILL_BASELINE_CHECKSUM" "Skill malformed metadata content checksum"

FORCE_INVALID_ROOT="$SMOKE_ROOT/force-invalid-metadata-race"
mkdir -p "$FORCE_INVALID_ROOT"
cp -R "$REPO_ROOT/skills/terminal-ops" "$FORCE_INVALID_ROOT/"
FORCE_INVALID_SKILL="$FORCE_INVALID_ROOT/terminal-ops/SKILL.md"
FORCE_INVALID_META="$FORCE_INVALID_ROOT/terminal-ops/.skill-meta.json"
printf '{\n' > "$FORCE_INVALID_META"
FORCE_INVALID_SKILL_CHECKSUM="$(cksum < "$FORCE_INVALID_SKILL")"
export CRAFTROSTER_INSTALL_TEST_MODE=enabled
export CRAFTROSTER_INSTALL_TEST_FAULT=skill-force-invalid-metadata-changes-after-recheck
expect_failure "forced malformed Skill metadata race" "ownership metadata, filesystem identity, or content changed" \
  --target claude --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$FORCE_INVALID_ROOT" --force
unset CRAFTROSTER_INSTALL_TEST_MODE CRAFTROSTER_INSTALL_TEST_FAULT
assert_equal "$(cksum < "$FORCE_INVALID_SKILL")" "$FORCE_INVALID_SKILL_CHECKSUM" "forced malformed metadata race Skill checksum"
grep -Fq 'test-only malformed metadata newcomer mutation' "$FORCE_INVALID_META" || fail "forced malformed metadata race removed its newcomer mutation"
if find "$FORCE_INVALID_ROOT" -mindepth 1 -maxdepth 1 -name '.craftroster-skill-*' -print | grep -q .; then
  fail "forced malformed metadata race left transaction residue"
fi

FORCE_MISSING_ROOT="$SMOKE_ROOT/force-missing-metadata-race"
mkdir -p "$FORCE_MISSING_ROOT"
cp -R "$REPO_ROOT/skills/terminal-ops" "$FORCE_MISSING_ROOT/"
FORCE_MISSING_SKILL="$FORCE_MISSING_ROOT/terminal-ops/SKILL.md"
FORCE_MISSING_META="$FORCE_MISSING_ROOT/terminal-ops/.skill-meta.json"
FORCE_MISSING_SKILL_CHECKSUM="$(cksum < "$FORCE_MISSING_SKILL")"
export CRAFTROSTER_INSTALL_TEST_MODE=enabled
export CRAFTROSTER_INSTALL_TEST_FAULT=skill-force-missing-metadata-appears-after-recheck
expect_failure "forced missing Skill metadata appearance race" "ownership metadata, filesystem identity, or content changed" \
  --target claude --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$FORCE_MISSING_ROOT" --force
unset CRAFTROSTER_INSTALL_TEST_MODE CRAFTROSTER_INSTALL_TEST_FAULT
assert_equal "$(cksum < "$FORCE_MISSING_SKILL")" "$FORCE_MISSING_SKILL_CHECKSUM" "forced missing metadata race Skill checksum"
[[ -f "$FORCE_MISSING_META" && ! -L "$FORCE_MISSING_META" ]] || fail "forced missing metadata race did not preserve the newcomer metadata"
assert_equal "$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).repo)' "$FORCE_MISSING_META")" "foreign/repository" "forced missing metadata race newcomer owner"
if find "$FORCE_MISSING_ROOT" -mindepth 1 -maxdepth 1 -name '.craftroster-skill-*' -print | grep -q .; then
  fail "forced missing metadata race left transaction residue"
fi

printf '%s\n' "$OWNED_SKILL_BASELINE_META" > "$OWNED_SKILL_META"
mutate_json_string "$OWNED_SKILL_META" repo foreign/repository
run_installer "Skill explicit force replacement" \
  --target claude --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$SKILL_OWNERSHIP_ROOT" --force
assert_equal "$(count_output_lines '^OK  force-replace Skill ')" 1 "Skill force replacement count"
assert_skill_profile "$SKILL_OWNERSHIP_ROOT" terminal-ops claude "forced Skill"

printf '\nLOCAL-DRIFT-SENTINEL\n' >> "$OWNED_SKILL_FILE"
DRIFTED_SKILL_CHECKSUM="$(cksum < "$OWNED_SKILL_FILE")"
DRIFTED_META_CHECKSUM="$(cksum < "$OWNED_SKILL_META")"
expect_failure "Skill local content drift refusal" "installed Skill content has changed since the last CraftRoster install" \
  --target claude --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$SKILL_OWNERSHIP_ROOT"
assert_equal "$(cksum < "$OWNED_SKILL_FILE")" "$DRIFTED_SKILL_CHECKSUM" "drift refusal Skill content checksum"
assert_equal "$(cksum < "$OWNED_SKILL_META")" "$DRIFTED_META_CHECKSUM" "drift refusal metadata checksum"
run_installer "Skill local drift explicit force reset" \
  --target claude --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$SKILL_OWNERSHIP_ROOT" --force
assert_equal "$(count_output_lines '^OK  force-replace Skill ')" 1 "Skill drift force reset count"
assert_skill_profile "$SKILL_OWNERSHIP_ROOT" terminal-ops claude "drift-reset Skill"

ROLLBACK_SKILL_CHECKSUM="$(cksum < "$OWNED_SKILL_FILE")"
ROLLBACK_META_CHECKSUM="$(cksum < "$OWNED_SKILL_META")"
ROLLBACK_META_CONTENT="$(cat "$OWNED_SKILL_META")"
export CRAFTROSTER_INSTALL_TEST_MODE=enabled
export CRAFTROSTER_INSTALL_TEST_FAULT=skill-commit-after-backup
expect_failure "Skill atomic rollback after backup" "Injected test-only Skill commit failure after backup" \
  --target claude --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$SKILL_OWNERSHIP_ROOT"
unset CRAFTROSTER_INSTALL_TEST_MODE CRAFTROSTER_INSTALL_TEST_FAULT
assert_equal "$(cksum < "$OWNED_SKILL_FILE")" "$ROLLBACK_SKILL_CHECKSUM" "Skill rollback content checksum"
assert_equal "$(cksum < "$OWNED_SKILL_META")" "$ROLLBACK_META_CHECKSUM" "Skill rollback metadata checksum"
assert_skill_profile "$SKILL_OWNERSHIP_ROOT" terminal-ops claude "rolled-back Skill"
if find "$SKILL_OWNERSHIP_ROOT" -mindepth 1 -maxdepth 1 -name '.craftroster-skill-*' -print | grep -q .; then
  fail "Skill rollback left a staging or backup directory"
fi

SKILL_CAPTURE_RACE_ROOT="$SMOKE_ROOT/skill-backup-capture-race"
run_installer "Skill backup capture race baseline install" \
  --target claude --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$SKILL_CAPTURE_RACE_ROOT"
SKILL_CAPTURE_TARGET="$SKILL_CAPTURE_RACE_ROOT/terminal-ops"
SKILL_CAPTURE_CONTENT_CHECKSUM="$(cksum < "$SKILL_CAPTURE_TARGET/SKILL.md")"
SKILL_CAPTURE_META_CHECKSUM="$(cksum < "$SKILL_CAPTURE_TARGET/.skill-meta.json")"
export CRAFTROSTER_INSTALL_TEST_MODE=enabled
export CRAFTROSTER_INSTALL_TEST_FAULT=skill-backup-capture-destination-race-portable-mv
expect_failure "Skill backup capture portable-mv race" "preserved the source for manual recovery" \
  --target claude --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$SKILL_CAPTURE_RACE_ROOT"
unset CRAFTROSTER_INSTALL_TEST_MODE CRAFTROSTER_INSTALL_TEST_FAULT
[[ ! -e "$SKILL_CAPTURE_TARGET" ]] || fail "Skill backup capture race unexpectedly recreated the exact destination"
SKILL_CAPTURE_CONTAINER="$(find "$SKILL_CAPTURE_RACE_ROOT" -mindepth 1 -maxdepth 1 -type d -name '.craftroster-skill-backup.*' -print)"
assert_equal "$(printf '%s\n' "$SKILL_CAPTURE_CONTAINER" | sed '/^$/d' | wc -l | tr -d ' ')" 1 "Skill backup capture race container count"
SKILL_CAPTURE_WRAPPER="$SKILL_CAPTURE_CONTAINER/original"
SKILL_CAPTURE_RECOVERY="$SKILL_CAPTURE_WRAPPER/terminal-ops"
[[ -f "$SKILL_CAPTURE_WRAPPER/CRAFTROSTER-NEWCOMER.txt" ]] || fail "Skill backup capture race removed the destination newcomer"
[[ -d "$SKILL_CAPTURE_RECOVERY" && ! -L "$SKILL_CAPTURE_RECOVERY" ]] || fail "Skill backup capture race did not preserve nested original Skill"
assert_equal "$(cksum < "$SKILL_CAPTURE_RECOVERY/SKILL.md")" "$SKILL_CAPTURE_CONTENT_CHECKSUM" "Skill backup capture race original content checksum"
assert_equal "$(cksum < "$SKILL_CAPTURE_RECOVERY/.skill-meta.json")" "$SKILL_CAPTURE_META_CHECKSUM" "Skill backup capture race original metadata checksum"
mv "$SKILL_CAPTURE_RECOVERY" "$SKILL_CAPTURE_TARGET"
rm "$SKILL_CAPTURE_WRAPPER/CRAFTROSTER-NEWCOMER.txt"
rmdir "$SKILL_CAPTURE_WRAPPER" "$SKILL_CAPTURE_CONTAINER"
assert_skill_profile "$SKILL_CAPTURE_RACE_ROOT" terminal-ops claude "manually recovered Skill capture race"

SKILL_RESTORE_RACE_ROOT="$SMOKE_ROOT/skill-backup-restore-race"
run_installer "Skill backup restore race baseline install" \
  --target claude --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$SKILL_RESTORE_RACE_ROOT"
SKILL_RESTORE_TARGET="$SKILL_RESTORE_RACE_ROOT/terminal-ops"
SKILL_RESTORE_CONTENT_CHECKSUM="$(cksum < "$SKILL_RESTORE_TARGET/SKILL.md")"
SKILL_RESTORE_META_CHECKSUM="$(cksum < "$SKILL_RESTORE_TARGET/.skill-meta.json")"
export CRAFTROSTER_INSTALL_TEST_MODE=enabled
export CRAFTROSTER_INSTALL_TEST_FAULT=skill-backup-restore-destination-race-portable-mv
expect_failure "Skill backup restore portable-mv race" "original Skill could not be restored" \
  --target claude --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$SKILL_RESTORE_RACE_ROOT"
unset CRAFTROSTER_INSTALL_TEST_MODE CRAFTROSTER_INSTALL_TEST_FAULT
[[ -f "$SKILL_RESTORE_TARGET/CRAFTROSTER-NEWCOMER.txt" ]] || fail "Skill backup restore race removed the destination newcomer"
SKILL_RESTORE_RECOVERY="$SKILL_RESTORE_TARGET/original"
[[ -d "$SKILL_RESTORE_RECOVERY" && ! -L "$SKILL_RESTORE_RECOVERY" ]] || fail "Skill backup restore race did not preserve nested original Skill"
assert_equal "$(cksum < "$SKILL_RESTORE_RECOVERY/SKILL.md")" "$SKILL_RESTORE_CONTENT_CHECKSUM" "Skill backup restore race original content checksum"
assert_equal "$(cksum < "$SKILL_RESTORE_RECOVERY/.skill-meta.json")" "$SKILL_RESTORE_META_CHECKSUM" "Skill backup restore race original metadata checksum"
if find "$SKILL_RESTORE_RACE_ROOT" -mindepth 1 -maxdepth 1 -type d -name '.craftroster-skill-stage.*' -print | grep -q .; then
  fail "Skill backup restore race left transaction staging content"
fi
SKILL_RESTORE_CONTAINER="$(find "$SKILL_RESTORE_RACE_ROOT" -mindepth 1 -maxdepth 1 -type d -name '.craftroster-skill-backup.*' -print)"
assert_equal "$(printf '%s\n' "$SKILL_RESTORE_CONTAINER" | sed '/^$/d' | wc -l | tr -d ' ')" 1 "Skill backup restore race container count"
SKILL_RESTORE_TEMP="$SKILL_RESTORE_RACE_ROOT/.manual-recovery-terminal-ops"
mv "$SKILL_RESTORE_RECOVERY" "$SKILL_RESTORE_TEMP"
rm "$SKILL_RESTORE_TARGET/CRAFTROSTER-NEWCOMER.txt"
rmdir "$SKILL_RESTORE_TARGET"
mv "$SKILL_RESTORE_TEMP" "$SKILL_RESTORE_TARGET"
rmdir "$SKILL_RESTORE_CONTAINER"
assert_skill_profile "$SKILL_RESTORE_RACE_ROOT" terminal-ops claude "manually recovered Skill restore race"

export CRAFTROSTER_INSTALL_TEST_MODE=enabled
export CRAFTROSTER_INSTALL_TEST_FAULT=skill-backup-metadata-changes-after-recheck
expect_failure "Skill ownership marker race preserves changed backup" "captured Skill ownership metadata or content changed" \
  --target claude --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$SKILL_OWNERSHIP_ROOT"
unset CRAFTROSTER_INSTALL_TEST_MODE CRAFTROSTER_INSTALL_TEST_FAULT
[[ ! -e "$OWNED_SKILL_ROOT" ]] || fail "Skill ownership marker race unexpectedly recreated the destination"
METADATA_RACE_BACKUP_CONTAINER="$(find "$SKILL_OWNERSHIP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '.craftroster-skill-backup.*' -print)"
assert_equal "$(printf '%s\n' "$METADATA_RACE_BACKUP_CONTAINER" | sed '/^$/d' | wc -l | tr -d ' ')" 1 "Skill ownership marker race retained backup count"
METADATA_RACE_BACKUP_ROOT="$METADATA_RACE_BACKUP_CONTAINER/original"
[[ -d "$METADATA_RACE_BACKUP_ROOT" ]] || fail "Skill ownership marker race did not preserve its backup"
assert_equal "$(cksum < "$METADATA_RACE_BACKUP_ROOT/SKILL.md")" "$ROLLBACK_SKILL_CHECKSUM" "Skill ownership marker race content checksum"
assert_equal "$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).repo)' "$METADATA_RACE_BACKUP_ROOT/.skill-meta.json")" "foreign/repository" "Skill ownership marker race foreign owner"
printf '%s\n' "$ROLLBACK_META_CONTENT" > "$METADATA_RACE_BACKUP_ROOT/.skill-meta.json"
mv "$METADATA_RACE_BACKUP_ROOT" "$OWNED_SKILL_ROOT"
rmdir "$METADATA_RACE_BACKUP_CONTAINER"
assert_skill_profile "$SKILL_OWNERSHIP_ROOT" terminal-ops claude "manually recovered ownership marker race fixture"

FRESH_POST_MOVE_ROOT="$SMOKE_ROOT/fresh-post-move"
export CRAFTROSTER_INSTALL_TEST_MODE=enabled
export CRAFTROSTER_INSTALL_TEST_FAULT=skill-fresh-post-move-failure
expect_failure "fresh Skill post-move failure removes exact transaction" "Injected test-only fresh Skill post-move verification failure" \
  --target claude --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$FRESH_POST_MOVE_ROOT"
unset CRAFTROSTER_INSTALL_TEST_MODE CRAFTROSTER_INSTALL_TEST_FAULT
[[ ! -e "$FRESH_POST_MOVE_ROOT/terminal-ops" ]] || fail "fresh Skill post-move failure retained exact transaction content"
if find "$FRESH_POST_MOVE_ROOT" -mindepth 1 -maxdepth 1 -name '.craftroster-skill-*' -print | grep -q .; then
  fail "fresh Skill post-move failure left transaction residue"
fi

FRESH_NEWCOMER_ROOT="$SMOKE_ROOT/fresh-post-move-newcomer"
export CRAFTROSTER_INSTALL_TEST_MODE=enabled
export CRAFTROSTER_INSTALL_TEST_FAULT=skill-fresh-post-move-newcomer
expect_failure "fresh Skill post-move newcomer is preserved" "Manual recovery required" \
  --target claude --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$FRESH_NEWCOMER_ROOT"
unset CRAFTROSTER_INSTALL_TEST_MODE CRAFTROSTER_INSTALL_TEST_FAULT
[[ -f "$FRESH_NEWCOMER_ROOT/terminal-ops/SKILL.md" ]] || fail "fresh Skill post-move newcomer content was removed"
assert_equal "$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).repo)' "$FRESH_NEWCOMER_ROOT/terminal-ops/.skill-meta.json")" "foreign/repository" "fresh Skill post-move newcomer owner"
if find "$FRESH_NEWCOMER_ROOT" -mindepth 1 -maxdepth 1 -name '.craftroster-skill-*' -print | grep -q .; then
  fail "fresh Skill post-move newcomer test left transaction residue"
fi

export CRAFTROSTER_INSTALL_TEST_MODE=enabled
export CRAFTROSTER_INSTALL_TEST_FAULT=skill-destination-appears-after-recheck-portable-mv
expect_failure "Skill destination race preserves newcomer" "Manual recovery required" \
  --target claude --type skill --name terminal-ops --source-dir "$REPO_ROOT" --dir "$SKILL_OWNERSHIP_ROOT"
unset CRAFTROSTER_INSTALL_TEST_MODE CRAFTROSTER_INSTALL_TEST_FAULT
[[ -f "$OWNED_SKILL_ROOT/CRAFTROSTER-NEWCOMER.txt" ]] || fail "Skill destination race removed the newcomer sentinel"
assert_equal "$(find "$OWNED_SKILL_ROOT" -mindepth 1 -maxdepth 1 -print | wc -l | tr -d ' ')" 1 "Skill portable-mv race newcomer entry count"
if find "$OWNED_SKILL_ROOT" -mindepth 1 -type d -name '.craftroster-skill-stage.*' -print | grep -q .; then
  fail "Skill portable-mv race left transaction staging content inside the newcomer"
fi
RACE_BACKUP_CONTAINER="$(find "$SKILL_OWNERSHIP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '.craftroster-skill-backup.*' -print)"
assert_equal "$(printf '%s\n' "$RACE_BACKUP_CONTAINER" | sed '/^$/d' | wc -l | tr -d ' ')" 1 "Skill destination race retained backup count"
RACE_BACKUP_ROOT="$RACE_BACKUP_CONTAINER/original"
[[ -d "$RACE_BACKUP_ROOT" ]] || fail "Skill destination race did not retain the original backup"
assert_equal "$(cksum < "$RACE_BACKUP_ROOT/SKILL.md")" "$ROLLBACK_SKILL_CHECKSUM" "Skill destination race backup content checksum"
assert_equal "$(cksum < "$RACE_BACKUP_ROOT/.skill-meta.json")" "$ROLLBACK_META_CHECKSUM" "Skill destination race backup metadata checksum"
rm -rf "$OWNED_SKILL_ROOT"
mv "$RACE_BACKUP_ROOT" "$OWNED_SKILL_ROOT"
rmdir "$RACE_BACKUP_CONTAINER"
assert_skill_profile "$SKILL_OWNERSHIP_ROOT" terminal-ops claude "manually recovered Skill race fixture"
if find "$SKILL_OWNERSHIP_ROOT" -mindepth 1 -maxdepth 1 -name '.craftroster-skill-*' -print | grep -q .; then
  fail "Skill destination race cleanup left a staging or backup directory"
fi

FIFO_SOURCE_ROOT="$SMOKE_ROOT/fifo-source"
FIFO_DESTINATION_ROOT="$SMOKE_ROOT/fifo-destination"
mkdir -p "$FIFO_SOURCE_ROOT/skills"
write_skill_dependency_index "$FIFO_SOURCE_ROOT"
cp -R "$REPO_ROOT/skills/terminal-ops" "$FIFO_SOURCE_ROOT/skills/"
if command -v mkfifo >/dev/null 2>&1 && mkfifo "$FIFO_SOURCE_ROOT/skills/terminal-ops/non-regular.fifo" 2>/dev/null; then
  expect_failure "Skill FIFO source refusal" "non-regular Skill content" \
    --target claude --type skill --name terminal-ops --source-dir "$FIFO_SOURCE_ROOT" --dir "$FIFO_DESTINATION_ROOT"
  [[ ! -e "$FIFO_DESTINATION_ROOT/terminal-ops" ]] || fail "Skill FIFO refusal installed partial content"
  log_pass "FIFO/device/socket Skill content policy"
else
  log_pass "FIFO smoke skipped because this platform cannot create a FIFO"
fi

AGENT_OWNERSHIP_ROOT="$SMOKE_ROOT/agent-ownership-matrix"
run_installer "Agent ownership matrix baseline install" \
  --target claude --type agent --name code-reviewer --source-dir "$REPO_ROOT" --dir "$AGENT_OWNERSHIP_ROOT"
OWNED_AGENT_FILE="$AGENT_OWNERSHIP_ROOT/code-reviewer.md"
OWNED_AGENT_META="$OWNED_AGENT_FILE.craftroster.json"
OWNED_AGENT_BASELINE_META="$(cat "$OWNED_AGENT_META")"
OWNED_AGENT_BASELINE_CHECKSUM="$(cksum < "$OWNED_AGENT_FILE")"

AGENT_METADATA_FIELDS=('id' 'adapter')
AGENT_METADATA_VALUES=('debugger' 'codex')
for ((index = 0; index < ${#AGENT_METADATA_FIELDS[@]}; index++)); do
  printf '%s\n' "$OWNED_AGENT_BASELINE_META" > "$OWNED_AGENT_META"
  mutate_json_string "$OWNED_AGENT_META" "${AGENT_METADATA_FIELDS[$index]}" "${AGENT_METADATA_VALUES[$index]}"
  expect_failure "Agent ownership ${AGENT_METADATA_FIELDS[$index]} mismatch" "ownership metadata does not match" \
    --target claude --type agent --name code-reviewer --source-dir "$REPO_ROOT" --dir "$AGENT_OWNERSHIP_ROOT"
  assert_equal "$(cksum < "$OWNED_AGENT_FILE")" "$OWNED_AGENT_BASELINE_CHECKSUM" "Agent ownership ${AGENT_METADATA_FIELDS[$index]} mismatch content checksum"
done

printf '%s\n' "$OWNED_AGENT_BASELINE_META" > "$OWNED_AGENT_META"
LEGACY_AGENT_META="$OWNED_AGENT_FILE.autoverse.json"
mv "$OWNED_AGENT_META" "$LEGACY_AGENT_META"
mutate_json_string "$LEGACY_AGENT_META" repo "$LEGACY_REPO"
run_installer "Agent legacy repository and sidecar migration" \
  --target claude --type agent --name code-reviewer --source-dir "$REPO_ROOT" --dir "$AGENT_OWNERSHIP_ROOT"
assert_equal "$(count_output_lines '^OK  migrate-update Agent ')" 1 "Agent legacy repository migration count"
assert_agent_profile "$OWNED_AGENT_FILE" code-reviewer claude claude "legacy sidecar migrated Agent"
[[ ! -e "$LEGACY_AGENT_META" ]] || fail "Agent migration retained the legacy sidecar"

mv "$OWNED_AGENT_META" "$LEGACY_AGENT_META"
mutate_json_string "$LEGACY_AGENT_META" repo "$LEGACY_REPO"
expect_failure "Agent explicit repository disables transition" "installed from '$LEGACY_REPO'" \
  --target claude --type agent --name code-reviewer --repo "$EXPECTED_REPO" --source-dir "$REPO_ROOT" --dir "$AGENT_OWNERSHIP_ROOT"
[[ -f "$LEGACY_AGENT_META" && ! -e "$OWNED_AGENT_META" ]] || fail "Agent explicit repository refusal changed the legacy sidecar layout"
assert_equal "$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).repo)' "$LEGACY_AGENT_META")" "$LEGACY_REPO" "Agent explicit repository refusal preserved legacy owner"

run_installer "Agent transition after explicit repository refusal" \
  --target claude --type agent --name code-reviewer --source-dir "$REPO_ROOT" --dir "$AGENT_OWNERSHIP_ROOT"
[[ ! -e "$LEGACY_AGENT_META" ]] || fail "Agent transition after refusal retained the legacy sidecar"

mv "$OWNED_AGENT_META" "$LEGACY_AGENT_META"
run_installer "Agent canonical repository legacy sidecar migration" \
  --target claude --type agent --name code-reviewer --source-dir "$REPO_ROOT" --dir "$AGENT_OWNERSHIP_ROOT"
assert_equal "$(count_output_lines '^OK  migrate-update Agent ')" 1 "Agent canonical repository legacy sidecar migration count"
[[ ! -e "$LEGACY_AGENT_META" ]] || fail "Agent canonical repository migration retained the legacy sidecar"
assert_agent_profile "$OWNED_AGENT_FILE" code-reviewer claude claude "canonical repository legacy sidecar migrated Agent"

cp "$OWNED_AGENT_META" "$LEGACY_AGENT_META"
run_installer "Agent verified duplicate legacy sidecar cleanup" \
  --target claude --type agent --name code-reviewer --source-dir "$REPO_ROOT" --dir "$AGENT_OWNERSHIP_ROOT"
assert_equal "$(count_output_lines '^OK  migrate-update Agent ')" 1 "Agent duplicate sidecar cleanup count"
[[ ! -e "$LEGACY_AGENT_META" ]] || fail "Agent duplicate sidecar recovery retained the verified legacy sidecar"
log_pass "ownership metadata mismatch, malformed, digest, and force matrix"

GLOBAL_TARGETS=('codex' 'claude' 'cursor' 'vscode' 'copilot' 'opencode')
GLOBAL_SKILL_NAMES=('terminal-ops' 'terminal-ops' 'terminal-ops' 'terminal-ops' 'python-development' 'terminal-ops')
GLOBAL_AGENT_NAMES=('code-reviewer' 'code-reviewer' 'code-reviewer' 'code-reviewer' 'debugger' 'code-reviewer')
GLOBAL_SKILL_ROOTS=(
  "$CODEX_HOME/skills"
  "$HOME/.claude/skills"
  "$HOME/.cursor/skills"
  "$HOME/.copilot/skills"
  "$HOME/.copilot/skills"
  "$OPENCODE_CONFIG_DIR/skills"
)
GLOBAL_AGENT_FILES=(
  "$CODEX_HOME/agents/code-reviewer.toml"
  "$HOME/.claude/agents/code-reviewer.md"
  "$HOME/.cursor/agents/code-reviewer.md"
  "$HOME/.copilot/agents/code-reviewer.agent.md"
  "$HOME/.copilot/agents/debugger.agent.md"
  "$OPENCODE_CONFIG_DIR/agents/code-reviewer.md"
)
GLOBAL_OWNERSHIP_TARGETS=('codex' 'claude' 'cursor' 'copilot' 'copilot' 'opencode')
GLOBAL_AGENT_ADAPTERS=('codex' 'claude' 'cursor' 'copilot' 'copilot' 'opencode')

for ((index = 0; index < ${#GLOBAL_TARGETS[@]}; index++)); do
  requested_target="${GLOBAL_TARGETS[$index]}"
  skill_name="${GLOBAL_SKILL_NAMES[$index]}"
  agent_name="${GLOBAL_AGENT_NAMES[$index]}"
  ownership_target="${GLOBAL_OWNERSHIP_TARGETS[$index]}"
  adapter="${GLOBAL_AGENT_ADAPTERS[$index]}"

  run_installer "global $requested_target Skill install" \
    --target "$requested_target" --type skill --name "$skill_name" --source-dir "$REPO_ROOT"
  assert_equal "$(count_output_lines '^OK  install Skill ')" 1 "global $requested_target Skill install count"
  run_installer "global $requested_target Skill update" \
    --target "$requested_target" --type skill --name "$skill_name" --source-dir "$REPO_ROOT"
  assert_equal "$(count_output_lines '^OK  update Skill ')" 1 "global $requested_target Skill update count"
  assert_skill_profile \
    "${GLOBAL_SKILL_ROOTS[$index]}" \
    "$skill_name" \
    "$ownership_target" \
    "global $requested_target"

  run_installer "global $requested_target Agent install" \
    --target "$requested_target" --type agent --name "$agent_name" --source-dir "$REPO_ROOT"
  assert_equal "$(count_output_lines '^OK  install Agent ')" 1 "global $requested_target Agent install count"
  run_installer "global $requested_target Agent update" \
    --target "$requested_target" --type agent --name "$agent_name" --source-dir "$REPO_ROOT"
  assert_equal "$(count_output_lines '^OK  update Agent ')" 1 "global $requested_target Agent update count"
  if [[ "$requested_target" == "vscode" ]]; then
    [[ "$LAST_OUTPUT" == *"Target alias: vscode -> copilot"* ]] || fail "vscode Agent update did not report the copilot alias"
  fi
  assert_agent_profile \
    "${GLOBAL_AGENT_FILES[$index]}" \
    "$agent_name" \
    "$ownership_target" \
    "$adapter" \
    "global $requested_target"
done
log_pass "global Skill and Agent install/update target matrix"

NORMAL_CODEX_HOME="$CODEX_HOME"
export CODEX_HOME="$NORMAL_CODEX_HOME/"
run_installer "Codex trailing-slash root update" \
  --target codex --type skill --name terminal-ops --source-dir "$REPO_ROOT"
assert_equal "$(count_output_lines '^OK  update Skill ')" 1 "Codex trailing-slash root update count"
export CODEX_HOME="$NORMAL_CODEX_HOME"
log_pass "Codex trailing-slash root normalization"

ALTERNATE_CODEX_SKILL_ROOT="$HOME/.agents/skills"
run_installer "Codex alternate-root transition fixture install" \
  --target codex --type skill --name hotkey --source-dir "$REPO_ROOT" --dir "$ALTERNATE_CODEX_SKILL_ROOT"
ALTERNATE_CODEX_SKILL="$ALTERNATE_CODEX_SKILL_ROOT/hotkey"
ALTERNATE_CODEX_META="$ALTERNATE_CODEX_SKILL/.skill-meta.json"
ALTERNATE_LEGACY_DIGEST="$(single_file_skill_digest "$ALTERNATE_CODEX_SKILL/SKILL.md" 'autoverse-skill-content-v1')"
mutate_json_string "$ALTERNATE_CODEX_META" repo "$LEGACY_REPO"
mutate_json_string "$ALTERNATE_CODEX_META" contentSha256 "$ALTERNATE_LEGACY_DIGEST"
run_installer "Codex alternate-root Skill migration" \
  --target codex --type skill --name hotkey --source-dir "$REPO_ROOT"
assert_equal "$(count_output_lines '^OK  migrate-update Skill ')" 1 "Codex alternate-root migration count"
assert_skill_profile "$ALTERNATE_CODEX_SKILL_ROOT" hotkey codex "Codex alternate-root migrated Skill"
[[ ! -e "$CODEX_HOME/skills/hotkey" ]] || fail "Codex alternate-root migration created a duplicate in the canonical root"

AUTO_NORMAL_CODEX_HOME="$CODEX_HOME"
AUTO_CAPTURE_CODEX_HOME="$SMOKE_ROOT/auto-config-backup-capture-race"
export CODEX_HOME="$AUTO_CAPTURE_CODEX_HOME"
mkdir -p "$CODEX_HOME"
printf '%s\n' '# original capture-race config' 'model = "test-model"' > "$CODEX_HOME/config.toml"
AUTO_CAPTURE_CONFIG_CHECKSUM="$(cksum < "$CODEX_HOME/config.toml")"
export CRAFTROSTER_INSTALL_TEST_MODE=enabled
export CRAFTROSTER_INSTALL_TEST_FAULT=auto-config-backup-capture-destination-race-portable-mv
expect_failure "auto-delegation config backup capture portable-mv race" "preserved the source for manual recovery" \
  --target codex --type agent --name debugger --source-dir "$REPO_ROOT" --enable-auto-delegation
unset CRAFTROSTER_INSTALL_TEST_MODE CRAFTROSTER_INSTALL_TEST_FAULT
[[ ! -e "$CODEX_HOME/config.toml" ]] || fail "auto-delegation backup capture race unexpectedly recreated the config destination"
AUTO_CAPTURE_BACKUP_DIR="$(find "$CODEX_HOME" -mindepth 1 -maxdepth 1 -type d -name 'config.toml.craftroster-backup-*' -print)"
assert_equal "$(printf '%s\n' "$AUTO_CAPTURE_BACKUP_DIR" | sed '/^$/d' | wc -l | tr -d ' ')" 1 "auto-delegation backup capture race directory count"
[[ -f "$AUTO_CAPTURE_BACKUP_DIR/CRAFTROSTER-NEWCOMER.txt" ]] || fail "auto-delegation backup capture race removed the backup destination newcomer"
[[ -f "$AUTO_CAPTURE_BACKUP_DIR/config.toml" && ! -L "$AUTO_CAPTURE_BACKUP_DIR/config.toml" ]] || fail "auto-delegation backup capture race did not preserve nested original config"
assert_equal "$(cksum < "$AUTO_CAPTURE_BACKUP_DIR/config.toml")" "$AUTO_CAPTURE_CONFIG_CHECKSUM" "auto-delegation backup capture original config checksum"
mv "$AUTO_CAPTURE_BACKUP_DIR/config.toml" "$CODEX_HOME/config.toml"
rm "$AUTO_CAPTURE_BACKUP_DIR/CRAFTROSTER-NEWCOMER.txt"
rmdir "$AUTO_CAPTURE_BACKUP_DIR"

AUTO_RESTORE_CODEX_HOME="$SMOKE_ROOT/auto-config-backup-restore-race"
export CODEX_HOME="$AUTO_RESTORE_CODEX_HOME"
mkdir -p "$CODEX_HOME"
printf '%s\n' '# original restore-race config' 'model = "test-model"' > "$CODEX_HOME/config.toml"
AUTO_RESTORE_CONFIG_CHECKSUM="$(cksum < "$CODEX_HOME/config.toml")"
export CRAFTROSTER_INSTALL_TEST_MODE=enabled
export CRAFTROSTER_INSTALL_TEST_FAULT=auto-config-backup-restore-destination-race-portable-mv
expect_failure "auto-delegation config backup restore portable-mv race" "captured config remains at" \
  --target codex --type agent --name debugger --source-dir "$REPO_ROOT" --enable-auto-delegation
unset CRAFTROSTER_INSTALL_TEST_MODE CRAFTROSTER_INSTALL_TEST_FAULT
[[ -f "$CODEX_HOME/config.toml/CRAFTROSTER-NEWCOMER.txt" ]] || fail "auto-delegation config restore race removed the destination newcomer"
AUTO_RESTORE_RECOVERY="$(find "$CODEX_HOME/config.toml" -mindepth 1 -maxdepth 1 -type f ! -name 'CRAFTROSTER-NEWCOMER.txt' -print)"
assert_equal "$(printf '%s\n' "$AUTO_RESTORE_RECOVERY" | sed '/^$/d' | wc -l | tr -d ' ')" 1 "auto-delegation config restore recovery file count"
assert_equal "$(cksum < "$AUTO_RESTORE_RECOVERY")" "$AUTO_RESTORE_CONFIG_CHECKSUM" "auto-delegation config restore original checksum"
AUTO_RESTORE_TEMP="$CODEX_HOME/.manual-recovery-config.toml"
mv "$AUTO_RESTORE_RECOVERY" "$AUTO_RESTORE_TEMP"
rm "$CODEX_HOME/config.toml/CRAFTROSTER-NEWCOMER.txt"
rmdir "$CODEX_HOME/config.toml"
mv "$AUTO_RESTORE_TEMP" "$CODEX_HOME/config.toml"

export CODEX_HOME="$AUTO_NORMAL_CODEX_HOME"
mkdir -p "$CODEX_HOME"
cat > "$CODEX_HOME/config.toml" <<'EOF'
# CRAFTROSTER_AUTO_DELEGATION_END
model = "test-model"

developer_instructions = '''
Existing instructions that must remain untouched.
'''
EOF
MALFORMED_MARKER_CHECKSUM="$(cksum < "$CODEX_HOME/config.toml")"
expect_failure "Codex malformed auto-delegation marker diagnostics" "START=0 at lines none; END=1 at lines 1" \
  --target codex --type agent --name debugger --source-dir "$REPO_ROOT" --enable-auto-delegation --force
assert_equal "$(cksum < "$CODEX_HOME/config.toml")" "$MALFORMED_MARKER_CHECKSUM" "Codex malformed marker refusal config checksum"

cat > "$CODEX_HOME/config.toml" <<'EOF'
model = "test-model"

developer_instructions = '''
Existing instructions that must remain untouched.
'''
EOF
EXISTING_INSTRUCTIONS_CHECKSUM="$(cksum < "$CODEX_HOME/config.toml")"
expect_failure "Codex existing developer instructions recovery guidance" "rerun without --enable-auto-delegation" \
  --target codex --type agent --name debugger --source-dir "$REPO_ROOT" --enable-auto-delegation --force
assert_equal "$(cksum < "$CODEX_HOME/config.toml")" "$EXISTING_INSTRUCTIONS_CHECKSUM" "Codex existing instructions refusal config checksum"

cat > "$CODEX_HOME/config.toml" <<'EOF'
# AUTOVERSE_AUTO_DELEGATION_START
developer_instructions = '''
Legacy managed guidance that must be replaced.
'''
# AUTOVERSE_AUTO_DELEGATION_END
model = "test-model"
EOF
run_installer "Codex legacy auto-delegation migration" \
  --target codex --type agent --name debugger --source-dir "$REPO_ROOT" --enable-auto-delegation
assert_equal "$(count_output_lines '^OK  migrate-update Codex auto-delegation ')" 1 "Codex legacy auto-delegation migration count"
assert_equal "$(grep -c '^# AUTOVERSE_AUTO_DELEGATION_START$' "$CODEX_HOME/config.toml" || true)" 0 "Codex legacy marker removal count"
assert_equal "$(grep -c '^# CRAFTROSTER_AUTO_DELEGATION_START$' "$CODEX_HOME/config.toml")" 1 "Codex migrated marker count"
grep -Fq 'model = "test-model"' "$CODEX_HOME/config.toml" || fail "Codex auto-delegation migration did not preserve the unmanaged config tail"
run_installer "Codex auto-delegation update" \
  --target codex --type agent --name debugger --source-dir "$REPO_ROOT" --enable-auto-delegation
assert_equal "$(count_output_lines '^OK  update Agent ')" 1 "Codex Agent update count"
assert_equal "$(grep -c '^# CRAFTROSTER_AUTO_DELEGATION_START$' "$CODEX_HOME/config.toml")" 1 "Codex auto-delegation block count"
assert_agent_profile "$CODEX_HOME/agents/debugger.toml" "debugger" "codex" "codex" "Codex auto-delegation"
assert_skill_profile "$CODEX_HOME/skills" "subagent-architecture" "codex" "Codex auto-delegation companion"

printf 'Bash installer smoke passed (%s): %s Skills, %s Agents.\n' "$SMOKE_MODE" "$EXPECTED_PROJECT_SKILLS" "$EXPECTED_PROJECT_AGENTS"
