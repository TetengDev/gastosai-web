#!/usr/bin/env bash
# Bumps the version in package.json (and package-lock.json) that
# continuous-integration.yml guards and auto-release.yml tags as v<version>.
#
# Usage:
#   scripts/bump-version.sh [major|minor|patch]   # default: patch
#
# Run from a release/* branch, then commit the result:
#   git add package.json package-lock.json
#   git commit -m "chore: release v$(jq -r .version package.json)"
set -euo pipefail

BUMP="${1:-patch}"

case "$BUMP" in
  major|minor|patch) ;;
  *)
    echo "usage: $0 [major|minor|patch]" >&2
    exit 1
    ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OLD_VERSION=$(jq -r .version package.json)
npm version "$BUMP" --no-git-tag-version --allow-same-version >/dev/null
NEW_VERSION=$(jq -r .version package.json)

echo "Version bumped: $OLD_VERSION -> $NEW_VERSION"
