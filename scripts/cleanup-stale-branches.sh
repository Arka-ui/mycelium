#!/usr/bin/env bash
# Mycelium — stale-branch cleanup (run after the v0.10 → v0.74 cascade merge).
#
# Deletes every remote branch whose commits are already reachable from
# origin/main, plus the dead chore/manifest-v0.8.0 branch (PR #19 closed
# without merge, superseded by PR #36).
#
# Keeps:
#   - main
#   - feat/beta-75-features (open PR #86)
#   - chore/dependabot-quartet (open PR — branch with the dependabot triage)
#
# Safe-by-construction: we only delete branches whose tip is already in
# origin/main (verified by `--merged`). The two protected branches are
# excluded by explicit allow-list, not just by name match.
#
# Usage:
#   bash scripts/cleanup-stale-branches.sh           # dry-run
#   bash scripts/cleanup-stale-branches.sh --apply   # actually delete
#
# The dry-run prints exactly what would happen and exits 0.

set -euo pipefail

DRY_RUN=1
if [[ "${1:-}" == "--apply" ]]; then
    DRY_RUN=0
fi

PROTECT=("main" "feat/beta-75-features" "chore/dependabot-quartet")

protected() {
    local b="$1"
    for p in "${PROTECT[@]}"; do
        [[ "$b" == "$p" ]] && return 0
    done
    return 1
}

git fetch --prune origin >/dev/null 2>&1

echo "== Remote branches merged into origin/main =="
mapfile -t MERGED < <(git branch -r --merged origin/main | grep -vE 'origin/HEAD|origin/main$' | sed 's|origin/||' | tr -d ' ')

DELETE=()
for b in "${MERGED[@]}"; do
    if protected "$b"; then
        echo "  keep (protected): $b"
    else
        DELETE+=("$b")
    fi
done

# chore/manifest-v0.8.0 is technically not in `--merged` because its single
# commit (701fc28) never landed in main — PR #19 was closed. It's still
# dead: superseded by chore/manifest-v0.10.0 (PR #36, merged).
if git ls-remote --heads origin chore/manifest-v0.8.0 | grep -q .; then
    DELETE+=("chore/manifest-v0.8.0")
fi

echo
echo "== ${#DELETE[@]} stale remote branches queued for deletion =="
printf '  %s\n' "${DELETE[@]}"

echo
if [[ "$DRY_RUN" == "1" ]]; then
    echo "Dry-run only. Re-run with --apply to delete."
    exit 0
fi

echo "== Deleting =="
FAILED=()
for b in "${DELETE[@]}"; do
    if git push origin --delete "$b" >/dev/null 2>&1; then
        echo "  deleted: $b"
    else
        echo "  FAILED:  $b"
        FAILED+=("$b")
    fi
done

echo
echo "== Local cleanup =="
mapfile -t LOCAL_MERGED < <(git branch --merged main | grep -vE '^\*|^  main$' | tr -d ' ')
for b in "${LOCAL_MERGED[@]}"; do
    if protected "$b"; then
        echo "  keep (protected): $b"
    else
        if git branch -d "$b" >/dev/null 2>&1; then
            echo "  deleted local: $b"
        else
            echo "  could not delete local: $b"
        fi
    fi
done

if [[ "${#FAILED[@]}" -gt 0 ]]; then
    echo
    echo "WARNING: ${#FAILED[@]} remote deletions failed; check permissions / pinned-branch protection."
    exit 1
fi
