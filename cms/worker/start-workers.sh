#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# 啟動多個 Worker 實例（併發處理 tasks）
#
# 用法:
#   ./start-workers.sh          # 預設 3 個 worker
#   ./start-workers.sh 5        # 啟動 5 個 worker
#   ./start-workers.sh stop     # 停止所有 worker
# ─────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

PID_DIR="$SCRIPT_DIR/.worker-pids"
LOG_DIR="$SCRIPT_DIR/logs"

stop_all() {
  if [ -d "$PID_DIR" ]; then
    echo "Stopping workers..."
    for pidfile in "$PID_DIR"/*.pid; do
      [ -f "$pidfile" ] || continue
      pid=$(cat "$pidfile")
      name=$(basename "$pidfile" .pid)
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid"
        echo "  ✔ $name (PID $pid) stopped"
      else
        echo "  - $name already stopped"
      fi
      rm -f "$pidfile"
    done
    rmdir "$PID_DIR" 2>/dev/null || true
  else
    echo "No workers running."
  fi
}

if [ "${1:-}" = "stop" ]; then
  stop_all
  exit 0
fi

NUM_WORKERS="${1:-2}"

# Build first
echo "Building worker..."
npm run build

# Stop existing workers
stop_all 2>/dev/null

mkdir -p "$PID_DIR" "$LOG_DIR"

echo ""
echo "Starting $NUM_WORKERS worker(s) with skill routing..."
echo ""

# Worker 分工：
#   WORKER-1: 通用 worker（做 S1 search / S2 enrich+analyze / S3 draft / 同埋冇人認領嘅 task）
#   WORKER-2: 專做 S4 email（send / reply_check / followup），同 search pipeline 唔會互相 block
#   WORKER-3+: 通用 worker（額外併發）

for i in $(seq 1 "$NUM_WORKERS"); do
  WORKER_ID="WORKER-$i"
  LOG_FILE="$LOG_DIR/$WORKER_ID.log"

  WORKER_SKILL=""
  WORKER_EXCLUDE=""
  if [ "$i" -eq 1 ]; then
    WORKER_EXCLUDE="S4"
    LABEL="(S1/S2/S3 search pipeline)"
  elif [ "$i" -eq 2 ]; then
    WORKER_SKILL="S4"
    LABEL="(S4 email 專用)"
  else
    LABEL="(通用)"
  fi

  AGENT_ID="$WORKER_ID" AGENT_SKILL="$WORKER_SKILL" AGENT_SKILL_EXCLUDE="$WORKER_EXCLUDE" node --env-file=.env dist/agent.js > "$LOG_FILE" 2>&1 &
  PID=$!
  echo "$PID" > "$PID_DIR/$WORKER_ID.pid"
  echo "  ✔ $WORKER_ID $LABEL started (PID $PID) → logs/$WORKER_ID.log"
done

echo ""
echo "All workers running. Use './start-workers.sh stop' to stop."
echo "Tail logs: tail -f logs/WORKER-*.log"
