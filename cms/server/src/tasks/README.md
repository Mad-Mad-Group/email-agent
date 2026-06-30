# Tasks Module（Person C）— NestJS ↔ Hermes agent 派工契約

對齊內網 `lead_scraper.tasks` collection（46 筆真數據）。
**架構決定：enqueue 模式** —— NestJS 唔自己做 search/scrape/analyze（嗰啲要 browser+CUA+MiniMax），
而係 enqueue 一個 task，由外部 **Hermes agent**（~/.hermes，有 browser+CUA+MiniMax）claim 去做，
做完寫返 Mongo（leads/analyses…）+ 回報 task。

## Skill 對應（agent_registry 真實資料）
| skill_id | 技能 | 對應 module |
|---|---|---|
| S1 | 搵客源(情報收集) | ③ Search |
| S2 | 深度分析客戶 | ④ Scraper / ⑤ AI Analysis |
| S3 | 生成 Outreach Email | ⑥ Email draft |
| S4 | 發送+回覆+跟進 | ⑥ Email send / reply |

## 狀態機
```
pending ──claim(agent)──→ running ──complete──→ completed
                              └────── fail ─────→ failed
```

## API
```
# Admin
GET  /api/tasks                列表(status,skill_id,page,limit)
GET  /api/tasks/:taskId
POST /api/tasks                enqueue { skill_id, title?, params?, priority? }
# 俾 Hermes agent
POST /api/tasks/claim          { agent_id, skill_id? } → claim 下一個 pending（原子）
POST /api/tasks/:taskId/complete { result? }
POST /api/tasks/:taskId/fail     { error? }
```
每步都 emit SSE `hermes_log`（queue / claim / done / failed）。

## ⚠️ 跨團隊 coordination（重要）
現有 Hermes agent 係 poll `~/.hermes/inbox/*.json` + 舊 SQLite，**唔係 poll 呢個 Mongo `tasks`**。
要 work，維護 Hermes 嗰邊嘅人要改成：
- 定期 `POST /api/tasks/claim`（或直接 query Mongo `tasks` collection）攞 pending task；
- 做完 `POST /api/tasks/:id/complete` 回報。
（呢個係 Hermes 側嘅改動，唔屬於 NestJS。先同負責 Hermes 嘅人對齊。）

## 已驗證
enqueue → claim → complete 全程通 + SSE 廣播 ✓（測完已清走測試 task，真 46 筆不變）
