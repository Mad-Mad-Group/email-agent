#!/usr/bin/env bash
# ─────────────────────────────────────────────
# ClientRadar AI — Worker 部署腳本
# 用法: ./scripts/deploy-worker.sh
# 喺 Worker Mac 上執行
# ─────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✔${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "  ${RED}✘${NC} $1"; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKER_DIR="${ROOT}/cms/worker"

echo ""
echo "══════════════════════════════════════"
echo "  ClientRadar AI — Worker Deploy"
echo "══════════════════════════════════════"
echo ""

# ── 1. 前置檢查 ──
echo "▸ 前置檢查..."

command -v node >/dev/null 2>&1 || fail "Node.js 未安裝"
ok "Node.js $(node -v)"

[ -f "${WORKER_DIR}/.env" ] || fail "cms/worker/.env 不存在（請先從 .env.example 建立）"
ok ".env 存在"

# 檢查 Hermes CLI
if command -v hermes >/dev/null 2>&1; then
  ok "Hermes CLI 已安裝"
else
  warn "Hermes CLI 未安裝 — AI 任務將無法執行"
fi

# 檢查 API 連通性
API_URL=$(grep '^API_URL=' "${WORKER_DIR}/.env" 2>/dev/null | cut -d'=' -f2- || echo "")
if [ -n "$API_URL" ]; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    ok "Backend API 連通 (${API_URL})"
  else
    warn "Backend API 連唔到 (${API_URL}, HTTP ${HTTP_CODE})，請確認 Backend 已啟動"
  fi
fi

echo ""

# ── 2. Git pull ──
echo "▸ 更新代碼..."
if [ -d "${ROOT}/.git" ]; then
  cd "$ROOT"
  git pull --ff-only 2>/dev/null && ok "Git pull 成功" || warn "Git pull 失敗"
else
  warn "非 git repo，跳過 pull"
fi

echo ""

# ── 3. 安裝依賴 ──
echo "▸ 安裝依賴..."
cd "$WORKER_DIR"
npm install --silent 2>/dev/null
ok "npm install 完成"

echo ""

# ── 4. Build ──
echo "▸ Building..."
npm run build 2>&1 | tail -3
ok "Build 完成"

echo ""

# ── 5. 啟動 ──
echo "▸ 啟動 Worker..."

if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe clientradar-worker >/dev/null 2>&1; then
    pm2 restart clientradar-worker
    ok "pm2 restart clientradar-worker"
  else
    pm2 start dist/leader.js --name "clientradar-worker" --node-args="--env-file=.env"
    pm2 save
    ok "pm2 start clientradar-worker"
  fi
else
  # 殺舊 worker
  OLD_PIDS=$(pgrep -f "node.*leader\.js" 2>/dev/null || true)
  if [ -n "$OLD_PIDS" ]; then
    echo "$OLD_PIDS" | xargs kill 2>/dev/null || true
    sleep 2
    warn "已停止舊 worker"
  fi

  nohup node --env-file=.env dist/leader.js > /tmp/clientradar-worker.log 2>&1 &
  NEW_PID=$!
  sleep 3

  if kill -0 "$NEW_PID" 2>/dev/null; then
    ok "Worker 已啟動 (PID: $NEW_PID)"
  else
    fail "Worker 啟動失敗，查看 /tmp/clientradar-worker.log"
  fi
fi

echo ""
echo "══════════════════════════════════════"
echo "  ✅ Worker 部署完成"
echo "  Log: pm2 logs clientradar-worker"
echo "       或 tail -f /tmp/clientradar-worker.log"
echo "══════════════════════════════════════"
echo ""
