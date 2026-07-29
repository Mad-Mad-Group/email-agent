#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# Lead Scraper CMS — One-click Setup
# 用法: chmod +x setup.sh && ./setup.sh
# ─────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}✔${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "  ${RED}✘${NC} $1"; }

ROOT="$(cd "$(dirname "$0")" && pwd)"
ERRORS=0

echo ""
echo "══════════════════════════════════════"
echo "  Lead Scraper CMS — Environment Setup"
echo "══════════════════════════════════════"
echo ""

# ── 1. Check prerequisites ──
echo "▸ Checking prerequisites..."

if command -v node &>/dev/null; then
  NODE_VER=$(node -v)
  NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v//' | cut -d. -f1)
  NODE_MINOR=$(echo "$NODE_VER" | sed 's/v//' | cut -d. -f2)
  if [ "$NODE_MAJOR" -ge 21 ] || ([ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -ge 6 ]); then
    ok "Node.js $NODE_VER"
  else
    fail "Node.js $NODE_VER (need >= 20.6.0, Worker 需要 --env-file 支援)"
    echo "       安裝方法: brew install node@20  或  nvm install 20"
    ERRORS=$((ERRORS + 1))
  fi
else
  fail "Node.js not found (need >= 20.6.0)"
  echo "       安裝方法: brew install node@20  或  nvm install 20"
  ERRORS=$((ERRORS + 1))
fi

if command -v npm &>/dev/null; then
  ok "npm $(npm -v)"
else
  fail "npm not found"
  ERRORS=$((ERRORS + 1))
fi

if command -v mongod &>/dev/null; then
  ok "MongoDB (local) installed"
elif command -v mongosh &>/dev/null; then
  ok "mongosh found (using remote MongoDB)"
else
  warn "MongoDB not found locally — make sure MONGODB_URI points to Atlas or remote instance"
fi

if command -v hermes &>/dev/null; then
  ok "hermes CLI found"
else
  warn "hermes CLI not found — AI worker features won't work until installed"
fi

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  fail "Fix the errors above before continuing."
  exit 1
fi

echo ""

# ── 2. Install dependencies ──
echo "▸ Installing dependencies..."

install_deps() {
  local dir="$1"
  local name="$2"
  cd "$dir"
  if npm install --silent 2>/dev/null; then
    ok "$name dependencies installed"
  else
    warn "$name npm install failed, retrying with --legacy-peer-deps..."
    if npm install --legacy-peer-deps --silent 2>/dev/null; then
      ok "$name dependencies installed (with --legacy-peer-deps)"
    else
      fail "$name dependencies failed to install"
      echo "       嘗試手動執行: cd $dir && npm install --legacy-peer-deps"
      ERRORS=$((ERRORS + 1))
    fi
  fi
}

echo "  → cms/server"
install_deps "$ROOT/cms/server" "cms/server"

echo "  → cms/worker"
install_deps "$ROOT/cms/worker" "cms/worker"

echo "  → hermes-frontend"
install_deps "$ROOT/hermes-frontend" "hermes-frontend"

cd "$ROOT"
echo ""

# ── 3. Setup .env files ──
echo "▸ Setting up environment files..."

setup_env() {
  local dir="$1"
  local name="$2"
  if [ -f "$dir/.env" ]; then
    ok "$name/.env already exists"
  elif [ -f "$dir/.env.example" ]; then
    cp "$dir/.env.example" "$dir/.env"
    warn "$name/.env created from template — edit it with your actual values"
  else
    warn "$name has no .env.example — skipping"
  fi
}

setup_env "$ROOT" "root"
setup_env "$ROOT/cms/server" "cms/server"
setup_env "$ROOT/cms/worker" "cms/worker"
setup_env "$ROOT/hermes-frontend" "hermes-frontend"

echo ""

# ── 4. Seed MongoDB ──
echo "▸ Initializing MongoDB..."
echo "  (建立 collections、indexes、預設角色及管理員帳號)"

if node "$ROOT/scripts/seed-db.js" 2>/dev/null; then
  ok "MongoDB seed 完成"
else
  warn "MongoDB seed 失敗 — 請確認 MongoDB 正在運行，或稍後手動執行:"
  echo "       node scripts/seed-db.js"
fi

echo ""

# ── 5. Verify TypeScript compilation ──
echo "▸ Verifying TypeScript..."

cd "$ROOT/hermes-frontend"
if npx tsc --noEmit --pretty 2>/dev/null; then
  ok "Frontend TypeScript — no errors"
else
  warn "Frontend TypeScript has errors (non-blocking)"
fi

cd "$ROOT"
echo ""

# ── 6. Summary ──
echo "══════════════════════════════════════"
echo "  Setup complete!"
echo "══════════════════════════════════════"
echo ""
echo "  Next steps:"
echo "    1. Edit the .env files with your actual values"
echo "       (每個 .env.example 內有詳細說明)"
echo ""
echo "    2. 如果 MongoDB seed 未自動執行，手動執行:"
echo "       node scripts/seed-db.js"
echo ""
echo "    3. Start the services:"
echo "       Terminal 1:  cd cms/server && npm run start:dev"
echo "       Terminal 2:  cd hermes-frontend && npm run dev"
echo "       Terminal 3:  cd cms/worker && npm start  (optional)"
echo ""
echo "    4. Open http://localhost:5173 in your browser"
echo "       預設管理員: admin@test.com / 123456"
echo ""
