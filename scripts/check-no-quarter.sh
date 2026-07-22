#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

matches=$(git grep -inE 'quarter|Quarter|QUARTER|Q[1-4]' -- \
  ':!*/package-lock.json' \
  ':!*/node_modules/*' \
  ':!scripts/check-no-quarter.sh' \
  ':!hermes-frontend/package.json' || true)

if [[ -n "$matches" ]]; then
  printf 'Quarter-related content is not allowed:\n%s\n' "$matches" >&2
  exit 1
fi

if git ls-files | grep -i quarter >/dev/null; then
  printf 'Quarter-related filenames are not allowed:\n' >&2
  git ls-files | grep -i quarter >&2
  exit 1
fi

printf 'OK: no quarter-related content or filenames found.\n'
