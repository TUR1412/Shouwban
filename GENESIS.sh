#!/usr/bin/env bash
# GENESIS Delivery Script (Atomic / Non-Interactive)
# - Safety rails:
#   - Default push is non-force (`git push`)
#   - Force push requires FORCE_PUSH=1 (uses `--force-with-lease`)
#   - Self-destruct requires SELF_DESTRUCT=1
#
# Usage examples:
#   bash ./GENESIS.sh
#   FORCE_PUSH=1 SELF_DESTRUCT=1 REPO_URL="https://github.com/<you>/<repo>.git" bash ./GENESIS.sh

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/TUR1412/Shouwban.git}"
REPO_DIR="${REPO_DIR:-Shouwban}"
COMMIT_MESSAGE="${COMMIT_MESSAGE:-feat(GOD-MODE):  Ultimate Evolution - Quark-level UI & Arch Upgrade}"
SKIP_VERIFY="${SKIP_VERIFY:-0}"

command -v git >/dev/null 2>&1 || { echo "Missing: git"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Missing: node"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Missing: npm"; exit 1; }

START_DIR="$(pwd)"
REPO_PATH=""

cleanup() {
  cd "$START_DIR" || true
}
trap cleanup EXIT

if [ -d "$START_DIR/.git" ]; then
  REPO_PATH="$START_DIR"
else
  if [ ! -d "$REPO_DIR" ]; then
    git clone "$REPO_URL" "$REPO_DIR"
  fi
  REPO_PATH="$START_DIR/$REPO_DIR"
fi

cd "$REPO_PATH"
git rev-parse --is-inside-work-tree >/dev/null

if [ "$SKIP_VERIFY" != "1" ]; then
  npm run verify
  npm test
fi

git add .
if [ -z "$(git status --porcelain)" ]; then
  echo "No changes: working tree is clean."
  exit 0
fi

git commit -m "$COMMIT_MESSAGE"

if [ "${FORCE_PUSH:-0}" = "1" ]; then
  git push --force-with-lease
else
  git push
fi

if [ "${SELF_DESTRUCT:-0}" = "1" ]; then
  cd "$START_DIR"
  rm -rf "$REPO_PATH"
  echo "Self-Destruct: removed $REPO_PATH"
fi

