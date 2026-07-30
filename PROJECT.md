# ClientRadar AI — Project Guide

> 本文件用於讓任何 AI agent 或新開發者快速了解、設置和運行此項目。
> 最後更新：2026-07-29

---

## 項目概覽

ClientRadar AI 是一套 B2B 銷售線索管理系統，包含：

- **自動化線索抓取**：從 Google Maps 等來源收集潛在客戶資料
- **AI 郵件撰寫**：透過 LLM（目前用 MiniMax）自動生成開發信
- **郵件發送與追蹤**：SMTP 發信 + IMAP 收信，自動追蹤回覆
- **CRM 管理介面**：像素風遊戲 UI 的 lead 管理系統

---

## 系統架構

系統由三個獨立行程組成，共用同一個 MongoDB 資料庫：

```
┌─────────────┐     REST API + SSE     ┌─────────────┐    HTTP 輪詢     ┌─────────────┐
│  Frontend   │ ◄──────────────────► │   Server    │ ◄────────────► │   Worker    │
│  (port 5173)│                       │  (port 4000) │                │             │
└─────────────┘                       └──────┬───────┘                └──────┬──────┘
                                             │                               │
                                             └───── MongoDB（13 集合）───────┘
```

### hermes-frontend（React 前端）

提供使用者介面，涵蓋潛在客戶管理、郵件行銷、AI 分析、行事曆、系統管理等功能。

**核心技術：** React 19 + TypeScript + Vite 8 + styled-components + @tanstack/react-query + react-i18next

**主要頁面：**

| 頁面 | 說明 |
|------|------|
| Dashboard | 總覽儀表板（統計數據） |
| Search | 搜尋潛在客戶（觸發 S1 任務） |
| ClientPool | 潛在客戶池（Leads + VerifiedEmails 統一入口） |
| EmailQueue | 郵件佇列管理（審核、批次發送）+ 郵件範本編輯器 |
| EmailApp | 郵件應用介面 |
| Calendar | 行事曆（會議、跟進提醒） |
| Customers | 聯絡人管理 |
| Tasks | 任務列表與狀態追蹤 |
| AgentPanel | AI Agent 監控面板（含 3D 等距視圖） |
| Users | 使用者管理 |
| Settings | 系統設定（含 SMTP/IMAP 郵件連線設定） |
| Login / Register | 帳號登入與註冊 |

**與其他子系統的連接：**
- 透過 Axios 呼叫 Server 的 REST API（`/api/*`）
- 透過 SSE 連線 Server 的 `/api/events` 端點，即時接收更新
- 不直接與 Worker 通訊

### cms/server（NestJS 後端）

系統中樞，提供 REST API、任務佇列管理、排程工作、即時事件推送。

**核心技術：** NestJS 11 + TypeScript + Mongoose 8 + Passport JWT + googleapis + nodemailer + imapflow

**主要模組（20 個）：**

| 類別 | 模組 | 說明 |
|------|------|------|
| 核心 | Auth | JWT 認證、登入、註冊、密碼重設 |
| 核心 | Users | 使用者管理（含個人 SMTP/IMAP、WhatsApp 範本） |
| 核心 | Roles | 角色與權限管理 |
| 核心 | Settings | 系統設定（key-value 存儲） |
| 核心 | Email | SMTP 寄信引擎 |
| 核心 | UserCredentials | OAuth 憑證管理（Gmail/Outlook，AES-256-GCM 加密） |
| 核心 | SSE | 即時事件推送匯流排（RxJS Subject） |
| 核心 | Uploads | 檔案上傳（Multer） |
| 業務 | Leads | 潛在客戶 CRUD（狀態機：new → pending → contacted） |
| 業務 | Tasks | 任務佇列（S1/S2/S3/S4 四階段） |
| 業務 | Search | 搜尋請求入口（排入 S1 任務） |
| 業務 | Scraper | 網頁抓取入口（排入 S2 任務） |
| 業務 | AiAnalysis | AI 分析結果儲存與查詢 |
| 業務 | EmailQueue | 郵件佇列（pending → approved → sent/failed） |
| 業務 | Hermes | 全流程協調器（search → enrich → analyze → draft → send） |
| 業務 | Jobs | 排程（每 10 分鐘回收卡住任務、每 30 分鐘檢查回信、每日跟進提醒） |
| 業務 | Calendar | 行事曆事件管理 |
| 業務 | Notifications | 通知系統（含 i18n） |
| 業務 | VerifiedEmails | 已驗證信箱管理 |
| 業務 | TokenUsage | AI Token 用量追蹤 |

