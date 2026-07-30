#!/usr/bin/env bash
#
# hermes-migrate.sh — 搬移 / 還原 Hermes AI agent 嘅 memory、skills、context
#
# 為咩需要：worker 唔係自己叫 API，而係 shell out 去外部 CLI `hermes`
# （見 cms/worker/agent.ts#callHermes）。個 CLI 嘅學習成果全部喺 ~/.hermes：
#   skills/    已裝 / 自己養出嚟嘅 skill（每個一個 SKILL.md + references）
#   memories/  MEMORY.md、USER.md — 跨 session 記住嘅事實同用戶偏好
#   state.db   對話歷史（SQLite，含 FTS index）
#   SOUL.md    persona / 系統指示
#   config.yaml 模型、provider、工具設定
#   cron hooks pairing  自動化設定
# 唔搬呢啲，新機就係一個全新 agent — 行為會同舊機唔同。
#
# 用法：
#   ./hermes-migrate.sh backup [輸出目錄]        # 打包（預設 ~/Desktop）
#   ./hermes-migrate.sh backup --no-history      # 唔要 state.db + sessions（細好多）
#   ./hermes-migrate.sh backup --no-secrets      # 唔要 .env + auth.json
#   ./hermes-migrate.sh restore <tar.gz>         # 還原（會先備份現有 ~/.hermes）
#   ./hermes-migrate.sh restore <tar.gz> --yes   # 唔問確認
#   ./hermes-migrate.sh verify                   # 檢查現時 ~/.hermes 完整性
#
# 環境變數：
#   HERMES_HOME   自訂 hermes home（預設 ~/.hermes）—— 測試 restore 用得着
#
set -uo pipefail

HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"

GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✔${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "  ${RED}✘${NC} $1"; }
step() { echo -e "\n${BLUE}▸ $1${NC}"; }

# ── 可攜內容清單 ────────────────────────────────────
# 刻意唔包：bin/ cache/ logs/ sandboxes/ *_cache* — 呢啲係本機衍生物，
# 由 hermes 自己重建，搬過去只會體積大 + 可能同新機唔兼容。
PORTABLE_CORE=(SOUL.md config.yaml skills memories cron hooks)
PORTABLE_SECRETS=(.env auth.json)
PORTABLE_HISTORY=(sessions state.db state.db-shm state.db-wal)
PORTABLE_DEVICE=(pairing)   # 可能綁裝置，還原後或需重新 pair

have_sqlite() { command -v sqlite3 >/dev/null 2>&1; }

