#!/usr/bin/env bash
#
# ClientRadar CMS — 一鍵 Build 全部三個子系統
#
# 用法:
#   ./build.sh                  # build 全部 (server + worker + frontend)
#   ./build.sh server           # 只 build server
#   ./build.sh worker           # 只 build worker
#   ./build.sh frontend         # 只 build frontend
#   ./build.sh --clean          # 先清除舊 build 產物再 build 全部
#   ./build.sh --skip-install   # 跳過 npm install（假設 deps 已裝好）
#
# 產出:
#   cms/server/dist/       — NestJS 編譯結果
#   cms/worker/dist/       — Worker 編譯結果
#   hermes-frontend/dist/  — Vite 靜態檔案
#

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# ── 顏色 ────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

ok()    { echo -e "  ${GREEN}✔${NC} $1"; }
warn()  { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail()  { echo -e "  ${RED}✘${NC} $1"; }
step()  { echo -e "\n${BLUE}${BOLD}▸ $1${NC}"; }

# ── 參數解析 ────────────────────────────────────────
TARGET="all"
CLEAN=false
SKIP_INSTALL=false

for arg in "$@"; do
  case "$arg" in
    server|worker|frontend) TARGET="$arg" ;;
    --clean)         CLEAN=true ;;
    --skip-install)  SKIP_INSTALL=true ;;
    -h|--help)
      sed -n '3,16p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      fail "未知參數: $arg（用 --help 查看用法）"
      exit 1
      ;;
  esac
done

# ── 統計 ────────────────────────────────────────────
BUILD_START=$(date +%s)
FAILED=()
SUCCEEDED=()

# 失敗時完整日誌存放位置
LOG_DIR="$ROOT/logs/build"
mkdir -p "$LOG_DIR"

# ── 環境檢查 ────────────────────────────────────────
step "環境檢查"

if ! command -v node &>/dev/null; then
  fail "找唔到 node。請先安裝 Node.js ≥ 20.6"
  exit 1
fi

NODE_VER=$(node -v | sed 's/^v//')
NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
NODE_MINOR=$(echo "$NODE_VER" | cut -d. -f2)

if [ "$NODE_MAJOR" -lt 20 ] || { [ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -lt 6 ]; }; then
  fail "Node 版本過舊: v$NODE_VER（需要 ≥ 20.6，因為用咗 --env-file）"
  exit 1
fi
ok "Node v$NODE_VER"

if ! command -v npm &>/dev/null; then
  fail "找唔到 npm"
  exit 1
fi
ok "npm $(npm -v)"

# ── 安裝依賴（帶 fallback）──────────────────────────
install_deps() {
  local dir="$1"
  local name="$2"

  if [ "$SKIP_INSTALL" = true ]; then
    ok "$name — 跳過 npm install"
    return 0
  fi

  if [ ! -f "$dir/package.json" ]; then
    fail "$name — 找唔到 package.json ($dir)"
    return 1
  fi

  echo "    安裝 $name 依賴..."
  if (cd "$dir" && npm install --no-audit --no-fund >/dev/null 2>&1); then
    ok "$name 依賴已安裝"
    return 0
  fi

  warn "$name npm install 失敗，改用 --legacy-peer-deps 重試..."
  if (cd "$dir" && npm install --legacy-peer-deps --no-audit --no-fund >/dev/null 2>&1); then
    ok "$name 依賴已安裝（legacy-peer-deps）"
    return 0
  fi

  fail "$name 依賴安裝失敗"
  return 1
}

# ── 清除舊產物 ──────────────────────────────────────
clean_dist() {
  local dir="$1"
  local name="$2"
  if [ -d "$dir/dist" ]; then
    rm -rf "$dir/dist"
    ok "$name — 已清除 dist/"
  fi
}

