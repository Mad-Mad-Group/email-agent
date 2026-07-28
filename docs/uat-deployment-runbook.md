# Hermes AI Agent 跨機遷移 Runbook

> **版本**:v1.0(2026-07-28)
> **目的**:Frontend 上 UAT 後,**Hermes AI agent 將喺公司新嘅 Mac mini 上重新部署**。本文件確保從舊機搬到新機時:
> 1. **Plug-and-play**(單機安裝 ≤ 30 分鐘)
> 2. **State 無縫接軌**(skills / memory / 任務記錄 / 個人偏好全部跟到新機,**唔需要從零開始**)

---

## 目錄

- [1. 部署決策摘要](#1-部署決策摘要)
- [2. Hermes 嘅 state 地圖](#2-hermes-嘅-state-地圖)
- [3. 遷移前:舊機備份清單](#3-遷移前舊機備份清單)
- [4. 新機安裝:Plug-and-play 步驟](#4-新機安裝plug-and-play-步驟)
- [5. State restore:無縫接軌](#5-state-restore無縫接軌)
- [6. 連通性驗證](#6-連通性驗證)
- [7. 失敗救援](#7-失敗救援)
- [8. 自動備份 cron(建議)](#8-自動備份-cron建議)

---

## 1. 部署決策摘要

| 項目 | 當前 | UAT Phase 3 之後 |
|------|------|------|
| **Frontend** | `hermes-frontend`(dev box,192.168.1.111) | 公司 UAT 域名 |
| **Backend** | `cms/server`(192.168.1.111) | 維持 192.168.1.111(MongoDB + state) |
| **Worker** | `cms/worker`(192.168.1.111) | 維持或搬去 Worker Mac |
| **MongoDB** | 本機(192.168.1.111) | 維持 shared,**Hermes 唔直接 access** |
| **Hermes AI Agent** | 192.168.1.111 | **公司新 Mac mini**(spawn child process 由 Worker 觸發) |

**Hermes 嘅角色**:`Worker(S1/S2/S3)` 透過 `child_process.execFileSync('hermes', ['-z', prompt, '--yolo'])` 短暫 spawn 一個 Hermes 子程序跑 LLM + CUA 任務。**所有 lead / email / task state 已經喺 MongoDB**。Hermes 而家只負責 AI 推理,**冇 critical state 落自己機**。

但**個人化**狀態需要遷移:
- Skills(系統裝嘅 + 你裝嘅)
- Cross-session memory / persona(`SOUL.md`)
- Cron jobs
- Session SQLite DB
- API keys + model config

---

## 2. Hermes 嘅 state 地圖

Hermes CLI 嘅 persistance **全部都喺 `~/.hermes/`** 一個目錄入面。audit 結果:

| 路徑 | 性質 | 大小 | 是否 migrate |
|------|------|------|-----------|
| `~/.hermes/.env` | **API keys**(敏感) | ~24KB | **必須 migrate** |
| `~/.hermes/config.yaml` | Provider / model / agent config | ~16KB | **必須 migrate** |
| `~/.hermes/auth.json` | Runtime auth tokens | 682B | **必須 migrate** |
| `~/.hermes/skills/` | 系統 + 用戶技能 | ~18MB | **必須 migrate** |
| `~/.hermes/cron/` | Cron jobs + output | dir | **必須 migrate** |
| `~/.hermes/sessions/` | 跨 session 記錄 | dir | **必須 migrate** |
| `~/.hermes/state.db` + `state.db-shm` / `state.db-wal` | SQLite 永久記憶 | DB | **必須 migrate** |
| `~/.hermes/SOUL.md` | Persona / identity 設定 | text | **必須 migrate** |
| `~/.hermes/hooks/` | 自訂 shell hooks | dir | **必須 migrate** |
| `~/.hermes/memories/` | Memory plugin dir | dir | 可選 migrate |
| `~/.hermes/hermes-agent/` | Hermes source code(或 git clone) | 762KB | **唔需要 migrate**(新機重裝) |
| `~/.hermes/cache/` / `sandboxes/` / `image_cache/` | 暫存 cache | dir | **skip**(可重生) |
| `~/.hermes/logs/` | agent.log / errors.log | dir | **可選 migrate**(debug 用) |
| `~/.hermes/lsp/` / `interrupt_debug.log` / `pastes/` | runtime 暫存 | dir | **skip**(可重生) |
| `~/.hermes/pairing/` / `processes.json` | Gateway pairing state | 可選 | 視乎新機需唔需要 |

**核心 6 個一定要帶**:`.env`、`config.yaml`、`auth.json`、`skills/`、`sessions/` + `state.db`、`SOUL.md`。

---

## 3. 遷移前:舊機備份清單

### 3.1 一鍵打包 script(由舊機 `/Users/intern3` 執行)

```bash
#!/bin/bash
# ~/.hermes-migration: 一鍵打包 Hermes 全 state
# 適用於「Hermes 已裝完,將搬到新機」嘅場景

set -euo pipefail

STAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$HOME/Desktop/hermes-migration-${STAMP}"
mkdir -p "${BACKUP_DIR}"

# 1. 主 ~/.hermes directory(篩走 runtime cache)
rsync -a \
  --exclude='cache/' \
  --exclude='sandboxes/' \
  --exclude='image_cache/' \
  --exclude='images/' \
  --exclude='lsp/' \
  --exclude='pastes/' \
  --exclude='logs/*.log' \
  --exclude='.models_dev_cache_*' \
  --exclude='.hermes_history' \
  ~/.hermes/ "${BACKUP_DIR}/hermes-home/"

# 2. 二次驗證:必要檔案有齊
for f in .env config.yaml auth.json SOUL.md; do
  test -f "${BACKUP_DIR}/hermes-home/${f}" || {
    echo "ERROR: 缺少 ${f}" >&2; exit 1;
  }
done
test -d "${BACKUP_DIR}/hermes-home/skills" || { echo "ERROR: 缺少 skills/"; exit 1; }
test -d "${BACKUP_DIR}/hermes-home/sessions" || { echo "ERROR: 缺少 sessions/"; exit 1; }
test -f "${BACKUP_DIR}/hermes-home/state.db" || { echo "ERROR: 缺少 state.db"; exit 1; }

# 3. 壓縮
cd "${BACKUP_DIR%/*}"
tar czf "hermes-migration-${STAMP}.tar.gz" "${BACKUP_DIR##*/}/hermes-home/"

# 4. 印出 SHA + size 用作遷移後 verify
SHA=$(shasum -a 256 "hermes-migration-${STAMP}.tar.gz" | awk '{print $1}')
echo ""
echo "✅ Migration package ready:"
echo "   Path: $(pwd)/hermes-migration-${STAMP}.tar.gz"
echo "   SHA256: ${SHA}"
echo "   Size: $(du -h hermes-migration-${STAMP}.tar.gz | awk '{print $1}')"
```

執行後會喺 `~/Desktop/hermes-migration-<timestamp>.tar.gz`(典型 20-50 MB)。

### 3.2 備份內容預覽

```bash
tar tzf hermes-migration-20260728.tar.gz | head -20
```

**預期出現**:
```
hermes-home/.env
hermes-home/config.yaml
hermes-home/auth.json
hermes-home/SOUL.md
hermes-home/skills/apple/SKILL.md
hermes-home/skills/autonomous-ai-agents/SKILL.md
... (20+ skills)
hermes-home/sessions/*.json
hermes-home/state.db
hermes-home/state.db-shm
hermes-home/state.db-wal
hermes-home/cron/jobs.yaml
```

---

## 4. 新機安裝:Plug-and-play 步驟

### 4.1 全新 Mac mini 嘅一鍵 setup script

```bash
#!/bin/bash
# Hermes 全新機 setup - 公司新 Mac mini 適用
# 必須以有 sudo 嘅 user 身份行
# Usage: ./setup-hermes-macmini.sh [migration-tar.gz 路徑]

set -euo pipefail

MIGRATION_TAR="${1:-}"

echo "═══════════════════════════════════════════════"
echo "Hermes AI Agent 一鍵安裝(Mac mini UAT)"
echo "═══════════════════════════════════════════════"

# 1. System 必備:Homebrew + Python 3.11+ + Node 20+
if ! command -v brew >/dev/null 2>&1; then
  echo "[setup] 安裝 Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

if ! command -v python3.11 >/dev/null 2>&1; then
  echo "[setup] 安裝 Python 3.11..."
  brew install python@3.11
fi

if ! command -v node >/dev/null 2>&1 || [[ "$(node --version | cut -d'v' -f2 | cut -d'.' -f1)" -lt 20 ]]; then
  echo "[setup] 安裝 Node 20+..."
  brew install node@20
fi

# 2. 安裝 Hermes CLI
echo "[setup] 安裝 Hermes CLI..."
pip3 install --user hermes-agent-cli  # 或用戶指定嘅 source

# 3. 確保 ~/.hermes 存在且權限正確
mkdir -p ~/.hermes
chmod 700 ~/.hermes

# 4. Restore state(如果有 migration tar)
if [[ -n "${MIGRATION_TAR}" && -f "${MIGRATION_TAR}" ]]; then
  echo "[restore] 從 ${MIGRATION_TAR} 還原 state..."
  bash ./restore-hermes-state.sh "${MIGRATION_TAR}"
else
  echo "[setup] 未提供 migration tar,只會有新嘅空白 ~/.hermes"
  echo "[setup] Hermes 首次啟動會自動同 server 配對 / 拉 skills"
fi

# 5. 設環境變數(如果同事需要)
echo ""
echo "═══════════════════════════════════════════════"
echo "✅ 安裝完成"
echo ""
echo "下一步驗證:"
echo "  hermes --version"
echo "  hermes logs --follow"
echo ""
echo "新 Hermes mac mini 嘅 IP:"
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
echo "  ${IP}"
echo "═══════════════════════════════════════════════"
```

### 4.2 預備 setup 之前要起嘅 bash files

- `setup-hermes-macmini.sh`(上面嘅內容)
- `restore-hermes-state.sh`(下面 §5)

兩者放喺新機 `/Users/intern3/Desktop/hermes-migration/`,chmod +x 執行。

### 4.3 Worker 嗰邊要 update 嘅位

Worker 透過 `child_process` spawn Hermes 子進程。**新 Hermes 機嘅位置**要由「同機 spawn」改成「跨機 SSH/socket」:

```typescript
// cms/worker/agent.ts 入面
// 原本 (Line 230-260):
execFileSync('hermes', ['-z', prompt, '--yolo'], { ... })

// Phase 3 之後:
// 透過 SSH 落新 Hermes Mac mini
execFileSync('ssh', [
  'intern3@192.168.1.222',  // ← 新 Hermes Mac mini IP
  `hermes -z ${JSON.stringify(prompt)} --yolo`,
], {
  timeout: 600_000,  // 10+ min
  env: { ...process.env, AGENT_ID: 'WORKER-HERMES-1' },
})
```

> **注意**:Worker 同新 Hermes Mac mini 之間嘅網絡必須 accessible(公司內網 / VPN)。Worker 上嘅 SSH key 需要 pre-authorised 喺新 Hermes 機(`ssh-copy-id intern3@192.168.1.222`)。

---

## 5. State restore:無縫接軌

### 5.1 restore-hermes-state.sh(新機執行)

```bash
#!/bin/bash
# restore-hermes-state.sh <migration-tar.gz>
# 將備份 state 解到 ~/.hermes/

set -euo pipefail

TAR_FILE="${1:?Usage: $0 <migration-tar.gz>}"
EXPECTED_SHA="${EXPECTED_SHA:-}"

if [[ ! -f "${TAR_FILE}" ]]; then
  echo "❌ 找不到備份檔: ${TAR_FILE}" >&2; exit 1
fi

# 1. 驗 SHA256(可選)
if [[ -n "${EXPECTED_SHA}" ]]; then
  ACTUAL=$(shasum -a 256 "${TAR_FILE}" | awk '{print $1}')
  if [[ "${ACTUAL}" != "${EXPECTED_SHA}" ]]; then
    echo "❌ SHA256 mismatch:" >&2
    echo "   Expected: ${EXPECTED_SHA}" >&2
    echo "   Actual:   ${ACTUAL}" >&2
    exit 1
  fi
fi

# 2. 解壓
TMPDIR=$(mktemp -d)
trap "rm -rf ${TMPDIR}" EXIT
tar xzf "${TAR_FILE}" -C "${TMPDIR}"

HERMES_HOME_SRC="${TMPDIR}/$(tar tzf "${TAR_FILE}" | head -1 | cut -d/ -f1)/hermes-home"

# 3. 驗必要檔案齊全
for f in .env config.yaml auth.json SOUL.md skills sessions state.db; do
  if [[ ! -e "${HERMES_HOME_SRC}/${f}" ]]; then
    echo "❌ 備份缺 ${f}" >&2; exit 1
  fi
done

# 4. 合併去 ~/.hermes(預設 ~/.hermes 已存在或新機)
#    - .env / config.yaml / auth.json / SOUL.md:直接覆蓋
#    - skills / cron / sessions / state.db:合併(missing 先 restore)
mkdir -p ~/.hermes

# Atomic overwrite (cp 後 mv 確保唔會半寫)
for f in .env config.yaml auth.json SOUL.md; do
  cp "${HERMES_HOME_SRC}/${f}" "${HOME}/.hermes/${f}.tmp"
  mv "${HOME}/.hermes/${f}.tmp" "${HOME}/.hermes/${f}"
done

# Merge directories
for d in skills cron sessions hooks memories; do
  if [[ -d "${HERMES_HOME_SRC}/${d}" ]]; then
    rsync -au "${HERMES_HOME_SRC}/${d}/" "${HOME}/.hermes/${d}/"
  fi
done

# SQLite Database - atomic move
cp "${HERMES_HOME_SRC}/state.db" "${HOME}/.hermes/state.db.tmp"
mv "${HOME}/.hermes/state.db.tmp" "${HOME}/.hermes/state.db"
test -f "${HERMES_HOME_SRC}/state.db-shm" && cp "${HERMES_HOME_SRC}/state.db-shm" "${HOME}/.hermes/state.db-shm"
test -f "${HERMES_HOME_SRC}/state.db-wal" && cp "${HERMES_HOME_SRC}/state.db-wal" "${HOME}/.hermes/state.db-wal"

# 5. 修正權限(Hermes 要求 700)
chmod 700 ~/.hermes
chmod 600 ~/.hermes/.env ~/.hermes/auth.json
chmod 644 ~/.hermes/config.yaml ~/.hermes/SOUL.md

echo ""
echo "═══════════════════════════════════════════════"
echo "✅ Hermes state restored"
echo ""
echo "還原項目:"
echo "  - API keys / config (${HERMES_HOME_SRC}/.env, config.yaml)"
echo "  - Auth tokens (auth.json)"
echo "  - Skills: $(ls -1 ${HERMES_HOME_SRC}/skills/ 2>/dev/null | wc -l | tr -d ' ') 個"
echo "  - Sessions: $(ls -1 ${HERMES_HOME_SRC}/sessions/ 2>/dev/null | wc -l | tr -d ' ') 個"
echo "  - Cron jobs: $(ls -1 ${HERMES_HOME_SRC}/cron/jobs.yaml 2>/dev/null | wc -l | tr -d ' ') 個"
echo "  - state.db: $(ls -la ${HERMES_HOME_SRC}/state.db 2>/dev/null | awk '{print $5}') bytes"
echo ""
echo "下一步:"
echo "  hermes --version        # 確認 Hermes 已認得 config"
echo "  hermes logs --follow   # 啟動 + watch logs"
echo "  第一次任務:Worker spawn 一個 S1 prompt,observe 結果同舊機完全一樣"
echo "═══════════════════════════════════════════════"
```

### 5.2 驗證清單

Restore 完之後需要即刻 verify 嘅項目:

```bash
# 1. Hermes 認得 config
hermes --version
hermes doctor              # 如有此指令

# 2. API key 已加載
hermes run "Reply with the word ready"  # 短 task 確認 LLM 連到

# 3. Skills 已加載
ls ~/.hermes/skills/ | wc -l  # 應該係 20+(同舊機一樣)

# 4. Sessions 數量對
sqlite3 ~/.hermes/state.db "SELECT COUNT(*) FROM sessions"
# 對比舊機數字

# 5. Cron jobs 已加載
crontab -l | grep hermes
```

---

## 6. 連通性驗證

新 Hermes Mac mini 上線後,要同 Backend Mac(192.168.1.111)建立信任關係。

### 6.1 雙向防火牆 + SSH pre-authorise

```bash
# 新 Hermes Mac mini 上:
ssh-keygen -t ed25519 -C "hermes-uat-2026"
ssh-copy-id intern3@192.168.1.111
# 跟 prompt 輸入密碼

# 然後測試 ssh 直接 run(模擬 Worker 行為):
ssh intern3@192.168.1.111 'echo "Worker 模擬 spawn -> 連到 backend"'
```

### 6.2 Backend .env 同 worker .env 更新

```
# cms/worker/.env (Worker Mac 或 Backend Mac 同機)
AGENT_HERMES_HOST=192.168.1.222          # ← 新 Hermes Mac mini IP
AGENT_HERMES_USER=intern3
AGENT_HERMES_SSH_KEY_PATH=/Users/intern3/.ssh/id_ed25519
```

### 6.3 E2E smoke test

```bash
# 喺 Worker Mac(或 Backend Mac)test:
curl -sf http://localhost:4000/api/health
# 應返 {"status":"success"}

# Spawn 第一個 AI 任務:
curl -X POST http://localhost:4000/api/hermes/run \
  -H "Authorization: Bearer $(cat /tmp/jwt)" \
  -d '{"keyword":"cafe","location":"Hong Kong","target_count":3,"source":"gmap"}'

# 觀察 Backend 嘅 log, 應該見到:
#   [Worker S1] spawning hermes on 192.168.1.222 via ssh
#   [Worker S1] task T1 claimed
```

---

## 7. 失敗救援

### 7.1 常見錯誤同解法

| 症狀 | 排查 | 解法 |
|------|------|------|
| `hermes: command not found` | 新機 PATH 入面冇 `~/.local/bin` | `export PATH="$HOME/.local/bin:$PATH"` 入 `~/.zshrc` |
| `state.db is locked` | 上一個 hermes 仲未退出 | `killall hermes`,rm `state.db-shm` / `state.db-wal` |
| `Authentication failed (worker can't ssh hermes)` | SSH key 未 pre-auth | `ssh-copy-id` 重新做一次 |
| `Mongo connection refused` | Hermes 唔該連 MongoDB(Worker 負責) | 唔關 Hermes 事,check Worker log |
| Persona's tone / memory 唔同咗 | `SOUL.md` / sessions restore 失敗 | 重新行 `restore-hermes-state.sh` |
| Skills 載唔到 | `~/.hermes/skills/` 漏目錄 | `ls ~/.hermes/skills` 應該見到 20+ directories |

### 7.2 完全 rollback(新機 reset)

如果新 Hermes 機搞唔掂,可以隨時 fallback:

```bash
# 喺 Backend .env 還原指向舊 Hermes 機:
# AGENT_HERMES_HOST=192.168.1.111  (暫時,直至新機修好)

# 重啟 Worker 拾返舊 Hermes
lsof -nP -iTCP:4000 -sTCP:LISTEN   # 找 Backend Mac 上跑緊嘅 worker
kill <pid>
npm run start:single              # Backend Mac 上

# 新機 restore 唔需要做(已經 failed),可以重試
```

### 7.3 永久保留舊機 backup 30 日

```bash
# Cron 喺舊機(192.168.1.111)備份 ~/.hermes,放 Desktop 上:
echo '0 3 * * * cd ~ && tar czf ~/Desktop/hermes-snapshot-$(date +\%Y\%m\%d).tar.gz --exclude=cache --exclude=sandboxes --exclude=image_cache .hermes' | crontab -
```

---

## 8. 自動備份 cron(建議)

**強烈建議** Hermes 升 UAT 之後開個 daily backup cron。Hermes 嘅 state 越嚟越有 personal touch(SOUL.md、跨 session 學習),失去就 reverse 唔到。

```bash
# ~/.hermes-state-backup.sh(擺入新 Hermes Mac mini 上 crontab)
#!/bin/bash
BACKUP_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/Hermes-Backups"  # iCloud sync
mkdir -p "${BACKUP_DIR}"
DAILY="hermes-state-$(date +%Y%m%d).tar.gz"
DAILY_PATH="${BACKUP_DIR}/${DAILY}"

tar czf "${DAILY_PATH}" \
  --exclude='cache' --exclude='sandboxes' --exclude='image_cache' \
  --exclude='lsp' --exclude='pastes' \
  ~/.hermes/.env ~/.hermes/config.yaml ~/.hermes/auth.json ~/.hermes/SOUL.md \
  ~/.hermes/skills ~/.hermes/cron ~/.hermes/sessions ~/.hermes/state.db*

# 保留最近 14 日
find "${BACKUP_DIR}" -name "hermes-state-*.tar.gz" -mtime +14 -delete
```

```bash
# 開 cron(每日 03:00):
crontab -e
0 3 * * * /Users/intern3/.hermes-state-backup.sh >> /tmp/hermes-backup.log 2>&1
```

iCloud sync backup 確保你嘅 iPhone / iPad / 屋企 Mac 都有 copy。

---

## 附錄 A:搬遷 Checklist

```markdown
### 搬遷前(舊 Hermes Mac)
- [ ] 跑 §3.1 嘅 migration script
- [ ] 確認 tar.gz 出現喺 ~/Desktop
- [ ] 印 SHA256
- [ ] 將 tar.gz 由 WhatsApp / AirDrop / scp 傳到新機

### 新 Mac mini 嘅首次開機
- [ ] macOS update + Apple ID + FileVault
- [ ] Disable sleep(System Settings → Energy Saver)
- [ ] 設固定 IP(Network → TCP/IP → DHCP with manual)
- [ ] 裝 Homebrew(若未裝)
- [ ] 跑 §4.1 嘅 setup script,帶 migration tar
- [ ] 確認 §4.3 嘅 Worker SSH key 設置

### Restore 後嘅 verification
- [ ] `hermes --version` 成功
- [ ] `hermes run "test"` 5 秒內回應
- [ ] `ls ~/.hermes/skills/ | wc -l` 對返舊機數字(20+)
- [ ] Worker spawn 一個 S1 prompt,確認同舊機結果一致

### Worker 嗰邊切換
- [ ] 更新 `cms/worker/.env` `AGENT_HERMES_HOST=新 Hermes IP`
- [ ] `ssh intern3@新 Hermes IP` 密碼免入
- [ ] `kill -HUP $(lsof ... :4000 worker PID)` graceful reload
- [ ] E2E test:建一個 S1 task,確認 spawn 去新 Hermes 完成

### 7 日回訪
- [ ] 確認 daily backup cron 跑咗
- [ ] 確認 iCloud 有最新 backup
- [ ] 評估新機 perform 對比舊機
```

---

## 附錄 B:相關文件

| 文件 | 用途 |
|------|------|
| `docs/uat-functional-spec.md` | 系統功能清單 + Mermaid flowcharts |
| `docs/uat-deployment-runbook.md` | 本文件 |
| `HANDOVER.md` | 完整技術交接文件(已有) |
| `setup.sh` | 一鍵安裝(本機,已有) |
| `cms/worker/agent.ts` | Worker 主入口(Phase 3 要改 spawn location) |
| `~/.hermes/` | Hermes state local directory |

---

**版本歷程**
- v1.0(2026-07-28):初版,對應 UAT Phase 3 Hermes mac mini 遷移
