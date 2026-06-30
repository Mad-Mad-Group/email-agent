# Hermes Pipeline Module（Person C）— 指揮（orchestrator）

`POST /api/hermes/run` 啟動一條 outreach pipeline。NestJS 做**指揮**，唔做實際工作：
派第一個 search task → 監聽 task 完成事件 → 自動派下一 stage，串成一條龍。
每 stage 嘅真正工作由 Hermes agent claim 去做（enqueue 模式）。

## 流程
```
run → search(S1)
         └─完成→ fan-out：每個新 lead 開一條鏈
                 enrich(S2) → analyze(S2) → draft(S3) → send(S4) → 該 lead 完
   全部 lead send 完 → campaign = completed
```

## 點樣 react（唔使 poll）
`TasksService.complete()` → publish `TaskEvents.completed$` → `HermesService` subscribe
→ 睇 task.params 嘅 `campaign_id` + `pipeline_stage` → 派下一 stage。
Tasks module 完全唔知 Hermes 存在（解耦）。

## API
```
POST /api/hermes/run            { keyword, location, targetCount? }
                                → { campaign_id, first_task }
GET  /api/hermes/campaigns/:id  睇 campaign 狀態 / done_count / lead_ids
```
全程 emit SSE `hermes_log` + `pipeline_progress`（runId = campaign_id）。

## 契約：每個 pipeline task 嘅 params
```jsonc
{ "campaign_id":"CAMP-…", "pipeline_stage":"enrich|analyze|draft|send",
  "lead_object_id":"…" }   // search stage 則帶 keyword/location/target_count
```
Hermes agent 做完 `POST /api/tasks/:id/complete`，**search task 嘅 result 要帶 `lead_object_ids:[…]`**
（新搜到嘅 lead _id），orchestrator 先 fan-out 得到。

## 已驗證（對真 DB）
run target=2 → search fan-out 2 → 共 8 個後續 task（2×4 stage）→ campaign completed (2/2) ✓
SSE 全程進度廣播 ✓（測完清走 9 tasks + campaign，真 46 tasks 不變）
