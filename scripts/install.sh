#!/usr/bin/env bash
set -euo pipefail

CANONICAL_REPO="HsinPu/CraftRoster"
LEGACY_REPO="HsinPu/Autoverse-Ai-Agent-Skills"
REPO="$CANONICAL_REPO"
REPO_OPTION_EXPLICIT=0
LEGACY_SKILL_DIGEST_MANIFEST=""
LEGACY_SKILL_DIGEST_MANIFEST_VALIDATED=0
BRANCH="main"
TARGET=""
TYPE="skill"
NAME=""
CATEGORY=""
INSTALL_DIR=""
SOURCE_DIR=""
DRY_RUN=0
FORCE=0
ENABLE_AUTO_DELEGATION=0
SKILL_ACTIVE_TARGET=""
SKILL_ACTIVE_STAGE=""
SKILL_ACTIVE_BACKUP=""
SKILL_ACTIVE_BACKUP_CONTAINER=""
SKILL_ACTIVE_STAGE_IDENTITY=""
SKILL_ACTIVE_STAGE_DIGEST=""
SKILL_ACTIVE_STAGE_META_IDENTITY=""
SKILL_ACTIVE_STAGE_META_SHA256=""
SKILL_ACTIVE_STAGE_META_STATE=""
SKILL_ACTIVE_STAGE_COMMITTED=0
SKILL_ACTIVE_BACKUP_IDENTITY=""
SKILL_ACTIVE_BACKUP_DIGEST=""
SKILL_ACTIVE_BACKUP_META_IDENTITY=""
SKILL_ACTIVE_BACKUP_META_SHA256=""
SKILL_ACTIVE_BACKUP_META_STATE=""
EXPECTED_SKILL_TARGET_IDENTITY=""
EXPECTED_SKILL_META_IDENTITY=""
EXPECTED_SKILL_META_SHA256=""
EXPECTED_SKILL_META_STATE=""
SKILL_MOVE_PRESERVED_PATH=""
EXACT_MOVE_PRESERVED_PATH=""

usage() {
  cat <<'EOF'
CraftRoster installer

Usage:
  scripts/install.sh --target <target> [--type skill] [--name <skill> | --category <category>] [--dir path] [--dry-run] [--force]
  scripts/install.sh --target <target> --type agent [--name <role> | --category <category>] [--dir path] [--enable-auto-delegation] [--dry-run] [--force]

Compatibility aliases:
  --agent is an alias for --target; --skill selects a Skill by name.
  --source-dir installs from a local checkout; otherwise the requested GitHub repo and branch are downloaded.
  Omit --name and --category to install every available component of the selected Type.
  Skill installs include required dependencies; conditional and optional dependencies are not installed automatically.
  The source checkout must include scripts/data/install-skill-dependencies.tsv.

Skill targets:
  codex, claude, cursor, vscode, copilot, opencode, project

Agent targets:
  codex, claude, cursor, vscode, copilot, opencode, project

Examples:
  scripts/install.sh --target codex --name python-development
  scripts/install.sh --agent codex --skill python-development
  scripts/install.sh --target codex --type agent --name code-reviewer
  scripts/install.sh --target codex --type skill --category frontend-design
  scripts/install.sh --target codex --type agent --category quality-assurance
  scripts/install.sh --target codex --type agent --enable-auto-delegation
  scripts/install.sh --target opencode --type agent
  scripts/install.sh --target project --type agent --name debugger --dry-run

Safety:
  Existing components are updated only when repo, component, name, and target metadata all match.
  Agent updates additionally require matching id and adapter metadata.
  Full Agent installs also install the subagent-architecture Skill.
  The project target uses the current directory as its project root; --dir overrides that root.
  Global auto-delegation is opt-in and never overwrites conflicting user instructions.
  Unknown same-named content is blocked unless --force is provided.
  --force also applies to required dependencies in the expanded installation plan.
EOF
}

log_info() { printf '==> %s\n' "$1"; }
log_success() { printf 'OK  %s\n' "$1"; }
log_error() { printf 'Error: %s\n' "$1" >&2; }

require_option_value() {
  local option="$1" value="${2:-}"
  if [[ -z "$value" || "$value" == -* ]]; then
    log_error "Missing value for $option."
    exit 1
  fi
}

repo_matches_expected() {
  local existing_repo="$1"
  [[ "$existing_repo" == "$REPO" ]] && return 0
  [[ "$REPO_OPTION_EXPLICIT" -eq 0 && "$REPO" == "$CANONICAL_REPO" && "$existing_repo" == "$LEGACY_REPO" ]]
}

repo_needs_migration() {
  local existing_repo="$1"
  [[ "$REPO_OPTION_EXPLICIT" -eq 0 && "$REPO" == "$CANONICAL_REPO" && "$existing_repo" == "$LEGACY_REPO" ]]
}

path_identity_key() {
  local candidate="$1"
  while [[ "$candidate" != "/" && ! "$candidate" =~ ^[A-Za-z]:/$ && "$candidate" == */ ]]; do
    candidate="${candidate%/}"
  done
  if [[ -d "$candidate" ]]; then
    (cd "$candidate" 2>/dev/null && pwd -P)
  else
    printf '%s' "$candidate"
  fi
}

codex_skill_path() {
  local scope="$1" skill_name="${2:-}" incoming_skill_file="${3:-}" canonical_root agents_alternate default_codex_alternate root target meta key existing_key duplicate
  local found_count=0 found_root="" owned_root="" candidate_count=0
  local -a raw_roots=() candidate_roots=() candidate_keys=()
  if [[ "$scope" != "user" ]]; then
    printf '%s' "$PWD/.agents/skills"
    return
  fi

  canonical_root="${CODEX_HOME:-$HOME/.codex}/skills"
  [[ -n "$skill_name" ]] || { printf '%s' "$canonical_root"; return; }

  agents_alternate="$HOME/.agents/skills"
  default_codex_alternate="$HOME/.codex/skills"
  raw_roots=("$canonical_root" "$agents_alternate" "$default_codex_alternate")
  for root in "${raw_roots[@]}"; do
    if ! key="$(path_identity_key "$root")"; then
      log_error "Could not resolve Codex Skill root: $root"
      return 2
    fi
    duplicate=0
    if [[ "$candidate_count" -gt 0 ]]; then
      for existing_key in "${candidate_keys[@]}"; do
        if [[ "$existing_key" == "$key" ]]; then duplicate=1; break; fi
      done
    fi
    if [[ "$duplicate" -eq 0 ]]; then
      candidate_roots+=("$root")
      candidate_keys+=("$key")
      candidate_count=$((candidate_count + 1))
    fi
  done

  for root in "${candidate_roots[@]}"; do
    target="${root%/}/$skill_name"
    [[ -e "$target" || -L "$target" ]] || continue
    found_count=$((found_count + 1))
    found_root="$root"
  done

  if [[ "$found_count" -gt 1 ]]; then
    log_error "Codex Skill '$skill_name' exists in more than one canonical or alternate root. Remove or reconcile the duplicates before installing."
    return 2
  fi
  if [[ "$found_count" -eq 1 ]]; then
    if [[ "$found_root" == "$canonical_root" ]]; then
      printf '%s' "$canonical_root"
      return
    fi
    target="${found_root%/}/$skill_name"
    meta="$target/.skill-meta.json"
    if (
      FORCE=0
      install_action "$target" "$meta" "$skill_name" "skill" "$skill_name" "codex" "$target/SKILL.md" "$incoming_skill_file"
    ) >/dev/null 2>&1; then
      owned_root="$found_root"
    fi
    if [[ -n "$owned_root" ]]; then
      printf '%s' "$owned_root"
      return
    fi
    log_error "Codex Skill '$skill_name' exists in alternate root '$found_root' without matching CraftRoster ownership metadata. Refusing to create a duplicate in '$canonical_root'."
    return 2
  fi
  printf '%s' "$canonical_root"
}

opencode_config_root() {
  if [[ -n "${OPENCODE_CONFIG_DIR:-}" ]]; then
    printf '%s' "$OPENCODE_CONFIG_DIR"
  else
    printf '%s/opencode' "${XDG_CONFIG_HOME:-$HOME/.config}"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target|--agent) require_option_value "$1" "${2:-}"; TARGET="$2"; shift 2 ;;
    --type) require_option_value "$1" "${2:-}"; TYPE="$2"; shift 2 ;;
    --name) require_option_value "$1" "${2:-}"; NAME="$2"; shift 2 ;;
    --category) require_option_value "$1" "${2:-}"; CATEGORY="$2"; shift 2 ;;
    --skill) require_option_value "$1" "${2:-}"; TYPE="skill"; NAME="$2"; shift 2 ;;
    --agent-profile) require_option_value "$1" "${2:-}"; TYPE="agent"; NAME="$2"; shift 2 ;;
    --branch) require_option_value "$1" "${2:-}"; BRANCH="$2"; shift 2 ;;
    --repo) require_option_value "$1" "${2:-}"; REPO="$2"; REPO_OPTION_EXPLICIT=1; shift 2 ;;
    --dir) require_option_value "$1" "${2:-}"; INSTALL_DIR="$2"; shift 2 ;;
    --source-dir) require_option_value "$1" "${2:-}"; SOURCE_DIR="$2"; shift 2 ;;
    --enable-auto-delegation) ENABLE_AUTO_DELEGATION=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --force) FORCE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) log_error "Unknown argument: $1"; usage; exit 1 ;;
  esac
done

install_path() {
  local target="$1"
  local type="$2"
  if [[ "$type" == "agent" ]]; then
    case "$target" in
      codex) printf '%s/agents' "${CODEX_HOME:-$HOME/.codex}" ;;
      claude) printf '%s/.claude/agents' "$HOME" ;;
      cursor) printf '%s/.cursor/agents' "$HOME" ;;
      copilot) printf '%s/.copilot/agents' "$HOME" ;;
      opencode) printf '%s/agents' "$(opencode_config_root)" ;;
      *) return 1 ;;
    esac
    return
  fi

  case "$target" in
    claude) printf '%s/.claude/skills' "$HOME" ;;
    cursor) printf '%s/.cursor/skills' "$HOME" ;;
    codex) codex_skill_path user ;;
    copilot) printf '%s/.copilot/skills' "$HOME" ;;
    opencode) printf '%s/skills' "$(opencode_config_root)" ;;
    *) return 1 ;;
  esac
}

validate_target() {
  local target="$1" type="$2"
  case "$target" in
    codex|claude|cursor|vscode|copilot|opencode|project) return ;;
    *) log_error "Unsupported $type target: $target"; exit 1 ;;
  esac
}

add_skill_profile() {
  SKILL_DESTINATIONS+=("$1")
  SKILL_OWNERSHIP_TARGETS+=("$2")
  SKILL_LEGACY_TARGETS+=("${3:-}")
  SKILL_CODEX_LEGACY_CHECKS+=("${4:-0}")
}

configure_skill_profiles() {
  local use_install_override="$1" destination
  SKILL_DESTINATIONS=()
  SKILL_OWNERSHIP_TARGETS=()
  SKILL_LEGACY_TARGETS=()
  SKILL_CODEX_LEGACY_CHECKS=()
  if [[ "$TARGET" == "project" ]]; then
    add_skill_profile "$PROJECT_ROOT/.agents/skills" "project" "codex-project" 0
    add_skill_profile "$PROJECT_ROOT/.claude/skills" "project" "claude-project" 0
    return
  fi
  if [[ "$use_install_override" -eq 1 && -n "$INSTALL_DIR" ]]; then
    destination="$INSTALL_DIR"
  elif destination="$(install_path "$TARGET" skill)"; then
    :
  else
    log_error "Unsupported skill target: $TARGET"
    exit 1
  fi
  if [[ "$TARGET" == "codex" && ! ( "$use_install_override" -eq 1 && -n "$INSTALL_DIR" ) ]]; then
    add_skill_profile "$destination" "$TARGET" "" 1
  elif [[ "$TARGET" == "copilot" ]]; then
    add_skill_profile "$destination" "$TARGET" "vscode" 0
  else
    add_skill_profile "$destination" "$TARGET" "" 0
  fi
}

resolve_skill_profile_destination() {
  local destination_root="$1" skill_name="$2" check_codex_legacy="$3" incoming_skill_file="$4"
  if [[ "$check_codex_legacy" -eq 1 ]]; then
    codex_skill_path user "$skill_name" "$incoming_skill_file"
  else
    printf '%s' "$destination_root"
  fi
}

add_agent_profile() {
  AGENT_PLATFORMS+=("$1")
  AGENT_SUFFIXES+=("$2")
  AGENT_DESTINATIONS+=("$3")
  AGENT_OWNERSHIP_TARGETS+=("$4")
  AGENT_LEGACY_TARGETS+=("${5:-}")
}

configure_agent_profiles() {
  local destination
  AGENT_PLATFORMS=()
  AGENT_SUFFIXES=()
  AGENT_DESTINATIONS=()
  AGENT_OWNERSHIP_TARGETS=()
  AGENT_LEGACY_TARGETS=()
  if [[ "$TARGET" == "project" ]]; then
    add_agent_profile "codex" ".toml" "$PROJECT_ROOT/.codex/agents" "project" "codex-project"
    add_agent_profile "claude" ".md" "$PROJECT_ROOT/.claude/agents" "project" "claude-project"
    add_agent_profile "cursor" ".md" "$PROJECT_ROOT/.cursor/agents" "project" "cursor-project"
    add_agent_profile "copilot" ".agent.md" "$PROJECT_ROOT/.github/agents" "project" "copilot-project,vscode-project,vscode"
    add_agent_profile "opencode" ".md" "$PROJECT_ROOT/.opencode/agents" "project" "opencode-project"
    return
  fi
  if [[ -n "$INSTALL_DIR" ]]; then
    destination="$INSTALL_DIR"
  elif destination="$(install_path "$TARGET" agent)"; then
    :
  else
    log_error "Unsupported agent target: $TARGET"
    exit 1
  fi
  case "$TARGET" in
    codex) add_agent_profile "codex" ".toml" "$destination" "$TARGET" ;;
    claude) add_agent_profile "claude" ".md" "$destination" "$TARGET" ;;
    cursor) add_agent_profile "cursor" ".md" "$destination" "$TARGET" ;;
    copilot) add_agent_profile "copilot" ".agent.md" "$destination" "$TARGET" "vscode" ;;
    opencode) add_agent_profile "opencode" ".md" "$destination" "$TARGET" ;;
    *) log_error "Unsupported agent target: $TARGET"; exit 1 ;;
  esac
}

