# ClientRadar AI — 無縫接軌設計方案

> **版本**: v1.0（2026-07-29）
> **目的**: 回應管理層問題「換 AI agent / 換設備時點樣做到無縫接軌？」

---

## 核心問題

當我們需要：
1. **換設備**（舊 Mac → 新 Mac mini）
2. **換 AI agent**（Hermes → 其他 LLM agent）
3. **橫向擴展**（一台 Worker → 多台 Worker）

系統要做到**零停機、零資料遺失、用戶無感知**。

---

## 1. 為何已經可以無縫接軌

### 1.1 架構天然解耦

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▸│   Backend    │◂────│   Worker     │
│   (靜態頁面)  │     │  (NestJS API) │     │ (任務執行器)  │
│              │     │  + MongoDB   │     │ + AI Agent   │
└──────────────┘     └──────────────┘     └──────────────┘
     獨立部署            資料中心              可替換
```

三個組件完全獨立。Worker 只係一個「任務消費者」— 它從 Backend API 攞任務、執行、寫結果回 MongoDB。Frontend 同 Worker 之間完全冇直接通訊。

### 1.2 關鍵設計決策

| 決策 | 效果 |
|------|------|
| **所有業務資料存 MongoDB** | Lead、Email、Task、User settings 唔存喺 Worker 本機 |
| **Worker 透過 API 認證** | 用 `AGENT_EMAIL` / `AGENT_PASS` 登入，唔係 SSH key binding |
| **Per-user SMTP/IMAP** | 每個用戶嘅郵件設定存 DB，唔係 Worker 嘅 .env |
| **AI Agent 係 child process** | Worker spawn `hermes -z prompt --yolo`，agent 係可替換嘅 |
| **Stateless API** | JWT auth，任何 Backend 實例都可以處理 request |

---

## 2. 換設備（Mac A → Mac B）

### 2.1 步驟

```
舊機                              新機
 ┌─────────────┐                ┌─────────────┐
 │ hermes-backup│   AirDrop/    │hermes-restore│
 │   .sh       │───scp/USB────▸│   .sh        │
 └─────────────┘                └─────────────┘
       ↓                              ↓
  tar.gz (≈200MB)              ~/.hermes/ 還原
                                      ↓
                               改 Worker .env:
                               API_URL → Backend IP
                               MONGODB_URI → Backend IP
                                      ↓
                               npm run start
                                      ↓
                               ✅ 新機接手
```

### 2.2 停機時間

| 場景 | 停機 |
|------|------|
| Worker 同機搬遷 | ≈ 5 分鐘（停舊 Worker → 新機 restore → 啟動） |
| Worker 獨立搬遷（Backend 唔動） | **0 分鐘**（新機 Worker 起好後先停舊機） |
| Backend 搬遷 | ≈ 10 分鐘（MongoDB dump → 新機 restore → 啟動） |

### 2.3 已提供嘅工具

| 腳本 | 用途 |
|------|------|
| `scripts/hermes-backup.sh` | 舊機一鍵打包 ~/.hermes/ |
| `scripts/hermes-restore.sh` | 新機一鍵還原 |
| `scripts/deploy-backend.sh` | Backend 部署 |
| `scripts/deploy-worker.sh` | Worker 部署 |
| `scripts/deploy-frontend.sh` | Frontend build + 上傳 |

---

## 3. 換 AI Agent（Hermes → 其他）

### 3.1 現有架構嘅替換點

Worker 調用 AI agent 嘅位置只有一個 — `cms/worker/agent.ts` 入面嘅 `execFileSync`：

```typescript
// 現有
execFileSync('hermes', ['-z', prompt, '--yolo'], { timeout: 600_000 })

// 換成任何其他 CLI agent，例如：
execFileSync('claude', ['--print', '-p', prompt], { timeout: 600_000 })
execFileSync('aider', ['--message', prompt], { timeout: 600_000 })
```

### 3.2 替換清單

換 AI agent 只需要改 **1 個檔案**（`agent.ts`），其他全部唔使改：

| 需要改 | 不需要改 |
|--------|---------|
| `cms/worker/agent.ts`（spawn 指令） | Frontend（完全唔知後面用咩 agent） |
| 新 agent 嘅 config / API key | Backend API（只管 task queue） |
| | MongoDB schema |
| | SMTP/IMAP 設定 |
| | 用戶帳號 / JWT |

### 3.3 建議：Agent Adapter Pattern

如果預期會頻繁換 agent，可以將 agent 調用抽象成 adapter：

```typescript
// cms/worker/agents/base.ts
interface AgentAdapter {
  run(prompt: string, options?: { timeout?: number }): string;
}

