#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# -I: 跳過二進位檔案（PNG/JPG 內容會誤中 Q[1-4]）
matches=$(git grep -I -inE 'quarter|Quarter|QUARTER|Q[1-4]' -- \
  ':!*/package-lock.json' \
  ':!*/node_modules/*' \
  ':!scripts/check-no-quarter.sh' \
  ':!hermes-frontend/package.json' || true)

if [[ -n "$matches" ]]; then
  printf 'Quarter-related content is not allowed:\n%s\n' "$matches" >&2
  exit 1
fi

# 排除呢個檢查腳本自己 —— 佢個檔名本身就含 "quarter"
bad_names=$(git ls-files | grep -i quarter | grep -v '^scripts/check-no-quarter\.sh$' || true)

if [[ -n "$bad_names" ]]; then
  printf 'Quarter-related filenames are not allowed:\n%s\n' "$bad_names" >&2
  exit 1
fi

printf 'OK: no quarter-related content or filenames found.\n'