validate_name() {
  if [[ "$TYPE" == "agent" ]]; then
    [[ -z "$NAME" ]] && return
    if [[ ! "$NAME" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
      log_error "Invalid Agent Name '$NAME'. Expected a lowercase hyphen-case role."
      exit 1
    fi
    return
  fi
  [[ -z "$NAME" ]] && return
  if [[ ! "$NAME" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
    log_error "Invalid Skill Name '$NAME'. Expected a lowercase hyphen-case catalog name."
    exit 1
  fi
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log_error "$1 is required but was not found."
    exit 1
  fi
}

json_string_value() {
  local file="$1" key="$2"
  sed -n "s/^[[:space:]]*\"$key\"[[:space:]]*:[[:space:]]*\"\\([^\"]*\\)\".*/\\1/p" "$file" | head -n 1
}

json_string_key_present() {
  local file="$1" key="$2"
  grep -Eq "^[[:space:]]*\"$key\"[[:space:]]*:[[:space:]]*\"" "$file"
}

validate_flat_metadata() {
  awk '
    function fail() { invalid = 1; exit 1 }
    function trim(value) {
      sub(/^[[:space:]]+/, "", value)
      sub(/[[:space:]]+$/, "", value)
      return value
    }
    BEGIN { state = 0; count = 0 }
    {
      if (NR == 1) sub(/^\357\273\277/, "", $0)
      sub(/\r$/, "", $0)
      line = trim($0)
      if (line == "") next
      if (line ~ /[[:cntrl:]]/) fail()
      if (state == 0) {
        if (line != "{") fail()
        state = 1
        next
      }
      if (state != 1) fail()
      if (line == "}") {
        state = 2
        next
      }
      if (substr(line, 1, 1) != "\"") fail()
      rest = substr(line, 2)
      quote = index(rest, "\"")
      if (quote < 2) fail()
      key = substr(rest, 1, quote - 1)
      if (key !~ /^[A-Za-z][A-Za-z0-9]*$/ || seen[tolower(key)]++) fail()
      position = quote + 2
      while (position <= length(line) && substr(line, position, 1) ~ /[[:space:]]/) position++
      if (substr(line, position, 1) != ":") fail()
      position++
      while (position <= length(line) && substr(line, position, 1) ~ /[[:space:]]/) position++
      if (substr(line, position, 1) != "\"") fail()
      position++
      closed = 0
      while (position <= length(line)) {
        character = substr(line, position, 1)
        if (character == "\\") {
          position++
          if (position > length(line)) fail()
          escape = substr(line, position, 1)
          if (escape == "u") {
            hex = substr(line, position + 1, 4)
            if (length(hex) != 4 || hex !~ /^[0-9A-Fa-f]{4}$/) fail()
            position += 5
            continue
          }
          if (escape != "\"" && escape != "\\" && escape != "/" && escape !~ /^[bfnrt]$/) fail()
          position++
          continue
        }
        if (character == "\"") { closed = 1; position++; break }
        position++
      }
      if (!closed) fail()
      suffix = trim(substr(line, position))
      count++
      if (suffix == ",") comma[count] = 1
      else if (suffix == "") comma[count] = 0
      else fail()
    }
    END {
      if (invalid || state != 2 || count == 0) exit 1
      for (i = 1; i < count; i++) if (!comma[i]) exit 1
      if (comma[count]) exit 1
    }
  ' "$1"
}

sha256_stream() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum | awk '{ print tolower($1) }'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 | awk '{ print tolower($1) }'
  else
    log_error "A SHA-256 tool is required (sha256sum or shasum)."
    return 1
  fi
}

regular_file_sha256() {
  local path="$1" digest
  [[ -f "$path" && ! -L "$path" ]] || return 1
  if ! digest="$(sha256_stream < "$path")"; then return 1; fi
  [[ "$digest" =~ ^[0-9a-f]{64}$ ]] || return 1
  printf '%s' "$digest"
}

regular_file_identity() {
  local path="$1" identity=""
  [[ -f "$path" && ! -L "$path" ]] || return 1
  if identity="$(stat -c '%d:%i' -- "$path" 2>/dev/null)" && [[ "$identity" =~ ^[0-9]+:[0-9]+$ ]]; then
    printf '%s' "$identity"
    return 0
  fi
  if identity="$(stat -f '%d:%i' "$path" 2>/dev/null)" && [[ "$identity" =~ ^[0-9]+:[0-9]+$ ]]; then
    printf '%s' "$identity"
    return 0
  fi
  return 1
}

emit_skill_content_stream() {
  local root="${1%/}" excluded_relative_path="${2:-}" digest_namespace="${3:-craftroster-skill-content-v1}" path relative_path byte_length special_path
  local -a relative_paths=()

  if [[ ! -d "$root" || -L "$root" ]]; then
    log_error "Refusing to hash a non-directory or linked Skill root: $root"
    return 1
  fi
  if ! special_path="$(find "$root" -mindepth 1 ! -type d ! -type f ! -type l -print -quit)"; then
    log_error "Could not inspect Skill content types: $root"
    return 1
  fi
  if [[ -n "$special_path" ]]; then
    log_error "Refusing to hash non-regular Skill content (FIFO, device, or socket): $special_path"
    return 1
  fi

  while IFS= read -r -d '' path; do
    log_error "Refusing to hash Skill content that contains a symbolic link: $path"
    return 1
  done < <(find "$root" -type l -print0)

  while IFS= read -r -d '' path; do
    relative_path="${path#"$root"/}"
    if [[ "$relative_path" == *$'\n'* ]]; then
      log_error "Refusing to hash a Skill path that contains a newline."
      return 1
    fi
    if [[ "$relative_path" == ".skill-meta.json" || ( -n "$excluded_relative_path" && "$relative_path" == "$excluded_relative_path" ) ]]; then continue; fi
    relative_paths+=("$relative_path")
  done < <(find "$root" -type f -print0)

  printf '%s\0' "$digest_namespace"
  if [[ "${#relative_paths[@]}" -eq 0 ]]; then return; fi
  while IFS= read -r relative_path; do
    byte_length="$(wc -c < "$root/$relative_path" | tr -d '[:space:]')"
    printf '%s\0%s\0' "$relative_path" "$byte_length"
    cat "$root/$relative_path"
    printf '\0'
  done < <(printf '%s\n' "${relative_paths[@]}" | LC_ALL=C sort)
}

skill_content_sha256() {
  local root="$1" excluded_relative_path="${2:-}" digest_namespace="${3:-craftroster-skill-content-v1}" digest
  if ! digest="$(emit_skill_content_stream "$root" "$excluded_relative_path" "$digest_namespace" | sha256_stream)"; then
    return 1
  fi
  if [[ ! "$digest" =~ ^[0-9a-f]{64}$ ]]; then
    log_error "Could not compute a valid lowercase SHA-256 digest for Skill content: $root"
    return 1
  fi
  printf '%s' "$digest"
}

validate_legacy_skill_digest_manifest() {
  [[ "$LEGACY_SKILL_DIGEST_MANIFEST_VALIDATED" -eq 1 ]] && return
  if [[ -z "$LEGACY_SKILL_DIGEST_MANIFEST" || ! -f "$LEGACY_SKILL_DIGEST_MANIFEST" || -L "$LEGACY_SKILL_DIGEST_MANIFEST" ]]; then
    log_error "Verified legacy Skill digest manifest is missing or linked: $LEGACY_SKILL_DIGEST_MANIFEST"
    exit 1
  fi
  if ! LC_ALL=C awk -F '\t' '
    { sub(/\r$/, "", $0) }
    NR == 1 { if ($0 != "# craftroster-verified-legacy-skill-content-v1") invalid = 1; next }
    NR == 2 { if ($0 != "# digest-namespace: craftroster-skill-content-v1") invalid = 1; next }
    NR == 3 { if ($0 !~ /^# history-range: [0-9a-f]+\^\.\.[0-9a-f]+$/) invalid = 1; next }
    NR == 4 {
      if ($0 !~ /^# skills: [1-9][0-9]*$/) invalid = 1
      expected_skills = substr($0, length("# skills: ") + 1) + 0
      next
    }
    NR == 5 {
      if ($0 !~ /^# entries: [1-9][0-9]*$/) invalid = 1
      expected_entries = substr($0, length("# entries: ") + 1) + 0
      next
    }
    NR >= 6 {
      if (NF != 2 || $1 !~ /^[a-z0-9]+(-[a-z0-9]+)*$/ || length($2) != 64 || $2 ~ /[^0-9a-f]/) invalid = 1
      if (previous != "" && previous >= $0) invalid = 1
      previous = $0
      skills[$1] = 1
      entries++
    }
    END {
      for (skill in skills) skill_count++
      if (NR < 6 || entries != expected_entries || skill_count != expected_skills) invalid = 1
      exit invalid ? 1 : 0
    }
  ' "$LEGACY_SKILL_DIGEST_MANIFEST"; then
    log_error "Verified legacy Skill digest manifest is invalid: $LEGACY_SKILL_DIGEST_MANIFEST"
    exit 1
  fi
  LEGACY_SKILL_DIGEST_MANIFEST_VALIDATED=1
}

legacy_skill_digest_allowed() {
  local skill_name="$1" digest="$2"
  validate_legacy_skill_digest_manifest
  LC_ALL=C awk -F '\t' -v skill="$skill_name" -v expected_digest="$digest" '
    { sub(/\r$/, "", $0) }
    $1 == skill && $2 == expected_digest { found = 1; exit }
    END { exit found ? 0 : 1 }
  ' "$LEGACY_SKILL_DIGEST_MANIFEST"
}

yaml_frontmatter_value() {
  local file="$1" key="$2" allow_nested=0
  [[ -f "$file" && ! -L "$file" ]] || return 0
  case "$key" in source|reference-*|previous-license) allow_nested=1 ;; esac
  awk -v key="$key" -v allow_nested="$allow_nested" '
    function emit_value(line, prefix_length, value) {
      value = substr(line, prefix_length + 1)
      sub(/^[[:space:]]+/, "", value)
      sub(/[[:space:]]+$/, "", value)
      gsub(/^[\047\"]|[\047\"]$/, "", value)
      print value
      exit
    }
    NR == 1 { sub(/^\357\273\277/, "", $0) }
    NR == 1 && $0 == "---" { inside = 1; next }
    inside && $0 == "---" { exit }
    !inside { next }
    /^[^[:space:]]/ {
      in_metadata = 0
      if (index($0, key ":") == 1) emit_value($0, length(key) + 1)
      if ($0 ~ /^metadata:[[:space:]]*(#.*)?$/) in_metadata = 1
      next
    }
    in_metadata && allow_nested {
      nested = $0
      sub(/^[[:space:]]+/, "", nested)
      if (index(nested, key ":") == 1) emit_value(nested, length(key) + 1)
    }
  ' "$file"
}

skill_frontmatter_identity_matches() {
  local existing_file="$1" incoming_file="$2" expected_name="$3" existing_repo="$4"
  local existing_name existing_source existing_license incoming_name incoming_source incoming_reference_source incoming_license incoming_previous_license
  local source_matches=0 license_matches=0
  existing_name="$(yaml_frontmatter_value "$existing_file" "name")"
  existing_source="$(yaml_frontmatter_value "$existing_file" "source")"
  existing_license="$(yaml_frontmatter_value "$existing_file" "license")"
  incoming_name="$(yaml_frontmatter_value "$incoming_file" "name")"
  incoming_source="$(yaml_frontmatter_value "$incoming_file" "source")"
  incoming_reference_source="$(yaml_frontmatter_value "$incoming_file" "reference-source")"
  incoming_license="$(yaml_frontmatter_value "$incoming_file" "license")"
  incoming_previous_license="$(yaml_frontmatter_value "$incoming_file" "previous-license")"
  if [[ "$existing_source" == "$incoming_source" || ( -n "$incoming_reference_source" && "$existing_source" == "$incoming_reference_source" ) ]]; then source_matches=1; fi
  if [[ "$source_matches" -eq 0 ]] && repo_needs_migration "$existing_repo" && [[ "$existing_source" == "$LEGACY_REPO" && "$incoming_source" == "$CANONICAL_REPO" ]]; then
    source_matches=1
  fi
  if [[ "$existing_license" == "$incoming_license" || ( -n "$incoming_previous_license" && "$existing_license" == "$incoming_previous_license" ) ]]; then license_matches=1; fi
  [[ "$existing_name" == "$expected_name" && "$incoming_name" == "$expected_name" && -n "$existing_source" && "$source_matches" -eq 1 && -n "$existing_license" && "$license_matches" -eq 1 ]]
}

verified_legacy_skill_without_digest() {
  local existing_file="$1" incoming_file="$2" expected_name="$3" existing_repo="$4" content_sha256="$5"
  repo_needs_migration "$existing_repo" || return 1
  skill_frontmatter_identity_matches "$existing_file" "$incoming_file" "$expected_name" "$existing_repo" || return 1
  legacy_skill_digest_allowed "$expected_name" "$content_sha256"
}

legacy_target_allowed() {
  local candidate="$1" allowed_targets="$2"
  [[ -n "$candidate" && -n "$allowed_targets" ]] || return 1
  case ",$allowed_targets," in
    *",$candidate,"*) return 0 ;;
    *) return 1 ;;
  esac
}

install_action() {
  local target="$1" meta="$2" label="$3" expected_component="$4" expected_name="$5" expected_target="$6" legacy_identity="${7:-}" incoming_identity="${8:-}" expected_id="${9:-}" expected_adapter="${10:-}" legacy_targets="${11:-}"
  local metadata_identity_before="" metadata_identity_after="" metadata_sha256_before="" metadata_sha256_after=""
  local target_identity_before="" target_identity_after=""
  local existing_repo existing_component existing_name existing_target existing_agent existing_id existing_adapter existing_content_sha256 current_content_sha256 legacy_content_sha256 identity_matches repository_matches repository_needs_migration ownership_matches
  local existing_content_sha256_present=0 unverified_missing_skill_digest=0
  INSTALL_ACTION="install"
  EXISTING_INSTALLED_AT=""
  EXPECTED_SKILL_CURRENT_SHA256=""
  EXPECTED_SKILL_TARGET_IDENTITY=""
  EXPECTED_SKILL_META_IDENTITY=""
  EXPECTED_SKILL_META_SHA256=""
  EXPECTED_SKILL_META_STATE=""

  if [[ "$expected_component" == "skill" ]]; then
    if [[ -L "$meta" || ( -e "$meta" && ! -f "$meta" ) ]]; then
      log_error "Refusing to replace '$label' because its Skill ownership metadata is linked or non-regular: $meta"
      exit 1
    fi
    if [[ -f "$meta" ]]; then
      if ! metadata_identity_before="$(regular_file_identity "$meta")" ||
        ! metadata_sha256_before="$(regular_file_sha256 "$meta")"; then
        log_error "Refusing to replace '$label' because its ownership metadata identity or SHA-256 could not be captured."
        exit 1
      fi
      EXPECTED_SKILL_META_IDENTITY="$metadata_identity_before"
      EXPECTED_SKILL_META_SHA256="$metadata_sha256_before"
      if validate_flat_metadata "$meta"; then
        EXPECTED_SKILL_META_STATE="valid"
      else
        EXPECTED_SKILL_META_STATE="invalid"
      fi
    else
      EXPECTED_SKILL_META_STATE="missing"
    fi
  fi
  if [[ ! -e "$target" && ! -f "$meta" ]]; then return; fi

  if [[ -f "$meta" ]]; then
    if [[ "$expected_component" == "skill" && "$EXPECTED_SKILL_META_STATE" == "invalid" ]]; then
      if [[ "$FORCE" -eq 1 ]]; then INSTALL_ACTION="force-replace"; return; fi
      log_error "Refusing to replace '$label' because its CraftRoster metadata is not a strict flat JSON object. Use --force to overwrite intentionally."
      exit 1
    fi
    if [[ "$expected_component" != "skill" ]] && { [[ -L "$meta" ]] || ! validate_flat_metadata "$meta"; }; then
      if [[ "$FORCE" -eq 1 ]]; then INSTALL_ACTION="force-replace"; return; fi
      log_error "Refusing to replace '$label' because its CraftRoster metadata is not a strict flat JSON object. Use --force to overwrite intentionally."
      exit 1
    fi
    existing_repo="$(json_string_value "$meta" "repo")"
    existing_component="$(json_string_value "$meta" "component")"
    existing_name="$(json_string_value "$meta" "name")"
    existing_target="$(json_string_value "$meta" "target")"
    existing_agent="$(json_string_value "$meta" "agent")"
    existing_id="$(json_string_value "$meta" "id")"
    existing_adapter="$(json_string_value "$meta" "adapter")"
    existing_content_sha256="$(json_string_value "$meta" "contentSha256")"
    if json_string_key_present "$meta" "contentSha256"; then existing_content_sha256_present=1; fi
    EXISTING_INSTALLED_AT="$(json_string_value "$meta" "installedAt")"
    repository_matches=0
    repository_needs_migration=0
    if repo_matches_expected "$existing_repo"; then repository_matches=1; fi
    if repo_needs_migration "$existing_repo"; then repository_needs_migration=1; fi
    if [[ "$expected_component" == "skill" ]]; then
      if ! validate_flat_metadata "$meta" ||
        ! metadata_identity_after="$(regular_file_identity "$meta")" ||
        ! metadata_sha256_after="$(regular_file_sha256 "$meta")" ||
        [[ "$metadata_identity_after" != "$metadata_identity_before" || "$metadata_sha256_after" != "$metadata_sha256_before" ]]; then
        log_error "Refusing to replace '$label' because its ownership metadata changed while it was being parsed. Run the installer again."
        exit 1
      fi
      EXPECTED_SKILL_META_IDENTITY="$metadata_identity_after"
      EXPECTED_SKILL_META_SHA256="$metadata_sha256_after"
      EXPECTED_SKILL_META_STATE="valid"
    fi
    if [[ "$expected_component" == "skill" && -d "$target" && ! -L "$target" ]]; then
      if ! target_identity_before="$(skill_directory_identity "$target")" ||
        ! current_content_sha256="$(skill_content_sha256 "$target")"; then
        log_error "Refusing to replace '$label' because its Skill directory changed while ownership was being checked. Run the installer again."
        exit 1
      fi
      legacy_content_sha256=""
      if [[ "$existing_content_sha256_present" -eq 1 && "$existing_content_sha256" =~ ^[0-9a-f]{64}$ && "$current_content_sha256" != "$existing_content_sha256" ]] &&
        ! legacy_content_sha256="$(skill_content_sha256 "$target" "" "autoverse-skill-content-v1")"; then
        log_error "Refusing to replace '$label' because its Skill directory changed while ownership was being checked. Run the installer again."
        exit 1
      fi
      if ! target_identity_after="$(skill_directory_identity "$target")" || [[ "$target_identity_after" != "$target_identity_before" ]]; then
        log_error "Refusing to replace '$label' because its Skill directory changed while ownership was being checked. Run the installer again."
        exit 1
      fi
      if ! skill_metadata_matches "$meta" "$EXPECTED_SKILL_META_IDENTITY" "$EXPECTED_SKILL_META_SHA256"; then
        log_error "Refusing to replace '$label' because its ownership metadata changed while Skill content was being checked. Run the installer again."
        exit 1
      fi
      EXPECTED_SKILL_TARGET_IDENTITY="$target_identity_after"
      EXPECTED_SKILL_CURRENT_SHA256="$current_content_sha256"
    fi
    identity_matches=1
    if [[ "$expected_component" == "agent" && ( -z "$expected_id" || "$existing_id" != "$expected_id" || -z "$expected_adapter" || "$existing_adapter" != "$expected_adapter" ) ]]; then identity_matches=0; fi
    ownership_matches=0
    if [[ "$repository_matches" -eq 1 && "$existing_component" == "$expected_component" && "$existing_name" == "$expected_name" && "$existing_target" == "$expected_target" && "$identity_matches" -eq 1 ]]; then ownership_matches=1; fi
    if [[ "$ownership_matches" -eq 1 ]]; then
      if [[ "$expected_component" == "skill" && -e "$target" ]]; then
        if [[ "$existing_content_sha256_present" -eq 0 ]]; then
          if ! verified_legacy_skill_without_digest "$legacy_identity" "$incoming_identity" "$expected_name" "$existing_repo" "$current_content_sha256"; then
            ownership_matches=0
            unverified_missing_skill_digest=1
          else
            repository_needs_migration=1
          fi
        elif [[ ! "$existing_content_sha256" =~ ^[0-9a-f]{64}$ ]]; then
          if [[ "$FORCE" -eq 1 ]]; then INSTALL_ACTION="force-replace"; return; fi
          log_error "Refusing to replace '$label' because its contentSha256 is not a valid lowercase 64-character SHA-256 digest. Use --force to reset it intentionally."
          exit 1
        elif [[ "$current_content_sha256" != "$existing_content_sha256" ]]; then
          if [[ "$legacy_content_sha256" == "$existing_content_sha256" ]]; then
            repository_needs_migration=1
          elif [[ "$FORCE" -eq 1 ]]; then
            INSTALL_ACTION="force-replace"
            return
          else
            log_error "Refusing to replace '$label' because the installed Skill content has changed since the last CraftRoster install. Use --force to reset it intentionally."
            exit 1
          fi
        fi
      fi
      if [[ "$ownership_matches" -eq 1 ]]; then
        if [[ "$repository_needs_migration" -eq 1 ]]; then
          INSTALL_ACTION="migrate-update"
        elif [[ -e "$target" ]]; then
          INSTALL_ACTION="update"
        else
          INSTALL_ACTION="repair"
        fi
        return
      fi
    fi
    if [[ "$repository_matches" -eq 1 && "$existing_component" == "$expected_component" && "$existing_name" == "$expected_name" && "$identity_matches" -eq 1 ]] && legacy_target_allowed "$existing_target" "$legacy_targets"; then
      if [[ "$expected_component" == "skill" && -e "$target" ]]; then
        if ! skill_frontmatter_identity_matches "$legacy_identity" "$incoming_identity" "$expected_name" "$existing_repo"; then
          ownership_matches=0
        elif [[ "$existing_content_sha256_present" -eq 0 ]] && ! verified_legacy_skill_without_digest "$legacy_identity" "$incoming_identity" "$expected_name" "$existing_repo" "$current_content_sha256"; then
          ownership_matches=0
          unverified_missing_skill_digest=1
        elif [[ "$existing_content_sha256_present" -eq 1 && ! "$existing_content_sha256" =~ ^[0-9a-f]{64}$ ]]; then
          if [[ "$FORCE" -eq 1 ]]; then INSTALL_ACTION="force-replace"; return; fi
          log_error "Refusing to replace '$label' because its contentSha256 is not a valid lowercase 64-character SHA-256 digest. Use --force to reset it intentionally."
          exit 1
        elif [[ "$existing_content_sha256_present" -eq 1 && "$current_content_sha256" != "$existing_content_sha256" && "$legacy_content_sha256" != "$existing_content_sha256" ]]; then
          if [[ "$FORCE" -eq 1 ]]; then INSTALL_ACTION="force-replace"; return; fi
          log_error "Refusing to replace '$label' because the installed Skill content has changed since the last CraftRoster install. Use --force to reset it intentionally."
          exit 1
        else
          ownership_matches=1
        fi
      else
        ownership_matches=1
      fi
      if [[ "$ownership_matches" -eq 1 ]]; then INSTALL_ACTION="migrate-update"; return; fi
    fi
    if [[ "$repository_matches" -eq 1 && "$expected_component" == "skill" && -z "$existing_component" && -z "$existing_target" && "$existing_name" == "$expected_name" ]] &&
      { [[ "$existing_agent" == "$expected_target" ]] || legacy_target_allowed "$existing_agent" "$legacy_targets"; } &&
      skill_frontmatter_identity_matches "$legacy_identity" "$incoming_identity" "$expected_name" "$existing_repo"; then
      if [[ "$existing_content_sha256_present" -eq 1 ]]; then
        if [[ ! "$existing_content_sha256" =~ ^[0-9a-f]{64}$ ]]; then
          if [[ "$FORCE" -eq 1 ]]; then INSTALL_ACTION="force-replace"; return; fi
          log_error "Refusing to replace '$label' because its contentSha256 is not a valid lowercase 64-character SHA-256 digest. Use --force to reset it intentionally."
          exit 1
        fi
        if [[ "$current_content_sha256" != "$existing_content_sha256" && "$legacy_content_sha256" != "$existing_content_sha256" ]]; then
          if [[ "$FORCE" -eq 1 ]]; then INSTALL_ACTION="force-replace"; return; fi
          log_error "Refusing to replace '$label' because the installed Skill content has changed since the last CraftRoster install. Use --force to reset it intentionally."
          exit 1
        fi
      elif ! verified_legacy_skill_without_digest "$legacy_identity" "$incoming_identity" "$expected_name" "$existing_repo" "$current_content_sha256"; then
        unverified_missing_skill_digest=1
      else
        INSTALL_ACTION="migrate-update"
        return
      fi
      if [[ "$existing_content_sha256_present" -eq 1 ]]; then INSTALL_ACTION="migrate-update"; return; fi
    fi
    if [[ "$FORCE" -eq 1 ]]; then INSTALL_ACTION="force-replace"; return; fi
    if [[ "$unverified_missing_skill_digest" -eq 1 ]]; then
      log_error "Refusing to migrate '$label' because its metadata has no contentSha256 and its installed content does not match a verified legacy Skill release. Use --force to overwrite intentionally."
      exit 1
    fi
    if [[ -n "$existing_repo" && "$repository_matches" -eq 0 ]]; then
      log_error "Refusing to replace '$label' because it was installed from '$existing_repo', not '$REPO'. Use --force to overwrite intentionally."
    elif [[ "$repository_matches" -eq 1 ]]; then
      local agent_identity=""
      if [[ "$expected_component" == "agent" ]]; then agent_identity=", id='$expected_id', and adapter='$expected_adapter'"; fi
      log_error "Refusing to replace '$label' because its ownership metadata does not match component='$expected_component', name='$expected_name', target='$expected_target'$agent_identity. Use --force to overwrite intentionally."
    else
      log_error "Refusing to replace '$label' because its CraftRoster metadata is invalid. Use --force to overwrite intentionally."
    fi
    exit 1
  fi

  if [[ "$FORCE" -eq 1 ]]; then INSTALL_ACTION="force-replace"; return; fi
  log_error "Refusing to replace '$label' because it has no matching CraftRoster metadata. Use --force to overwrite intentionally."
  exit 1
}

assert_within_destination() {
  local target="$1" root="${2%/}"
  case "$1" in
    "$root"/*) ;;
    *) log_error "Refusing to write outside install directory: $target"; exit 1 ;;
  esac
}

assert_regular_skill_root() {
  local path="$1"
  if [[ -L "$path" || ( -e "$path" && ! -d "$path" ) ]]; then
    log_error "Refusing to replace a non-directory or linked Skill root: $path"
    exit 1
  fi
}

clear_active_skill_transaction() {
  SKILL_ACTIVE_TARGET=""
  SKILL_ACTIVE_STAGE=""
  SKILL_ACTIVE_BACKUP=""
  SKILL_ACTIVE_BACKUP_CONTAINER=""
  SKILL_ACTIVE_STAGE_IDENTITY=""
  SKILL_ACTIVE_STAGE_DIGEST=""
  SKILL_ACTIVE_STAGE_META_IDENTITY=""
  SKILL_ACTIVE_STAGE_META_SHA256=""
  SKILL_ACTIVE_STAGE_META_STATE=""
  SKILL_ACTIVE_STAGE_COMMITTED=0
  SKILL_ACTIVE_BACKUP_IDENTITY=""
  SKILL_ACTIVE_BACKUP_DIGEST=""
  SKILL_ACTIVE_BACKUP_META_IDENTITY=""
  SKILL_ACTIVE_BACKUP_META_SHA256=""
  SKILL_ACTIVE_BACKUP_META_STATE=""
}

skill_directory_identity() {
  local path="$1" identity=""
  if identity="$(stat -c '%d:%i' -- "$path" 2>/dev/null)" && [[ "$identity" =~ ^[0-9]+:[0-9]+$ ]]; then
    printf '%s' "$identity"
    return 0
  fi
  if identity="$(stat -f '%d:%i' "$path" 2>/dev/null)" && [[ "$identity" =~ ^[0-9]+:[0-9]+$ ]]; then
    printf '%s' "$identity"
    return 0
  fi
  log_error "Could not establish filesystem identity for Skill directory: $path"
  return 1
}

skill_directory_matches() {
  local path="$1" expected_identity="$2" expected_digest="$3" actual_identity actual_digest
  [[ -d "$path" && ! -L "$path" && -n "$expected_identity" && -n "$expected_digest" ]] || return 1
  actual_identity="$(skill_directory_identity "$path")" || return 1
  [[ "$actual_identity" == "$expected_identity" ]] || return 1
  actual_digest="$(skill_content_sha256 "$path")" || return 1
  [[ "$actual_digest" == "$expected_digest" ]]
}

skill_metadata_matches() {
  local path="$1" expected_identity="$2" expected_sha256="$3" actual_identity actual_sha256
  [[ -f "$path" && ! -L "$path" && -n "$expected_identity" && -n "$expected_sha256" ]] || return 1
  validate_flat_metadata "$path" || return 1
  actual_identity="$(regular_file_identity "$path")" || return 1
  [[ "$actual_identity" == "$expected_identity" ]] || return 1
  actual_sha256="$(regular_file_sha256 "$path")" || return 1
  [[ "$actual_sha256" == "$expected_sha256" ]]
}

skill_metadata_state_matches() {
  local root="$1" expected_state="$2" expected_identity="${3:-}" expected_sha256="${4:-}"
  local metadata="$root/.skill-meta.json" actual_identity actual_sha256
  case "$expected_state" in
    valid)
      skill_metadata_matches "$metadata" "$expected_identity" "$expected_sha256"
      ;;
    invalid)
      [[ -f "$metadata" && ! -L "$metadata" && -n "$expected_identity" && -n "$expected_sha256" ]] || return 1
      actual_identity="$(regular_file_identity "$metadata")" || return 1
      actual_sha256="$(regular_file_sha256 "$metadata")" || return 1
      [[ "$actual_identity" == "$expected_identity" && "$actual_sha256" == "$expected_sha256" ]] || return 1
      ! validate_flat_metadata "$metadata"
      ;;
    missing)
      [[ ! -e "$metadata" && ! -L "$metadata" ]]
      ;;
    *)
      return 1
      ;;
  esac
}

skill_transaction_snapshot_matches() {
  local path="$1" expected_identity="$2" expected_digest="$3" expected_meta_identity="$4" expected_meta_sha256="$5"
  skill_directory_matches "$path" "$expected_identity" "$expected_digest" || return 1
  skill_metadata_matches "$path/.skill-meta.json" "$expected_meta_identity" "$expected_meta_sha256"
}

skill_move_snapshot_matches() {
  local path="$1" expected_identity="$2" expected_digest="$3" expected_meta_identity="${4:-}" expected_meta_sha256="${5:-}" expected_meta_state="${6:-}"
  skill_directory_matches "$path" "$expected_identity" "$expected_digest" || return 1
  if [[ -z "$expected_meta_state" && ( -n "$expected_meta_identity" || -n "$expected_meta_sha256" ) ]]; then
    expected_meta_state="valid"
  fi
  if [[ -n "$expected_meta_state" ]]; then
    skill_metadata_state_matches "$path" "$expected_meta_state" "$expected_meta_identity" "$expected_meta_sha256"
  fi
}

move_skill_directory_no_clobber() {
  local source="$1" destination="$2" expected_identity="$3" expected_digest="$4" expected_meta_identity="${5:-}" expected_meta_sha256="${6:-}" expected_meta_state="${7:-}" nested_policy="${8:-preserve}"
  local os_name nested source_parent quarantine_container quarantine
  SKILL_MOVE_PRESERVED_PATH=""
  case "$nested_policy" in
    preserve|discard-transaction) ;;
    *) log_error "Unsupported nested Skill move policy: $nested_policy"; return 1 ;;
  esac
  [[ -d "$source" && ! -L "$source" ]] || return 1
  if ! should_force_portable_skill_move && mv --help 2>&1 | grep -q -- '--no-target-directory'; then
    mv -nT "$source" "$destination" 2>/dev/null || true
  else
    os_name="$(uname -s 2>/dev/null || true)"
    case "$os_name" in
      Darwin|FreeBSD|NetBSD|OpenBSD) mv -n -h "$source" "$destination" 2>/dev/null || true ;;
      *) mv -n "$source" "$destination" 2>/dev/null || true ;;
    esac
  fi
  if [[ ! -e "$source" && ! -L "$source" ]] && skill_move_snapshot_matches "$destination" "$expected_identity" "$expected_digest" "$expected_meta_identity" "$expected_meta_sha256" "$expected_meta_state"; then
    return 0
  fi

  # BSD mv has no GNU -T equivalent. If a destination directory appears after
  # the last recheck, `mv -n -h` can place our source inside that newcomer.
  # User backup material is preserved in place for manual recovery. Only a
  # caller that explicitly marks its source as transaction-owned may isolate
  # and discard the exact verified nested directory.
  if [[ ! -e "$source" && ! -L "$source" && -d "$destination" && ! -L "$destination" ]]; then
    nested="$destination/${source##*/}"
    if skill_move_snapshot_matches "$nested" "$expected_identity" "$expected_digest" "$expected_meta_identity" "$expected_meta_sha256" "$expected_meta_state"; then
      if [[ "$nested_policy" == "preserve" ]]; then
        SKILL_MOVE_PRESERVED_PATH="$nested"
        log_error "Destination became a directory during the exact Skill move; preserved the source for manual recovery at $nested"
        return 1
      fi
      source_parent="${source%/*}"
      quarantine_container="$(mktemp -d "$source_parent/.craftroster-skill-quarantine.XXXXXXXX")"
      quarantine="$quarantine_container/staged"
      if ! mv "$nested" "$quarantine"; then
        rmdir "$quarantine_container" 2>/dev/null || true
        log_error "Could not isolate the transaction-owned nested Skill directory from newcomer destination: $destination"
        return 1
      fi
      if ! skill_move_snapshot_matches "$quarantine" "$expected_identity" "$expected_digest" "$expected_meta_identity" "$expected_meta_sha256" "$expected_meta_state"; then
        log_error "The nested Skill directory changed while it was quarantined; preserved manual recovery path: $quarantine"
        return 1
      fi
      if ! rm -rf "$quarantine_container"; then
        log_error "Could not clean the quarantined transaction-owned Skill directory: $quarantine_container"
        return 1
      fi
    fi
  fi
  return 1
}

discard_transaction_skill_directory() {
  local path="$1" expected_identity="$2" expected_digest="$3" expected_meta_identity="${4:-}" expected_meta_sha256="${5:-}" expected_meta_state="${6:-}"
  local parent quarantine_container quarantine
  skill_move_snapshot_matches "$path" "$expected_identity" "$expected_digest" "$expected_meta_identity" "$expected_meta_sha256" "$expected_meta_state" || return 1
  parent="${path%/*}"
  quarantine_container="$(mktemp -d "$parent/.craftroster-skill-discard.XXXXXXXX")"
  quarantine="$quarantine_container/owned"
  if ! move_skill_directory_no_clobber "$path" "$quarantine" "$expected_identity" "$expected_digest" "$expected_meta_identity" "$expected_meta_sha256" "$expected_meta_state" "discard-transaction"; then
    rmdir "$quarantine_container" 2>/dev/null || true
    return 1
  fi
  if ! skill_move_snapshot_matches "$quarantine" "$expected_identity" "$expected_digest" "$expected_meta_identity" "$expected_meta_sha256" "$expected_meta_state"; then
    log_error "Transaction-owned Skill changed after quarantine; preserved manual recovery path: $quarantine"
    return 1
  fi
  rm -rf "$quarantine_container"
}

cleanup_active_skill_stage() {
  [[ -n "$SKILL_ACTIVE_STAGE" && -d "$SKILL_ACTIVE_STAGE" && ! -L "$SKILL_ACTIVE_STAGE" ]] || return 0
  if [[ -n "$SKILL_ACTIVE_STAGE_IDENTITY" && -n "$SKILL_ACTIVE_STAGE_DIGEST" ]]; then
    discard_transaction_skill_directory \
      "$SKILL_ACTIVE_STAGE" \
      "$SKILL_ACTIVE_STAGE_IDENTITY" \
      "$SKILL_ACTIVE_STAGE_DIGEST" \
      "$SKILL_ACTIVE_STAGE_META_IDENTITY" \
      "$SKILL_ACTIVE_STAGE_META_SHA256" \
      "$SKILL_ACTIVE_STAGE_META_STATE"
    return
  fi
  rmdir "$SKILL_ACTIVE_STAGE" 2>/dev/null
}

rollback_active_skill_transaction() {
  local failed_commit="" recovery_path=""
  if [[ -n "$SKILL_ACTIVE_BACKUP" && -d "$SKILL_ACTIVE_BACKUP" ]]; then
    if ! skill_move_snapshot_matches \
      "$SKILL_ACTIVE_BACKUP" \
      "$SKILL_ACTIVE_BACKUP_IDENTITY" \
      "$SKILL_ACTIVE_BACKUP_DIGEST" \
      "$SKILL_ACTIVE_BACKUP_META_IDENTITY" \
      "$SKILL_ACTIVE_BACKUP_META_SHA256" \
      "$SKILL_ACTIVE_BACKUP_META_STATE"; then
      cleanup_active_skill_stage || true
      log_error "Manual recovery required: the captured Skill ownership metadata or content changed; the backup was preserved at $SKILL_ACTIVE_BACKUP."
      clear_active_skill_transaction
      return 1
    fi
    if [[ -e "$SKILL_ACTIVE_TARGET" || -L "$SKILL_ACTIVE_TARGET" ]]; then
      if ! skill_move_snapshot_matches \
        "$SKILL_ACTIVE_TARGET" \
        "$SKILL_ACTIVE_STAGE_IDENTITY" \
        "$SKILL_ACTIVE_STAGE_DIGEST" \
        "$SKILL_ACTIVE_STAGE_META_IDENTITY" \
        "$SKILL_ACTIVE_STAGE_META_SHA256" \
        "$SKILL_ACTIVE_STAGE_META_STATE"; then
        cleanup_active_skill_stage || true
        log_error "Manual recovery required: the Skill destination is occupied by an unrecognized newcomer at $SKILL_ACTIVE_TARGET; the original backup was preserved at $SKILL_ACTIVE_BACKUP."
        clear_active_skill_transaction
        return 1
      fi
      failed_commit="$SKILL_ACTIVE_BACKUP_CONTAINER/failed-commit"
      if ! move_skill_directory_no_clobber \
        "$SKILL_ACTIVE_TARGET" \
        "$failed_commit" \
        "$SKILL_ACTIVE_STAGE_IDENTITY" \
        "$SKILL_ACTIVE_STAGE_DIGEST" \
        "$SKILL_ACTIVE_STAGE_META_IDENTITY" \
        "$SKILL_ACTIVE_STAGE_META_SHA256" \
        "$SKILL_ACTIVE_STAGE_META_STATE" \
        "discard-transaction"; then
        log_error "Manual recovery required: the failed Skill commit could not be safely quarantined; the original backup was preserved at $SKILL_ACTIVE_BACKUP."
        clear_active_skill_transaction
        return 1
      fi
    fi
    if should_create_skill_restore_destination_after_recheck; then
      mkdir "$SKILL_ACTIVE_TARGET"
      printf '%s\n' 'test-only restore newcomer that must be preserved' > "$SKILL_ACTIVE_TARGET/CRAFTROSTER-NEWCOMER.txt"
    fi
    if ! move_skill_directory_no_clobber \
      "$SKILL_ACTIVE_BACKUP" \
      "$SKILL_ACTIVE_TARGET" \
      "$SKILL_ACTIVE_BACKUP_IDENTITY" \
      "$SKILL_ACTIVE_BACKUP_DIGEST" \
      "$SKILL_ACTIVE_BACKUP_META_IDENTITY" \
      "$SKILL_ACTIVE_BACKUP_META_SHA256" \
      "$SKILL_ACTIVE_BACKUP_META_STATE" \
      "preserve"; then
      recovery_path="${SKILL_MOVE_PRESERVED_PATH:-$SKILL_ACTIVE_BACKUP}"
      cleanup_active_skill_stage || true
      log_error "Manual recovery required: the original Skill could not be restored to $SKILL_ACTIVE_TARGET; its backup was preserved at $recovery_path."
      clear_active_skill_transaction
      return 1
    fi
    if ! skill_move_snapshot_matches \
      "$SKILL_ACTIVE_TARGET" \
      "$SKILL_ACTIVE_BACKUP_IDENTITY" \
      "$SKILL_ACTIVE_BACKUP_DIGEST" \
      "$SKILL_ACTIVE_BACKUP_META_IDENTITY" \
      "$SKILL_ACTIVE_BACKUP_META_SHA256" \
      "$SKILL_ACTIVE_BACKUP_META_STATE"; then
      log_error "Manual recovery required: the restored Skill changed before it could be verified at $SKILL_ACTIVE_TARGET."
      clear_active_skill_transaction
      return 1
    fi
  elif [[ "$SKILL_ACTIVE_STAGE_COMMITTED" -eq 1 && -n "$SKILL_ACTIVE_TARGET" && ( -e "$SKILL_ACTIVE_TARGET" || -L "$SKILL_ACTIVE_TARGET" ) ]]; then
    if ! discard_transaction_skill_directory \
      "$SKILL_ACTIVE_TARGET" \
      "$SKILL_ACTIVE_STAGE_IDENTITY" \
      "$SKILL_ACTIVE_STAGE_DIGEST" \
      "$SKILL_ACTIVE_STAGE_META_IDENTITY" \
      "$SKILL_ACTIVE_STAGE_META_SHA256" \
      "$SKILL_ACTIVE_STAGE_META_STATE"; then
      cleanup_active_skill_stage || true
      log_error "Manual recovery required: the fresh Skill destination no longer matches this transaction and was preserved at $SKILL_ACTIVE_TARGET."
      clear_active_skill_transaction
      return 1
    fi
  fi
  if ! cleanup_active_skill_stage; then
    log_error "Manual recovery required: an unrecognized Skill staging directory was preserved at $SKILL_ACTIVE_STAGE."
    clear_active_skill_transaction
    return 1
  fi
  if [[ -n "$failed_commit" && -d "$failed_commit" ]]; then
    if ! discard_transaction_skill_directory \
      "$failed_commit" \
      "$SKILL_ACTIVE_STAGE_IDENTITY" \
      "$SKILL_ACTIVE_STAGE_DIGEST" \
      "$SKILL_ACTIVE_STAGE_META_IDENTITY" \
      "$SKILL_ACTIVE_STAGE_META_SHA256" \
      "$SKILL_ACTIVE_STAGE_META_STATE"; then
      log_error "Manual recovery required: the failed Skill commit was preserved at $failed_commit."
      clear_active_skill_transaction
      return 1
    fi
  fi
  if [[ -n "$SKILL_ACTIVE_BACKUP_CONTAINER" && -d "$SKILL_ACTIVE_BACKUP_CONTAINER" ]]; then
    if ! rmdir "$SKILL_ACTIVE_BACKUP_CONTAINER"; then
      log_error "Manual recovery required: the Skill backup container was not empty and was preserved at $SKILL_ACTIVE_BACKUP_CONTAINER."
      clear_active_skill_transaction
      return 1
    fi
  fi
  clear_active_skill_transaction
}

validate_test_fault_config() {
  local mode="${CRAFTROSTER_INSTALL_TEST_MODE:-}" fault="${CRAFTROSTER_INSTALL_TEST_FAULT:-}"
  case "$mode" in
    ""|enabled) ;;
    *) log_error "CRAFTROSTER_INSTALL_TEST_MODE must be unset or exactly 'enabled'."; exit 1 ;;
  esac
  case "$fault" in
    ""|skill-commit-after-backup|skill-destination-appears-after-recheck|skill-destination-appears-after-recheck-portable-mv|skill-backup-metadata-changes-after-recheck|skill-fresh-post-move-failure|skill-fresh-post-move-newcomer|skill-backup-capture-destination-race-portable-mv|skill-backup-restore-destination-race-portable-mv|skill-force-invalid-metadata-changes-after-recheck|skill-force-missing-metadata-appears-after-recheck|auto-config-backup-capture-destination-race-portable-mv|auto-config-backup-restore-destination-race-portable-mv) ;;
    *) log_error "CRAFTROSTER_INSTALL_TEST_FAULT has an unsupported test-only value."; exit 1 ;;
  esac
  if [[ -n "$fault" && "$mode" != "enabled" ]]; then
    log_error "CRAFTROSTER_INSTALL_TEST_FAULT requires CRAFTROSTER_INSTALL_TEST_MODE=enabled."
    exit 1
  fi
}

should_fail_skill_commit_after_backup() {
  [[ "${CRAFTROSTER_INSTALL_TEST_MODE:-}" == "enabled" ]] || return 1
  case "${CRAFTROSTER_INSTALL_TEST_FAULT:-}" in
    skill-commit-after-backup|skill-backup-restore-destination-race-portable-mv) return 0 ;;
    *) return 1 ;;
  esac
}

should_create_skill_destination_after_recheck() {
  [[ "${CRAFTROSTER_INSTALL_TEST_MODE:-}" == "enabled" ]] || return 1
  case "${CRAFTROSTER_INSTALL_TEST_FAULT:-}" in
    skill-destination-appears-after-recheck|skill-destination-appears-after-recheck-portable-mv) return 0 ;;
    *) return 1 ;;
  esac
}

