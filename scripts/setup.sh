#!/usr/bin/env bash
# Keep the executable call at the end: piped script input must never become answers.
set -eo pipefail

SETUP_REPO="HsinPu/CraftRoster"
SETUP_REPO_EXPLICIT=0
SETUP_BRANCH="main"
SETUP_SOURCE_DIR=""
SETUP_INSTALL_DIR=""
SETUP_DRY_RUN=0
SETUP_FORCE=0
SETUP_AUTO_DELEGATION=0
SETUP_TMP_DIR=""
SETUP_TMP_BASE=""
SETUP_FROM_STDIN=0
case "${BASH_SOURCE[0]:-}" in
  ""|-|/dev/stdin|/dev/fd/*|/proc/self/fd/*) SETUP_FROM_STDIN=1 ;;
esac

setup_usage() {
  cat <<'EOF'
CraftRoster interactive setup

Usage:
  bash scripts/setup.sh [--source-dir path] [--dir path] [--repo owner/name]
                        [--branch name] [--dry-run] [--force]
  curl -fsSL https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/setup.sh | bash

Choose a platform, user global or current project, then all Skills and Agents
or unified usage categories. Each category installs related Skills and Agents
together. Multiple categories accept comma or space-separated numbers.
Enter uses the displayed default; q cancels. Invalid answers allow three tries.
An explicit y is required before installation. --dry-run previews the complete
plan without a write-confirmation prompt or destination writes.

Options:
  --source-dir path  Use an existing checkout; otherwise download one GitHub archive.
  --dir path         Override the global destination, or set the project root.
  --repo owner/name  GitHub source repository (default: HsinPu/CraftRoster).
  --branch name      GitHub branch (default: main).
  --dry-run          Complete the menus and preflight only.
  --force            Forward intentional overwrite permission to the backend.
  -h, --help         Show this help.

When run from a file, redirected stdin can supply answers. When the script itself
arrives on stdin (curl | bash), answers come from /dev/tty; a terminal is required.
For non-interactive installation or selection by name, use scripts/install.sh.
EOF
}

setup_error() { printf 'Error: %s\n' "$1" >&2; }
setup_die() { setup_error "$1"; exit 1; }
setup_cancel() { printf '\nSetup cancelled; no installation was started.\n'; exit 0; }

setup_option_value() {
  if [[ -z "${2:-}" || "$2" == -* ]]; then
    setup_die "Missing value for $1."
  fi
}

setup_cleanup() {
  local resolved=""
  [[ -n "$SETUP_TMP_DIR" ]] || return 0
  # Remove only the exact physical directory allocated by this invocation.
  if [[ ! -L "$SETUP_TMP_DIR" && -d "$SETUP_TMP_DIR" ]]; then
    resolved="$(cd "$SETUP_TMP_DIR" 2>/dev/null && pwd -P)" || return 0
    case "$resolved" in
      "${SETUP_TMP_BASE%/}"/craftroster-setup.*)
        if [[ "$resolved" == "$SETUP_TMP_DIR" ]]; then rm -rf -- "$resolved"; fi ;;
    esac
  fi
}

setup_require_command() {
  command -v "$1" >/dev/null 2>&1 || setup_die "$1 is required but was not found."
}

setup_read_answer() {
  printf '%s: ' "$1"
  SETUP_REPLY=""
  if ! IFS= read -r SETUP_REPLY <&3; then
    setup_die "Input ended (EOF); setup requires an answer and no installation was started."
  fi
  SETUP_REPLY="${SETUP_REPLY%$'\r'}"
  SETUP_REPLY="${SETUP_REPLY#"${SETUP_REPLY%%[![:space:]]*}"}"
  SETUP_REPLY="${SETUP_REPLY%"${SETUP_REPLY##*[![:space:]]}"}"
  case "$SETUP_REPLY" in q|Q) setup_cancel ;; esac
}

setup_invalid_answer() {
  local attempt="$1" message="$2"
  setup_error "$message"
  if [[ "$attempt" -ge 3 ]]; then
    setup_die "Too many invalid answers (3); no installation was started."
  fi
}

setup_choose_platform() {
  local attempt
  printf '\nPlatform\n  1) Codex\n  2) Claude Code\n  3) Cursor\n  4) GitHub Copilot\n  5) OpenCode\n  6) Project (all platforms)\n'
  for attempt in 1 2 3; do
    setup_read_answer 'Platform [1] (q to cancel)'
    case "${SETUP_REPLY:-1}" in
      1) SETUP_TARGET="codex"; return ;;
      2) SETUP_TARGET="claude"; return ;;
      3) SETUP_TARGET="cursor"; return ;;
      4) SETUP_TARGET="copilot"; return ;;
      5) SETUP_TARGET="opencode"; return ;;
      6) SETUP_TARGET="project"; return ;;
      *) setup_invalid_answer "$attempt" 'Choose a platform number from 1 to 6.' ;;
    esac
  done
}

setup_choose_scope() {
  local attempt
  if [[ "$SETUP_TARGET" == "project" ]]; then
    SETUP_PLATFORM="all"
    SETUP_SCOPE="project"
    return
  fi
  SETUP_PLATFORM="$SETUP_TARGET"
  printf '\nInstallation scope\n  1) User global\n  2) Current project\n'
  for attempt in 1 2 3; do
    setup_read_answer 'Installation scope [1] (q to cancel)'
    case "${SETUP_REPLY:-1}" in
      1) SETUP_SCOPE="global"; return ;;
      2) SETUP_SCOPE="project"; SETUP_TARGET="project"; return ;;
      *) setup_invalid_answer "$attempt" 'Choose 1 (user global) or 2 (current project).' ;;
    esac
  done
}

setup_choose_mode() {
  local attempt
  printf '\nInstallation mode\n  1) All Skills and Agents\n  2) Select categories\n'
  for attempt in 1 2 3; do
    setup_read_answer 'Installation mode [1] (q to cancel)'
    case "${SETUP_REPLY:-1}" in
      1) SETUP_BUNDLE="all"; return ;;
      2) SETUP_BUNDLE=""; return ;;
      *) setup_invalid_answer "$attempt" 'Choose 1 (all Skills and Agents) or 2 (select categories).' ;;
    esac
  done
}

setup_acquire_source() {
  local archive extract_dir candidate
  local -a roots=()
  if [[ -n "$SETUP_SOURCE_DIR" ]]; then
    SETUP_ROOT="$(cd "$SETUP_SOURCE_DIR" 2>/dev/null && pwd -P)" ||
      setup_die "Cannot read source directory: $SETUP_SOURCE_DIR"
  else
    setup_require_command curl
    setup_require_command tar
    setup_require_command mktemp
    SETUP_TMP_BASE="$(cd "${TMPDIR:-/tmp}" 2>/dev/null && pwd -P)" ||
      setup_die "Cannot access the temporary directory: ${TMPDIR:-/tmp}"
    SETUP_TMP_DIR="$(mktemp -d "${SETUP_TMP_BASE%/}/craftroster-setup.XXXXXX")" ||
      setup_die 'Could not create the setup temporary directory.'
    SETUP_TMP_DIR="$(cd "$SETUP_TMP_DIR" && pwd -P)"
    archive="$SETUP_TMP_DIR/repo.tar.gz"
    extract_dir="$SETUP_TMP_DIR/repo"
    mkdir "$extract_dir"
    printf '\nDownloading one source snapshot: %s@%s\n' "$SETUP_REPO" "$SETUP_BRANCH"
    curl -fsSL "https://codeload.github.com/$SETUP_REPO/tar.gz/refs/heads/$SETUP_BRANCH" -o "$archive" ||
      setup_die 'Could not download the repository archive.'
    tar -xzf "$archive" -C "$extract_dir" || setup_die 'Could not extract the repository archive.'
    for candidate in "$extract_dir"/*; do
      [[ -d "$candidate" && ! -L "$candidate" ]] || continue
      roots+=("$candidate")
    done
    [[ "${#roots[@]}" -eq 1 ]] || setup_die 'The archive must contain exactly one repository root.'
    SETUP_ROOT="${roots[0]}"
  fi
  [[ -f "$SETUP_ROOT/scripts/install.sh" && ! -L "$SETUP_ROOT/scripts/install.sh" ]] ||
    setup_die "Backend installer not found as a regular file: $SETUP_ROOT/scripts/install.sh"
  # Match parsed option cases, rather than help text, before invoking any backend.
  # Bash rejects unknown options, but source validation gives an actionable error.
  setup_require_command grep
  if ! grep -Eq -- '^[[:space:]]*--bundle\)' "$SETUP_ROOT/scripts/install.sh" ||
     ! grep -Eq -- '^[[:space:]]*--agent-skill-policy\)' "$SETUP_ROOT/scripts/install.sh"; then
    setup_die 'This source backend does not support bundled installation. Update --source-dir or --branch and use the matching setup script.'
  fi
  if [[ "$SETUP_TARGET" == "project" && "$SETUP_PLATFORM" != "all" ]] &&
     ! grep -Eq -- '^[[:space:]]*--project-platform\)' "$SETUP_ROOT/scripts/install.sh"; then
    setup_die 'This source backend does not support a single project platform. Update --source-dir or --branch.'
  fi
  SETUP_INDEX="$SETUP_ROOT/scripts/data/install-bundles.tsv"
  [[ -f "$SETUP_INDEX" && ! -L "$SETUP_INDEX" ]] ||
    setup_die "Bundled usage category index not found as a regular file: $SETUP_INDEX"
  [[ -f "$SETUP_ROOT/scripts/data/install-agent-skill-dependencies.tsv" && ! -L "$SETUP_ROOT/scripts/data/install-agent-skill-dependencies.tsv" ]] ||
    setup_die 'Agent Skill companion index is missing. Update --source-dir or --branch.'
}

setup_load_categories() {
  setup_require_command awk
  setup_require_command od
  local bytes
  bytes="$(LC_ALL=C od -An -v -tx1 "$SETUP_INDEX")" || setup_die 'Cannot inspect the bundled category index.'
  if [[ "$bytes" =~ (^|[[:space:]])00([[:space:]]|$) ]]; then setup_die 'Bundled category index contains a NUL byte.'; fi
  # Validate the generated table before it supplies any menu or backend argument.
  SETUP_CATEGORY_SUMMARY="$(LC_ALL=C awk -F '\t' '
    function fail(message) {
      print "Error: Bundled category index " message ": " FILENAME > "/dev/stderr"
      bad = 1
      exit 1
    }
    { sub(/\r$/, "") }
    NR == 1 {
      if ($0 != "bundle\ttitle\tdescription\ttype\tname") fail("has an invalid header")
      next
    }
    {
      if (NF != 5 || $1 !~ /^[a-z0-9]+(-[a-z0-9]+)*$/ || $1 == "all" ||
          $2 ~ /[[:cntrl:]]/ || $2 ~ /^[[:space:]]*$/ || $3 ~ /[[:cntrl:]]/ || $3 ~ /^[[:space:]]*$/ ||
          ($4 != "skill" && $4 != "agent") || $5 !~ /^[a-z0-9]+(-[a-z0-9]+)*$/)
        fail("contains an invalid row " NR)
      if (seen[$1 ":" $4 ":" $5]++) fail("contains duplicate member " $5)
      if (titles[$1] && (titles[$1] != $2 || descriptions[$1] != $3)) fail("contains inconsistent display metadata")
      if (!titles[$1]) order[++total] = $1
      titles[$1] = $2
      descriptions[$1] = $3
      counts[$1 ":" $4]++
    }
    END {
      if (bad) exit 1
      if (NR < 2) fail("contains no components")
      for (i = 1; i <= total; i++) {
        key = order[i]
        print key "\t" titles[key] "\t" descriptions[key] "\t" (counts[key ":skill"] + 0) "\t" (counts[key ":agent"] + 0)
      }
    }
  ' "$SETUP_INDEX")" || setup_die 'Cannot build bundled category menus from this source.'
}

setup_choose_categories() {
  local category title description skill_count agent_count count attempt token selected_index
  local valid seen pattern='^[1-9][0-9]*([[:space:]]*,[[:space:]]*[1-9][0-9]*|[[:space:]]+[1-9][0-9]*)*$'
  local -a categories=() tokens=() selected=()
  printf '\nUsage categories\n'
  while IFS=$'\t' read -r category title description skill_count agent_count; do
    categories+=("$category")
    printf '  %d) %s [%s] (%s Skills + %s Agents)\n     %s\n' "${#categories[@]}" "$title" "$category" "$skill_count" "$agent_count" "$description"
  done <<< "$SETUP_CATEGORY_SUMMARY"
  [[ "${#categories[@]}" -gt 0 ]] || setup_die 'No usage categories are available in this source.'
  printf 'Related Agent companions and required Skill dependencies are added after selection.\n'
  for attempt in 1 2 3; do
    setup_read_answer 'Usage categories (comma/space-separated numbers, q to cancel)'
    valid=1
    selected=()
    seen=$'\n'
    if [[ "$SETUP_REPLY" =~ $pattern ]]; then
      IFS=$' \t\r\n' read -r -a tokens <<< "${SETUP_REPLY//,/ }"
      for token in "${tokens[@]}"; do
        # Check length first so an oversized answer cannot overflow shell arithmetic.
        count="${#categories[@]}"
        if [[ "${#token}" -gt "${#count}" || "$token" -gt "$count" ]]; then
          valid=0; break
        fi
        case "$seen" in *$'\n'"$token"$'\n'*) continue ;; esac
        seen+="$token"$'\n'
        selected+=("$((token - 1))")
      done
    else
      valid=0
    fi
    if [[ "$valid" -eq 1 && "${#selected[@]}" -gt 0 ]]; then
      for selected_index in "${selected[@]}"; do
        [[ -z "$SETUP_BUNDLE" ]] || SETUP_BUNDLE+=","
        SETUP_BUNDLE+="${categories[$selected_index]}"
      done
      return
    fi
    setup_invalid_answer "$attempt" "Choose category numbers from 1 to ${#categories[@]} separated by commas or spaces. Blank input does not select all."
  done
}

setup_absolute_install_dir() {
  local path="$1"
  [[ ! "$path" =~ [[:cntrl:]] ]] || setup_die 'The destination cannot contain control characters.'
  case "$path" in
    [A-Za-z]:[\\/]*)
      if command -v cygpath >/dev/null 2>&1; then
        SETUP_INSTALL_DIR="$(cygpath -u "$path")" || setup_die "Cannot resolve destination: $path"
      else
        SETUP_INSTALL_DIR="$path"
      fi ;;
    /*) SETUP_INSTALL_DIR="$path" ;;
    *) SETUP_INSTALL_DIR="$SETUP_CALLER_DIR/$path" ;;
  esac
}

setup_yes_no() {
  local prompt="$1" attempt
  for attempt in 1 2 3; do
    setup_read_answer "$prompt"
    case "$SETUP_REPLY" in
      y|Y) SETUP_YES=1; return ;;
      ""|n|N) SETUP_YES=0; return ;;
      *) setup_invalid_answer "$attempt" 'Enter y to accept or n to decline (Enter defaults to n).' ;;
    esac
  done
}

setup_run_plan() {
  local preview="$1"
  local -a args=(--target "$SETUP_TARGET" --type bundle --bundle "$SETUP_BUNDLE" --agent-skill-policy recommended --source-dir "$SETUP_ROOT" --branch "$SETUP_BRANCH")
  if [[ "$SETUP_TARGET" == "project" && "$SETUP_PLATFORM" != "all" ]]; then
    args+=(--project-platform "$SETUP_PLATFORM")
  fi
  [[ "$SETUP_REPO_EXPLICIT" -eq 0 ]] || args+=(--repo "$SETUP_REPO")
  [[ -z "$SETUP_INSTALL_DIR" ]] || args+=(--dir "$SETUP_INSTALL_DIR")
  [[ "$SETUP_FORCE" -eq 0 ]] || args+=(--force)
  [[ "$preview" -eq 0 ]] || args+=(--dry-run)
  if [[ "$SETUP_AUTO_DELEGATION" -eq 1 ]]; then
    args+=(--enable-auto-delegation)
  fi
  # The backend has no interactive prompts and must not consume queued answers.
  "$BASH" "$SETUP_ROOT/scripts/install.sh" "${args[@]}" </dev/null 3<&-
}

setup_main() {
  local platform_label scope_label
  SETUP_BUNDLE=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --source-dir) setup_option_value "$1" "${2:-}"; SETUP_SOURCE_DIR="$2"; shift 2 ;;
      --dir) setup_option_value "$1" "${2:-}"; SETUP_INSTALL_DIR="$2"; shift 2 ;;
      --repo) setup_option_value "$1" "${2:-}"; SETUP_REPO="$2"; SETUP_REPO_EXPLICIT=1; shift 2 ;;
      --branch) setup_option_value "$1" "${2:-}"; SETUP_BRANCH="$2"; shift 2 ;;
      --dry-run) SETUP_DRY_RUN=1; shift ;;
      --force) SETUP_FORCE=1; shift ;;
      -h|--help) setup_usage; exit 0 ;;
      *) setup_die "Unknown argument: $1. Use --help for supported options." ;;
    esac
  done
  [[ "$SETUP_REPO" =~ ^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$ ]] ||
    setup_die "Invalid GitHub repository '$SETUP_REPO'; expected owner/name."
  [[ "$SETUP_BRANCH" =~ ^[A-Za-z0-9._/+_-]+$ ]] ||
    setup_die "Invalid GitHub branch '$SETUP_BRANCH'."

  # Test stdin-script mode before network access or any temporary directory creation.
  if [[ "$SETUP_FROM_STDIN" -eq 1 ]]; then
    if ! { exec 3</dev/tty; } 2>/dev/null; then
      setup_die 'Piped setup requires a terminal (/dev/tty) for answers. Save setup.sh and run bash setup.sh to use redirected answers.'
    fi
  else
    exec 3<&0
  fi
  trap setup_cleanup EXIT
  trap 'printf "\nSetup interrupted.\n" >&2; exit 130' INT
  trap 'printf "\nSetup interrupted.\n" >&2; exit 143' TERM
  SETUP_CALLER_DIR="$(pwd -P)"
  printf 'CraftRoster interactive setup\n'
  setup_choose_platform
  setup_choose_scope
  if [[ "$SETUP_TARGET" == "project" && -z "$SETUP_INSTALL_DIR" ]]; then
    setup_read_answer "Project root [$SETUP_CALLER_DIR] (q to cancel)"
    SETUP_INSTALL_DIR="${SETUP_REPLY:-$SETUP_CALLER_DIR}"
  fi
  [[ -z "$SETUP_INSTALL_DIR" ]] || setup_absolute_install_dir "$SETUP_INSTALL_DIR"
  setup_choose_mode
  setup_acquire_source
  setup_load_categories
  [[ "$SETUP_BUNDLE" == "all" ]] || setup_choose_categories
  if [[ "$SETUP_TARGET" == "codex" || "$SETUP_TARGET" == "opencode" ]]; then
    setup_yes_no 'Enable proactive Agent delegation? [y/N] (q to cancel)'
    SETUP_AUTO_DELEGATION="$SETUP_YES"
  fi

  platform_label="$SETUP_PLATFORM"
  [[ "$SETUP_PLATFORM" != "all" ]] || platform_label="all platforms"
  scope_label="user global"
  [[ "$SETUP_SCOPE" != "project" ]] || scope_label="current project"
  printf '\nSelected plan\n  Platform: %s\n  Installation scope: %s\n  Source snapshot: %s\n' "$platform_label" "$scope_label" "$SETUP_ROOT"
  if [[ "$SETUP_SCOPE" == "project" ]]; then
    printf '  Project root: %s\n' "$SETUP_INSTALL_DIR"
  elif [[ -n "$SETUP_INSTALL_DIR" ]]; then
    printf '  Destination override: %s\n' "$SETUP_INSTALL_DIR"
  fi
  printf '  Usage categories: %s\n  Agent Skill policy: recommended (required + recommended companions)\n' "$SETUP_BUNDLE"
  printf '  Proactive Agent delegation: %s\n' "$(if [[ "$SETUP_AUTO_DELEGATION" -eq 1 ]]; then printf enabled; else printf disabled; fi)"
  printf '  Force overwrite: %s\n' "$(if [[ "$SETUP_FORCE" -eq 1 ]]; then printf enabled; else printf disabled; fi)"
  printf 'Related Skills and Agents are installed together; shared Skills are planned once per destination.\n'
  printf 'The preflight below lists the exact destinations and any configuration changes.\n'
  printf '\nPreflight complete bundled plan\n'
  if ! setup_run_plan 1; then
    setup_die 'Preflight failed; no installation was started and no destination writes were allowed.'
  fi
  printf '\nThe complete plan passed preflight.\n'
  if [[ "$SETUP_DRY_RUN" -eq 1 ]]; then
    printf 'Dry run complete; no installation was started.\n'
    return
  fi
  printf 'Packages install sequentially; completed packages are not rolled back if a later package fails.\n'
  setup_yes_no 'Install this plan? [y/N] (q to cancel)'
  [[ "$SETUP_YES" -eq 1 ]] || setup_cancel
  printf '\nInstalling the complete bundled plan\n'
  if ! setup_run_plan 0; then
    setup_die 'Installation stopped; backend diagnostics identify completed and pending steps when writes began. Completed packages were not rolled back as a group.'
  fi
  printf '\nCraftRoster setup complete.\n'
}

setup_main "$@"
