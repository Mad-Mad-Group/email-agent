#!/usr/bin/env bash
# ─────────────────────────────────────────────
# Hermes AI Agent — 一鍵打包遷移包
# 用法: ./scripts/hermes-backup.sh
# 產出: ~/Desktop/hermes-migration-<timestamp>.tar.gz
# ─────────────────────────────────────────────
set -euo pipefail

STAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$HOME/Desktop/hermes-migration-${STAMP}"
mkdir -p "${BACKUP_DIR}"

echo ""
echo "══════════════════════════════════════"
echo "  Hermes AI Agent — 打包遷移包"
echo "══════════════════════════════════════"
echo ""

# 1. rsync（排除 runtime cache）
echo "▸ 複製 ~/.hermes/ ..."
rsync -a \
  --exclude='cache/' \
  --exclude='sandboxes/' \
  --exclude='image_cache/' \
  --exclude='images/' \
  --exclude='audio_cache/' \
  --exclude='lsp/' \
  --exclude='pastes/' \
  --exclude='hermes-agent/' \
  --exclude='bin/' \
  --exclude='logs/' \
  --exclude='.models_dev_cache_*' \
  --exclude='models_dev_cache.json' \
  --exclude='ollama_cloud_models_cache.json' \
  --exclude='provider_models_cache.json' \
  --exclude='.hermes_history' \
  --exclude='.install_method' \
  --exclude='.update_check' \
  --exclude='interrupt_debug.log' \
  --exclude='processes.json' \
  --exclude='auth.lock' \
  --exclude='config.yaml.bak.*' \
  ~/.hermes/ "${BACKUP_DIR}/hermes-home/"

# 2. 驗證必要檔案
echo "▸ 驗證必要檔案..."
MISSING=0
for f in .env config.yaml auth.json SOUL.md state.db; do
  if [ -f "${BACKUP_DIR}/hermes-home/${f}" ]; then
    echo "  ✔ ${f}"
  else
    echo "  ✘ ${f} 缺少！" >&2
    MISSING=$((MISSING + 1))
  fi
done
for d in skills sessions; do
  if [ -d "${BACKUP_DIR}/hermes-home/${d}" ]; then
    COUNT=$(ls -1 "${BACKUP_DIR}/hermes-home/${d}/" 2>/dev/null | wc -l | tr -d ' ')
    echo "  ✔ ${d}/ (${COUNT} items)"
  else
    echo "  ✘ ${d}/ 缺少！" >&2
    MISSING=$((MISSING + 1))
  fi
done

if [ "$MISSING" -gt 0 ]; then
  echo ""
  echo "❌ 有 ${MISSING} 個必要項目缺少，請檢查 ~/.hermes/"
  rm -rf "${BACKUP_DIR}"
  exit 1
fi

# 3. 壓縮
echo ""
echo "▸ 壓縮中..."
cd "${BACKUP_DIR%/*}"
tar czf "hermes-migration-${STAMP}.tar.gz" "$(basename ${BACKUP_DIR})/hermes-home/"

# 清理臨時目錄
rm -rf "${BACKUP_DIR}"

# 4. 印出結果
TAR_PATH="$(pwd)/hermes-migration-${STAMP}.tar.gz"
SHA=$(shasum -a 256 "${TAR_PATH}" | awk '{print $1}')
SIZE=$(du -h "${TAR_PATH}" | awk '{print $1}')

echo ""
echo "══════════════════════════════════════"
echo "  ✅ 遷移包已準備好"
echo ""
echo "  路徑: ${TAR_PATH}"
echo "  大小: ${SIZE}"
echo "  SHA256: ${SHA}"
echo ""
echo "  下一步:"
echo "    1. 傳到新機 (AirDrop / scp / USB)"
echo "    2. 新機行: ./scripts/hermes-restore.sh <tar.gz 路徑>"
echo "══════════════════════════════════════"
echo ""