# 有冇 hermes 程序會寫入我哋要動嘅 home？
# 只攔真正衝突嘅：命令行提到目標 home 嘅程序。
# 目標係預設 ~/.hermes 時額外保守 —— 任何 hermes 程序都當衝突，
# 因為佢冇明確寫出路徑都會用預設 home。
hermes_running() {
  local target="$1"
  local default_home="$HOME/.hermes"

  if pgrep -fl "[h]ermes" 2>/dev/null | grep -qF -- "$target"; then
    return 0
  fi
  if [ "$target" = "$default_home" ] && pgrep -f "[h]ermes" >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

# ══════════════════════════════════════════════════
# backup
# ══════════════════════════════════════════════════
cmd_backup() {
  local out_dir="$HOME/Desktop"
  local with_history=true with_secrets=true

  for arg in "$@"; do
    case "$arg" in
      --no-history) with_history=false ;;
      --no-secrets) with_secrets=false ;;
      -*) fail "未知參數: $arg"; exit 1 ;;
      *)  out_dir="$arg" ;;
    esac
  done

  step "檢查來源"
  if [ ! -d "$HERMES_HOME" ]; then
    fail "找唔到 hermes home: $HERMES_HOME"
    exit 1
  fi
  ok "來源: $HERMES_HOME"
  [ -d "$HERMES_HOME/skills" ] && ok "skills: $(find "$HERMES_HOME/skills" -name SKILL.md 2>/dev/null | wc -l | tr -d ' ') 個"
  [ -d "$HERMES_HOME/memories" ] && ok "memories: $(find "$HERMES_HOME/memories" -type f -name '*.md' 2>/dev/null | wc -l | tr -d ' ') 個檔"

  if hermes_running "$HERMES_HOME"; then
    warn "偵測到 hermes 正在執行 —— state.db 快照可能唔一致"
    warn "建議先停止 agent（包括 cms/worker 嘅 leader）再 backup"
  fi

  local stamp name stage
  stamp="$(date +%Y%m%d_%H%M%S)"
  name="hermes-migration-${stamp}"
  stage="$(mktemp -d)/${name}/hermes-home"
  mkdir -p "$stage"

  step "收集內容"
  local list=("${PORTABLE_CORE[@]}" "${PORTABLE_DEVICE[@]}")
  $with_secrets && list+=("${PORTABLE_SECRETS[@]}")

  for item in "${list[@]}"; do
    if [ -e "$HERMES_HOME/$item" ]; then
      cp -R "$HERMES_HOME/$item" "$stage/$item"
      ok "$item"
    fi
  done

  if $with_history; then
    [ -d "$HERMES_HOME/sessions" ] && cp -R "$HERMES_HOME/sessions" "$stage/sessions" && ok "sessions"
    if [ -f "$HERMES_HOME/state.db" ]; then
      # 用 sqlite3 .backup 而唔係 cp —— 直接 cp 一個 WAL 模式下正在寫入嘅 DB
      # 有機會攞到撕裂快照。.backup 會出一個已 checkpoint、自洽嘅單檔。
      if have_sqlite && sqlite3 "$HERMES_HOME/state.db" ".backup '$stage/state.db'" 2>/dev/null; then
        ok "state.db（sqlite .backup，已 checkpoint）"
      else
        cp "$HERMES_HOME/state.db" "$stage/state.db"
        for f in state.db-shm state.db-wal; do
          [ -f "$HERMES_HOME/$f" ] && cp "$HERMES_HOME/$f" "$stage/$f"
        done
        warn "state.db 用 cp（冇 sqlite3 CLI）—— WAL 一併複製，還原時會 replay"
      fi
    fi
  else
    warn "略過 sessions + state.db（--no-history）：skills 同 memories 仍然完整"
  fi

  step "打包"
  mkdir -p "$out_dir"
  local archive="$out_dir/${name}.tar.gz"
  ( cd "$(dirname "$(dirname "$stage")")" && tar -czf "$archive" "$name" ) || { fail "打包失敗"; exit 1; }
  rm -rf "$(dirname "$(dirname "$stage")")"

  ok "已產出: $archive ($(du -h "$archive" | cut -f1))"
  if $with_secrets; then
    echo ""
    warn "呢個檔案包含 .env 同 auth.json（API key / 憑證）。"
    warn "用安全渠道傳輸，唔好放公開網盤或者 email 附件。"
  fi
}

