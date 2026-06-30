# Search Module（Person C）— enqueue 模式

`POST /api/search` **唔自己搜尋**，而係 enqueue 一個 **S1 task** 俾 Hermes agent
（佢有 browser + CUA）。agent 做完寫入 leads + 回報 task。

## API
```
POST /api/search   body: { keyword, location, targetCount? (1-20, default 5) }
回:  { status:'success', data:{ task_id, status:'pending' } }
```

## 流程
```
POST /api/search → TasksService.enqueue(skill_id=S1, params={keyword,location,target_count})
   → Hermes agent claim S1 task → 用 browser+CUA 搵 → 寫入 leads → complete task
   → SSE hermes_log 全程廣播
```

> 進度同結果睇 `tasks` collection（`GET /api/tasks/:taskId`）+ SSE `/api/events`。
> 詳見 `src/tasks/README.md`。

## 等 B
controller 加 `@UseGuards(...)` + `@Permission('search.run')`。