should_force_portable_skill_move() {
  [[ "${CRAFTROSTER_INSTALL_TEST_MODE:-}" == "enabled" ]] || return 1
  case "${CRAFTROSTER_INSTALL_TEST_FAULT:-}" in
    skill-destination-appears-after-recheck-portable-mv|skill-backup-capture-destination-race-portable-mv|skill-backup-restore-destination-race-portable-mv) return 0 ;;
    *) return 1 ;;
  esac
}

should_create_skill_backup_destination_after_recheck() {
  [[ "${CRAFTROSTER_INSTALL_TEST_MODE:-}" == "enabled" && "${CRAFTROSTER_INSTALL_TEST_FAULT:-}" == "skill-backup-capture-destination-race-portable-mv" ]]
}

should_create_skill_restore_destination_after_recheck() {
  [[ "${CRAFTROSTER_INSTALL_TEST_MODE:-}" == "enabled" && "${CRAFTROSTER_INSTALL_TEST_FAULT:-}" == "skill-backup-restore-destination-race-portable-mv" ]]
}

should_force_portable_exact_move() {
  [[ "${CRAFTROSTER_INSTALL_TEST_MODE:-}" == "enabled" ]] || return 1
  case "${CRAFTROSTER_INSTALL_TEST_FAULT:-}" in
    auto-config-backup-capture-destination-race-portable-mv|auto-config-backup-restore-destination-race-portable-mv) return 0 ;;
    *) return 1 ;;
  esac
}