# ══════════════════════════════════════════════════
# restore
# ══════════════════════════════════════════════════
cmd_restore() {
  local archive="" assume_yes=false
  for arg in "$@"; do
    case "$arg" in
      --yes|-y) assume_yes=true ;;
      -*) fail "未知參數: $arg"; exit 1 ;;
      *) archive="$arg" ;;
    esac
  done

  [ -z "$archive" ] && { fail "用法: $0 restore <tar.gz> [--yes]"; exit 1; }
  [ -f "$archive" ] || { fail "找唔到檔案: $archive"; exit 1; }

  step "前置檢查"
  if ! command -v hermes >/dev/null 2>&1; then
    fail "新機未安裝 hermes CLI。先安裝好，再 restore。"
    fail "（本 script 只搬 state，唔會裝 CLI —— 版本要由你決定）"
    exit 1
  fi
  ok "hermes CLI: $(command -v hermes)"

  if hermes_running "$HERMES_HOME"; then
    fail "hermes 正在執行。請先停止（連 cms/worker 嘅 leader）再 restore，"
    fail "否則會寫入衝突同 DB 損壞。"
    exit 1
  fi
  ok "冇 hermes 進程執行中"

  # 驗證 archive 結構
  local root
  root="$(tar -tzf "$archive" | head -1 | cut -d/ -f1)"
  if ! tar -tzf "$archive" | grep -q "^${root}/hermes-home/"; then
    fail "archive 結構唔對：預期 <name>/hermes-home/…"
    exit 1
  fi
  ok "archive 結構正確（$root）"

  echo ""
  echo "  即將覆蓋: $HERMES_HOME"
  echo "  現有內容會先備份到: ${HERMES_HOME}.bak.<timestamp>"
  if ! $assume_yes; then
    printf "  繼續？[y/N] "
    read -r reply
    case "$reply" in [yY]*) ;; *) warn "已取消，冇改任何嘢"; exit 0 ;; esac
  fi

  step "備份現有 home"
  if [ -d "$HERMES_HOME" ]; then
    local bak="${HERMES_HOME}.bak.$(date +%Y%m%d_%H%M%S)"
    mv "$HERMES_HOME" "$bak" || { fail "備份失敗，中止"; exit 1; }
    ok "舊 home → $bak"
  else
    ok "冇現有 home，直接建立"
  fi
  mkdir -p "$HERMES_HOME"

  step "解壓"
  local tmp
  tmp="$(mktemp -d)"
  tar -xzf "$archive" -C "$tmp" || { fail "解壓失敗"; exit 1; }
  local src="$tmp/$root/hermes-home"

  # 用 cp -R 逐項搬，唔用 mv 整個目錄 —— 保留 hermes 首次啟動可能已建立嘅
  # bin/ cache/ 等本機目錄。
  ( cd "$src" && find . -maxdepth 1 -mindepth 1 -print ) | while read -r item; do
    cp -R "$src/${item#./}" "$HERMES_HOME/${item#./}"
    ok "${item#./}"
  done
  rm -rf "$tmp"

  step "修正權限"
  # 憑證唔應該俾其他用戶讀
  for f in .env auth.json; do
    [ -f "$HERMES_HOME/$f" ] && chmod 600 "$HERMES_HOME/$f" && ok "chmod 600 $f"
  done
  chmod 700 "$HERMES_HOME" && ok "chmod 700 $(basename "$HERMES_HOME")"

  cmd_verify

  echo ""
  step "還原完成 — 仲要人手確認嘅事"
  echo "  1. config.yaml 內嘅模型 / provider 設定係舊機嘅，確認新機用得着"
  echo "  2. pairing/ 可能綁舊裝置，如果 pair 唔到就刪掉再重新 pair"
  echo "  3. .env / auth.json 係同一組憑證 —— 兩部機同時跑會共用 API 額度"
  echo "     （額度爆嘅時候，CMS 會通知 admin，見 cms/server/src/alerts）"
  echo "  4. 跑一次簡單任務對照兩機輸出，確認行為一致"
}

# ══════════════════════════════════════════════════
# verify
# ══════════════════════════════════════════════════
cmd_verify() {
  step "驗證 $HERMES_HOME"
  local problems=0

  for item in "${PORTABLE_CORE[@]}"; do
    if [ -e "$HERMES_HOME/$item" ]; then
      ok "$item 存在"
    else
      warn "$item 唔存在"
    fi
  done

  if [ -d "$HERMES_HOME/skills" ]; then
    ok "skills: $(find "$HERMES_HOME/skills" -name SKILL.md 2>/dev/null | wc -l | tr -d ' ') 個 SKILL.md"
  fi
  if [ -f "$HERMES_HOME/memories/MEMORY.md" ]; then
    ok "memories/MEMORY.md: $(wc -c < "$HERMES_HOME/memories/MEMORY.md" | tr -d ' ') bytes"
  else
    warn "memories/MEMORY.md 唔存在 —— 學習到嘅事實會冇咗"
    problems=$((problems + 1))
  fi

  if [ -f "$HERMES_HOME/state.db" ]; then
    if have_sqlite; then
      local integrity
      integrity="$(sqlite3 "$HERMES_HOME/state.db" "pragma integrity_check;" 2>&1 | head -1)"
      if [ "$integrity" = "ok" ]; then
        ok "state.db integrity: ok（sessions=$(sqlite3 "$HERMES_HOME/state.db" 'select count(*) from sessions' 2>/dev/null), messages=$(sqlite3 "$HERMES_HOME/state.db" 'select count(*) from messages' 2>/dev/null)）"
      else
        fail "state.db integrity 有問題: $integrity"
        problems=$((problems + 1))
      fi
    else
      warn "冇 sqlite3 CLI，跳過 state.db 完整性檢查"
    fi
  else
    warn "state.db 唔存在 —— 對話歷史會冇咗（skills / memories 唔受影響）"
  fi

  echo ""
  if [ "$problems" -eq 0 ]; then
    ok "驗證通過"
  else
    fail "$problems 項有問題，請檢查上面輸出"
    return 1
  fi
}

# ══════════════════════════════════════════════════
case "${1:-}" in
  backup)  shift; cmd_backup "$@" ;;
  restore) shift; cmd_restore "$@" ;;
  verify)  shift; cmd_verify "$@" ;;
  *)
    sed -n '2,30p' "$0" | sed 's/^# \?//'
    exit 1
    ;;
esac
