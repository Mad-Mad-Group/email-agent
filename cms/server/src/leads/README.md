# Leads Module（Person C）

外展對象（lead）嘅 CRUD + pipeline 狀態管理。係 Search / Scraper / AI / Email Draft / Hermes 全部會用到嘅資料核心。

> ✅ **已對齊公司內網 `lead_scraper.leads` collection 嘅真實格式**（snake_case），
> 同現有 Python pipeline 共用同一份數據。唔好擅自改欄位名／日期型別。

## 兩個 status 欄（好易撈亂）
| 欄 | 意思 | 值 |
|---|---|---|
| `status` | **外展 pipeline 狀態**（狀態機管呢個）| `null`(=NEW) / `pending` / `contacted` |
| `_status` | 資料核查狀態（另一回事）| `unverified` / … |

- `status: null` 一律當 `NEW`（見 `normalizeStatus()` / `toDbStatus()`）。
- 改外展狀態走 `PATCH /api/leads/:id/status`，service 查 `canTransition()`，非法即 400。
- 實測現有 20 筆：`null`(NEW) 15 筆、`contacted` 5 筆。

## 狀態機
```
NEW(null) ──→ pending ──→ contacted(終態)
   └────────────────────────┘ (可直接 NEW→contacted)
pending ──→ NEW (可退回)
```

## API
```
GET    /api/leads        列表(page,limit,status,verification,industry,source,search)
GET    /api/leads/:id
POST   /api/leads
PATCH  /api/leads/:id            改一般欄位(唔改 status)
PATCH  /api/leads/:id/status     改外展狀態(走狀態機)
POST   /api/leads/:id/mark-interested   → pending
DELETE /api/leads/:id            soft delete (set _deleted_at)
```

## 關鍵設計決定
- **`@Schema({ strict:false, versionKey:false })`** + 唔開 mongoose timestamps
  → 唔會 strip Python 寫嘅 `_`-meta 欄，唔會加 Python 唔識嘅 `__v` / `createdAt`。
- **日期全部 string**（DB 係 ISO 或 `"YYYY-MM-DD HH:MM:SS"`），唔轉 Date。
- **Soft delete = 新增 `_deleted_at` 字串欄**（additive，Python 忽略，安全）。
- `user_id` 係 **string**（如 `"U-cd410cc8"`），唔係 ObjectId。

## 仲未接（等隊友）
- **B**：交付 Guards 後解除 controller 註解 `@UseGuards(...)` + `@Permission('leads.*')`。
- **C 自己②**：SSE Module 好咗，`leads.module.ts` import `SseModule`，service 將 `NOOP_EMITTER` 換真 `SseService`。
- 同 B 登記權限字串：`leads.view / create / update / delete`。

## 相關 collection（你其他 module 會掂）
`analyses`(18) / `lead_analysis`(4) → AI Analysis ｜ `email_queue`(8) → Email Draft
`agent_registry`(8) / `playbooks` / `instructions` → Hermes ｜ `scheduled_tasks` → Jobs