should_create_auto_backup_destination_after_recheck() {
  [[ "${CRAFTROSTER_INSTALL_TEST_MODE:-}" == "enabled" && "${CRAFTROSTER_INSTALL_TEST_FAULT:-}" == "auto-config-backup-capture-destination-race-portable-mv" ]]
}

should_fail_auto_after_backup_for_restore_race() {
  [[ "${CRAFTROSTER_INSTALL_TEST_MODE:-}" == "enabled" && "${CRAFTROSTER_INSTALL_TEST_FAULT:-}" == "auto-config-backup-restore-destination-race-portable-mv" ]]
}

should_create_auto_restore_destination_after_recheck() {
  should_fail_auto_after_backup_for_restore_race
}

apply_test_only_force_skill_metadata_race() {
  local target="$1" name="$2" ownership_target="$3" content_sha256="$4"
  [[ "${CRAFTROSTER_INSTALL_TEST_MODE:-}" == "enabled" ]] || return 0
  case "${CRAFTROSTER_INSTALL_TEST_FAULT:-}" in
    skill-force-invalid-metadata-changes-after-recheck)
      printf '%s\n' 'test-only malformed metadata newcomer mutation' >> "$target/.skill-meta.json"
      ;;
    skill-force-missing-metadata-appears-after-recheck)
      write_test_only_foreign_skill_metadata "$target/.skill-meta.json" "$name" "$ownership_target" "$content_sha256"
      ;;
  esac
}

should_change_skill_backup_metadata_after_recheck() {
  [[ "${CRAFTROSTER_INSTALL_TEST_MODE:-}" == "enabled" && "${CRAFTROSTER_INSTALL_TEST_FAULT:-}" == "skill-backup-metadata-changes-after-recheck" ]]
}

should_fail_fresh_skill_post_move() {
  [[ "${CRAFTROSTER_INSTALL_TEST_MODE:-}" == "enabled" ]] || return 1
  case "${CRAFTROSTER_INSTALL_TEST_FAULT:-}" in
    skill-fresh-post-move-failure|skill-fresh-post-move-newcomer) return 0 ;;
    *) return 1 ;;
  esac
}

should_create_fresh_skill_post_move_newcomer() {
  [[ "${CRAFTROSTER_INSTALL_TEST_MODE:-}" == "enabled" && "${CRAFTROSTER_INSTALL_TEST_FAULT:-}" == "skill-fresh-post-move-newcomer" ]]
}

write_test_only_foreign_skill_metadata() {
  local path="$1" name="$2" ownership_target="$3" content_sha256="$4"
  [[ "${CRAFTROSTER_INSTALL_TEST_MODE:-}" == "enabled" ]] || return 1
  cat > "$path" <<EOF
{
  "source": "test-only-newcomer",
  "repo": "foreign/repository",
  "branch": "main",
  "component": "skill",
  "name": "$name",
  "target": "$ownership_target",
  "contentSha256": "$content_sha256",
  "installedAt": "2000-01-01T00:00:00Z",
  "updatedAt": "2000-01-01T00:00:00Z"
}
EOF
}

assert_regular_agent_leaf() {
  local path="$1" label="$2"
  if [[ -L "$path" || ( -e "$path" && ! -f "$path" ) ]]; then
    log_error "Refusing to replace a non-regular or linked $label file: $path"
    exit 1
  fi
}

exact_regular_file_snapshot_matches() {
  local path="$1" expected_identity="$2" expected_sha256="$3" actual_identity actual_sha256
  [[ -f "$path" && ! -L "$path" && -n "$expected_identity" && -n "$expected_sha256" ]] || return 1
  actual_identity="$(regular_file_identity "$path")" || return 1
  [[ "$actual_identity" == "$expected_identity" ]] || return 1
  actual_sha256="$(regular_file_sha256 "$path")" || return 1
  [[ "$actual_sha256" == "$expected_sha256" ]]
}

discard_transaction_regular_file() {
  local path="$1" expected_identity="$2" expected_sha256="$3" parent quarantine_container quarantine
  exact_regular_file_snapshot_matches "$path" "$expected_identity" "$expected_sha256" || return 1
  parent="${path%/*}"
  quarantine_container="$(mktemp -d "$parent/.craftroster-file-discard.XXXXXXXX")"
  quarantine="$quarantine_container/owned"
  if ! mv "$path" "$quarantine"; then
    rmdir "$quarantine_container" 2>/dev/null || true
    return 1
  fi
  if ! exact_regular_file_snapshot_matches "$quarantine" "$expected_identity" "$expected_sha256"; then
    log_error "Transaction-owned file changed while it was quarantined; preserved manual recovery path: $quarantine"
    return 1
  fi
  rm -f "$quarantine"
  rmdir "$quarantine_container"
}

move_exact_no_clobber() {
  local source="$1" destination="$2" nested_policy="${3:-preserve}" source_identity source_sha256 nested os_name
  EXACT_MOVE_PRESERVED_PATH=""
  case "$nested_policy" in
    preserve|discard-transaction) ;;
    *) log_error "Unsupported exact file move policy: $nested_policy"; return 1 ;;
  esac
  source_identity="$(regular_file_identity "$source")" || return 1
  source_sha256="$(regular_file_sha256 "$source")" || return 1
  if ! should_force_portable_exact_move && mv --help 2>&1 | grep -q -- '--no-target-directory'; then
    mv -nT "$source" "$destination" 2>/dev/null || true
  else
    os_name="$(uname -s 2>/dev/null || true)"
    case "$os_name" in
      Darwin|FreeBSD|NetBSD|OpenBSD) mv -n -h "$source" "$destination" 2>/dev/null || true ;;
      *) mv -n "$source" "$destination" 2>/dev/null || true ;;
    esac
  fi
  if [[ ! -e "$source" && ! -L "$source" ]] &&
    exact_regular_file_snapshot_matches "$destination" "$source_identity" "$source_sha256"; then
    return 0
  fi
  if [[ -d "$destination" && ! -L "$destination" ]]; then
    nested="$destination/${source##*/}"
    if exact_regular_file_snapshot_matches "$nested" "$source_identity" "$source_sha256"; then
      if [[ "$nested_policy" == "preserve" ]]; then
        EXACT_MOVE_PRESERVED_PATH="$nested"
        log_error "Destination became a directory during the exact file move; preserved the source for manual recovery at $nested"
      elif ! discard_transaction_regular_file "$nested" "$source_identity" "$source_sha256"; then
        log_error "Could not safely isolate the transaction-owned nested file from newcomer destination: $destination"
      fi
    fi
  fi
  return 1
}

move_exact_replace() {
  local source="$1" destination="$2" nested_policy="${3:-preserve}" source_identity source_sha256 nested os_name
  EXACT_MOVE_PRESERVED_PATH=""
  case "$nested_policy" in
    preserve|discard-transaction) ;;
    *) log_error "Unsupported exact file move policy: $nested_policy"; return 1 ;;
  esac
  source_identity="$(regular_file_identity "$source")" || return 1
  source_sha256="$(regular_file_sha256 "$source")" || return 1
  if ! should_force_portable_exact_move && mv --help 2>&1 | grep -q -- '--no-target-directory'; then
    mv -fT "$source" "$destination" 2>/dev/null || true
  else
    os_name="$(uname -s 2>/dev/null || true)"
    case "$os_name" in
      Darwin|FreeBSD|NetBSD|OpenBSD)
        if [[ "$nested_policy" == "preserve" ]]; then
          mv -n -h "$source" "$destination" 2>/dev/null || true
        else
          mv -f -h "$source" "$destination" 2>/dev/null || true
        fi
        ;;
      *) mv -f "$source" "$destination" 2>/dev/null || true ;;
    esac
  fi
  if [[ ! -e "$source" && ! -L "$source" ]] &&
    exact_regular_file_snapshot_matches "$destination" "$source_identity" "$source_sha256"; then
    return 0
  fi
  if [[ -d "$destination" && ! -L "$destination" ]]; then
    nested="$destination/${source##*/}"
    if exact_regular_file_snapshot_matches "$nested" "$source_identity" "$source_sha256"; then
      if [[ "$nested_policy" == "preserve" ]]; then
        EXACT_MOVE_PRESERVED_PATH="$nested"
        log_error "Destination became a directory during the exact file replacement; preserved the source for manual recovery at $nested"
      elif ! discard_transaction_regular_file "$nested" "$source_identity" "$source_sha256"; then
        log_error "Could not safely isolate the transaction-owned nested replacement from newcomer destination: $destination"
      fi
    fi
  fi
  return 1
}

install_staged_exact() {
  local staged="$1" destination="$2" label="$3" destination_existed="$4"
  assert_regular_agent_leaf "$destination" "$label"
  if [[ "$destination_existed" -eq 1 ]]; then
    if [[ ! -f "$destination" || -L "$destination" ]]; then
      log_error "Refusing to replace $label because its existing destination changed: $destination"
      return 1
    fi
    if ! move_exact_replace "$staged" "$destination" "discard-transaction"; then
      log_error "Could not atomically replace and verify the exact $label destination: $destination"
      return 1
    fi
  elif ! move_exact_no_clobber "$staged" "$destination" "discard-transaction"; then
    log_error "Refusing to install $label because the exact destination was occupied or changed: $destination"
    return 1
  fi
}

