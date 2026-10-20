#!/usr/bin/env bash
# The eight existing report writers share one canonical-first persistence path.
# Generation and the caller's branch/index remain untouched. Only known report
# paths enter the isolated commit; no arbitrary ref/path or remote input exists.
set -euo pipefail

fail() { echo "::error::Generated report persistence: $*" >&2; exit 1; }
[[ "${GITHUB_REPOSITORY:-}" == 'cyalcala/va-freelance-hub' ]] || fail 'unexpected repository'
[[ "${GITHUB_REF:-}" == 'refs/heads/main' ]] || fail 'main is required; branch runs only generate reports'
[[ -n "${GITHUB_WORKSPACE:-}" && -d "$GITHUB_WORKSPACE/.git" && -d "${RUNNER_TEMP:-}" ]] || fail 'checkout and runner temporary directory are required'
[[ -n "${GH_REPORT_TOKEN:-}" ]] || fail 'existing GitHub workflow token is required'

case "${REPORT_KEY:-}" in
  directory) paths=(docs/directory-health-latest.md); message='docs: update directory health digest' ;;
  enrichment) paths=(docs/enrichment-latest.md); message='docs: update enrichment digest' ;;
  hunter|sentinel) paths=(docs/source-health-latest.md); message='docs: update daily source health' ;;
  medic) paths=(docs/health-digest-latest.md); message='docs: update weekly health digest' ;;
  prospector) paths=(docs/prospector-latest.md); message='docs: update prospector digest' ;;
  workable) paths=(docs/workable-candidates-latest.md); message='docs: update workable global feed candidates digest [skip ci]' ;;
  economics) paths=(docs/source-economics-latest.md docs/economics-snapshots); message='docs: update measured source economics [skip ci]' ;;
  *) fail 'unknown fixed report key' ;;
esac

readonly canonical='https://va-freelance-hub-296059249147-git.asia-northeast1.sourcemanager.dev/antigravity-494415/va-freelance-hub.git'
readonly mirror='https://github.com/cyalcala/va-freelance-hub.git'
export GIT_TERMINAL_PROMPT=0 CLOUDSDK_CORE_DISABLE_PROMPTS=1
scratch=$(mktemp -d "$RUNNER_TEMP/va-hub-report.XXXXXXXX")
scratch=$(realpath "$scratch")
temp_root=$(realpath "$RUNNER_TEMP")
cleanup() {
  # Both the resolved parent and generated basename must match before removal.
  case "$scratch" in
    "$temp_root"/va-hub-report.*) rm -rf -- "$scratch" ;;
    *) echo '::error::Refusing cleanup outside the report temporary directory.' >&2; return 1 ;;
  esac
}
trap cleanup EXIT

source_head=$(git -C "$GITHUB_WORKSPACE" rev-parse HEAD)
# A separate index captures additions and retention deletions without staging
# anything in the generator's index or copying untracked logs/auth files.
[[ ! -L "$GITHUB_WORKSPACE/docs" ]] || fail 'report directory may not be a symlink'
for path in "${paths[@]}"; do
  [[ -e "$GITHUB_WORKSPACE/$path" ]] || fail "generated path is missing: $path"
  if [[ -e "$GITHUB_WORKSPACE/$path" || -L "$GITHUB_WORKSPACE/$path" ]]; then
    [[ -z "$(find "$GITHUB_WORKSPACE/$path" -type l -print -quit)" ]] || fail 'report paths may not contain symlinks'
  fi
done
GIT_INDEX_FILE="$scratch/report.index" git -C "$GITHUB_WORKSPACE" read-tree "$source_head"
GIT_INDEX_FILE="$scratch/report.index" git -C "$GITHUB_WORKSPACE" add --all -- "${paths[@]}"
GIT_INDEX_FILE="$scratch/report.index" git -C "$GITHUB_WORKSPACE" diff --cached --binary "$source_head" -- "${paths[@]}" > "$scratch/report.patch"

git init --quiet "$scratch/repo"
git -C "$scratch/repo" fetch --quiet --no-tags "$GITHUB_WORKSPACE" "$source_head"
git -C "$scratch/repo" checkout --quiet --detach FETCH_HEAD
git -C "$scratch/repo" config user.name 'github-actions[bot]'
git -C "$scratch/repo" config user.email 'github-actions[bot]@users.noreply.github.com'
changed=false
if [[ -s "$scratch/report.patch" ]]; then
  git -C "$scratch/repo" apply --index "$scratch/report.patch"
  git -C "$scratch/repo" commit --quiet -m "$message"
  changed=true
