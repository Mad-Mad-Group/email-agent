# Lead Scraper CMS — Project Guide

> 本文件用於讓任何 AI agent 或新開發者快速了解、設置和運行此項目。
> 最後更新：2026-07-06

---

## 項目概覽

Lead Scraper CMS 是一套 B2B 銷售線索管理系統，包含：

- **自動化線索抓取**：從 Google Maps 等來源收集潛在客戶資料
- **AI 郵件撰寫**：透過 LLM（目前用 MiniMax）自動生成開發信
- **郵件發送與追蹤**：SMTP 發信 + IMAP 收信，自動追蹤回覆
- **CRM 管理介面**：三欄式 Agile CRM 風格的 lead 管理 UI

---

## 技術棧

| 層級 | 技術 |
|------|------|
| 前端 | React 19 + Vite + TypeScript + styled-components + @tanstack/react-query |
| 後端 | NestJS 11 + TypeScript + Mongoose |
| 資料庫 | MongoDB（本地開發用 localhost，生產環境將遷移至 MongoDB Atlas） |
| AI Agent | 目前用 Hermes CLI + MiniMax API，後續可能更換其他 LLM provider |
| 郵件 | Nodemailer (SMTP) + ImapFlow (IMAP) |
| i18n | react-i18next（EN / 繁中 / 简中） |

---

## 目錄結構

```
email_agent/
├── cms/
│   ├── server/          # NestJS 後端 API (port 4000)
│   │   ├── src/
│   │   │   ├── leads/        # 線索 CRUD
│   │   │   ├── email-queue/  # 郵件佇列
│   │   │   ├── tasks/        # 任務系統（enqueue 模式）
│   │   │   ├── hermes/       # AI pipeline 管理
│   │   │   ├── auth/         # JWT 認證
│   │   │   ├── users/        # 用戶管理
│   │   │   ├── roles/        # 角色權限
│   │   │   ├── calendar/     # 行事曆
│   │   │   ├── search/       # 全文搜尋
│   │   │   ├── settings/     # 系統設定
│   │   │   ├── sse/          # Server-Sent Events
│   │   │   ├── jobs/         # 定時任務
│   │   │   ├── uploads/      # 檔案上傳
│   │   │   ├── scraper/      # 抓取模組
│   │   │   ├── ai/           # AI 相關
│   │   │   ├── email/        # 郵件服務
│   │   │   └── common/       # 共用工具（guards, interceptors, pipes, filters）
│   │   ├── scripts/          # 資料遷移/修復腳本
│   │   ├── .env              # 環境變量（不入 git）
│   │   └── .env.example      # 環境變量模板
│   │
│   └── worker/          # AI Agent worker（獨立 process）
│       ├── agent.ts          # 主 worker loop：claim task → AI 處理 → complete
│       ├── brand.ts          # 品牌資料（公司名、標語、簽名檔）
│       ├── .env              # Worker 環境變量（不入 git）
│       └── outreach_qc.json  # 郵件品質檢查規則
│
├── hermes-frontend/     # React 前端 (port 5173)
│   ├── src/
│   │   ├── pages/            # 頁面
│   │   │   ├── Leads/             # 線索管理（主頁面，含三欄詳情面板）
│   │   │   ├── Dashboard/         # 儀表板
│   │   │   ├── EmailQueue/        # 郵件佇列
│   │   │   ├── Pipeline/          # Pipeline 進度
│   │   │   ├── Search/            # 搜尋（含 pipeline progress SSE）
│   │   │   ├── Tasks/             # 任務管理
│   │   │   ├── Calendar/          # 行事曆
│   │   │   ├── Settings/          # 設定
│   │   │   ├── Users/             # 用戶管理
│   │   │   ├── Login/             # 登入
│   │   │   └── Register/          # 註冊
│   │   ├── components/       # 共用元件（Topbar, Sidebar, Table, etc.）
│   │   ├── api/              # API client + hooks
│   │   ├── i18n/             # 國際化（locales/en.json, zh-TW.json, zh-CN.json）
│   │   ├── styles/           # 主題 + media breakpoints
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # 自定義 hooks
│   │   ├── types/            # TypeScript 類型定義
│   │   └── utils/            # 工具函數
│   ├── .env                  # 前端環境變量（不入 git）
│   └── .env.example          # 前端環境變量模板
│
├── AGENTS.md                 # AI agent 行為準則（Ponytail style）
├── CMS-TECHNICAL-REQUIREMENTS.md  # 技術架構設計文件
└── PROJECT.md                # ← 你正在讀的這份文件
```

---

## 環境需求

- **Node.js** >= 18
- **npm** >= 9
- **MongoDB** >= 6（本地）或 MongoDB Atlas 連接字串
- **hermes** CLI（AI agent 工具，需另外安裝）
- **SMTP 帳號**（目前用 Gmail App Password）

---

## 快速設置（新設備）

### 1. Clone repo

```bash
git clone https://github.com/Mad-Mad-Group/email-agent.git
cd email-agent
```

### 2. 安裝依賴

```bash
# 後端
cd cms/server && npm install && cd ../..

# Worker
cd cms/worker && npm install && cd ../..

# 前端
cd hermes-frontend && npm install && cd ..
```

### 3. 設定環境變量

複製模板並填入實際值：

