# ClientRadar AI — 系統交接文件

> **專案名稱**：ClientRadar AI（CRM + AI 自動化外展系統）
> **團隊**：MAD MAD Group
> **倉庫**：`https://github.com/Mad-Mad-Group/email-agent.git`（branch: `dev`）
> **最後更新**：2026-07-22

---

## 目錄

1. [系統概覽](#1-系統概覽)
2. [目錄結構](#2-目錄結構)
3. [技術棧](#3-技術棧)
4. [後端架構](#4-後端架構)
5. [前端架構](#5-前端架構)
6. [AI Worker 架構](#6-ai-worker-架構)
7. [資料庫 Schema](#7-資料庫-schema)
8. [API 端點一覽](#8-api-端點一覽)
9. [即時通訊（SSE）](#9-即時通訊sse)
10. [國際化（i18n）](#10-國際化i18n)
11. [環境變數](#11-環境變數)
12. [部署與啟動](#12-部署與啟動)
13. [核心業務流程](#13-核心業務流程)
14. [已知限制與待辦](#14-已知限制與待辦)

---

## 1. 系統概覽

ClientRadar AI 是一套結合像素風遊戲 UI 的 CRM 系統，核心功能是**AI 驅動的客戶外展自動化**。系統可自動從 Google Maps、Google Search、LinkedIn 搜尋潛在客戶，抓取聯絡資料，用 LLM 撰寫個人化外展郵件，並管理整個發送 → 追蹤 → 跟進流程。

系統由三個獨立程序組成：

| 程序 | 技術 | 預設埠 | 功能 |
|------|------|--------|------|
| **前端** | React 19 + Vite | 5173 | 像素風 CRM 介面 |
| **後端 API** | NestJS 11 | 4000 | REST API + SSE 推送 |
| **AI Worker** | Node.js + Hermes CLI | — | 任務輪詢 + LLM + 爬蟲 |

---

## 2. 目錄結構

```
email_agent/
├── hermes-frontend/        # React 前端
│   ├── src/
│   │   ├── pages/          # 頁面組件（18 個）
│   │   ├── components/     # 共用組件
│   │   ├── api/            # Axios 封裝 + API 服務
│   │   ├── contexts/       # React Context (Auth, Theme, Badge)
│   │   ├── hooks/          # 自訂 hooks (SSE, Push)
│   │   ├── layouts/        # AppLayout
│   │   ├── styles/         # Theme, GlobalStyles, media
│   │   ├── i18n/           # 三語系翻譯檔
│   │   └── types/          # TypeScript 型別
│   └── .storybook/         # Storybook 設定
├── cms/
│   ├── server/             # NestJS 後端
│   │   ├── src/
│   │   │   ├── auth/       # JWT 認證
│   │   │   ├── leads/      # 線索 CRUD
│   │   │   ├── tasks/      # 任務佇列
│   │   │   ├── hermes/     # AI Pipeline 管理
│   │   │   ├── email-queue/ # 郵件佇列
│   │   │   ├── settings/   # 系統設定
│   │   │   ├── sse/        # Server-Sent Events
│   │   │   ├── calendar/   # 日曆事件
│   │   │   ├── notifications/ # 通知系統
│   │   │   ├── ai/         # AI 分析
│   │   │   ├── users/      # 使用者管理
│   │   │   ├── roles/      # 角色權限
│   │   │   ├── jobs/       # 排程工作
│   │   │   ├── verified-emails/ # 已驗證郵箱
│   │   │   ├── token-usage/ # Token 用量追蹤
│   │   │   ├── uploads/    # 檔案上傳
│   │   │   └── common/     # 共用工具
│   │   └── scripts/        # DB 維護腳本
│   ├── worker/             # AI Worker
│   │   ├── agent.ts        # 主要業務邏輯
│   │   ├── leader.ts       # 多 Worker 管理程序
│   │   ├── brand.ts        # 品牌常量
│   │   └── start-workers.sh
│   └── scripts/            # DB 重設腳本
├── setup.sh                # 一鍵安裝腳本
├── PROJECT.md              # 專案文檔
└── .env.example            # 環境變數範本
```

---

## 3. 技術棧

### 前端
- **React 19** + TypeScript 6 + Vite 8
- **styled-components 6** — CSS-in-JS
- **@tanstack/react-query 5** — 伺服器狀態管理
- **react-router-dom 7** — 路由
- **react-i18next** — 國際化（繁中/簡中/英文）
- **Storybook 8** — 組件文檔
- **xlsx** — Excel 匯出

### 後端
- **NestJS 11** + Express
- **Mongoose 8** + MongoDB
- **Passport + JWT** — 認證
- **Helmet** — 安全標頭
- **Swagger** — API 文檔（`/api/docs`）
- **Nodemailer** — SMTP 發信
- **class-validator** — DTO 驗證

### Worker
- **Node.js** — 獨立程序
- **mongodb 6** — 直連 MongoDB（無 Mongoose）
- **Hermes CLI** — LLM（MiniMax）+ 隱身瀏覽器
- **imapflow + mailparser** — IMAP 收件匣掃描
- **Nodemailer** — SMTP 發信

---

## 4. 後端架構

### 入口與中介層

`cms/server/src/main.ts` 啟動 NestJS 應用，套用以下全域配置：

- **Helmet** — 安全標頭（CSP 在開發時停用以支援 Swagger）
- **CORS** — 白名單機制，支援 `CORS_ORIGIN` 環境變數擴充，`__strict__` 模式停用子網萬用字元
- **全域路由前綴** — `/api`
- **ValidationPipe** — 白名單 + 轉換 + 禁止未知欄位
- **HttpExceptionFilter** — 統一錯誤格式 `{ status: 'error', message, code }`
- **ResponseInterceptor** — 統一回應格式 `{ status: 'success', data }` ，分頁回應額外包含 `total, page, limit`

### 模組列表（20 個）

| 模組 | 功能 |
|------|------|
| `auth` | JWT 登入/註冊/改密碼/忘記密碼/個人資料 |
| `leads` | 線索 CRUD、狀態管理、重新處理 |
| `tasks` | 任務佇列（enqueue/claim/complete 模式） |
| `hermes` | AI Pipeline / Campaign 管理 |
| `email-queue` | 郵件佇列（pending → approved → sent） |
| `search` | 搜尋觸發 |
| `settings` | 系統設定（key-value 存儲，upsert 模式） |
| `sse` | Server-Sent Events 即時推送 |
| `calendar` | 日曆事件 CRUD |
| `notifications` | 應用內通知（支援 i18n key） |
| `ai` | AI 網站分析 + 合作建議 |
| `users` | 使用者管理 + 通知偏好 |
| `roles` | 角色權限定義 |
| `jobs` | 排程工作（@nestjs/schedule） |
| `email` | Email 發送服務（Nodemailer） |
| `scraper` | 網頁抓取觸發 |
| `verified-emails` | 已驗證郵箱池 |
| `token-usage` | LLM Token 用量追蹤 |
| `uploads` | 檔案上傳 |
| `common` | 共用 Guards / Decorators / Filters / Interceptors |

### 共用工具（`common/`）

- `JwtAuthGuard` — Passport JWT 守衛
- `RolesGuard` — 角色守衛（搭配 `@Roles()` 裝飾器）
- `PermissionsGuard` — 權限守衛（目前回傳 `true`，預留啟用）
- `@CurrentUser()` — 參數裝飾器，取得當前登入使用者
- `normalize-company.ts` — 公司名稱正規化

---

## 5. 前端架構

### 頁面一覽

| 頁面 | 路由 | 說明 |
|------|------|------|
| AgentPanel | `/cms-agents` | 像素風 AI 代理儀表板（主頁） |
| Search | `/cms-search` | 搜尋頁面（多來源 + SSE Pipeline） |
| Leads | `/cms-leads` | 三欄式線索管理（Agile CRM） |
| EmailQueue | `/cms-email-queue` | 郵件佇列 + 模板編輯器 |
| Dashboard | `/dashboard` | 數據儀表板 |
| Calendar | `/app-calendar` | 日曆 |
| Tasks | `/cms-tasks` | 任務管理 |
| Settings | `/cms-settings` | 系統設定（5 個 Tab） |
| Users | `/cms-users` | 使用者管理（Admin） |
| VerifiedEmails | `/cms-verified-emails` | 已驗證郵箱管理 |
| UserInfo | `/cms-user-info` | 個人資料 |
| Login / Register | `/login`, `/register` | 登入/註冊 |

### 路由保護

- `ProtectedRoute` — 檢查 JWT token，無 token 導向 `/login`
- `AdminRoute` — 檢查角色為 `admin` 或 `super_admin`
- 預設 fallback（`*`）導向 `/cms-agents`

### 重要組件

- `Sidebar` — 左側導航欄
- `Topbar` — 頂部導航列
- `OnboardingTour` — Mask 式新手教學（spotlight + tooltip）
- `LeadDetailPanel` — 三欄線索詳情
- `LiveFeed` — 即時活動動態
- `SpriteAvatar` — 像素風頭像

### 狀態管理

- **React Query** — 伺服器狀態（API 資料快取與同步）
- **AuthContext** — Token + 使用者資訊
- **ThemeModeContext** — 深色/淺色主題切換
- **BadgeContext** — 未讀通知計數
- **localStorage** — 認證 Token（`hermes_token`）、語言偏好、新手教學狀態

### API 封裝（`api/`）

前端 Axios interceptor 自動拆解後端的信封格式：分頁回應變為 `{ data, total, page, limit }`，一般回應直接回傳 `data`。401 自動導向登入頁。

---

## 6. AI Worker 架構

### 架構概覽

Worker 是獨立的 Node.js 程序，透過輪詢 API 取得任務、執行後回報結果。支援兩種啟動模式：

1. **Leader 模式**（`leader.ts`）— 主程序 fork 4 個子 Worker，各負責不同技能：
   ```
   Leader
   ├── S1 Worker（搜尋）       concurrency=3
   ├── S2 Worker（充實+分析）  concurrency=3
   ├── S3 Worker（撰寫郵件）   concurrency=3
   └── S4 Worker（發送+回覆）  concurrency=2
   ```
   子 Worker 崩潰時自動重啟（可配置延遲）。

2. **單一 Worker 模式** — 直接執行 `agent.ts`，可用 `AGENT_SKILL` 限制技能。

### 任務處理函式

| 函式 | 技能 | 功能 |
|------|------|------|
| `doSearch` | S1 | 用 Hermes 隱身瀏覽器搜尋線索（Google Maps / Google Search / LinkedIn），去重後寫入 DB |
| `doEnrich` | S2 | 三層郵箱充實：(1) Node fetch 爬蟲 (2) Hermes 隱身瀏覽器 (3) 域名猜測。同時抓取公司描述 |
| `doAnalyze` | S2 | AI 分析：生成合作角度、推薦方案、服務匹配 |
| `doDraft` | S3 | LLM 撰寫外展郵件，自評信心分數 0-100，使用可配置的評分規則 |
| `doFollowupDraft` | S3 | 對無回覆線索生成跟進郵件 |
| `doReoutreachDraft` | S3 | 對重試線索生成重新外展郵件 |
| `doSend` | S4 | SMTP 發信（需 `ENABLE_REAL_SEND=true`，否則模擬發送） |
| `doReplyCheck` | S4 | IMAP 掃描收件匣，AI 分類回覆（有興趣/無興趣/會議/自動回覆/提問） |
| `doCheckFollowups` | S4 | 掃描 5 天以上無回覆線索，自動排入跟進任務 |

### 關鍵工具函式

- `callHermes()` — 執行 `hermes -z <prompt> --yolo --ignore-rules`，超時預設 300 秒
- `hermesJson()` — 呼叫 Hermes 並解析 JSON，解析失敗會重試
- `sanitizeLlmJson()` — 修正常見 LLM JSON 錯誤（智慧引號、未跳脫換行、尾逗號）
- `buildLeadContext()` — 組合線索公司資料為 LLM 上下文
- `buildUserCompanyContext()` — 按使用者取得公司資訊（防止跨使用者汙染）
- `getScoringRules()` — 從 DB 讀取郵件評分規則，有預設 fallback
- `sseNotify()` — 透過 SSE 推送即時更新到前端
- `notify()` — 寫入 i18n 通知記錄到 MongoDB

---

## 7. 資料庫 Schema

**資料庫名稱**：`lead_scraper`（MongoDB）

### Collections

| Collection | Schema 檔案 | 主要欄位 |
|------------|-------------|----------|
| `leads` | `leads/schemas/lead.schema.ts` | `lead_id`, `user_id`, `company_name`, `email`, `phone`, `website`, `industry_tags`, `status`(null/contacted), `_status`(unverified/...), `email_draft`, `_email_draft_score`, `_collab_*` 系列, `_deleted_at`(軟刪除) |
| `tasks` | `tasks/schemas/task.schema.ts` | `task_id`(TASK-xxxx), `skill_id`(S1-S4), `status`(pending/running/completed/failed), `params`, `assigned_agent_id`, `result`, `error` |
| `email_queue` | `email-queue/schemas/email-queue.schema.ts` | `email_id`, `lead_id`, `user_id`, `to_email`, `subject`, `body`, `status`(pending/approved/sent/failed/rejected) |
| `users` | `users/schemas/user.schema.ts` | `email`(unique), `password`(bcrypt), `name`, `role`(admin/super_admin/staff), `permissions[]`, `notification_prefs`, `companyName`, `companyDescription`, `companyWebsite` |
| `campaigns` | `hermes/schemas/campaign.schema.ts` | `campaign_id`, `keyword`, `location`, `target_count`, `user_id`, `status`(running/completed/failed), `pipeline_stage`, `lead_ids[]`, `done_count` |
| `calendar_events` | `calendar/schemas/calendar-event.schema.ts` | `userId`, `event_id`, `title`, `start`, `end`, `all_day`, `type`(meeting/follow_up/deadline/other), `lead_id` |
| `notifications` | `notifications/schemas/notification.schema.ts` | `title`, `message`, `user_id`, `type`(lead/email/campaign/task/system), `title_key`/`title_params`(i18n), `read`, `hidden` |
| `roles` | `roles/schemas/role.schema.ts` | `name`(unique), `permissions[]` |
| `settings` | `settings/schemas/setting.schema.ts` | `key`(unique), `value`(Mixed), `updated_by` |
| `analyses` | `ai/schemas/analysis.schema.ts` | `lead_id`, `analysis_type`, `ai_summary`, `emails_found[]`, `phones_found[]` |
| `verified_emails` | `verified-emails/schemas/verified-email.schema.ts` | `email`, `company_name`(聯合唯一), `domain`, `verification_method`(auto_reply_count/ai_check/manual), `reply_count`, `status`(active/revoked) |
| `token_usages` | `token-usage/schemas/token-usage.schema.ts` | `user_id`, `task_id`, `skill_id`, `model`(MiniMax-M3), `prompt_tokens`, `completion_tokens`, `total_tokens` |

### Schema 設計注意事項

- 大部分日期欄位存為 **string** 而非 Date 物件（相容 Python Pipeline 遺留資料）
- `leads`, `tasks`, `email_queue`, `campaigns`, `analyses` 使用 `strict: false`（容納 Python Pipeline 額外欄位）
- 所有 Schema 設定 `versionKey: false`（無 `__v` 欄位）
- Leads 使用 `_deleted_at` 軟刪除

---

## 8. API 端點一覽

全域前綴：`/api`

### 認證

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/auth/login` | 登入 |
| POST | `/api/auth/register` | 註冊 |
| GET | `/api/auth/me` | 取得當前使用者 |
| POST | `/api/auth/change-password` | 改密碼 |
| POST | `/api/auth/forgot-password` | 忘記密碼 |
| POST | `/api/auth/reset-password` | 重設密碼 |
| PATCH | `/api/auth/profile` | 更新個人資料 |

### 線索

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/leads` | 列表（分頁） |
| GET | `/api/leads/:id` | 詳情 |
| POST | `/api/leads` | 新增 |
| PATCH | `/api/leads/:id` | 更新 |
| PATCH | `/api/leads/:id/status` | 更新狀態 |
| POST | `/api/leads/:id/mark-interested` | 標記有興趣 |
| POST | `/api/leads/:id/reprocess` | 重新處理 |
| DELETE | `/api/leads/:id` | 刪除（單筆） |
| DELETE | `/api/leads` | 批量刪除 |

### 郵件佇列

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/email-queue` | 列表 |
| GET | `/api/email-queue/:id` | 詳情 |
| PATCH | `/api/email-queue/:id` | 更新 |
| POST | `/api/email-queue/:id/approve` | 審核通過 |
| POST | `/api/email-queue/:id/reject` | 拒絕 |
| POST | `/api/email-queue/:id/send` | 發送 |

### 任務

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/tasks` | 列表 |
| GET | `/api/tasks/stats` | 統計 |
| GET | `/api/tasks/:taskId` | 詳情 |
| POST | `/api/tasks` | 新增任務 |
| POST | `/api/tasks/claim` | Worker 認領 |
| POST | `/api/tasks/:taskId/complete` | 完成回報 |
| POST | `/api/tasks/:taskId/fail` | 失敗回報 |

### AI Pipeline

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/hermes/run` | 啟動 Pipeline |
| GET | `/api/hermes/campaigns/:id` | 取得 Campaign 狀態 |
| POST | `/api/search` | 搜尋觸發 |

### 其他

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/health` | 健康檢查 |
| GET/POST/PATCH/DELETE | `/api/calendar/*` | 日曆事件 CRUD |
| GET/PATCH | `/api/settings` | 系統設定 |
| GET/POST/PATCH/DELETE | `/api/users/*` | 使用者管理 |
| GET/POST/PATCH/DELETE | `/api/roles/*` | 角色管理 |
| GET/PATCH/POST/DELETE | `/api/notifications/*` | 通知管理 |
| GET/POST/DELETE | `/api/verified-emails/*` | 已驗證郵箱 |
| GET | `/api/token-usage` | Token 用量 |
| POST | `/api/leads/:id/scrape` | 網頁抓取 |
| POST | `/api/ai/leads/:id/analyze` | AI 分析 |
| POST/GET | `/api/jobs/*` | 排程工作管理 |

---

## 9. 即時通訊（SSE）

系統使用 Server-Sent Events 實現即時推送：

- **推送端點**：`POST /api/sse/notify`（Worker/後端呼叫）
- **監聽端點**：`GET /api/events`（前端 EventSource 連接）
- **心跳**：每 15 秒推送 `ping` 事件

### 事件類型

| 事件 | 說明 |
|------|------|
| `lead_update` | 線索狀態變更 |
| `email_update` | 郵件佇列狀態變更 |
| `hermes_log` | AI Agent 日誌 |
| `pipeline_progress` | Pipeline 階段更新 |
| `notification` | 新通知 |
| `ping` | 心跳 |

前端使用 `useSseListener` hook 訂閱事件。

---

## 10. 國際化（i18n）

### 設定

- 框架：`react-i18next` + `i18next-browser-languagedetector`
- 預設語言：`zh-TW`（繁體中文）
- 偵測順序：`localStorage`（key: `i18nextLng`）→ `navigator`

### 支援語言

| 代碼 | 語言 | 檔案 |
|------|------|------|
| `en` | English | `src/i18n/locales/en.ts` |
| `zh-TW` | 繁體中文 | `src/i18n/locales/zhTW.ts` |
| `zh-CN` | 簡體中文 | `src/i18n/locales/zhCN.ts` |

每個語系檔約 1,360 行，涵蓋所有頁面文字。

### 後端 i18n 策略

Worker 將 i18n key（`title_key`, `title_params`）寫入通知記錄，前端在渲染時翻譯。避免在後端硬編碼語言。

---

## 11. 環境變數

### 後端（`cms/server/.env`）

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `MONGODB_URI` | `mongodb://localhost:27017/lead_scraper` | MongoDB 連接字串 |
| `JWT_SECRET` | — | JWT 簽名密鑰 |
| `JWT_EXPIRES_IN` | `7d` | Token 有效期 |
| `SMTP_HOST` | — | SMTP 伺服器 |
| `SMTP_PORT` | — | SMTP 埠 |
| `SMTP_USER` | — | SMTP 帳號 |
| `SMTP_PASS` | — | SMTP 密碼 |
| `SMTP_FROM` | — | 寄件人地址 |
| `PORT` | `4000` | API 監聽埠 |
| `CORS_ORIGIN` | — | 額外 CORS 來源（逗號分隔），`__strict__` 為嚴格模式 |

### Worker（`cms/worker/.env`）

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `MONGODB_URI` | — | MongoDB 連接字串 |
| `API_URL` | `http://localhost:4000/api` | 後端 API 位址 |
| `AGENT_EMAIL` | — | Worker 登入帳號 |
| `AGENT_PASS` | — | Worker 登入密碼 |
| `AGENT_ID` | `WORKER-1` | Worker 識別碼 |
| `AGENT_SKILL` | — | 限制處理特定技能（S1/S2/S3/S4） |
| `AGENT_SKILL_EXCLUDE` | — | 排除技能（逗號分隔） |
| `POLL_MS` | `2000` | 輪詢間隔（毫秒） |
| `CONCURRENCY` | `1` | 同時處理任務數 |
| `ENABLE_REAL_SEND` | `false` | 設為 `true` 才會真正發信 |
| `TEST_RECIPIENT_EMAIL` | — | 測試模式所有郵件導向此地址 |
| `SEND_OVERRIDE` | — | 強制所有郵件發到此地址 |
| `WORKER_MAX_IDLE` | `0` | 閒置 N 輪後停止（0=永不停止） |
| `S1_CONCURRENCY` ~ `S4_CONCURRENCY` | — | Leader 模式下各技能並行數 |
| `RESTART_DELAY` | `3000` | 子 Worker 崩潰後重啟延遲（毫秒） |

### 前端（`hermes-frontend/.env`）

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `VITE_API_URL` | `http://localhost:4000/api` | 後端 API 位址 |

### 根目錄（`.env`）

| 變數 | 說明 |
|------|------|
| `MINIMAX_API_KEY` | MiniMax LLM API 金鑰 |
| `SMTP_EMAIL` | 遺留腳本用 SMTP 帳號 |
| `SMTP_PASSWORD` | 遺留腳本用 SMTP 密碼 |

---

## 12. 部署與啟動

### 前置需求

- Node.js ≥ 18
- MongoDB（本機或 Atlas）
- Hermes CLI（`hermes` 命令需在 PATH 中）

### 一鍵安裝

```bash
chmod +x setup.sh && ./setup.sh
```

此腳本會：檢查環境 → 安裝所有依賴 → 複製 `.env.example` 為 `.env` → TypeScript 型別檢查

### 手動啟動

```bash
# 1. 後端 API
cd cms/server
npm run start:dev          # 開發模式（watch）
# 或 npm run build && npm run start:prod  # 正式

# 2. 前端
cd hermes-frontend
npm run dev                # 開發模式 (port 5173)
# 或 npm run build && npm run preview     # 正式

# 3. Worker（二選一）
cd cms/worker
npm run start              # Leader 模式（4 子 Worker）
# 或 npm run start:single  # 單一 Worker
# 或 ./start-workers.sh    # Shell 腳本啟動多 Worker
```

### 正式環境建議

- 目前倉庫**沒有** Dockerfile / docker-compose / PM2 設定檔
- `agent.ts` 中有 `process.exit(1)` 的註解提及 PM2，建議正式環境使用 PM2 管理 Worker
- 正式環境務必設定 `CORS_ORIGIN=__strict__` 或明確域名
- 設定 `ENABLE_REAL_SEND=true` 才會真正發送郵件

### 資料庫維護腳本

| 腳本 | 位置 | 功能 |
|------|------|------|
| `reset-db.ts` | `cms/scripts/` | 完全重設資料庫 |
| `seed-data.js` | `cms/server/scripts/` | 初始資料種子 |
| `seed-email-queue.ts` | `cms/server/scripts/` | 郵件佇列測試資料 |
| `cleanup-pending-search-tasks.ts` | `cms/server/scripts/` | 清理卡住的搜尋任務 |
| `recover-missing-leads.ts` | `cms/server/scripts/` | 恢復遺失的線索 |
| `migrate-calendar-userid.ts` | `cms/server/scripts/` | 遷移日曆 userId 格式 |

---

## 13. 核心業務流程

### 搜尋 → 郵件發送 Pipeline

```
使用者在 Search 頁面輸入關鍵字 + 地區 + 來源
    │
    ▼
POST /api/hermes/run → 建立 Campaign + S1 搜尋任務
    │
    ▼
Worker(S1) doSearch() → Hermes 隱身瀏覽器搜尋 → 線索去重 → 寫入 DB
    │
    ▼
自動建立 S2 enrich 任務
    │
    ▼
Worker(S2) doEnrich() → 三層郵箱抓取 + 公司描述
    │
    ▼
自動建立 S2 analyze 任務
    │
    ▼
Worker(S2) doAnalyze() → AI 分析合作角度
    │
    ▼
自動建立 S3 draft 任務
    │
    ▼
Worker(S3) doDraft() → LLM 撰寫郵件 + 自評分數 → 寫入 email_queue
    │
    ▼
使用者在 Email Queue 審核（approve/reject/edit）
    │
    ▼
Worker(S4) doSend() → SMTP 發信
    │
    ▼
Worker(S4) doReplyCheck() → IMAP 掃描回覆 → AI 分類
    │
    ▼
Worker(S4) doCheckFollowups() → 5 天無回覆 → 自動排入跟進
```

### 郵件評分規則

Settings 頁面可配置評分規則（語氣、長度、必含要點、自訂指示），存入 `settings` collection（key: `email_scoring_rules`）。Worker 讀取並注入 LLM prompt，有硬編碼預設值作為 fallback。

### 任務佇列模式

1. 後端建立任務（`status=pending`）
2. Worker 輪詢 `POST /api/tasks/claim`（可按 `skill_id` 過濾）
3. Worker 處理完成後呼叫 `POST /api/tasks/:id/complete` 或 `/fail`
4. 全程透過 SSE 推送進度到前端

---

## 14. 已知限制與待辦

### 已知限制

- 無 Dockerfile / docker-compose，部署需手動
- `PermissionsGuard` 目前永遠回傳 `true`，角色權限細粒度控制未啟用
- 日期欄位存為 string 而非 Date（歷史相容）
- Schema 大量使用 `strict: false`，DB 中可能存在未預期的欄位
- Worker 直連 MongoDB（繞過 API），維護時需注意兩邊一致性

### 品牌資訊

Worker 中的 `brand.ts` 包含 MAD MAD Group 的品牌常量（公司名、標語、解決方案、作品集、聯絡方式、語氣指南），LLM 撰寫郵件時會引用。更換客戶時需修改此檔案。

---

*此文件由 ClientRadar AI 開發團隊生成，供系統交接使用。*