fi

network=(-c http.lowSpeedLimit=1 -c http.lowSpeedTime=30)
ssm() {
  git -C "$scratch/repo" "${network[@]}" -c credential.helper= \
    -c credential.https://va-freelance-hub-296059249147-git.asia-northeast1.sourcemanager.dev.helper=gcloud.sh "$@"
}
# The token is the existing per-job workflow token, used only for this fixed
# GitHub host. Do not echo the header or persist it in Git configuration.
github_header="AUTHORIZATION: basic $(printf 'x-access-token:%s' "$GH_REPORT_TOKEN" | base64 | tr -d '\n')"
github() {
  git -C "$scratch/repo" "${network[@]}" -c credential.helper= \
    -c "http.https://github.com/.extraheader=$github_header" "$@"
}
fetch_heads() {
  ssm fetch --quiet --no-tags "$canonical" refs/heads/main:refs/remotes/canonical/main
  github fetch --quiet --no-tags "$mirror" refs/heads/main:refs/remotes/mirror/main
  # Do not silently discard or import commits made only in the mirror. The
  # operator must preserve/reconcile that history before canonical activation.
  git -C "$scratch/repo" merge-base --is-ancestor refs/remotes/mirror/main refs/remotes/canonical/main \
    || fail 'GitHub main is ahead or diverged; preserve and reconcile it with SSM first'
  git -C "$scratch/repo" merge-base --is-ancestor "$source_head" refs/remotes/canonical/main \
    || fail 'checkout is not an ancestor of canonical main; refusing to publish checkout changes'
}
verify_ref() {
  local service="$1" url="$2" expected="$3" observed
  observed=$("$service" ls-remote --exit-code "$url" refs/heads/main | cut -f1)
  [[ "$observed" == "$expected" ]] || return 1
}

for attempt in 1 2 3 4 5; do
  fetch_heads
  if [[ "$changed" == true ]]; then
    # Replay only the generated commit; conflicts are real evidence, not a
    # license to choose ours/theirs or overwrite concurrent report changes.
    git -C "$scratch/repo" rebase --onto refs/remotes/canonical/main "$source_head" \
      || fail 'report conflicts with canonical changes; neither remote was overwritten'
    source_head=$(git -C "$scratch/repo" rev-parse refs/remotes/canonical/main)
  else
    git -C "$scratch/repo" checkout --quiet --detach refs/remotes/canonical/main
  fi
  candidate=$(git -C "$scratch/repo" rev-parse HEAD)
  if ! ssm push --porcelain --no-follow-tags "$canonical" "$candidate:refs/heads/main"; then
    echo "Canonical push did not succeed (attempt $attempt/5); refreshing both histories."
    continue
  fi
  if ! verify_ref ssm "$canonical" "$candidate"; then
    echo "Canonical main moved before readback (attempt $attempt/5); refreshing."
    continue
  fi
  canonical_saved="$candidate"
  # A no-change report still repairs an outstanding mirror after an earlier
  # canonical success. GitHub can only receive a confirmed canonical SHA.
  if ! github push --porcelain --no-follow-tags "$mirror" "$candidate:refs/heads/main"; then
    echo "::warning::SSM retains $canonical_saved; GitHub mirror push failed (attempt $attempt/5)."
    continue
  fi
  if ! verify_ref github "$mirror" "$candidate"; then
    echo "::warning::SSM retains $canonical_saved; GitHub moved before readback (attempt $attempt/5)."
    continue
  fi
  if ! verify_ref ssm "$canonical" "$candidate"; then
    echo "Canonical main advanced during mirror verification (attempt $attempt/5); refreshing."
    continue
  fi
  {
    echo '### Generated report persistence'
    printf 'Report: `%s`; canonical SSM and GitHub main verified at `%s`.\n' "$REPORT_KEY" "$candidate"
    printf 'Generated file changes: `%s`.\n' "$changed"
    echo 'GitLab: pending; this job has no configured GitLab runtime credential.'
  } >> "$GITHUB_STEP_SUMMARY"
  exit 0
done
fail "retry limit reached; canonical commit ${canonical_saved:-not confirmed}. GitHub mirror is not verified; GitLab remains pending"
