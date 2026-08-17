#!/usr/bin/env bash
# Builds the site and stages the static output on a `deploy` branch,
# ready for cPanel Git Version Control to pull. Does NOT push — review
# the commit, then `git push origin deploy` yourself.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree has uncommitted changes. Commit or stash first." >&2
  exit 1
fi

echo "Building site..."
npm run build

WORKTREE_DIR="$(mktemp -d)"
cleanup() { git worktree remove "$WORKTREE_DIR" --force >/dev/null 2>&1 || rm -rf "$WORKTREE_DIR"; }
trap cleanup EXIT

if git show-ref --verify --quiet refs/heads/deploy; then
  git worktree add "$WORKTREE_DIR" deploy
else
  git worktree add --detach "$WORKTREE_DIR"
  (cd "$WORKTREE_DIR" && git checkout --orphan deploy && git rm -rf . --quiet >/dev/null 2>&1 || true)
fi

find "$WORKTREE_DIR" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -R dist/. "$WORKTREE_DIR/"
cp .cpanel.yml.template "$WORKTREE_DIR/.cpanel.yml"

(
  cd "$WORKTREE_DIR"
  git add -A
  if git diff --cached --quiet; then
    echo "Nothing changed since last deploy commit."
  else
    git commit -m "Deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)" --quiet
    echo "Committed to 'deploy' branch."
  fi
)

echo ""
echo "Review:  git log deploy --oneline -5"
echo "Push:    git push origin deploy"