**與其他子系統的連接：**
- 對 Frontend：提供完整 REST API + SSE 即時事件串流
- 對 Worker：採用「排隊-認領」模式 — 任務寫入 MongoDB `tasks` 集合，Worker 透過 API 輪詢認領

### cms/worker（AI Worker 行程）

執行 AI 驅動的自動化工作：搜尋潛在客戶、網站分析、郵件撰寫、郵件發送、回信檢查與自動跟進。

**核心技術：** Node.js >= 20.6 + TypeScript + mongodb 原生驅動 + nodemailer + imapflow + Hermes CLI

**架構：**
- `leader.ts`（主管行程）：fork 4 個 `agent.ts` 子行程，分別負責 S1/S2/S3/S4
- `agent.ts`（核心邏輯）：輪詢認領任務，依 `skill_id` 分派處理
- 呼叫外部 Hermes AI Agent（CLI 工具）執行搜尋和分析

**任務處理：**

| 階段 | 功能 |
|------|------|
| S1（Search） | 透過 Hermes 隱匿瀏覽器爬取 Google Maps / 網頁 / LinkedIn |
| S2（Enrich） | 三層策略提取信箱、電話、WhatsApp、公司描述 |
| S2（Analyze） | LLM 分析網站內容，產出合作建議 |
| S3（Draft） | LLM 撰寫開發信（含多維度評分） |
| S3（followup） | 針對 5 天未回覆的客戶撰寫跟進信 |
| S3（reoutreach） | 針對回覆「沒興趣」的客戶重新撰寫開發信 |
| S4（Send） | 透過使用者個人 SMTP 發送郵件 |
| reply_check | IMAP 收信 → LLM 分類 → 自動草擬回覆 → 建立行事曆事件 |

**與其他子系統的連接：**
- 登入取得 JWT → 每 2 秒輪詢認領任務 → 完成後回報結果
- 同時以原生 MongoDB 驅動直接讀寫多個集合
- 透過 Server 的 SSE 間接推送前端更新

---

## 環境需求

| 項目 | 最低版本 | 說明 |
|------|---------|------|
| Node.js | >= 20.6.0 | Worker 使用 `--env-file` 功能（20.6+） |
| npm | >= 9.0.0 | |
| MongoDB | >= 6.0 | 本地安裝或 MongoDB Atlas |
| hermes CLI | 最新版 | AI agent 工具，僅 Worker 需要（可選） |

---

## 新設備設定指南（分步驟）

以下每個步驟都可以獨立執行。如果某步驟失敗，修正後直接重跑該步驟即可。

### 步驟 1：確認環境

確認 Node.js 版本 >= 20.6.0，以及 MongoDB 可用（本地或雲端）。

```bash
# 檢查 Node.js 版本
node -v
# 應顯示 v20.6.0 或以上

# 如果版本不夠，安裝 Node 20：
brew install node@20
# 或用 nvm：
nvm install 20 && nvm use 20
```

**MongoDB — 二選一：**

**方案 A：本地 MongoDB**
```bash
# 檢查是否運行
mongosh --eval "db.runCommand({ping:1})"
# 應顯示 { ok: 1 }

# 如果未安裝：
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```
連接字串：`mongodb://localhost:27017/lead_scraper`

