# Email Queue Module（Person C）

Email 草稿審批佇列：list / 編輯 / approve / reject / send。
對齊內網 `lead_scraper.email_queue`（真實格式，8 筆數據），同 Python pipeline 共用。

## 狀態機（`email_queue.status`）
```
pending ──approve──→ approved ──send──→ sent(終態)
   │                    │
   └──reject──→ rejected └──reject──→ rejected
rejected ──→ pending        failed ──→ approved/pending
```
> DB 現有值：`pending` / `sent`。`approved`/`rejected`/`failed` 係本 module 新增審批狀態。

## API
```
GET   /api/email-queue              列表(page,limit,status,search)
GET   /api/email-queue/:id
PATCH /api/email-queue/:id          編輯 subject/body（只限 pending/approved）
POST  /api/email-queue/:id/approve  pending→approved
POST  /api/email-queue/:id/reject   →rejected（可帶 reason）
POST  /api/email-queue/:id/send     approved→sent（經 EmailSender）
```

## 關鍵連動
- **發送成功** → 經 `LeadsService.markContactedByLeadId(lead_id)` 把對應 lead 標 `contacted`
  （`email_queue.lead_id` 連 `leads.lead_id` 字串欄，非 _id），並發 SSE `lead_update`。

## 等 B（一行換走）
- **EmailSender**：而家用 `FakeEmailSender`（只 log，唔真發）。B 交付 `EmailService` 後，
  喺 `email-queue.module.ts` 改：
  ```ts
  { provide: EMAIL_SENDER, useExisting: EmailService }
  ```
- **Guards**：controller 加 `@UseGuards(...)` + `@Permission('emails.view'|'emails.send'…)`。

## 已驗證（對真數據）
list pending=5 ✓ ｜ approve→send→sent ✓ ｜ 連動 lead→contacted ✓（測完已還原）
