#!/usr/bin/env bash
# ─────────────────────────────────────────────
# ClientRadar AI — Backend 部署腳本
# 用法: ./scripts/deploy-backend.sh
# 喺 Backend Mac 上執行
# ─────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✔${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "  ${RED}✘${NC} $1"; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="${ROOT}/cms/server"

echo ""
echo "══════════════════════════════════════"
echo "  ClientRadar AI — Backend Deploy"
echo "══════════════════════════════════════"
echo ""

# ── 1. 前置檢查 ──
echo "▸ 前置檢查..."

command -v node >/dev/null 2>&1 || fail "Node.js 未安裝"
NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
[ "$NODE_MAJOR" -ge 18 ] || fail "Node.js 版本太舊（需要 ≥ 18，當前 $(node -v)）"
ok "Node.js $(node -v)"

command -v npm >/dev/null 2>&1 || fail "npm 未安裝"
ok "npm $(npm -v)"

[ -f "${SERVER_DIR}/.env" ] || fail "cms/server/.env 不存在（請先從 .env.example 建立）"
ok ".env 存在"

# 檢查必要 env vars
source_env() {
  set +u
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    export "$key"="$value"
  done < "${SERVER_DIR}/.env"
  set -u
}
source_env

[ -n "${MONGODB_URI:-}" ] || fail "MONGODB_URI 未設定"
ok "MONGODB_URI 已設定"
[ -n "${JWT_SECRET:-}" ] || fail "JWT_SECRET 未設定"
ok "JWT_SECRET 已設定"

echo ""

# ── 2. Git pull（如果係 git repo） ──
echo "▸ 更新代碼..."
if [ -d "${ROOT}/.git" ]; then
  cd "$ROOT"
  git pull --ff-only 2>/dev/null && ok "Git pull 成功" || warn "Git pull 失敗（可能有本地改動）"
else
  warn "非 git repo，跳過 pull"
fi

echo ""

# ── 3. 安裝依賴 ──
echo "▸ 安裝依賴..."
cd "$SERVER_DIR"
npm install --production=false --silent 2>/dev/null
ok "npm install 完成"

echo ""

# ── 4. Build ──
echo "▸ Building..."
npm run build 2>&1 | tail -3
ok "Build 完成"

echo ""

# ── 5. 停舊 process + 啟動 ──
echo "▸ 啟動服務..."

if command -v pm2 >/dev/null 2>&1; then
  # pm2 模式
  if pm2 describe clientradar-api >/dev/null 2>&1; then
    pm2 restart clientradar-api
    ok "pm2 restart clientradar-api"
  else
    pm2 start dist/main.js --name "clientradar-api"
    pm2 save
    ok "pm2 start clientradar-api"
  fi
else
  # 直接模式（nohup）
  # 殺舊 process
  OLD_PID=$(lsof -ti:${PORT:-4000} 2>/dev/null || true)
  if [ -n "$OLD_PID" ]; then
    kill "$OLD_PID" 2>/dev/null || true
    sleep 2
    warn "已停止舊 process (PID: $OLD_PID)"
  fi

  nohup node dist/main.js > /tmp/clientradar-api.log 2>&1 &
  NEW_PID=$!
  sleep 3

  if kill -0 "$NEW_PID" 2>/dev/null; then
    ok "Backend 已啟動 (PID: $NEW_PID)"
  else
    fail "Backend 啟動失敗，查看 /tmp/clientradar-api.log"
  fi
fi

echo ""

# ── 6. Health check ──
echo "▸ Health check..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT:-4000}/api/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  ok "API health check 通過 (HTTP $HTTP_CODE)"
else
  fail "API health check 失敗 (HTTP $HTTP_CODE)"
fi

echo ""
echo "══════════════════════════════════════"
echo "  ✅ Backend 部署完成"
echo "  API: http://localhost:${PORT:-4000}/api"
echo "  Docs: http://localhost:${PORT:-4000}/api/docs"
echo "══════════════════════════════════════"
echo ""
