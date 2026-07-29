#!/usr/bin/env bash
# ─────────────────────────────────────────────
# Hermes AI Agent — 新機還原遷移包
# 用法: ./scripts/hermes-restore.sh <hermes-migration-xxx.tar.gz>
# ─────────────────────────────────────────────
set -euo pipefail

TAR_FILE="${1:?用法: $0 <hermes-migration-xxx.tar.gz>}"

if [ ! -f "${TAR_FILE}" ]; then
  echo "❌ 找不到: ${TAR_FILE}" >&2
  exit 1
fi

echo ""
echo "══════════════════════════════════════"
echo "  Hermes AI Agent — 還原遷移包"
echo "══════════════════════════════════════"
echo ""

# 1. SHA256 驗證（可選）
if [ -n "${EXPECTED_SHA:-}" ]; then
  ACTUAL=$(shasum -a 256 "${TAR_FILE}" | awk '{print $1}')
  if [ "${ACTUAL}" != "${EXPECTED_SHA}" ]; then
    echo "❌ SHA256 不匹配" >&2
    echo "   預期: ${EXPECTED_SHA}" >&2
    echo "   實際: ${ACTUAL}" >&2
    exit 1
  fi
  echo "  ✔ SHA256 驗證通過"
fi

# 2. 解壓到臨時目錄
TMPDIR=$(mktemp -d)
trap "rm -rf ${TMPDIR}" EXIT
echo "▸ 解壓中..."
tar xzf "${TAR_FILE}" -C "${TMPDIR}"

# 找到 hermes-home 目錄
HERMES_SRC=$(find "${TMPDIR}" -type d -name "hermes-home" -maxdepth 2 | head -1)
if [ -z "${HERMES_SRC}" ]; then
  echo "❌ tar.gz 入面搵唔到 hermes-home/ 目錄" >&2
  exit 1
fi

# 3. 驗證必要檔案
echo "▸ 驗證檔案完整性..."
MISSING=0
for f in .env config.yaml auth.json SOUL.md state.db; do
  if [ -f "${HERMES_SRC}/${f}" ]; then
    echo "  ✔ ${f}"
  else
    echo "  ✘ ${f}" >&2
    MISSING=$((MISSING + 1))
  fi
done

if [ "$MISSING" -gt 0 ]; then
  echo "❌ 缺少 ${MISSING} 個必要檔案" >&2
  exit 1
fi

# 4. 備份現有 ~/.hermes（如果有）
mkdir -p ~/.hermes
if [ -f ~/.hermes/.env ] || [ -f ~/.hermes/config.yaml ]; then
  BACKUP="$HOME/.hermes-pre-restore-$(date +%Y%m%d_%H%M%S)"
  echo "▸ 備份現有 ~/.hermes/ → ${BACKUP}"
  cp -r ~/.hermes "${BACKUP}"
fi

# 5. 還原核心檔案（atomic overwrite）
echo "▸ 還原核心設定檔..."
for f in .env config.yaml auth.json SOUL.md; do
  cp "${HERMES_SRC}/${f}" "$HOME/.hermes/${f}.tmp"
  mv "$HOME/.hermes/${f}.tmp" "$HOME/.hermes/${f}"
done

# 6. 還原目錄（merge，唔覆蓋已有）
echo "▸ 還原目錄..."
for d in skills cron sessions hooks memories; do
  if [ -d "${HERMES_SRC}/${d}" ]; then
    rsync -au "${HERMES_SRC}/${d}/" "$HOME/.hermes/${d}/"
    COUNT=$(ls -1 "$HOME/.hermes/${d}/" 2>/dev/null | wc -l | tr -d ' ')
    echo "  ✔ ${d}/ (${COUNT} items)"
  fi
done

# 7. 還原 SQLite DB（atomic）
echo "▸ 還原 state.db..."
cp "${HERMES_SRC}/state.db" "$HOME/.hermes/state.db.tmp"
mv "$HOME/.hermes/state.db.tmp" "$HOME/.hermes/state.db"
[ -f "${HERMES_SRC}/state.db-shm" ] && cp "${HERMES_SRC}/state.db-shm" "$HOME/.hermes/state.db-shm"
[ -f "${HERMES_SRC}/state.db-wal" ] && cp "${HERMES_SRC}/state.db-wal" "$HOME/.hermes/state.db-wal"

# 8. 修正權限
chmod 700 ~/.hermes
chmod 600 ~/.hermes/.env ~/.hermes/auth.json
chmod 644 ~/.hermes/config.yaml ~/.hermes/SOUL.md

echo ""
echo "══════════════════════════════════════"
echo "  ✅ Hermes state 已還原"
echo ""
echo "  驗證步驟:"
echo "    hermes --version"
echo "    hermes run \"Reply with the word ready\""
echo "    ls ~/.hermes/skills/ | wc -l  # 應該 22+"
echo "══════════════════════════════════════"
echo ""
