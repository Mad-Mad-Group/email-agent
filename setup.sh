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
  if [ "$NODE_MAJOR" -ge 18 ]; then
    ok "Node.js $NODE_VER"
  else
    fail "Node.js $NODE_VER (need >= 18)"
    ERRORS=$((ERRORS + 1))
  fi
else
  fail "Node.js not found (need >= 18)"
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

echo "  → cms/server"
cd "$ROOT/cms/server" && npm install --silent 2>/dev/null && ok "cms/server dependencies installed"

echo "  → cms/worker"
cd "$ROOT/cms/worker" && npm install --silent 2>/dev/null && ok "cms/worker dependencies installed"

echo "  → hermes-frontend"
cd "$ROOT/hermes-frontend" && npm install --silent 2>/dev/null && ok "hermes-frontend dependencies installed"

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

# ── 4. Verify TypeScript compilation ──
echo "▸ Verifying TypeScript..."

cd "$ROOT/hermes-frontend"
if npx tsc --noEmit --pretty 2>/dev/null; then
  ok "Frontend TypeScript — no errors"
else
  warn "Frontend TypeScript has errors (non-blocking)"
fi

cd "$ROOT"
echo ""

# ── 5. Summary ──
echo "══════════════════════════════════════"
echo "  Setup complete!"
echo "══════════════════════════════════════"
echo ""
echo "  Next steps:"
echo "    1. Edit the .env files with your actual values"
echo "       (see PROJECT.md for full variable list)"
echo ""
echo "    2. Start the services:"
echo "       Terminal 1:  cd cms/server && npm run start:dev"
echo "       Terminal 2:  cd hermes-frontend && npm run dev"
echo "       Terminal 3:  cd cms/worker && npm start  (optional)"
echo ""
echo "    3. Open http://localhost:5173 in your browser"
echo ""
