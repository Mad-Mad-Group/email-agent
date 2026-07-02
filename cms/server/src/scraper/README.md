# Scraper Module（Person C）— enqueue 模式

`POST /api/leads/:id/scrape` 派一個 **S2 task（mode=enrich）** 俾 Hermes agent，
browse 官網補返 email / phone / address 等缺漏，寫返 lead。

## API
```
POST /api/leads/:id/scrape   → { task_id, status, lead_id }   (:id = lead _id)
```

## params（俾 Hermes agent）
```jsonc
{ "mode":"enrich", "lead_id":"…", "lead_object_id":"…", "website":"…" }
```
用 `mode` 同 ⑤ AI Analysis（同樣 S2）區分：`enrich` = 補資料，無 mode/`analyze` = 出合作建議。

## 等 B
controller 加 `@UseGuards(...)` + `@Permission('scraper.run')`。