**方案 B：MongoDB Atlas（雲端，推薦多人/多設備使用）**
1. 前往 [mongodb.com/atlas](https://www.mongodb.com/atlas) 建立免費 cluster
2. 在 Database Access 建立帳號密碼
3. 在 Network Access 加入你的 IP（或暫時用 `0.0.0.0/0` 允許所有）
4. 點擊 Connect → Drivers，複製連接字串

連接字串格式：`mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/lead_scraper`

> 選用 Atlas 的話，所有設備（Backend、Worker）填同一條連接字串即可共用資料。

### 步驟 2：Clone 並進入專案

```bash
git clone https://github.com/Mad-Mad-Group/email-agent.git
cd email-agent
```

### 步驟 3：安裝 Backend 依賴

```bash
cd cms/server
npm install
# 如果失敗，試：
# npm install --legacy-peer-deps
cd ../..
```

**確認成功：** `cms/server/node_modules/` 目錄存在且不為空。

### 步驟 4：安裝 Worker 依賴

```bash
cd cms/worker
npm install
# 如果失敗，試：
# npm install --legacy-peer-deps
cd ../..
```

**確認成功：** `cms/worker/node_modules/` 目錄存在且不為空。

### 步驟 5：安裝 Frontend 依賴

```bash
cd hermes-frontend
npm install
# 如果失敗，試：
# npm install --legacy-peer-deps
cd ..
```

**確認成功：** `hermes-frontend/node_modules/` 目錄存在且不為空。

### 步驟 6：設定 Backend 環境變量

```bash
cp cms/server/.env.example cms/server/.env
```

然後編輯 `cms/server/.env`，以下是完整範例（`⚠️` 標記的必須修改）：

```env
# ── MongoDB ──────────────────────────────────────────
# 本地：mongodb://localhost:27017/lead_scraper
# Atlas：mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/lead_scraper
MONGODB_URI=mongodb://localhost:27017/lead_scraper          # ⚠️ 填入你的連接字串

# ── JWT 認證 ─────────────────────────────────────────
# 產生方法：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-jwt-secret-change-me                        # ⚠️ 必須改為隨機字串
JWT_EXPIRES_IN=7d

# ── Refresh Token 加密 ──────────────────────────────
REFRESH_TOKEN_KEY=your-refresh-token-key-change-me          # ⚠️ 必須改為隨機字串

# ── SMTP（系統級 fallback，可選）─────────────────────
# 使用者可在 Settings 頁面設定個人 SMTP，此處為 fallback
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="ClientRadar" <noreply@example.com>

# ── Server ───────────────────────────────────────────
PORT=4000

# ── CORS ─────────────────────────────────────────────
# 留空=允許 localhost + 內網，填 URL=額外允許的 origin
CORS_ORIGIN=
```

### 步驟 7：設定 Worker 環境變量

```bash
cp cms/worker/.env.example cms/worker/.env
```

然後編輯 `cms/worker/.env`，以下是完整範例（`⚠️` 標記的必須修改）：

```env
# ── MongoDB ──────────────────────────────────────────
# 必須與 Backend 指向同一個 DB
MONGODB_URI=mongodb://localhost:27017/lead_scraper          # ⚠️ 與步驟 6 相同

# ── CMS API 連線 ────────────────────────────────────
# Worker 透過 API 登入並 claim tasks
API_URL=http://localhost:4000/api                           # ⚠️ 指向 Backend 地址

# Worker 登入帳號（步驟 9 的 seed script 會建立此帳號）
AGENT_EMAIL=admin@test.com                                  # ⚠️ 與 seed script 一致
AGENT_PASS=123456                                           # ⚠️ 與 seed script 一致
AGENT_ID=WORKER-1
POLL_MS=2000

# ── 測試收件人（開發時所有郵件發送至此地址）──────────
TEST_RECIPIENT_EMAIL=your-email@example.com

# ── SMTP（Worker fallback，可選）────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="ClientRadar" <your-email@gmail.com>
```

### 步驟 8：設定 Frontend 環境變量

```bash
cp hermes-frontend/.env.example hermes-frontend/.env
```

然後編輯 `hermes-frontend/.env`，以下是完整範例（`⚠️` 標記的必須修改）：

```env
# ── Backend API 地址 ─────────────────────────────────
# 本地開發：http://localhost:4000/api
# UAT/其他設備：http://<server-ip>:4000/api
VITE_API_URL=http://localhost:4000/api                      # ⚠️ 指向 Backend 地址
```

> **三者如何連起來：** Server、Worker 的 `MONGODB_URI` 必須指向同一個 DB；Frontend 的 `VITE_API_URL` 和 Worker 的 `API_URL` 必須指向 Server 的地址。如果三者分開部署在不同機器，把 `localhost` 換成對應機器的 IP 即可。

### 步驟 9：初始化 MongoDB

此腳本會建立全部 13 個 collections、必要的索引、預設角色（admin/staff）和管理員帳號。

```bash
node scripts/seed-db.js
```

可自訂管理員帳號：

```bash
node scripts/seed-db.js --admin-email=admin@test.com --admin-pass=123456 --admin-name=Admin
```

**確認成功：** 腳本輸出「Seed 完成！」且顯示 13 個 collections 已就緒。

### 步驟 10：啟動並驗證

分別在三個終端視窗中執行：

**終端 1 — Backend：**
```bash
cd cms/server && npm run start:dev
```
確認：看到 `Nest application successfully started` 且 `http://localhost:4000` 可訪問。

**終端 2 — Frontend：**
```bash
cd hermes-frontend && npm run dev
```
確認：看到 `Local: http://localhost:5173/` 且瀏覽器可打開。

**終端 3 — Worker（可選）：**
```bash
cd cms/worker && npm start
```
確認：看到 `[LEADER] All agents started` 且開始輪詢。

**登入：** 打開 `http://localhost:5173`，使用步驟 9 建立的管理員帳號登入。

---

## 一鍵設定（可選）

如果你已確認設備環境，也可以直接執行：

```bash
chmod +x setup.sh
./setup.sh
```

此腳本會自動執行步驟 3-9（安裝依賴 → 複製 .env → seed MongoDB）。
但你仍然需要手動編輯各 `.env` 文件填入實際值。

---

## 技術棧

| 層級 | 技術 |
|------|------|
| 前端 | React 19 + Vite 8 + TypeScript + styled-components + @tanstack/react-query |
| 後端 | NestJS 11 + TypeScript + Mongoose 8 |
| 資料庫 | MongoDB（本地開發 / MongoDB Atlas） |
| AI Agent | Hermes CLI + MiniMax API |
| 郵件 | Nodemailer (SMTP) + ImapFlow (IMAP) |
| i18n | react-i18next（EN / 繁中 / 简中） |
| 認證 | JWT + Passport（7 天有效期）+ bcryptjs |

---

## 目錄結構

```
email_agent/
├── cms/
│   ├── server/          # NestJS 後端 API (port 4000)
│   │   ├── src/
│   │   │   ├── auth/             # JWT 認證
│   │   │   ├── users/            # 用戶管理
│   │   │   ├── roles/            # 角色權限
│   │   │   ├── leads/            # 線索 CRUD
│   │   │   ├── email-queue/      # 郵件佇列
│   │   │   ├── email/            # SMTP 郵件服務
│   │   │   ├── tasks/            # 任務系統
│   │   │   ├── hermes/           # AI pipeline 管理
│   │   │   ├── search/           # 搜尋入口
│   │   │   ├── scraper/          # 抓取模組
│   │   │   ├── ai/               # AI 分析
│   │   │   ├── calendar/         # 行事曆
│   │   │   ├── notifications/    # 通知
│   │   │   ├── verified-emails/  # 已驗證信箱
│   │   │   ├── token-usage/      # Token 用量
│   │   │   ├── user-credentials/ # OAuth 憑證
│   │   │   ├── settings/         # 系統設定
│   │   │   ├── sse/              # Server-Sent Events
│   │   │   ├── jobs/             # 定時任務
│   │   │   ├── uploads/          # 檔案上傳
│   │   │   └── common/           # 共用工具
│   │   ├── scripts/              # 資料遷移/修復腳本
│   │   ├── .env.example          # 環境變量模板
│   │   └── .env                  # 環境變量（不入 git）
│   │
│   └── worker/          # AI Agent worker
│       ├── leader.ts             # 主管行程（fork S1-S4）
│       ├── agent.ts              # 核心 worker loop
│       ├── brand.ts              # 品牌資料
│       ├── .env.example          # 環境變量模板
│       └── .env                  # 環境變量（不入 git）
│
├── hermes-frontend/     # React 前端 (port 5173)
│   ├── src/
│   │   ├── pages/                # 頁面元件
│   │   ├── components/           # 共用元件
│   │   ├── api/                  # API client + services
│   │   ├── i18n/                 # 國際化（en, zh-TW, zh-CN）
│   │   ├── styles/               # 主題 + breakpoints
│   │   ├── contexts/             # React contexts
│   │   ├── hooks/                # 自定義 hooks
│   │   ├── types/                # TypeScript 類型
│   │   └── utils/                # 工具函數
│   ├── .env.example              # 環境變量模板
│   └── .env                      # 環境變量（不入 git）
│
├── scripts/
│   ├── seed-db.js                # MongoDB 初始化腳本
│   ├── deploy-backend.sh         # Backend 部署腳本
│   ├── deploy-frontend.sh        # Frontend 部署腳本
│   ├── deploy-worker.sh          # Worker 部署腳本
│   ├── hermes-backup.sh          # Hermes 狀態備份
│   ├── hermes-restore.sh         # Hermes 狀態還原
│   └── nginx-clientradar.conf    # nginx 設定範本
│
├── docs/
│   ├── uat-full-stack-deployment.md  # UAT 部署指南
│   └── seamless-migration-design.md  # 無縫遷移設計方案
│
├── setup.sh              # 一鍵設定腳本
├── .nvmrc                # Node 版本（20）
├── PROJECT.md            # ← 你正在讀的這份文件
└── AGENTS.md             # AI agent 行為準則
```

---

## MongoDB Collections（13 個）

| 集合 | 說明 | 主要索引 |
|------|------|---------|
| `users` | 使用者帳號 | `email`（unique） |
| `leads` | 潛在客戶 | `lead_id`, `user_id`, `company_name`, `email`, `status` + compound |
| `notifications` | 通知 | `user_id`, `type`, `read` |
| `calendar_events` | 行事曆事件 | `userId`, `event_id`, `type`, `lead_id` |
| `token_usages` | AI Token 用量 | `user_id` |
| `campaigns` | 批次任務 | `campaign_id`（unique）, `user_id`, `status` |
| `verified_emails` | 已驗證信箱 | `email` + `company_name`（compound unique） |
| `email_queue` | 郵件佇列 | `email_id`, `lead_id`, `user_id`, `status` + compound |
| `analyses` | AI 分析結果 | `lead_id` |
| `tasks` | 任務佇列 | `task_id`（unique）, `skill_id`, `status` + compound |
| `settings` | 系統設定 | `key`（unique） |
| `roles` | 角色定義 | `name`（unique） |
| `user_credentials` | OAuth 憑證 | `user_id`（unique） |

所有 collections 及索引可透過 `node scripts/seed-db.js` 自動建立。

---

## 環境變量完整清單

### cms/server/.env

| 變量 | 必填 | 說明 | 預設/範例 |
|------|------|------|---------|
| `MONGODB_URI` | ✅ | MongoDB 連接字串 | `mongodb://localhost:27017/lead_scraper` |
| `JWT_SECRET` | ✅ | JWT 簽名密鑰 | 務必修改為隨機字串 |
| `JWT_EXPIRES_IN` | | Token 有效期 | `7d` |
| `REFRESH_TOKEN_KEY` | ✅ | Refresh token 加密密鑰 | 務必修改為隨機字串 |
| `SMTP_HOST` | | 系統級 SMTP 伺服器 | `smtp.gmail.com` |
| `SMTP_PORT` | | SMTP 端口 | `587` |
| `SMTP_USER` | | SMTP 帳號 | |
| `SMTP_PASS` | | SMTP 密碼 | |
| `SMTP_FROM` | | 寄件人顯示名 | `"ClientRadar" <noreply@example.com>` |
| `PORT` | | 監聽端口 | `4000` |
| `CORS_ORIGIN` | | CORS 白名單 | 留空=允許 localhost + LAN |

### cms/worker/.env

| 變量 | 必填 | 說明 | 預設/範例 |
|------|------|------|---------|
| `MONGODB_URI` | ✅ | 與 Backend 相同 | |
| `API_URL` | ✅ | Backend API 地址 | `http://localhost:4000/api` |
| `AGENT_EMAIL` | ✅ | Worker 登入帳號 | `admin@test.com` |
| `AGENT_PASS` | ✅ | Worker 登入密碼 | `123456` |
| `AGENT_ID` | | Worker 識別碼 | `WORKER-1` |
| `POLL_MS` | | 輪詢間隔（毫秒） | `2000` |
| `TEST_RECIPIENT_EMAIL` | | 測試收件人 | |
| `SMTP_*` | | SMTP 設定（fallback） | 同 server |
| `S1_CONCURRENCY` | | S1 並行數 | `1` |
| `S2_CONCURRENCY` | | S2 並行數 | `1` |
| `S3_CONCURRENCY` | | S3 並行數 | `1` |
| `S4_CONCURRENCY` | | S4 並行數 | `1` |
| `RESTART_DELAY` | | 子行程重啟延遲（毫秒） | `5000` |

### hermes-frontend/.env

| 變量 | 必填 | 說明 | 預設/範例 |
|------|------|------|---------|
| `VITE_API_URL` | ✅ | Backend API 地址 | `http://localhost:4000/api` |
| `VITE_VAPID_PUBLIC_KEY` | | Web Push 通知 | |
| `VITE_SMTP_FROM` | | 預設寄件人（開發用） | |
| `VITE_TEST_RECIPIENT` | | 測試收件人（開發用） | |

### 根目錄 .env

| 變量 | 必填 | 說明 | 預設/範例 |
|------|------|------|---------|
| `MINIMAX_API_KEY` | | AI LLM API Key | `sk-...` |
| `SMTP_EMAIL` | | 舊腳本用 SMTP | |
| `SMTP_PASSWORD` | | 舊腳本用 SMTP 密碼 | |

---

## 關鍵技術細節

### API 資料流

1. 後端 `ResponseInterceptor` 統一包裝回應：`{ status: 'success', data: items, total }`
2. 前端 Axios interceptor：如果回應含 `total` → `{ data, total, page, limit }`，否則 → `body.data`
3. 後端 DTO 的 `limit` 參數有 `@Max(100)` 驗證，超過會回 400

### AI Agent 流程

1. Worker (`agent.ts`) 以 loop 模式運行：登入 API → claim task → 執行 → complete
2. `callHermes()` 用 `execFileSync('hermes', ['-z', prompt, '--yolo'])` 調用 AI，timeout 120s
3. Pipeline 透過 SSE 推送 `hermes_log` 和 `pipeline_progress` 事件

### 前端路由

使用 `BrowserRouter`，主要路由在 `App.tsx`。`useNavigate` + `useSearchParams` 處理導航。

### 響應式 breakpoints

```
mobile: ≤639px
tablet: 640-1023px
tabletDown: ≤1023px
desktop: ≥1024px
```

---

## 常用指令

```bash
# 開發
cd cms/server && npm run start:dev       # 後端 dev（hot reload）
cd hermes-frontend && npm run dev        # 前端 dev（Vite HMR）
cd cms/worker && npm start               # 啟動 AI worker

# 構建
cd cms/server && npm run build           # 後端編譯
cd hermes-frontend && npm run build      # 前端構建
cd cms/worker && npm run build           # Worker 編譯

# 檢查
cd hermes-frontend && npx tsc --noEmit   # 前端 TypeScript 類型檢查
cd cms/server && npm run lint            # 後端 lint

# 資料庫
node scripts/seed-db.js                  # 初始化 MongoDB
```

---

## 跨設備同步

- **資料庫**：改用 MongoDB Atlas 即可多設備共用，只需改 `.env` 中的 `MONGODB_URI`
- **程式碼**：全部透過 Git 同步，`.env` 不入 git，換設備需重新設定
- **AI Agent**：Hermes CLI 需在新設備另外安裝，狀態可用 `scripts/hermes-backup.sh` 遷移

---

## Git 資訊

- **Repo**: `https://github.com/Mad-Mad-Group/email-agent.git`
- **主分支**: `main`
- **團隊**: MAD MAD Group