# ── Build 單一子系統 ────────────────────────────────
build_one() {
  local dir="$1"
  local name="$2"
  local build_cmd="$3"

  step "Build $name"

  if [ ! -d "$dir" ]; then
    fail "$name — 目錄唔存在: $dir"
    FAILED+=("$name")
    return 1
  fi

  if [ "$CLEAN" = true ]; then
    clean_dist "$dir" "$name"
  fi

  if ! install_deps "$dir" "$name"; then
    FAILED+=("$name")
    return 1
  fi

  echo "    編譯中..."
  local log_file
  log_file=$(mktemp)

  if (cd "$dir" && eval "$build_cmd" > "$log_file" 2>&1); then
    ok "$name build 成功"
    if [ -d "$dir/dist" ]; then
      local size
      size=$(du -sh "$dir/dist" 2>/dev/null | cut -f1)
      ok "產出: $dir/dist ($size)"
    fi
    SUCCEEDED+=("$name")
    rm -f "$log_file"
    return 0
  else
    fail "$name build 失敗"

    # 統計錯誤數（TS / 一般 error）
    local err_count
    err_count=$(grep -cE 'error (TS[0-9]+|:)|^Error' "$log_file" 2>/dev/null || echo 0)
    [ "$err_count" -gt 0 ] && warn "偵測到 $err_count 個錯誤"

    echo ""
    echo "    ── 最先出現嘅錯誤（根因通常喺最前）──"
    head -50 "$log_file" | sed 's/^/    /'

    local total
    total=$(wc -l < "$log_file")
    if [ "$total" -gt 50 ]; then
      echo ""
      warn "仲有 $((total - 50)) 行未顯示 → 完整日誌已存喺: $LOG_DIR/${name}.log"
      cp "$log_file" "$LOG_DIR/${name}.log"
    fi

    echo ""
    rm -f "$log_file"
    FAILED+=("$name")
    return 1
  fi
}

# ── 主流程 ──────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════"
echo "  ClientRadar CMS — Build"
echo "═══════════════════════════════════════════"
echo "  目標: $TARGET"
[ "$CLEAN" = true ] && echo "  模式: 清除重建"
[ "$SKIP_INSTALL" = true ] && echo "  模式: 跳過依賴安裝"

if [ "$TARGET" = "all" ] || [ "$TARGET" = "server" ]; then
  build_one "cms/server" "cms-server" "npm run build"
fi

if [ "$TARGET" = "all" ] || [ "$TARGET" = "worker" ]; then
  build_one "cms/worker" "cms-worker" "npm run build"
fi

if [ "$TARGET" = "all" ] || [ "$TARGET" = "frontend" ]; then
  build_one "hermes-frontend" "hermes-frontend" "npm run build"
fi

# ── 總結 ────────────────────────────────────────────
BUILD_END=$(date +%s)
ELAPSED=$((BUILD_END - BUILD_START))

echo ""
echo "═══════════════════════════════════════════"
echo "  Build 完成 (${ELAPSED}s)"
echo "═══════════════════════════════════════════"
echo ""

if [ ${#SUCCEEDED[@]} -gt 0 ]; then
  echo -e "  ${GREEN}成功 (${#SUCCEEDED[@]}):${NC}"
  for s in "${SUCCEEDED[@]}"; do echo "    ✔ $s"; done
fi

if [ ${#FAILED[@]} -gt 0 ]; then
  echo ""
  echo -e "  ${RED}失敗 (${#FAILED[@]}):${NC}"
  for f in "${FAILED[@]}"; do echo "    ✘ $f"; done
  echo ""
  echo "  請檢查上面嘅錯誤輸出（由最先出現嘅開始睇）。"
  if [ -n "$(ls -A "$LOG_DIR" 2>/dev/null)" ]; then
    echo "  完整日誌: $LOG_DIR/"
  fi
  exit 1
fi

echo ""
echo "  下一步:"
echo "    啟動（PM2）:  pm2 start ecosystem.config.js"
echo "    啟動（手動）:"
echo "      cd cms/server && node --env-file=.env dist/main.js"
echo "      cd cms/worker && node --env-file=.env dist/leader.js"
echo "      cd hermes-frontend && npm run preview   # :5173，已 proxy /api → :4000"
echo ""
echo "  ⚠ Frontend 靜態檔案喺 hermes-frontend/dist/，但唔可以用 'serve -s dist' 直接開："
echo "    serve 冇 proxy，/api/* 會被 SPA fallback 回 index.html →"
echo "    /api/events 變 text/html（SSE 斷線）、其他 API 回 HTML（o.map is not a function）。"
echo "    本機請用 npm run preview；正式部署用 scripts/nginx-clientradar.conf（已有 /api/ proxy_pass）。"
echo ""
