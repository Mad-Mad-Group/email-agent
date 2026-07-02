# AI Agent Worker（Person C — 執行側）

獨立 process，enqueue 模式嘅「工人」。loop：登入 B API → `POST /tasks/claim`
→ 按 skill 做 → 寫返 Mongo → `POST /tasks/:id/complete`。同 NestJS API 分開行。

## 跑
```bash
npm run worker                          # 一直行
POLL_MS=500 WORKER_MAX_IDLE=8 npm run worker   # 測試：閒置 8 次自動停
AGENT_SKILL=S2 npm run worker           # 只做某 skill（可開多個 worker 分工）
```
env：`API_URL` / `MONGODB_URI`（讀 .env）、`AGENT_ID` / `AGENT_EMAIL` / `AGENT_PASS`。

## 真引擎 = 叫 Hermes agent（唔自己 call MiniMax）
worker 唔重新發明 AI/爬蟲 —— 叫 `hermes -z "<prompt>" --yolo`，Hermes 用佢嘅
**MiniMax + stealth browser（Browserbase/Camofox 自動反偵測）+ skills** 做，回 JSON。
見 `callHermes()` / `extractJson()`。

| skill | 做咩 | 引擎 |
|---|---|---|
| S1 search | Hermes 開 browser 爬 Google Maps → 造真 lead | ✅ 已接 Hermes |
| S2 enrich | Hermes 爬官網 → 抽 email/phone/address 回寫 | ✅ 已接 Hermes |
| S2 analyze | Hermes 爬官網 → 回寫 `_collab_*` + analyses | ✅ 已接 Hermes |
| S3 draft | Hermes(LLM) 寫 outreach email → email_queue | ✅ 已接 Hermes |
| S4 send | ⚠️ **預設唔真發**（標 approved）。`ENABLE_REAL_SEND=true` 先叫 Hermes 真發 | ✅ 已接（gated）|
| reply_check | cron 派，查回覆 | ⬜ stub（待接 Hermes 查 Gmail）|

## ⚠️ S4 send 安全閥
發冷 email 俾真公司係不可逆 → 預設 `doSend` **唔真發**，只標 `email_queue=approved`。
要真發：`ENABLE_REAL_SEND=true npm run worker`（會叫 Hermes 用佢 email 工具發）。

## 已驗證（真，對 B live :4000）
- analyze：Hermes 開 stealth browser 爬 tanghin.edu.hk → 真 site-specific 合作建議 ✓
- enrich：爬官網抽到真 `school@tanghin.edu.hk` + `2672 6820` ✓
- draft：Hermes 寫到引用真校情（ECA/Project Soothe/DSE）嘅專業繁中 email ✓
- send：安全跳過（real send disabled）✓

## 已驗證（對 B 個 live :4000）
hermes/run → worker 自動 drain 成條 pipeline（search→enrich→analyze→draft→send）
→ campaign completed 2/2 ✓（測完已清走）

## 之後
- 逐個 handler 接真引擎（先 S2 analyze 接 MiniMax，最易、最直接）
- 多開幾個 worker（`AGENT_SKILL` 分工，對應 agent_registry 啲 agent）
- 失敗 → 已會 call `/tasks/:id/fail`（Jobs 個 reaper 會 requeue）
