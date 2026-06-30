# AI Analysis Module（Person C）— enqueue 模式

`POST /api/ai/leads/:id/analyze` **唔自己 call MiniMax**，而係 enqueue 一個 **S2 task**
俾 Hermes agent（佢有 MiniMax + browser）。agent 做完回寫 lead `_collab_*` + `analyses`，再回報 task。

## API（:id = lead Mongo _id）
```
POST /api/ai/leads/:id/analyze    → 派 S2 task，回 { task_id, status, lead_id }
GET  /api/ai/leads/:id/analyses   → 攞該 lead 歷史分析（Hermes 寫入嘅結果）
```

## 點解唔直接 call MiniMax
團隊決定行 enqueue 模式：重 AI 工作交俾現有 Hermes agent（佢已配置 MiniMax creds + browser），
NestJS 只派工 + serve 數據。詳見 `src/tasks/README.md`。

> MiniMax 係 Anthropic-compatible（`https://api.minimax.io/anthropic/v1/messages`, model MiniMax-M3）。
> 真正 call 喺 Hermes agent 嗰邊，NestJS 唔掂。

## 等 B
controller 加 `@UseGuards(...)` + `@Permission('ai.analyze'|'ai.view')`。