install_skill() {
  local src="$1" destination_root="$2" ownership_target="$3" legacy_targets="${4:-}" name target meta now installed_at
  local staged backup_container backup target_existed preflight_target_identity preflight_content_sha256 current_content_sha256 incoming_content_sha256 staged_content_sha256
  name="$(basename "$src")"
  target="${destination_root%/}/$name"
  meta="$target/.skill-meta.json"
  assert_within_destination "$target" "$destination_root"
  assert_regular_skill_root "$target"
  install_action "$target" "$meta" "$name" "skill" "$name" "$ownership_target" "$target/SKILL.md" "$src/SKILL.md" "" "" "$legacy_targets"
  target_existed=0
  backup=""
  backup_container=""
  preflight_target_identity="$EXPECTED_SKILL_TARGET_IDENTITY"
  preflight_content_sha256="$EXPECTED_SKILL_CURRENT_SHA256"
  if [[ -d "$target" ]]; then
    target_existed=1
    if [[ -z "$preflight_target_identity" ]]; then
      if ! preflight_target_identity="$(skill_directory_identity "$target")"; then exit 1; fi
    fi
    if [[ -z "$preflight_content_sha256" ]]; then
      if ! preflight_content_sha256="$(skill_content_sha256 "$target")"; then exit 1; fi
    fi
  fi
  if [[ "$DRY_RUN" -eq 1 ]]; then printf 'DRY-RUN %s Skill %s -> %s\n' "$INSTALL_ACTION" "$name" "$target"; return; fi

  mkdir -p "$destination_root"
  staged="$(mktemp -d "$destination_root/.craftroster-skill-stage.XXXXXXXX")"
  SKILL_ACTIVE_TARGET="$target"
  SKILL_ACTIVE_STAGE="$staged"
  SKILL_ACTIVE_BACKUP=""
  SKILL_ACTIVE_BACKUP_CONTAINER=""
  SKILL_ACTIVE_STAGE_IDENTITY=""
  SKILL_ACTIVE_STAGE_DIGEST=""
  SKILL_ACTIVE_STAGE_META_IDENTITY=""
  SKILL_ACTIVE_STAGE_META_SHA256=""
  SKILL_ACTIVE_STAGE_META_STATE="valid"
  SKILL_ACTIVE_STAGE_COMMITTED=0
  SKILL_ACTIVE_BACKUP_IDENTITY=""
  SKILL_ACTIVE_BACKUP_DIGEST=""
  SKILL_ACTIVE_BACKUP_META_IDENTITY=""
  SKILL_ACTIVE_BACKUP_META_SHA256=""
  SKILL_ACTIVE_BACKUP_META_STATE=""
  if ! incoming_content_sha256="$(skill_content_sha256 "$src")"; then
    rollback_active_skill_transaction || true
    exit 1
  fi
  if ! cp -R "$src/." "$staged/"; then
    rollback_active_skill_transaction || true
    log_error "Could not stage Skill $name."
    exit 1
  fi
  if ! staged_content_sha256="$(skill_content_sha256 "$staged")"; then
    rollback_active_skill_transaction || true
    exit 1
  fi
  if [[ "$incoming_content_sha256" != "$staged_content_sha256" ]]; then
    rollback_active_skill_transaction || true
    log_error "Refusing to install Skill $name because its source changed while the staged snapshot was copied."
    exit 1
  fi
  if ! SKILL_ACTIVE_STAGE_IDENTITY="$(skill_directory_identity "$staged")"; then
    rollback_active_skill_transaction || true
    exit 1
  fi
  SKILL_ACTIVE_STAGE_DIGEST="$staged_content_sha256"
  now="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  installed_at="${EXISTING_INSTALLED_AT:-$now}"
  if ! cat > "$staged/.skill-meta.json" <<EOF
{
  "source": "$SOURCE_KIND",
  "repo": "$REPO",
  "branch": "$BRANCH",
  "component": "skill",
  "name": "$name",
  "target": "$ownership_target",
  "contentSha256": "$staged_content_sha256",
  "installedAt": "$installed_at",
  "updatedAt": "$now"
}
EOF
  then
    rollback_active_skill_transaction || true
    log_error "Could not stage Skill metadata for $name."
    exit 1
  fi
  if ! validate_flat_metadata "$staged/.skill-meta.json" ||
    ! SKILL_ACTIVE_STAGE_META_IDENTITY="$(regular_file_identity "$staged/.skill-meta.json")" ||
    ! SKILL_ACTIVE_STAGE_META_SHA256="$(regular_file_sha256 "$staged/.skill-meta.json")" ||
    ! skill_transaction_snapshot_matches \
      "$staged" \
      "$SKILL_ACTIVE_STAGE_IDENTITY" \
      "$SKILL_ACTIVE_STAGE_DIGEST" \
      "$SKILL_ACTIVE_STAGE_META_IDENTITY" \
      "$SKILL_ACTIVE_STAGE_META_SHA256"; then
    rollback_active_skill_transaction || true
    log_error "Could not verify the staged Skill ownership marker for $name."
    exit 1
  fi

  assert_regular_skill_root "$target"
  if [[ "$target_existed" -eq 1 ]]; then
    apply_test_only_force_skill_metadata_race "$target" "$name" "$ownership_target" "$preflight_content_sha256"
  fi
  if [[ "$target_existed" -eq 1 ]]; then
    if [[ ! -d "$target" ]]; then
      rollback_active_skill_transaction || true
      log_error "Refusing to replace Skill $name because its destination disappeared during staging."
      exit 1
    fi
    if ! skill_move_snapshot_matches \
      "$target" \
      "$preflight_target_identity" \
      "$preflight_content_sha256" \
      "$EXPECTED_SKILL_META_IDENTITY" \
      "$EXPECTED_SKILL_META_SHA256" \
      "$EXPECTED_SKILL_META_STATE"; then
      rollback_active_skill_transaction || true
      log_error "Refusing to replace Skill $name because its ownership metadata, filesystem identity, or content changed during installation staging. Run the installer again."
      exit 1
    fi
    backup_container="$(mktemp -d "$destination_root/.craftroster-skill-backup.XXXXXXXX")"
    backup="$backup_container/original"
    SKILL_ACTIVE_BACKUP_CONTAINER="$backup_container"
    SKILL_ACTIVE_BACKUP="$backup"
    SKILL_ACTIVE_BACKUP_IDENTITY="$preflight_target_identity"
    SKILL_ACTIVE_BACKUP_DIGEST="$preflight_content_sha256"
    SKILL_ACTIVE_BACKUP_META_IDENTITY="$EXPECTED_SKILL_META_IDENTITY"
    SKILL_ACTIVE_BACKUP_META_SHA256="$EXPECTED_SKILL_META_SHA256"
    SKILL_ACTIVE_BACKUP_META_STATE="$EXPECTED_SKILL_META_STATE"
    if should_create_skill_backup_destination_after_recheck; then
      mkdir "$backup"
      printf '%s\n' 'test-only backup destination newcomer that must be preserved' > "$backup/CRAFTROSTER-NEWCOMER.txt"
    fi
    if ! move_skill_directory_no_clobber \
      "$target" \
      "$backup" \
      "$SKILL_ACTIVE_BACKUP_IDENTITY" \
      "$SKILL_ACTIVE_BACKUP_DIGEST" \
      "$SKILL_ACTIVE_BACKUP_META_IDENTITY" \
      "$SKILL_ACTIVE_BACKUP_META_SHA256" \
      "$SKILL_ACTIVE_BACKUP_META_STATE" \
      "preserve"; then
      rollback_active_skill_transaction || true
      log_error "Could not capture the existing Skill before atomic replacement: $target"
      exit 1
    fi
    if should_change_skill_backup_metadata_after_recheck; then
      write_test_only_foreign_skill_metadata "$backup/.skill-meta.json" "$name" "$ownership_target" "$SKILL_ACTIVE_BACKUP_DIGEST"
    fi
    if ! skill_move_snapshot_matches \
      "$backup" \
      "$SKILL_ACTIVE_BACKUP_IDENTITY" \
      "$SKILL_ACTIVE_BACKUP_DIGEST" \
      "$SKILL_ACTIVE_BACKUP_META_IDENTITY" \
      "$SKILL_ACTIVE_BACKUP_META_SHA256" \
      "$SKILL_ACTIVE_BACKUP_META_STATE"; then
      rollback_active_skill_transaction || true
      log_error "Refusing to continue because the captured Skill ownership metadata, filesystem identity, or content changed after backup."
      exit 1
    fi
    if should_fail_skill_commit_after_backup; then
      rollback_active_skill_transaction || {
        log_error "Injected Skill commit failure also failed to restore the original Skill."
        exit 1
      }
      log_error "Injected test-only Skill commit failure after backup."
      exit 1
    fi
  elif [[ -e "$target" || -L "$target" ]]; then
    rollback_active_skill_transaction || true
    log_error "Refusing to install Skill $name because its destination appeared during staging."
    exit 1
  fi

  if should_create_skill_destination_after_recheck; then
    mkdir "$target"
    printf '%s\n' 'test-only newcomer that must be preserved' > "$target/CRAFTROSTER-NEWCOMER.txt"
  fi

  if ! move_skill_directory_no_clobber \
    "$staged" \
    "$target" \
    "$SKILL_ACTIVE_STAGE_IDENTITY" \
    "$SKILL_ACTIVE_STAGE_DIGEST" \
    "$SKILL_ACTIVE_STAGE_META_IDENTITY" \
    "$SKILL_ACTIVE_STAGE_META_SHA256" \
    "$SKILL_ACTIVE_STAGE_META_STATE" \
    "discard-transaction"; then
    rollback_active_skill_transaction || {
      log_error "Skill $name commit failed and the original Skill could not be restored."
      exit 1
    }
    log_error "Could not atomically commit and verify the exact Skill destination for $name."
    exit 1
  fi
  SKILL_ACTIVE_STAGE_COMMITTED=1
  if [[ "$target_existed" -eq 0 ]] && should_create_fresh_skill_post_move_newcomer; then
    write_test_only_foreign_skill_metadata "$target/.skill-meta.json" "$name" "$ownership_target" "$SKILL_ACTIVE_STAGE_DIGEST"
  fi
  if ! skill_transaction_snapshot_matches \
    "$target" \
    "$SKILL_ACTIVE_STAGE_IDENTITY" \
    "$SKILL_ACTIVE_STAGE_DIGEST" \
    "$SKILL_ACTIVE_STAGE_META_IDENTITY" \
    "$SKILL_ACTIVE_STAGE_META_SHA256" ||
    { [[ "$target_existed" -eq 0 ]] && should_fail_fresh_skill_post_move; }; then
    if ! rollback_active_skill_transaction; then
      log_error "Fresh or updated Skill post-move verification failed; unrecognized content was preserved for manual recovery."
    else
      log_error "Injected test-only fresh Skill post-move verification failure."
    fi
    exit 1
  fi
  if [[ -n "$backup" ]]; then
    if ! discard_transaction_skill_directory \
      "$backup" \
      "$SKILL_ACTIVE_BACKUP_IDENTITY" \
      "$SKILL_ACTIVE_BACKUP_DIGEST" \
      "$SKILL_ACTIVE_BACKUP_META_IDENTITY" \
      "$SKILL_ACTIVE_BACKUP_META_SHA256" \
      "$SKILL_ACTIVE_BACKUP_META_STATE"; then
      clear_active_skill_transaction
      log_error "Skill $name was installed, but the original backup changed before cleanup and was preserved at $backup."
      exit 1
    fi
    if ! rmdir "$backup_container"; then
      clear_active_skill_transaction
      log_error "Skill $name was installed, but its non-empty backup container was preserved at $backup_container."
      exit 1
    fi
  fi
  clear_active_skill_transaction
  log_success "$INSTALL_ACTION Skill $name -> $target"
}

preflight_skill() {
  local src="$1" destination_root="$2" ownership_target="$3" legacy_targets="${4:-}" name target meta
  name="$(basename "$src")"
  target="${destination_root%/}/$name"
  meta="$target/.skill-meta.json"
  assert_within_destination "$target" "$destination_root"
  assert_regular_skill_root "$target"
  install_action "$target" "$meta" "$name" "skill" "$name" "$ownership_target" "$target/SKILL.md" "$src/SKILL.md" "" "" "$legacy_targets"
}

install_agent_profile() {
  local src="$1" runtime_name="$2" agent_id="$3" platform="$4" destination_root="$5" ownership_target="$6" suffix="$7" legacy_targets="${8:-}"
  local target meta legacy_meta ownership_meta now installed_at staged_agent staged_meta target_existed meta_existed
  local legacy_meta_used=0 legacy_meta_identity="" legacy_meta_sha256=""
  target="${destination_root%/}/$runtime_name$suffix"
  meta="$target.craftroster.json"
  legacy_meta="$target.autoverse.json"
  ownership_meta="$meta"
  assert_within_destination "$target" "$destination_root"
  assert_regular_agent_leaf "$target" "Agent"
  assert_regular_agent_leaf "$meta" "Agent metadata"
  assert_regular_agent_leaf "$legacy_meta" "legacy Agent metadata"
  if [[ ! -f "$meta" && -f "$legacy_meta" ]]; then
    ownership_meta="$legacy_meta"
    legacy_meta_used=1
  elif [[ -f "$meta" && -f "$legacy_meta" ]] && (
    FORCE=0
    install_action "$target" "$legacy_meta" "$agent_id" "agent" "$runtime_name" "$ownership_target" "" "" "$agent_id" "$platform" "$legacy_targets"
  ) >/dev/null 2>&1; then
    legacy_meta_used=1
  fi
  if [[ "$legacy_meta_used" -eq 1 ]]; then
    if ! legacy_meta_identity="$(regular_file_identity "$legacy_meta")" || ! legacy_meta_sha256="$(regular_file_sha256 "$legacy_meta")"; then
      log_error "Refusing to migrate Agent $agent_id because its legacy ownership sidecar could not be identified."
      exit 1
    fi
  fi
  install_action "$target" "$ownership_meta" "$agent_id" "agent" "$runtime_name" "$ownership_target" "" "" "$agent_id" "$platform" "$legacy_targets"
  if [[ "$legacy_meta_used" -eq 1 && "$INSTALL_ACTION" != "force-replace" ]]; then INSTALL_ACTION="migrate-update"; fi
  target_existed=0
  meta_existed=0
  if [[ -f "$target" ]]; then target_existed=1; fi
  if [[ -f "$meta" ]]; then meta_existed=1; fi
  if [[ "$DRY_RUN" -eq 1 ]]; then printf 'DRY-RUN %s Agent %s -> %s\n' "$INSTALL_ACTION" "$agent_id" "$target"; return; fi

  mkdir -p "$destination_root"
  now="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  installed_at="${EXISTING_INSTALLED_AT:-$now}"
  staged_agent="$(mktemp "$destination_root/.craftroster-agent.XXXXXXXX")"
  staged_meta="$(mktemp "$destination_root/.craftroster-agent-meta.XXXXXXXX")"
  if ! cp "$src" "$staged_agent"; then
    rm -f "$staged_agent" "$staged_meta"
    log_error "Could not stage Agent $agent_id."
    exit 1
  fi
  if ! cat > "$staged_meta" <<EOF
{
  "source": "$SOURCE_KIND",
  "repo": "$REPO",
  "branch": "$BRANCH",
  "component": "agent",
  "id": "$agent_id",
  "name": "$runtime_name",
  "adapter": "$platform",
  "target": "$ownership_target",
  "installedAt": "$installed_at",
  "updatedAt": "$now"
}
EOF
  then
    rm -f "$staged_agent" "$staged_meta"
    log_error "Could not stage Agent metadata for $agent_id."
    exit 1
  fi
  assert_regular_agent_leaf "$target" "Agent"
  assert_regular_agent_leaf "$meta" "Agent metadata"
  if [[ "$target_existed" -eq 1 ]]; then
    if ! install_staged_exact "$staged_agent" "$target" "Agent" "$target_existed"; then
      rm -f "$staged_agent" "$staged_meta"
      log_error "Could not install Agent $agent_id."
      exit 1
    fi
    staged_agent=""
    if ! install_staged_exact "$staged_meta" "$meta" "Agent metadata" "$meta_existed"; then
      rm -f "$staged_meta"
      log_error "Agent $agent_id was updated, but its ownership metadata could not be refreshed."
      exit 1
    fi
  else
    if ! install_staged_exact "$staged_meta" "$meta" "Agent metadata" "$meta_existed"; then
      rm -f "$staged_agent" "$staged_meta"
      log_error "Could not install Agent metadata for $agent_id."
      exit 1
    fi
    staged_meta=""
    if ! install_staged_exact "$staged_agent" "$target" "Agent" "$target_existed"; then
      rm -f "$staged_agent"
      log_error "Could not install Agent $agent_id; its owned sidecar remains available for a safe repair run."
      exit 1
    fi
  fi
  if [[ "$legacy_meta_used" -eq 1 && "$INSTALL_ACTION" == "migrate-update" ]]; then
    if [[ ! -f "$legacy_meta" || -L "$legacy_meta" ]] ||
      [[ "$(regular_file_identity "$legacy_meta" 2>/dev/null || true)" != "$legacy_meta_identity" ]] ||
      [[ "$(regular_file_sha256 "$legacy_meta" 2>/dev/null || true)" != "$legacy_meta_sha256" ]]; then
      log_error "Agent $agent_id was installed, but its legacy ownership sidecar changed and was preserved for manual recovery: $legacy_meta"
      exit 1
    fi
    if ! rm -f -- "$legacy_meta"; then
      log_error "Agent $agent_id was installed, but its verified legacy ownership sidecar could not be removed: $legacy_meta"
      exit 1
    fi
  fi
  log_success "$INSTALL_ACTION Agent $agent_id -> $target"
}

preflight_agent_profile() {
  local src="$1" runtime_name="$2" agent_id="$3" platform="$4" destination_root="$5" ownership_target="$6" suffix="$7" legacy_targets="${8:-}" target meta legacy_meta ownership_meta
  target="${destination_root%/}/$runtime_name$suffix"
  meta="$target.craftroster.json"
  legacy_meta="$target.autoverse.json"
  ownership_meta="$meta"
  assert_within_destination "$target" "$destination_root"
  assert_regular_agent_leaf "$target" "Agent"
  assert_regular_agent_leaf "$meta" "Agent metadata"
  assert_regular_agent_leaf "$legacy_meta" "legacy Agent metadata"
  if [[ ! -f "$meta" && -f "$legacy_meta" ]]; then ownership_meta="$legacy_meta"; fi
  install_action "$target" "$ownership_meta" "$agent_id" "agent" "$runtime_name" "$ownership_target" "" "" "$agent_id" "$platform" "$legacy_targets"
}

has_codex_developer_instructions_conflict() {
  local file="$1" key
  key="(developer_instructions|\"developer_instructions\"|'developer_instructions')"
  if grep -Eq "^[[:space:]]*${key}([[:space:]]*=|[[:space:]]*\.)" "$file" ||
    grep -Eq "^[[:space:]]*\[{1,2}[[:space:]]*${key}([[:space:]]*\.|[[:space:]]*\])" "$file"; then
    return 0
  fi
  awk '
    function trim(value) {
      sub(/^[ \t]+/, "", value)
      sub(/[ \t]+$/, "", value)
      return value
    }
    function hex_to_decimal(hex, result, i, position) {
      result = 0
      hex = tolower(hex)
      for (i = 1; i <= length(hex); i++) {
        position = index("0123456789abcdef", substr(hex, i, 1)) - 1
        if (position < 0) return -1
        result = result * 16 + position
      }
      return result
    }
    function decode_basic_key(body, output, i, character, escape, width, hex, code) {
      output = ""
      for (i = 1; i <= length(body); i++) {
        character = substr(body, i, 1)
        if (character != "\\") { output = output character; continue }
        i++
        if (i > length(body)) return "__invalid__"
        escape = substr(body, i, 1)
        if (escape == "u" || escape == "U") {
          width = escape == "u" ? 4 : 8
          hex = substr(body, i + 1, width)
          if (length(hex) != width) return "__invalid__"
          code = hex_to_decimal(hex)
          if (code < 0 || code > 127) return "__non_ascii__"
          output = output sprintf("%c", code)
          i += width
        } else if (escape == "\"" || escape == "\\") {
          output = output escape
        } else {
          return "__invalid__"
        }
      }
      return output
    }
    {
      line = $0
      sub(/\r$/, "", line)
      line = trim(line)
      if (substr(line, 1, 2) == "[[") line = trim(substr(line, 3))
      else if (substr(line, 1, 1) == "[") line = trim(substr(line, 2))
      if (substr(line, 1, 1) != "\"") next
      escaped = 0
      closing = 0
      for (i = 2; i <= length(line); i++) {
        character = substr(line, i, 1)
        if (escaped) { escaped = 0; continue }
        if (character == "\\") { escaped = 1; continue }
        if (character == "\"") { closing = i; break }
      }
      if (!closing) next
      suffix = trim(substr(line, closing + 1))
      if (substr(suffix, 1, 1) != "=" && substr(suffix, 1, 1) != "." && substr(suffix, 1, 1) != "]") next
      body = substr(line, 2, closing - 2)
      if (decode_basic_key(body) == "developer_instructions") { found = 1; exit }
    }
    END { exit(found ? 0 : 1) }
  ' "$file"
}

marker_line_numbers() {
  local file="$1" marker="$2"
  awk -v marker="$marker" '
    {
      line = $0
      sub(/\r$/, "", line)
      sub(/[ \t]+$/, "", line)
      if (line == marker) lines = lines (lines ? "," : "") NR
    }
    END { print(lines ? lines : "none") }
  ' "$file"
}