```bash
# 後端
cp cms/server/.env.example cms/server/.env
# 編輯 cms/server/.env，填入 MONGODB_URI, JWT_SECRET, SMTP 設定

# Worker
cp cms/server/.env cms/worker/.env
# Worker 需額外設定 API_URL, AGENT_EMAIL, AGENT_PASS

# 前端
cp hermes-frontend/.env.example hermes-frontend/.env
# 設定 VITE_API_URL 指向後端地址
```

### 4. 啟動

```bash
# 終端 1：啟動後端
cd cms/server && npm run start:dev

# 終端 2：啟動前端
cd hermes-frontend && npm run dev

# 終端 3（可選）：啟動 Worker
cd cms/worker && npm start
```

---

## 環境變量清單

### cms/server/.env

| 變量 | 說明 | 範例 |
|------|------|------|
| `MONGODB_URI` | MongoDB 連接字串 | `mongodb://localhost:27017/lead_scraper` 或 Atlas URI |
| `JWT_SECRET` | JWT 簽名密鑰 | 任意字串 |
| `JWT_EXPIRES_IN` | JWT 過期時間 | `7d` |
| `SMTP_HOST` | SMTP 伺服器 | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP 端口 | `587` |
| `SMTP_USER` | SMTP 帳號 | 你的 email |
| `SMTP_PASS` | SMTP 密碼（Gmail 用 App Password） | `xxxx xxxx xxxx xxxx` |
| `SMTP_FROM` | 寄件人顯示名 | `"Company Name" <email@example.com>` |
| `PORT` | 後端監聽端口 | `4000` |
| `CORS_ORIGIN` | CORS 白名單（留空=允許 localhost + LAN） | 留空或 `http://192.168.1.50:5173` |

### cms/worker/.env

| 變量 | 說明 | 範例 |
|------|------|------|
| `MONGODB_URI` | 同上 | 同上 |
| `API_URL` | 後端 API 地址 | `http://localhost:4000/api` |
| `AGENT_EMAIL` | Worker 登入帳號 | `admin@test.com` |
| `AGENT_PASS` | Worker 登入密碼 | `123456` |
| `AGENT_ID` | Worker 識別碼 | `WORKER-1` |
| `POLL_MS` | 輪詢間隔（毫秒） | `2000` |
| `TEST_RECIPIENT_EMAIL` | 測試收件人 | 你的 email |
| SMTP 相關 | 同 server | 同 server |

### hermes-frontend/.env

| 變量 | 說明 | 範例 |
|------|------|------|
| `VITE_API_URL` | 後端 API 地址 | `http://localhost:4000/api` |
| `VITE_SMTP_FROM` | 寄件人 email（前端顯示用） | 你的 email |
| `VITE_TEST_RECIPIENT` | 測試收件人 | 你的 email |

### 根目錄 .env（AI agent 用）

| 變量 | 說明 | 範例 |
|------|------|------|
| `MINIMAX_API_KEY` | MiniMax LLM API Key（可替換為其他 provider） | `sk-...` |
| SMTP 相關 | 同上 | 同上 |

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

```typescript
// styles/media.ts
mobile: ≤639px
tablet: 640-1023px
tabletDown: ≤1023px
desktop: ≥1024px
```

### Leads 詳情面板

三欄 Agile CRM 風格 layout：
- 左欄 (340px)：About 資訊（DpGrid + DpField 水平排列）
- 中欄 (1fr)：Email 記錄
- 右欄 (220px)：Journey timeline + Tags + Reply info
- tablet 以下改為單欄 + collapsible sections

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
cd cms/server && npx ts-node scripts/recover-missing-leads.ts  # 修復遺失 leads
cd cms/server && npx ts-node scripts/seed-email-queue.ts       # 種子郵件資料
```

---

## 跨設備同步

### 資料庫

- **開發**：本地 MongoDB (`mongodb://localhost:27017/lead_scraper`)
- **共享/生產**：改用 MongoDB Atlas，所有設備連同一個雲端 DB
- 切換只需改 `.env` 中的 `MONGODB_URI`

### 程式碼

- 全部透過 Git 同步：`git pull` 即可拿到最新代碼
- `.env` 檔案不入 git，換設備需重新設定（參考 `.env.example`）

### AI Agent

- 目前用 MiniMax API，API key 放在根目錄 `.env`
- 後續如更換 LLM provider，只需改 worker 中的 API 調用和對應的 env 變量
- Hermes CLI 需在新設備上另外安裝

---

## 當前開發狀態

### 已完成

- [x] NestJS 後端 API（leads, email-queue, tasks, auth, users, roles, calendar, search, settings）
- [x] React 前端 UI（Leads 三欄面板、Dashboard、Pipeline、Search、EmailQueue）
- [x] AI Worker（task enqueue/claim/complete loop）
- [x] 郵件發送 + 回覆追蹤（SMTP + IMAP）
- [x] i18n 三語支援（EN / 繁中 / 简中）
- [x] 響應式 UI（mobile/tablet collapsible sections）
- [x] SSE 實時推送（pipeline progress、hermes log）
- [x] JWT 認證 + 角色權限

### 進行中 / 待做

- [ ] MongoDB 遷移至 Atlas（雲端）
- [ ] 表格 mobile responsive（卡片式 vs 橫向捲動待定）
- [ ] AI agent 更換 LLM provider 的抽象層
- [ ] 生產環境部署方案

---

## Git 資訊

- **Repo**: `https://github.com/Mad-Mad-Group/email-agent.git`
- **主分支**: `main`
- **團隊**: MAD MAD Group
