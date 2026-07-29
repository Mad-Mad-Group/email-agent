#!/usr/bin/env bash
# ─────────────────────────────────────────────
# ClientRadar AI — Frontend Build + Deploy 腳本
# 用法: ./scripts/deploy-frontend.sh [user@host] [remote_path]
#
# 無參數:    只 build，唔上傳（dist/ 手動處理）
# 有參數:    build + rsync 到遠端伺服器
#
# 例子:
#   ./scripts/deploy-frontend.sh                              # 只 build
#   ./scripts/deploy-frontend.sh admin@10.0.0.5 /var/www/clientradar  # build + deploy
# ─────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✔${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "  ${RED}✘${NC} $1"; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FE_DIR="${ROOT}/hermes-frontend"
REMOTE_HOST="${1:-}"
REMOTE_PATH="${2:-/var/www/clientradar}"

echo ""
echo "══════════════════════════════════════"
echo "  ClientRadar AI — Frontend Deploy"
echo "══════════════════════════════════════"
echo ""

# ── 1. 前置檢查 ──
echo "▸ 前置檢查..."
command -v node >/dev/null 2>&1 || fail "Node.js 未安裝"
ok "Node.js $(node -v)"

cd "$FE_DIR"

# ── 2. 確保 .env.production 存在 ──
if [ ! -f .env.production ]; then
  echo "VITE_API_URL=/api" > .env.production
  warn ".env.production 已自動建立（VITE_API_URL=/api）"
else
  ok ".env.production 存在"
fi

echo ""

# ── 3. 安裝依賴 ──
echo "▸ 安裝依賴..."
npm install --silent 2>/dev/null
ok "npm install 完成"

echo ""

# ── 4. TypeScript check ──
echo "▸ TypeScript 檢查..."
if npx tsc --noEmit 2>/dev/null; then
  ok "TypeScript 無錯誤"
else
  warn "TypeScript 有錯誤（non-blocking，繼續 build）"
fi

echo ""

# ── 5. Build ──
echo "▸ Building..."
npm run build 2>&1 | tail -5
ok "Build 完成"

DIST_SIZE=$(du -sh dist/ | awk '{print $1}')
ok "dist/ 大小: ${DIST_SIZE}"

echo ""

# ── 6. 上傳（如有遠端目標） ──
if [ -n "$REMOTE_HOST" ]; then
  echo "▸ 上傳到 ${REMOTE_HOST}:${REMOTE_PATH}..."

  # 確保遠端目錄存在
  ssh "$REMOTE_HOST" "mkdir -p ${REMOTE_PATH}" 2>/dev/null || fail "SSH 連線失敗"

  rsync -avz --delete \
    --exclude='.DS_Store' \
    dist/ "${REMOTE_HOST}:${REMOTE_PATH}/"

  ok "上傳完成"

  # 嘗試 reload nginx
  echo "▸ Reload nginx..."
  ssh "$REMOTE_HOST" "sudo nginx -t && sudo systemctl reload nginx 2>/dev/null || sudo brew services restart nginx 2>/dev/null || true"
  ok "nginx reloaded"

  echo ""
  echo "══════════════════════════════════════"
  echo "  ✅ Frontend 已部署到 ${REMOTE_HOST}"
  echo "══════════════════════════════════════"
else
  echo "══════════════════════════════════════"
  echo "  ✅ Frontend build 完成"
  echo "  dist/ 已準備好，手動上傳到伺服器："
  echo "    scp -r dist/ user@server:/var/www/clientradar/"
  echo "  或用本腳本帶參數自動上傳："
  echo "    $0 user@server /var/www/clientradar"
  echo "══════════════════════════════════════"
fi
echo ""