plan_codex_auto_delegation() {
  local guidance_file="$1" config_path start_count end_count legacy_start_count legacy_end_count start_lines end_lines legacy_start_lines legacy_end_lines end_line block_file remainder_file second_line closing_line literal_close_count bom
  local managed_end_pattern managed_label is_legacy_migration=0
  config_path="${CODEX_HOME:-$HOME/.codex}/config.toml"
  AUTO_SIBLING_PATH=""
  if [[ -e "$config_path" || -L "$config_path" ]]; then
    if [[ -L "$config_path" || ! -f "$config_path" ]]; then
      log_error "Refusing to replace a non-regular or linked Codex config: $config_path"
      exit 1
    fi
  fi
  block_file="$AUTO_PLAN_DIR/codex-block.toml"
  {
    printf '# CRAFTROSTER_AUTO_DELEGATION_START\n'
    printf "developer_instructions = '''\n"
    cat "$guidance_file"
    printf "\n'''\n"
    printf '# CRAFTROSTER_AUTO_DELEGATION_END\n'
  } > "$block_file"

  AUTO_RUNTIME="Codex"
  AUTO_CONFIG_PATH="$config_path"
  AUTO_NEW_TEXT="$AUTO_PLAN_DIR/codex-config.toml"
  AUTO_ORIGINAL_FILE=""
  AUTO_EXISTING=0
  if [[ ! -f "$config_path" ]]; then
    cp "$block_file" "$AUTO_NEW_TEXT"
    AUTO_ACTION="install"
    return
  fi

  AUTO_EXISTING=1
  AUTO_ORIGINAL_FILE="$AUTO_PLAN_DIR/codex-original.toml"
  cp -p "$config_path" "$AUTO_ORIGINAL_FILE"
  bom="$(LC_ALL=C head -c 3 "$AUTO_ORIGINAL_FILE" | od -An -t x1 | tr -d '[:space:]')"
  if [[ "$bom" == "efbbbf" ]]; then
    log_error "Refusing to rewrite BOM-prefixed Codex config $config_path. Remove the BOM or merge the guidance manually."
    exit 1
  fi
  start_count="$(grep -c '^# CRAFTROSTER_AUTO_DELEGATION_START[[:space:]]*$' "$AUTO_ORIGINAL_FILE" || true)"
  end_count="$(grep -c '^# CRAFTROSTER_AUTO_DELEGATION_END[[:space:]]*$' "$AUTO_ORIGINAL_FILE" || true)"
  legacy_start_count="$(grep -c '^# AUTOVERSE_AUTO_DELEGATION_START[[:space:]]*$' "$AUTO_ORIGINAL_FILE" || true)"
  legacy_end_count="$(grep -c '^# AUTOVERSE_AUTO_DELEGATION_END[[:space:]]*$' "$AUTO_ORIGINAL_FILE" || true)"
  start_lines="$(marker_line_numbers "$AUTO_ORIGINAL_FILE" '# CRAFTROSTER_AUTO_DELEGATION_START')"
  end_lines="$(marker_line_numbers "$AUTO_ORIGINAL_FILE" '# CRAFTROSTER_AUTO_DELEGATION_END')"
  legacy_start_lines="$(marker_line_numbers "$AUTO_ORIGINAL_FILE" '# AUTOVERSE_AUTO_DELEGATION_START')"
  legacy_end_lines="$(marker_line_numbers "$AUTO_ORIGINAL_FILE" '# AUTOVERSE_AUTO_DELEGATION_END')"
  if [[ "$start_count" -ne "$end_count" || "$start_count" -gt 1 ]]; then
    log_error "Refusing to edit $config_path because its CraftRoster auto-delegation markers are incomplete or duplicated (START=$start_count at lines $start_lines; END=$end_count at lines $end_lines). Back up config.toml and reconcile only these reserved marker lines. If the file contains developer_instructions you need to preserve, rerun without --enable-auto-delegation. --force does not bypass this config safety check."
    exit 1
  fi
  if [[ "$legacy_start_count" -ne "$legacy_end_count" || "$legacy_start_count" -gt 1 ]]; then
    log_error "Refusing to edit $config_path because its legacy auto-delegation markers are incomplete or duplicated (START=$legacy_start_count at lines $legacy_start_lines; END=$legacy_end_count at lines $legacy_end_lines). Back up config.toml and reconcile only these reserved marker lines. If the file contains developer_instructions you need to preserve, rerun without --enable-auto-delegation. --force does not bypass this config safety check."
    exit 1
  fi
  if [[ "$start_count" -eq 1 && "$legacy_start_count" -eq 1 ]]; then
    log_error "Refusing to edit $config_path because it contains both CraftRoster and legacy auto-delegation blocks (CraftRoster START/END lines $start_lines/$end_lines; legacy START/END lines $legacy_start_lines/$legacy_end_lines). Back up config.toml and reconcile the duplicate guidance manually, or rerun without --enable-auto-delegation. --force does not bypass this config safety check."
    exit 1
  fi
  if [[ "$start_count" -eq 1 && "$(head -n 1 "$AUTO_ORIGINAL_FILE" | tr -d '\r')" != "# CRAFTROSTER_AUTO_DELEGATION_START" ]]; then
    log_error "Refusing to edit $config_path because the CraftRoster marker is at line $start_lines instead of the start of the file. Back up config.toml and reconcile the managed block manually, or rerun without --enable-auto-delegation. --force does not bypass this config safety check."
    exit 1
  fi
  if [[ "$legacy_start_count" -eq 1 && "$(head -n 1 "$AUTO_ORIGINAL_FILE" | tr -d '\r')" != "# AUTOVERSE_AUTO_DELEGATION_START" ]]; then
    log_error "Refusing to edit $config_path because the legacy marker is at line $legacy_start_lines instead of the start of the file. Back up config.toml and reconcile the managed block manually, or rerun without --enable-auto-delegation. --force does not bypass this config safety check."
    exit 1
  fi

  if [[ "$legacy_start_count" -eq 1 ]]; then
    is_legacy_migration=1
    managed_end_pattern='^# AUTOVERSE_AUTO_DELEGATION_END[[:space:]]*$'
    managed_label="legacy"
  else
    managed_end_pattern='^# CRAFTROSTER_AUTO_DELEGATION_END[[:space:]]*$'
    managed_label="CraftRoster"
  fi

  if [[ "$start_count" -eq 1 || "$legacy_start_count" -eq 1 ]]; then
    end_line="$(grep -n "$managed_end_pattern" "$AUTO_ORIGINAL_FILE" | cut -d: -f1)"
    second_line="$(sed -n '2p' "$AUTO_ORIGINAL_FILE" | tr -d '\r')"
    closing_line=""
    if [[ "$end_line" -gt 1 ]]; then closing_line="$(sed -n "$((end_line - 1))p" "$AUTO_ORIGINAL_FILE" | tr -d '\r')"; fi
    literal_close_count=0
    if [[ "$end_line" -gt 2 ]]; then
      literal_close_count="$(sed -n "3,$((end_line - 1))p" "$AUTO_ORIGINAL_FILE" | tr -d '\r' | grep -c "^'''[[:space:]]*$" || true)"
    fi
    if [[ "$end_line" -lt 4 || "$second_line" != "developer_instructions = '''" || "$closing_line" != "'''" || "$literal_close_count" -ne 1 ]]; then
      log_error "Refusing to edit $config_path because its $managed_label managed block has an unexpected structure. Back up config.toml and reconcile the block manually, or rerun without --enable-auto-delegation. --force does not bypass this config safety check."
      exit 1
    fi
    remainder_file="$AUTO_PLAN_DIR/codex-remainder.toml"
    tail -n "+$((end_line + 1))" "$AUTO_ORIGINAL_FILE" > "$remainder_file"
    if has_codex_developer_instructions_conflict "$remainder_file"; then
      log_error "Refusing to edit $config_path because it also defines developer_instructions outside the CraftRoster managed block. Merge the guidance manually, or rerun without --enable-auto-delegation to preserve the existing instructions. --force does not bypass this config safety check."
      exit 1
    fi
    {
      cat "$block_file"
      cat "$remainder_file"
    } > "$AUTO_NEW_TEXT"
  else
    if has_codex_developer_instructions_conflict "$AUTO_ORIGINAL_FILE"; then
      log_error "Refusing to edit $config_path because it already defines developer_instructions outside the CraftRoster managed block. Merge the guidance manually, or rerun without --enable-auto-delegation to preserve the existing instructions. --force does not bypass this config safety check."
      exit 1
    fi
    {
      cat "$block_file"
      printf '\n'
      cat "$AUTO_ORIGINAL_FILE"
    } > "$AUTO_NEW_TEXT"
  fi
  if [[ "$is_legacy_migration" -eq 1 ]]; then
    AUTO_ACTION="migrate-update"
  elif cmp -s "$AUTO_ORIGINAL_FILE" "$AUTO_NEW_TEXT"; then
    AUTO_ACTION="unchanged"
  else
    AUTO_ACTION="update"
  fi
}

merge_opencode_config_with_python() {
  local python_command="$1" config_path="$2" instruction_path="$3" output_path="$4"
  local -a python_runner
  if [[ "$python_command" == "py" ]]; then
    python_runner=("$python_command" -3)
  else
    python_runner=("$python_command")
  fi
  "${python_runner[@]}" - "$config_path" "$instruction_path" "$output_path" <<'PY'
import codecs
import json
import shutil
import sys
from decimal import Decimal

config_path, instruction_path, output_path = sys.argv[1:]

def reject_constant(value):
    raise ValueError(f"non-standard JSON constant: {value}")

def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON key: {key}")
        result[key] = value
    return result

try:
    with open(config_path, "rb") as handle:
        raw = handle.read()
    has_bom = raw.startswith(codecs.BOM_UTF8)
    text = raw.decode("utf-8-sig")
    decoder = json.JSONDecoder(
        parse_float=Decimal,
        parse_constant=reject_constant,
        object_pairs_hook=unique_object,
    )
    config = decoder.decode(text)
except Exception as exc:
    print(f"OpenCode config is not strict JSON: {exc}", file=sys.stderr)
    raise SystemExit(4)

if not isinstance(config, dict):
    print("OpenCode config must contain a JSON object.", file=sys.stderr)
    raise SystemExit(4)
for key in config:
    if key.casefold() == "instructions" and key != "instructions":
        print("OpenCode config contains a case-conflicting Instructions key.", file=sys.stderr)
        raise SystemExit(4)
instructions = config.get("instructions", [])
if not isinstance(instructions, list) or any(not isinstance(item, str) for item in instructions):
    print("OpenCode instructions must be an array of strings.", file=sys.stderr)
    raise SystemExit(4)

normalize = lambda value: value.replace("\\", "/")
if any(normalize(item) == normalize(instruction_path) for item in instructions):
    shutil.copyfile(config_path, output_path)
    raise SystemExit(3)

def skip_whitespace(index):
    while index < len(text) and text[index] in " \t\r\n":
        index += 1
    return index

try:
    index = skip_whitespace(0)
    if index >= len(text) or text[index] != "{":
        raise ValueError("root is not an object")
    root_open = index
    index = skip_whitespace(index + 1)
    has_properties = False
    last_value_end = None
    instructions_array_end = None
    if index < len(text) and text[index] != "}":
        while True:
            key, key_end = decoder.raw_decode(text, index)
            if not isinstance(key, str):
                raise ValueError("object key is not a string")
            index = skip_whitespace(key_end)
            if index >= len(text) or text[index] != ":":
                raise ValueError("missing colon after object key")
            value_start = skip_whitespace(index + 1)
            _, value_end = decoder.raw_decode(text, value_start)
            if key == "instructions":
                if text[value_start] != "[" or text[value_end - 1] != "]":
                    raise ValueError("instructions is not an array")
                instructions_array_end = value_end - 1
            has_properties = True
            last_value_end = value_end
            index = skip_whitespace(value_end)
            if index < len(text) and text[index] == ",":
                index = skip_whitespace(index + 1)
                continue
            break
    if index >= len(text) or text[index] != "}":
        raise ValueError("missing root object terminator")
    root_close = index
    if skip_whitespace(root_close + 1) != len(text):
        raise ValueError("unexpected content after root object")
except Exception as exc:
    print(f"Could not locate the OpenCode config layout: {exc}", file=sys.stderr)
    raise SystemExit(4)

newline = "\r\n" if "\r\n" in text else "\n"
encoded_path = json.dumps(instruction_path, ensure_ascii=False)
if instructions_array_end is not None:
    separator = "," if instructions else ""
    insertion = separator + newline + "    " + encoded_path + newline + "  "
    new_text = text[:instructions_array_end] + insertion + text[instructions_array_end:]
else:
    insertion_index = last_value_end if has_properties else root_open + 1
    separator = "," if has_properties else ""
    insertion = separator + newline + '  "instructions": [' + newline + "    " + encoded_path + newline + "  ]"
    new_text = text[:insertion_index] + insertion + text[insertion_index:]

with open(output_path, "wb") as handle:
    if has_bom:
        handle.write(codecs.BOM_UTF8)
    handle.write(new_text.encode("utf-8"))
PY
}

merge_opencode_config_with_node() {
  local node_command="$1" config_path="$2" instruction_path="$3" output_path="$4"
  "$node_command" - "$config_path" "$instruction_path" "$output_path" <<'JS'
const fs = require("fs");
const { TextDecoder } = require("util");

const [configPath, instructionPath, outputPath] = process.argv.slice(2);
const raw = fs.readFileSync(configPath);
const hasBom = raw.length >= 3 && raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
let text;
try {
  text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(hasBom ? raw.subarray(3) : raw);
} catch (error) {
  console.error(`OpenCode config is not valid UTF-8: ${error.message}`);
  process.exit(4);
}

let index = 0;
const layout = {
  rootOpen: -1,
  rootClose: -1,
  hasProperties: false,
  lastValueEnd: -1,
  instructionsArrayEnd: -1,
};

function fail(message) {
  throw new Error(message);
}

function skipWhitespace() {
  while (index < text.length && /[ \t\r\n]/.test(text[index])) index += 1;
}

function parseString() {
  if (text[index] !== '"') fail("expected a JSON string");
  const start = index++;
  while (index < text.length) {
    const code = text.charCodeAt(index);
    const character = text[index++];
    if (character === '"') {
      const source = text.slice(start, index);
      return { value: JSON.parse(source), start, end: index, type: "string" };
    }
    if (code < 0x20) fail("unescaped control character in JSON string");
    if (character !== "\\") continue;
    if (index >= text.length) fail("unfinished JSON escape");
    const escape = text[index++];
    if ('"\\/bfnrt'.includes(escape)) continue;
    if (escape !== "u" || !/^[0-9a-fA-F]{4}$/.test(text.slice(index, index + 4))) {
      fail("invalid JSON escape");
    }
    index += 4;
  }
  fail("unterminated JSON string");
}

function parseNumber() {
  const start = index;
  const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(text.slice(index));
  if (!match) fail("invalid JSON number");
  index += match[0].length;
  if (index < text.length && !/[ \t\r\n,\]}]/.test(text[index])) fail("invalid JSON number terminator");
  return { start, end: index, type: "number" };
}

function parseLiteral(literal, type) {
  const start = index;
  if (text.slice(index, index + literal.length) !== literal) fail(`invalid JSON ${type}`);
  index += literal.length;
  return { start, end: index, type };
}

function parseArray(depth) {
  const start = index++;
  let count = 0;
  skipWhitespace();
  if (text[index] === "]") return { start, end: ++index, type: "array", count };
  while (true) {
    parseValue(depth + 1);
    count += 1;
    skipWhitespace();
    if (text[index] === "]") return { start, end: ++index, type: "array", count };
    if (text[index] !== ",") fail("expected a comma in JSON array");
    index += 1;
    skipWhitespace();
  }
}

function parseObject(depth) {
  const start = index++;
  const keys = new Set();
  skipWhitespace();
  if (text[index] === "}") {
    index += 1;
    if (depth === 0) {
      layout.rootOpen = start;
      layout.rootClose = index - 1;
    }
    return { start, end: index, type: "object" };
  }
  while (true) {
    const key = parseString();
    if (keys.has(key.value)) fail(`duplicate JSON key: ${key.value}`);
    keys.add(key.value);
    if (depth === 0 && key.value.toLowerCase() === "instructions" && key.value !== "instructions") {
      fail("case-conflicting Instructions key");
    }
    skipWhitespace();
    if (text[index] !== ":") fail("expected a colon after JSON object key");
    index += 1;
    skipWhitespace();
    const value = parseValue(depth + 1);
    if (depth === 0) {
      layout.rootOpen = start;
      layout.hasProperties = true;
      layout.lastValueEnd = value.end;
      if (key.value === "instructions") {
        if (value.type !== "array") fail("instructions is not an array");
        layout.instructionsArrayEnd = value.end - 1;
      }
    }
    skipWhitespace();
    if (text[index] === "}") {
      index += 1;
      if (depth === 0) layout.rootClose = index - 1;
      return { start, end: index, type: "object" };
    }
    if (text[index] !== ",") fail("expected a comma in JSON object");
    index += 1;
    skipWhitespace();
  }
}

function parseValue(depth) {
  if (index >= text.length) fail("unexpected end of JSON input");
  if (text[index] === "{") return parseObject(depth);
  if (text[index] === "[") return parseArray(depth);
  if (text[index] === '"') return parseString();
  if (text[index] === "t") return parseLiteral("true", "boolean");
  if (text[index] === "f") return parseLiteral("false", "boolean");
  if (text[index] === "n") return parseLiteral("null", "null");
  if (text[index] === "-" || /[0-9]/.test(text[index])) return parseNumber();
  fail("invalid JSON value");
}

let config;
try {
  skipWhitespace();
  const root = parseValue(0);
  skipWhitespace();
  if (index !== text.length) fail("unexpected content after root JSON value");
  if (root.type !== "object") fail("OpenCode config root is not an object");
  config = JSON.parse(text);
} catch (error) {
  console.error(`OpenCode config is not strict JSON: ${error.message}`);
  process.exit(4);
}

const instructions = config.instructions ?? [];
if (!Array.isArray(instructions) || instructions.some((item) => typeof item !== "string")) {
  console.error("OpenCode instructions must be an array of strings.");
  process.exit(4);
}
const normalize = (value) => value.replaceAll("\\", "/");
if (instructions.some((item) => normalize(item) === normalize(instructionPath))) {
  fs.copyFileSync(configPath, outputPath);
  process.exit(3);
}

const newline = text.includes("\r\n") ? "\r\n" : "\n";
const encodedPath = JSON.stringify(instructionPath);
let newText;
if (layout.instructionsArrayEnd >= 0) {
  const separator = instructions.length > 0 ? "," : "";
  const insertion = separator + newline + "    " + encodedPath + newline + "  ";
  newText = text.slice(0, layout.instructionsArrayEnd) + insertion + text.slice(layout.instructionsArrayEnd);
} else {
  const insertionIndex = layout.hasProperties ? layout.lastValueEnd : layout.rootOpen + 1;
  const separator = layout.hasProperties ? "," : "";
  const insertion = separator + newline + '  "instructions": [' + newline + "    " + encodedPath + newline + "  ]";
  newText = text.slice(0, insertionIndex) + insertion + text.slice(insertionIndex);
}
const output = Buffer.from(newText, "utf8");
fs.writeFileSync(outputPath, hasBom ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), output]) : output);
JS
}

plan_opencode_auto_delegation() {
  local instruction_path="$1" config_root json_path jsonc_path escaped_path minimal_path parser_command parser_kind status
  config_root="$(opencode_config_root)"
  if LC_ALL=C printf '%s' "$instruction_path" | grep -q '[[:cntrl:]]'; then
    log_error "Refusing to write an OpenCode instruction path containing control characters."
    exit 1
  fi
  json_path="$config_root/opencode.json"
  jsonc_path="$config_root/opencode.jsonc"
  AUTO_SIBLING_PATH="$jsonc_path"
  for candidate in "$json_path" "$jsonc_path"; do
    if [[ -e "$candidate" || -L "$candidate" ]]; then
      if [[ -L "$candidate" || ! -f "$candidate" ]]; then
        log_error "Refusing to replace a non-regular or linked OpenCode config: $candidate"
        exit 1
      fi
    fi
  done
  if [[ -f "$json_path" && -f "$jsonc_path" ]]; then
    log_error "Refusing to edit OpenCode config because both opencode.json and opencode.jsonc exist in $config_root. Add the instruction path manually."
    exit 1
  fi
  if [[ -f "$jsonc_path" ]]; then
    log_error "Refusing to rewrite JSONC config $jsonc_path. Add '$instruction_path' to its instructions array manually."
    exit 1
  fi

  AUTO_RUNTIME="OpenCode"
  AUTO_CONFIG_PATH="$json_path"
  AUTO_NEW_TEXT="$AUTO_PLAN_DIR/opencode.json"
  AUTO_ORIGINAL_FILE=""
  AUTO_EXISTING=0
  if [[ ! -f "$json_path" ]]; then
    escaped_path="$(printf '%s' "$instruction_path" | sed 's/\\/\\\\/g; s/"/\\"/g')"
    printf '{\n  "$schema": "https://opencode.ai/config.json",\n  "instructions": [\n    "%s"\n  ]\n}\n' "$escaped_path" > "$AUTO_NEW_TEXT"
    AUTO_ACTION="install"
    return
  fi

  AUTO_EXISTING=1
  AUTO_ORIGINAL_FILE="$AUTO_PLAN_DIR/opencode-original.json"
  cp -p "$json_path" "$AUTO_ORIGINAL_FILE"
  escaped_path="$(printf '%s' "$instruction_path" | sed 's/\\/\\\\/g; s/"/\\"/g')"
  minimal_path="$AUTO_PLAN_DIR/opencode-minimal.json"
  printf '{\n  "$schema": "https://opencode.ai/config.json",\n  "instructions": [\n    "%s"\n  ]\n}\n' "$escaped_path" > "$minimal_path"
  if cmp -s "$AUTO_ORIGINAL_FILE" "$minimal_path"; then
    cp "$AUTO_ORIGINAL_FILE" "$AUTO_NEW_TEXT"
    AUTO_ACTION="unchanged"
    return
  fi
  parser_command=""
  parser_kind=""
  if command -v python3 >/dev/null 2>&1 && python3 -c 'import sys; raise SystemExit(0 if sys.version_info.major == 3 else 1)' >/dev/null 2>&1; then
    parser_command="python3"; parser_kind="python"
  elif command -v python >/dev/null 2>&1 && python -c 'import sys; raise SystemExit(0 if sys.version_info.major == 3 else 1)' >/dev/null 2>&1; then
    parser_command="python"; parser_kind="python"
  elif command -v py >/dev/null 2>&1 && py -3 -c 'import sys; raise SystemExit(0 if sys.version_info.major == 3 else 1)' >/dev/null 2>&1; then
    parser_command="py"; parser_kind="python"
  elif command -v node >/dev/null 2>&1; then
    parser_command="node"; parser_kind="node"
  fi
  if [[ -z "$parser_command" ]]; then
    log_error "Refusing to rewrite existing OpenCode config $json_path without Python 3 or Node.js for strict JSON validation. Add '$instruction_path' to its instructions array manually."
    exit 1
  fi

  set +e
  if [[ "$parser_kind" == "python" ]]; then
    merge_opencode_config_with_python "$parser_command" "$AUTO_ORIGINAL_FILE" "$instruction_path" "$AUTO_NEW_TEXT"
  else
    merge_opencode_config_with_node "$parser_command" "$AUTO_ORIGINAL_FILE" "$instruction_path" "$AUTO_NEW_TEXT"
  fi
  status=$?
  set -e
  case "$status" in
    0) AUTO_ACTION="update" ;;
    3) AUTO_ACTION="unchanged" ;;
    *) log_error "Refusing to rewrite OpenCode config $json_path. Add '$instruction_path' to its instructions array manually."; exit 1 ;;
  esac
}

restore_captured_config() {
  local backup="${AUTO_CAPTURED_BACKUP:-}" destination="${AUTO_CAPTURED_PATH:-}" staged_checksum="${AUTO_STAGED_CHECKSUM:-}" current_checksum
  if [[ -z "$backup" || -z "$destination" ]]; then return 0; fi
  if [[ ! -f "$backup" || -L "$backup" ]]; then
    log_error "Could not restore $destination because its captured backup is missing or no longer a regular file: $backup"
    return 1
  fi

  if [[ ! -e "$destination" && ! -L "$destination" ]]; then
    if should_create_auto_restore_destination_after_recheck; then
      mkdir "$destination"
      printf '%s\n' 'test-only config restore newcomer that must be preserved' > "$destination/CRAFTROSTER-NEWCOMER.txt"
    fi
    if move_exact_no_clobber "$backup" "$destination" "preserve"; then
      AUTO_CAPTURED_BACKUP="" AUTO_CAPTURED_PATH="" AUTO_STAGED_CHECKSUM=""
      log_info "Restored config after incomplete installation: $destination"
      return 0
    fi
  elif [[ -f "$destination" && ! -L "$destination" && -n "$staged_checksum" ]]; then
    current_checksum="$(cksum < "$destination" 2>/dev/null || true)"
    if [[ "$current_checksum" == "$staged_checksum" ]] && move_exact_replace "$backup" "$destination" "preserve"; then
      AUTO_CAPTURED_BACKUP="" AUTO_CAPTURED_PATH="" AUTO_STAGED_CHECKSUM=""
      log_info "Restored config after incomplete installation: $destination"
      return 0
    fi
  fi

  log_error "Could not safely restore $destination because the destination is occupied or changed. The captured config remains at ${EXACT_MOVE_PRESERVED_PATH:-$backup}."
  return 1
}

apply_auto_delegation_plan() {
  local parent staged backup
  if [[ -n "$AUTO_SIBLING_PATH" && ( -e "$AUTO_SIBLING_PATH" || -L "$AUTO_SIBLING_PATH" ) ]]; then
    log_error "Refusing to apply OpenCode auto-delegation because a sibling config appeared: $AUTO_SIBLING_PATH"
    exit 1
  fi
  if [[ "$AUTO_ACTION" == "unchanged" ]]; then
    if [[ "$AUTO_EXISTING" -eq 1 ]]; then
      if [[ -L "$AUTO_CONFIG_PATH" || ! -f "$AUTO_CONFIG_PATH" || ! -f "$AUTO_ORIGINAL_FILE" ]] || ! cmp -s "$AUTO_CONFIG_PATH" "$AUTO_ORIGINAL_FILE"; then
        log_error "Refusing to confirm $AUTO_CONFIG_PATH because it changed after installation planning. Run the installer again."
        exit 1
      fi
    elif [[ -e "$AUTO_CONFIG_PATH" || -L "$AUTO_CONFIG_PATH" ]]; then
      log_error "Refusing to confirm $AUTO_CONFIG_PATH because it appeared after installation planning. Run the installer again."
      exit 1
    fi
    log_success "Auto-delegation already enabled for $AUTO_RUNTIME: $AUTO_CONFIG_PATH"
    return
  fi
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf 'DRY-RUN %s %s auto-delegation -> %s\n' "$AUTO_ACTION" "$AUTO_RUNTIME" "$AUTO_CONFIG_PATH"
    return
  fi

  if [[ "$AUTO_EXISTING" -eq 1 ]]; then
    if [[ -L "$AUTO_CONFIG_PATH" || ! -f "$AUTO_CONFIG_PATH" || ! -f "$AUTO_ORIGINAL_FILE" ]] || ! cmp -s "$AUTO_CONFIG_PATH" "$AUTO_ORIGINAL_FILE"; then
      log_error "Refusing to replace $AUTO_CONFIG_PATH because it changed after installation planning. Run the installer again."
      exit 1
    fi
  elif [[ -e "$AUTO_CONFIG_PATH" || -L "$AUTO_CONFIG_PATH" ]]; then
    log_error "Refusing to create $AUTO_CONFIG_PATH because it appeared after installation planning. Run the installer again."
    exit 1
  fi

  parent="$(dirname "$AUTO_CONFIG_PATH")"
  mkdir -p "$parent"
  staged="$(mktemp "$parent/.craftroster-config.XXXXXXXX")"
  AUTO_STAGED="$staged"
  cat "$AUTO_NEW_TEXT" > "$staged"
  AUTO_STAGED_CHECKSUM="$(cksum < "$staged")"
  if [[ "$AUTO_EXISTING" -eq 1 ]]; then
    if [[ -L "$AUTO_CONFIG_PATH" || ! -f "$AUTO_CONFIG_PATH" ]] || ! cmp -s "$AUTO_CONFIG_PATH" "$AUTO_ORIGINAL_FILE"; then
      log_error "Refusing to replace $AUTO_CONFIG_PATH because it changed after installation planning. Run the installer again."
      exit 1
    fi
    backup="$(mktemp "$AUTO_CONFIG_PATH.craftroster-backup-XXXXXXXX")"
    rm -f "$backup"
    if should_create_auto_backup_destination_after_recheck; then
      mkdir "$backup"
      printf '%s\n' 'test-only config backup destination newcomer that must be preserved' > "$backup/CRAFTROSTER-NEWCOMER.txt"
    fi
    if ! move_exact_no_clobber "$AUTO_CONFIG_PATH" "$backup" "preserve"; then
      log_error "Could not capture the current config before atomic replacement: $AUTO_CONFIG_PATH"
      exit 1
    fi
    AUTO_CAPTURED_BACKUP="$backup"
    AUTO_CAPTURED_PATH="$AUTO_CONFIG_PATH"
    if ! cmp -s "$backup" "$AUTO_ORIGINAL_FILE"; then
      log_error "Refusing to replace $AUTO_CONFIG_PATH because it changed during atomic replacement."
      exit 1
    fi
    log_info "Backup: $backup"
    if should_fail_auto_after_backup_for_restore_race; then
      log_error "Injected test-only auto-delegation failure after config backup."
      exit 1
    fi
  fi

  if [[ -n "$AUTO_SIBLING_PATH" && ( -e "$AUTO_SIBLING_PATH" || -L "$AUTO_SIBLING_PATH" ) ]]; then
    log_error "Refusing to apply OpenCode auto-delegation because a sibling config appeared: $AUTO_SIBLING_PATH"
    exit 1
  fi
  if ! move_exact_no_clobber "$staged" "$AUTO_CONFIG_PATH" "discard-transaction"; then
    log_error "Could not atomically install and verify the exact config destination: $AUTO_CONFIG_PATH"
    exit 1
  fi
  AUTO_STAGED="" AUTO_CAPTURED_BACKUP="" AUTO_CAPTURED_PATH="" AUTO_STAGED_CHECKSUM=""
  log_success "$AUTO_ACTION $AUTO_RUNTIME auto-delegation -> $AUTO_CONFIG_PATH"
}

validate_test_fault_config
if [[ -z "$TARGET" ]]; then usage; log_error "Target is required."; exit 1; fi
if [[ -n "$NAME" && -n "$CATEGORY" ]]; then log_error "Name and Category cannot be used together."; exit 1; fi
if [[ "$TYPE" != "skill" && "$TYPE" != "agent" ]]; then log_error "Type must be skill or agent."; exit 1; fi
if [[ ! "$REPO" =~ ^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$ ]]; then
  log_error "Invalid GitHub repository '$REPO'. Expected owner/name using letters, numbers, dot, underscore, or hyphen."
  exit 1
fi
if [[ ! "$BRANCH" =~ ^[A-Za-z0-9._/+_-]+$ ]]; then
  log_error "Invalid branch '$BRANCH'. Use a GitHub branch name without whitespace, control characters, quotes, or backslashes."
  exit 1
fi
validate_target "$TARGET" "$TYPE"
REQUESTED_TARGET="$TARGET"
if [[ "$TARGET" == "vscode" ]]; then TARGET="copilot"; fi
if [[ "$ENABLE_AUTO_DELEGATION" -eq 1 && "$TYPE" != "agent" ]]; then
  log_error "--enable-auto-delegation is only supported with --type agent."
  exit 1
fi
if [[ "$ENABLE_AUTO_DELEGATION" -eq 1 && "$TARGET" != "codex" && "$TARGET" != "opencode" ]]; then
  log_error "--enable-auto-delegation only supports the global Agent targets 'codex' and 'opencode'."
  exit 1
fi
validate_name
if [[ -n "$CATEGORY" && ! "$CATEGORY" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  log_error "Invalid Category '$CATEGORY'. Expected a lowercase hyphen-case category."
  exit 1
fi

PROJECT_ROOT="$PWD"
if [[ "$TARGET" == "project" && -n "$INSTALL_DIR" ]]; then
  case "$INSTALL_DIR" in
    /*|[A-Za-z]:[\\/]*) PROJECT_ROOT="${INSTALL_DIR%/}" ;;
    *) PROJECT_ROOT="${INSTALL_DIR%/}" ;;
  esac
fi
if [[ "$TYPE" == "agent" ]]; then
  configure_agent_profiles
else
  configure_skill_profiles 1
fi
if [[ "$REQUESTED_TARGET" == "vscode" ]]; then
  log_info "Target alias: vscode -> copilot"
fi
if [[ "$TYPE" == "agent" ]]; then
  for destination in "${AGENT_DESTINATIONS[@]}"; do
    log_info "Destination: $destination"
  done
else
  for destination in "${SKILL_DESTINATIONS[@]}"; do
    log_info "Destination: $destination"
  done
fi

TMP_DIR=""
AUTO_PLAN_DIR=""
AUTO_ORIGINAL_FILE=""
AUTO_STAGED=""
AUTO_STAGED_CHECKSUM=""
AUTO_CAPTURED_BACKUP=""
AUTO_CAPTURED_PATH=""
AUTO_SIBLING_PATH=""
cleanup() {
  restore_captured_config || true
  rollback_active_skill_transaction || true
  [[ -z "$AUTO_STAGED" ]] || rm -f "$AUTO_STAGED"
  [[ -z "$TMP_DIR" ]] || rm -rf "$TMP_DIR"
  [[ -z "$AUTO_PLAN_DIR" ]] || rm -rf "$AUTO_PLAN_DIR"
}
trap cleanup EXIT
if [[ -n "$SOURCE_DIR" ]]; then
  REPO_ROOT="$(cd "$SOURCE_DIR" && pwd)"
  SOURCE_KIND="local-checkout"
else
  require_command curl
  require_command tar
  require_command mktemp
  TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/craftroster-$TYPE.XXXXXX")"
  ARCHIVE="$TMP_DIR/repo.tar.gz"
  EXTRACT_DIR="$TMP_DIR/repo"
  mkdir -p "$EXTRACT_DIR"
  log_info "Downloading $REPO@$BRANCH"
  curl -fsSL "https://codeload.github.com/$REPO/tar.gz/refs/heads/$BRANCH" -o "$ARCHIVE"
  tar -xzf "$ARCHIVE" -C "$EXTRACT_DIR"
  REPO_ROOT="$(find "$EXTRACT_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  if [[ -z "$REPO_ROOT" ]]; then log_error "Could not find extracted repository root."; exit 1; fi
  SOURCE_KIND="github-archive"
fi
LEGACY_SKILL_DIGEST_MANIFEST="$REPO_ROOT/scripts/data/legacy-skill-content-sha256.tsv"
LEGACY_SKILL_DIGEST_MANIFEST_VALIDATED=0

CATEGORY_NAMES=()
load_install_category_names() {
  local index_path="$REPO_ROOT/scripts/data/install-category-index.tsv"
  local line line_number=0 row_type remainder row_category row_name key
  local seen_keys=$'\n' available_text="" last_available=""
  [[ -f "$index_path" && ! -L "$index_path" ]] || {
    log_error "Install category index not found: $index_path"
    exit 1
  }
  while IFS= read -r line || [[ -n "$line" ]]; do
    line_number=$((line_number + 1))
    line="${line%$'\r'}"
    if [[ "$line_number" -eq 1 ]]; then
      [[ "$line" == $'type\tcategory\tname' ]] || {
        log_error "Install category index has an invalid header: $index_path"
        exit 1
      }
      continue
    fi
    if [[ "$line" != *$'\t'* ]]; then
      log_error "Install category index row $line_number must contain type, category, and name."
      exit 1
    fi
    row_type="${line%%$'\t'*}"
    remainder="${line#*$'\t'}"
    if [[ "$remainder" != *$'\t'* ]]; then
      log_error "Install category index row $line_number must contain type, category, and name."
      exit 1
    fi
    row_category="${remainder%%$'\t'*}"
    row_name="${remainder#*$'\t'}"
    if [[ "$row_name" == *$'\t'* || ( "$row_type" != "skill" && "$row_type" != "agent" ) ||
          ! "$row_category" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ||
          ! "$row_name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
      log_error "Install category index row $line_number contains an invalid value."
      exit 1
    fi
    key="$row_type:$row_name"
    case "$seen_keys" in
      *$'\n'"$key"$'\n'*) log_error "Install category index contains duplicate $row_type name: $row_name"; exit 1 ;;
    esac
    seen_keys+="$key"$'\n'
    if [[ "$row_type" == "$TYPE" ]]; then
      if [[ "$row_category" != "$last_available" ]]; then
        if [[ -n "$available_text" ]]; then available_text+=", "; fi
        available_text+="$row_category"
        last_available="$row_category"
      fi
      if [[ "$row_category" == "$CATEGORY" ]]; then CATEGORY_NAMES+=("$row_name"); fi
    fi
  done < "$index_path"
  if [[ "$line_number" -lt 2 ]]; then
    log_error "Install category index contains no components: $index_path"
    exit 1
  fi
  if [[ "${#CATEGORY_NAMES[@]}" -eq 0 ]]; then
    local label="Agent"
    [[ "$TYPE" == "skill" ]] && label="Skill"
    log_error "Invalid $label category '$CATEGORY'. Available $label categories: $available_text"
    exit 1
  fi
}

skill_source_path() {
  local skill_name="$1" candidate="$REPO_ROOT/skills/$1"
  [[ -f "$candidate/SKILL.md" ]] || candidate="$REPO_ROOT/$skill_name"
  if [[ ! -f "$candidate/SKILL.md" ]]; then
    log_error "Skill not found in archive: $skill_name"
    return 1
  fi
  printf '%s' "$candidate"
}

load_skill_dependency_rows() {
  local index_path="$REPO_ROOT/scripts/data/install-skill-dependencies.tsv"
  local line line_number=0 row_skill row_dependency row_kind row_when remainder key component_name index_bytes
  local seen_keys=$'\n' checked_names=$'\n'
  DEPENDENCY_SKILLS=()
  DEPENDENCY_NAMES=()
  DEPENDENCY_KINDS=()
  DEPENDENCY_WHENS=()
  [[ -f "$index_path" && ! -L "$index_path" ]] || {
    log_error "Skill dependency index not found or not a regular file: $index_path. Use the installer matching this source checkout."
    return 1
  }
  if ! index_bytes="$(LC_ALL=C od -An -v -tx1 "$index_path")"; then
    log_error "Cannot inspect Skill dependency index bytes (od is required): $index_path"
    return 1
  fi
  if [[ "$index_bytes" =~ (^|[[:space:]])00([[:space:]]|$) ]]; then
    log_error "Skill dependency index contains a NUL byte: $index_path"
    return 1
  fi
  while IFS= read -r line || [[ -n "$line" ]]; do
    line_number=$((line_number + 1))
    line="${line%$'\r'}"
    if [[ "$line_number" -eq 1 ]]; then
      [[ "$line" == $'skill\tdependency\tkind\twhen' ]] || {
        log_error "Skill dependency index has an invalid header: $index_path"
        return 1
      }
      continue
    fi
    remainder="$line"
    if [[ "$remainder" != *$'\t'* ]]; then log_error "Skill dependency index row $line_number must contain skill, dependency, kind, and when."; return 1; fi
    row_skill="${remainder%%$'\t'*}"
    remainder="${remainder#*$'\t'}"
    if [[ "$remainder" != *$'\t'* ]]; then log_error "Skill dependency index row $line_number must contain skill, dependency, kind, and when."; return 1; fi
    row_dependency="${remainder%%$'\t'*}"
    remainder="${remainder#*$'\t'}"
    if [[ "$remainder" != *$'\t'* ]]; then log_error "Skill dependency index row $line_number must contain skill, dependency, kind, and when."; return 1; fi
    row_kind="${remainder%%$'\t'*}"
    row_when="${remainder#*$'\t'}"
    if [[ ! "$row_skill" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ || ! "$row_dependency" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ||
          ( "$row_kind" != "required" && "$row_kind" != "conditional" && "$row_kind" != "optional" ) || "$row_when" == *$'\t'* || "$row_when" == *$'\r'* ||
          ( "$row_kind" != "conditional" && "$row_when" != "-" ) ||
          ( "$row_kind" == "conditional" && ( -z "${row_when//[[:space:]]/}" || "$row_when" == "-" ) ) ]]; then
      log_error "Skill dependency index row $line_number contains an invalid value."
      return 1
    fi
    if [[ "$row_skill" == "$row_dependency" ]]; then log_error "Skill dependency index contains a self dependency: $row_skill"; return 1; fi
    key="$row_skill:$row_dependency"
    case "$seen_keys" in
      *$'\n'"$key"$'\n'*) log_error "Skill dependency index contains duplicate dependency: $row_skill -> $row_dependency"; return 1 ;;
    esac
    seen_keys+="$key"$'\n'
    for component_name in "$row_skill" "$row_dependency"; do
      case "$checked_names" in
        *$'\n'"$component_name"$'\n'*) ;;
        *) skill_source_path "$component_name" >/dev/null || return 1; checked_names+="$component_name"$'\n' ;;
      esac
    done
    DEPENDENCY_SKILLS+=("$row_skill")
    DEPENDENCY_NAMES+=("$row_dependency")
    DEPENDENCY_KINDS+=("$row_kind")
    DEPENDENCY_WHENS+=("$row_when")
  done < "$index_path"
  if [[ "$line_number" -eq 0 ]]; then log_error "Skill dependency index has an invalid header: $index_path"; return 1; fi
}

visit_required_skill() {
  local skill_name="$1" chain="${2:-}" row_index source_path
  case "$DEPENDENCY_VISITED" in *$'\n'"$skill_name"$'\n'*) return ;; esac
  case "$DEPENDENCY_VISITING" in
    *$'\n'"$skill_name"$'\n'*) log_error "Required Skill dependency cycle: $chain$skill_name"; return 1 ;;
  esac
  DEPENDENCY_VISITING+="$skill_name"$'\n'
  for ((row_index = 0; row_index < ${#DEPENDENCY_SKILLS[@]}; row_index++)); do
    if [[ "${DEPENDENCY_SKILLS[$row_index]}" == "$skill_name" && "${DEPENDENCY_KINDS[$row_index]}" == "required" ]]; then
      visit_required_skill "${DEPENDENCY_NAMES[$row_index]}" "$chain$skill_name -> " || return 1
    fi
  done
  DEPENDENCY_VISITING="${DEPENDENCY_VISITING%"$skill_name"$'\n'}"
  DEPENDENCY_VISITED+="$skill_name"$'\n'
  source_path="$(skill_source_path "$skill_name")" || return 1
  EXPANDED_SKILL_SOURCES+=("$source_path")
}

expand_required_skill_sources() {
  local src skill_name row_index selected_names=$'\n' selected_count=0
  EXPANDED_SKILL_SOURCES=()
  DEPENDENCY_VISITED=$'\n'
  DEPENDENCY_VISITING=$'\n'
  for src in "$@"; do
    skill_name="$(basename "$src")"
    case "$selected_names" in
      *$'\n'"$skill_name"$'\n'*) ;;
      *) selected_names+="$skill_name"$'\n'; selected_count=$((selected_count + 1)) ;;
    esac
    visit_required_skill "$skill_name" || return 1
  done
  log_info "Selected $selected_count Skill(s); added $((${#EXPANDED_SKILL_SOURCES[@]} - selected_count)) required dependency Skill(s)."
  for ((row_index = 0; row_index < ${#DEPENDENCY_SKILLS[@]}; row_index++)); do
    [[ "${DEPENDENCY_KINDS[$row_index]}" != "required" ]] || continue
    case "$selected_names" in *$'\n'"${DEPENDENCY_SKILLS[$row_index]}"$'\n'*) ;; *) continue ;; esac
    case "$DEPENDENCY_VISITED" in *$'\n'"${DEPENDENCY_NAMES[$row_index]}"$'\n'*) continue ;; esac
    if [[ "${DEPENDENCY_KINDS[$row_index]}" == "conditional" ]]; then
      log_info "Conditional route not auto-installed: ${DEPENDENCY_SKILLS[$row_index]} -> ${DEPENDENCY_NAMES[$row_index]} (${DEPENDENCY_WHENS[$row_index]})"
    else
      log_info "Optional dependency not auto-installed: ${DEPENDENCY_SKILLS[$row_index]} -> ${DEPENDENCY_NAMES[$row_index]}"
    fi
  done
}

build_skill_jobs() {
  local src skill_name profile_index destination
  SKILL_JOB_SOURCES=()
  SKILL_JOB_NAMES=()
  SKILL_JOB_DESTINATIONS=()
  SKILL_JOB_PROFILE_INDEXES=()
  for src in "$@"; do
    skill_name="$(basename "$src")"
    for ((profile_index = 0; profile_index < ${#SKILL_DESTINATIONS[@]}; profile_index++)); do
      destination="$(resolve_skill_profile_destination "${SKILL_DESTINATIONS[$profile_index]}" "$skill_name" "${SKILL_CODEX_LEGACY_CHECKS[$profile_index]}" "$src/SKILL.md")" || return 1
      SKILL_JOB_SOURCES+=("$src")
      SKILL_JOB_NAMES+=("$skill_name")
      SKILL_JOB_DESTINATIONS+=("$destination")
      SKILL_JOB_PROFILE_INDEXES+=("$profile_index")
    done
  done
}

assert_skill_dependency_jobs() {
  local job_index row_index dependency_index found source_key dependency_key
  for ((job_index = 0; job_index < ${#SKILL_JOB_SOURCES[@]}; job_index++)); do
    for ((row_index = 0; row_index < ${#DEPENDENCY_SKILLS[@]}; row_index++)); do
      [[ "${DEPENDENCY_SKILLS[$row_index]}" == "${SKILL_JOB_NAMES[$job_index]}" && "${DEPENDENCY_KINDS[$row_index]}" == "required" ]] || continue
      found=0
      for ((dependency_index = 0; dependency_index < ${#SKILL_JOB_SOURCES[@]}; dependency_index++)); do
        [[ "${SKILL_JOB_NAMES[$dependency_index]}" == "${DEPENDENCY_NAMES[$row_index]}" && "${SKILL_JOB_PROFILE_INDEXES[$dependency_index]}" == "${SKILL_JOB_PROFILE_INDEXES[$job_index]}" ]] || continue
        found=1
        source_key="$(path_identity_key "${SKILL_JOB_DESTINATIONS[$job_index]}")" || return 1
        dependency_key="$(path_identity_key "${SKILL_JOB_DESTINATIONS[$dependency_index]}")" || return 1
        if [[ "$source_key" != "$dependency_key" ]]; then
          log_error "Required Skill dependency uses different roots: ${SKILL_JOB_NAMES[$job_index]} at '${SKILL_JOB_DESTINATIONS[$job_index]}' -> ${DEPENDENCY_NAMES[$row_index]} at '${SKILL_JOB_DESTINATIONS[$dependency_index]}'. Reconcile the existing Skill roots before installing; no duplicate or migration was created."
          return 1
        fi
        break
      done
      if [[ "$found" -eq 0 ]]; then log_error "Required Skill dependency missing from installation plan: ${SKILL_JOB_NAMES[$job_index]} -> ${DEPENDENCY_NAMES[$row_index]}"; return 1; fi
    done
  done
}

preflight_skill_jobs() {
  local job_index profile_index
  assert_skill_dependency_jobs || return 1
  for ((job_index = 0; job_index < ${#SKILL_JOB_SOURCES[@]}; job_index++)); do
    profile_index="${SKILL_JOB_PROFILE_INDEXES[$job_index]}"
    preflight_skill "${SKILL_JOB_SOURCES[$job_index]}" "${SKILL_JOB_DESTINATIONS[$job_index]}" "${SKILL_OWNERSHIP_TARGETS[$profile_index]}" "${SKILL_LEGACY_TARGETS[$profile_index]}" || return 1
  done
}

install_skill_jobs() {
  local job_index profile_index
  for ((job_index = 0; job_index < ${#SKILL_JOB_SOURCES[@]}; job_index++)); do
    profile_index="${SKILL_JOB_PROFILE_INDEXES[$job_index]}"
    install_skill "${SKILL_JOB_SOURCES[$job_index]}" "${SKILL_JOB_DESTINATIONS[$job_index]}" "${SKILL_OWNERSHIP_TARGETS[$profile_index]}" "${SKILL_LEGACY_TARGETS[$profile_index]}"
  done
}

if [[ -n "$CATEGORY" ]]; then
  load_install_category_names
  log_info "Selected ${#CATEGORY_NAMES[@]} $TYPE component(s) from category '$CATEGORY'"
fi

if [[ "$TYPE" == "agent" ]]; then
  if [[ "$DRY_RUN" -eq 0 ]]; then
    require_command mktemp
    require_command cksum
  fi
  AGENT_JOB_SOURCES=()
  AGENT_JOB_ROLES=()
  AGENT_JOB_PLATFORMS=()
  AGENT_JOB_DESTINATIONS=()
  AGENT_JOB_OWNERSHIP_TARGETS=()
  AGENT_JOB_SUFFIXES=()
  AGENT_JOB_LEGACY_TARGETS=()
  for ((profile_index = 0; profile_index < ${#AGENT_PLATFORMS[@]}; profile_index++)); do
    PLATFORM="${AGENT_PLATFORMS[$profile_index]}"
    SUFFIX="${AGENT_SUFFIXES[$profile_index]}"
    DESTINATION="${AGENT_DESTINATIONS[$profile_index]}"
    OWNERSHIP_TARGET="${AGENT_OWNERSHIP_TARGETS[$profile_index]}"
    LEGACY_TARGETS="${AGENT_LEGACY_TARGETS[$profile_index]}"
    ADAPTER_ROOT="$REPO_ROOT/adapters/$PLATFORM"
    PROFILE_SOURCE_COUNT=0
    if [[ -n "$NAME" ]]; then
      SOURCE="$ADAPTER_ROOT/$NAME$SUFFIX"
      if [[ ! -f "$SOURCE" ]]; then log_error "Agent adapter not found in archive: $NAME ($PLATFORM)"; exit 1; fi
      ROLE="$NAME"
      AGENT_JOB_SOURCES+=("$SOURCE")
      AGENT_JOB_ROLES+=("$ROLE")
      AGENT_JOB_PLATFORMS+=("$PLATFORM")
      AGENT_JOB_DESTINATIONS+=("$DESTINATION")
      AGENT_JOB_OWNERSHIP_TARGETS+=("$OWNERSHIP_TARGET")
      AGENT_JOB_SUFFIXES+=("$SUFFIX")
      AGENT_JOB_LEGACY_TARGETS+=("$LEGACY_TARGETS")
      PROFILE_SOURCE_COUNT=1
    elif [[ -n "$CATEGORY" ]]; then
      for ROLE in "${CATEGORY_NAMES[@]}"; do
        SOURCE="$ADAPTER_ROOT/$ROLE$SUFFIX"
        if [[ ! -f "$SOURCE" ]]; then
          log_error "Agent category '$CATEGORY' does not match the available $PLATFORM adapter inventory."
          exit 1
        fi
        AGENT_JOB_SOURCES+=("$SOURCE")
        AGENT_JOB_ROLES+=("$ROLE")
        AGENT_JOB_PLATFORMS+=("$PLATFORM")
        AGENT_JOB_DESTINATIONS+=("$DESTINATION")
        AGENT_JOB_OWNERSHIP_TARGETS+=("$OWNERSHIP_TARGET")
        AGENT_JOB_SUFFIXES+=("$SUFFIX")
        AGENT_JOB_LEGACY_TARGETS+=("$LEGACY_TARGETS")
        PROFILE_SOURCE_COUNT=$((PROFILE_SOURCE_COUNT + 1))
      done
    else
      for source in "$ADAPTER_ROOT"/*"$SUFFIX"; do
        [[ -f "$source" ]] || continue
        ROLE_FILE="${source##*/}"
        ROLE="${ROLE_FILE%"$SUFFIX"}"
        AGENT_JOB_SOURCES+=("$source")
        AGENT_JOB_ROLES+=("$ROLE")
        AGENT_JOB_PLATFORMS+=("$PLATFORM")
        AGENT_JOB_DESTINATIONS+=("$DESTINATION")
        AGENT_JOB_OWNERSHIP_TARGETS+=("$OWNERSHIP_TARGET")
        AGENT_JOB_SUFFIXES+=("$SUFFIX")
        AGENT_JOB_LEGACY_TARGETS+=("$LEGACY_TARGETS")
        PROFILE_SOURCE_COUNT=$((PROFILE_SOURCE_COUNT + 1))
      done
    fi
    if [[ "$PROFILE_SOURCE_COUNT" -eq 0 ]]; then log_error "No Agent adapters were found for $PLATFORM."; exit 1; fi
  done
  for ((job_index = 0; job_index < ${#AGENT_JOB_SOURCES[@]}; job_index++)); do
    preflight_agent_profile \
      "${AGENT_JOB_SOURCES[$job_index]}" \
      "${AGENT_JOB_ROLES[$job_index]}" \
      "${AGENT_JOB_ROLES[$job_index]}" \
      "${AGENT_JOB_PLATFORMS[$job_index]}" \
      "${AGENT_JOB_DESTINATIONS[$job_index]}" \
      "${AGENT_JOB_OWNERSHIP_TARGETS[$job_index]}" \
      "${AGENT_JOB_SUFFIXES[$job_index]}" \
      "${AGENT_JOB_LEGACY_TARGETS[$job_index]}"
  done

  INSTALL_COMPANION_SKILL=0
  COMPANION_DESTINATIONS=()
  COMPANION_OWNERSHIP_TARGETS=()
  COMPANION_LEGACY_TARGETS=()
  COMPANION_SOURCE=""
  if [[ ( -z "$NAME" && -z "$CATEGORY" ) || "$ENABLE_AUTO_DELEGATION" -eq 1 ]]; then
    INSTALL_COMPANION_SKILL=1
    COMPANION_SOURCE="$REPO_ROOT/skills/subagent-architecture"
    if [[ ! -f "$COMPANION_SOURCE/SKILL.md" ]]; then log_error "Companion Skill not found in archive: subagent-architecture"; exit 1; fi
    configure_skill_profiles 0
    load_skill_dependency_rows
    expand_required_skill_sources "$COMPANION_SOURCE"
    build_skill_jobs "${EXPANDED_SKILL_SOURCES[@]}"
    preflight_skill_jobs
    for ((job_index = 0; job_index < ${#SKILL_JOB_SOURCES[@]}; job_index++)); do
      log_info "Companion Skill destination: ${SKILL_JOB_DESTINATIONS[$job_index]}"
      if [[ "${SKILL_JOB_NAMES[$job_index]}" == "subagent-architecture" ]]; then
        COMPANION_DESTINATIONS+=("${SKILL_JOB_DESTINATIONS[$job_index]}")
      fi
    done
  fi

  if [[ "$ENABLE_AUTO_DELEGATION" -eq 1 ]]; then
    require_command mktemp
    AUTO_PLAN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/craftroster-auto-delegation.XXXXXX")"
    GUIDANCE_FILE="$REPO_ROOT/skills/subagent-architecture/references/global-auto-delegation.md"
    if [[ ! -s "$GUIDANCE_FILE" ]]; then log_error "Auto-delegation guidance is missing or empty: $GUIDANCE_FILE"; exit 1; fi
    if grep -Fq "'''" "$GUIDANCE_FILE"; then log_error "Auto-delegation guidance cannot contain a TOML multiline literal delimiter."; exit 1; fi
    if [[ "$TARGET" == "codex" ]]; then
      plan_codex_auto_delegation "$GUIDANCE_FILE"
    else
      INSTRUCTION_PATH="${COMPANION_DESTINATIONS[0]}/subagent-architecture/references/global-auto-delegation.md"
      if [[ "$INSTRUCTION_PATH" != /* ]]; then INSTRUCTION_PATH="$PWD/${INSTRUCTION_PATH#./}"; fi
      plan_opencode_auto_delegation "$INSTRUCTION_PATH"
    fi
  fi

  if [[ "$INSTALL_COMPANION_SKILL" -eq 1 ]]; then
    install_skill_jobs
  fi
  log_info "$(if [[ "$DRY_RUN" -eq 1 ]]; then printf Planning; else printf Installing; fi) ${#AGENT_JOB_SOURCES[@]} Agent profile file(s) across ${#AGENT_PLATFORMS[@]} destination(s) for $TARGET"
  for ((job_index = 0; job_index < ${#AGENT_JOB_SOURCES[@]}; job_index++)); do
    install_agent_profile \
      "${AGENT_JOB_SOURCES[$job_index]}" \
      "${AGENT_JOB_ROLES[$job_index]}" \
      "${AGENT_JOB_ROLES[$job_index]}" \
      "${AGENT_JOB_PLATFORMS[$job_index]}" \
      "${AGENT_JOB_DESTINATIONS[$job_index]}" \
      "${AGENT_JOB_OWNERSHIP_TARGETS[$job_index]}" \
      "${AGENT_JOB_SUFFIXES[$job_index]}" \
      "${AGENT_JOB_LEGACY_TARGETS[$job_index]}"
  done
  if [[ "$ENABLE_AUTO_DELEGATION" -eq 1 ]]; then apply_auto_delegation_plan; fi
else
  SOURCES=()
  SKILLS_ROOT="$REPO_ROOT/skills"
  if [[ -n "$NAME" ]]; then
    SKILL_PATH="$SKILLS_ROOT/$NAME"
    [[ -f "$SKILL_PATH/SKILL.md" ]] || SKILL_PATH="$REPO_ROOT/$NAME"
    if [[ ! -f "$SKILL_PATH/SKILL.md" ]]; then log_error "Skill not found in archive: $NAME"; exit 1; fi
    SOURCES+=("$SKILL_PATH")
  elif [[ -n "$CATEGORY" ]]; then
    for SKILL_NAME in "${CATEGORY_NAMES[@]}"; do
      SKILL_PATH="$SKILLS_ROOT/$SKILL_NAME"
      if [[ ! -f "$SKILL_PATH/SKILL.md" ]]; then
        log_error "Skill category '$CATEGORY' does not match the available Skill inventory."
        exit 1
      fi
      SOURCES+=("$SKILL_PATH")
    done
  else
    SCAN_ROOT="$SKILLS_ROOT"
    [[ -d "$SCAN_ROOT" ]] || SCAN_ROOT="$REPO_ROOT"
    while IFS= read -r dir; do SOURCES+=("$dir"); done < <(find "$SCAN_ROOT" -mindepth 1 -maxdepth 1 -type d -exec test -f '{}/SKILL.md' ';' -print | sort)
  fi
  if [[ "${#SOURCES[@]}" -eq 0 ]]; then log_error "No Skill folders with SKILL.md were found in archive."; exit 1; fi
  load_skill_dependency_rows
  expand_required_skill_sources "${SOURCES[@]}"
  build_skill_jobs "${EXPANDED_SKILL_SOURCES[@]}"
  preflight_skill_jobs
  log_info "$(if [[ "$DRY_RUN" -eq 1 ]]; then printf Planning; else printf Installing; fi) ${#EXPANDED_SKILL_SOURCES[@]} Skill(s) across ${#SKILL_DESTINATIONS[@]} destination(s) for $TARGET"
  install_skill_jobs
fi

if [[ "$DRY_RUN" -eq 1 ]]; then log_success "Dry run complete."; else log_success "CraftRoster $TYPE install complete."; fi