// cms/worker/agents/hermes.ts
class HermesAdapter implements AgentAdapter {
  run(prompt: string, opts = {}) {
    return execFileSync('hermes', ['-z', prompt, '--yolo'], {
      timeout: opts.timeout ?? 600_000,
    }).toString();
  }
}

// cms/worker/agents/claude.ts
class ClaudeAdapter implements AgentAdapter {
  run(prompt: string, opts = {}) {
    return execFileSync('claude', ['--print', '-p', prompt], {
      timeout: opts.timeout ?? 600_000,
    }).toString();
  }
}

// cms/worker/agent.ts — 由 .env 決定用邊個
const adapter = createAgent(process.env.AGENT_TYPE ?? 'hermes');
const result = adapter.run(prompt);
```

加一個 `AGENT_TYPE=hermes|claude|aider` env var 就可以隨時切換，**零代碼改動**。

---

## 4. 橫向擴展（多 Worker）

### 4.1 現有支援

系統已經支持多 Worker 並行：
- Worker 透過 API `claim` 任務（atomic operation，唔會重複攞）
- 每個 Worker 用唔同嘅 `AGENT_ID` 識別
- Leader 模式已內建 4 個 sub-worker（S1/S2/S3/S4）

### 4.2 多機擴展

```
                    ┌──────────────┐
                    │   Backend    │
                    │  + MongoDB   │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Worker 1 │ │ Worker 2 │ │ Worker 3 │
        │ Mac mini │ │ Mac mini │ │ Linux VM │
        │ AGENT_ID │ │ AGENT_ID │ │ AGENT_ID │
        │ =UAT-1   │ │ =UAT-2   │ │ =UAT-3   │
        └──────────┘ └──────────┘ └──────────┘
```

每台新 Worker 機只需要：
1. Clone repo + `npm install` + `npm run build`
2. `.env` 指向同一個 Backend API + MongoDB
3. 設唔同嘅 `AGENT_ID`
4. 安裝 Hermes CLI（或其他 agent）

---

## 5. 災難恢復

### 5.1 備份策略

| 項目 | 備份方式 | 頻率 | 保留 |
|------|---------|------|------|
| MongoDB | `mongodump` | 每日 03:00 | 14 日 |
| Hermes state | `hermes-backup.sh` | 每週 | 4 週 |
| 代碼 | Git repo | 每次 commit | 永久 |
| .env 設定 | 加密備份到安全位置 | 每次改動 | 永久 |

### 5.2 恢復時間估算

| 場景 | RTO（恢復時間） |
|------|----------------|
| Worker 掛咗 | ≤ 5 分鐘（pm2 auto-restart） |
| Worker 機器壞咗 | ≤ 30 分鐘（新機 restore） |
| Backend 掛咗 | ≤ 5 分鐘（pm2 auto-restart） |
| Backend 機器壞咗 | ≤ 1 小時（MongoDB restore + Backend 部署） |
| 全部壞晒 | ≤ 2 小時（MongoDB backup + Hermes backup + 重新部署） |

---

## 6. 總結：點解可以無縫接軌

```
「無縫接軌」= 資料同 AI 分離 + 標準化遷移工具 + 可替換 Agent
```

1. **資料唔跟 Worker** — 所有業務資料喺 MongoDB，Worker 壞咗唔會丟資料
2. **AI 人格可遷移** — `~/.hermes/` 一個 tar.gz 搬到新機就恢復（skills + memory + persona）
3. **Agent 可替換** — Worker 只喺一個位調用 agent，改一行就可以換
4. **橫向可擴展** — 多台 Worker 機指向同一個 Backend，自動分工
5. **自動化工具齊備** — backup / restore / deploy scripts 一鍵操作

---

## 附錄：相關文件

| 文件 | 用途 |
|------|------|
| `docs/uat-deployment-runbook.md` | Hermes 跨機遷移詳細步驟 |
| `docs/uat-full-stack-deployment.md` | 全棧 UAT 部署指南 |
| `scripts/hermes-backup.sh` | Hermes state 打包 |
| `scripts/hermes-restore.sh` | Hermes state 還原 |
| `scripts/deploy-*.sh` | 各組件部署腳本 |
