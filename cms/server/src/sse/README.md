# SSE Module（Person C）

全 app 共用嘅即時事件 bus。任何 module inject `SseService` 就可以 `emit()`，所有連住 `/api/events` 嘅前端即時收到。

## 端點
```
GET /api/events    （text/event-stream，長連線）
```

## 前端用法（俾 A）
```ts
const es = new EventSource(`${API_BASE}/api/events`);
es.addEventListener('lead_update',       e => handle(JSON.parse(e.data)));
es.addEventListener('hermes_log',        e => handle(JSON.parse(e.data)));
es.addEventListener('pipeline_progress', e => handle(JSON.parse(e.data)));
// 'ping' = 每 30s heartbeat，可忽略
```

## 事件合約（payload）
| event | payload |
|---|---|
| `lead_update` | `{ id, action: 'created'\|'updated'\|'status_changed'\|'deleted', status? }` |
| `hermes_log` | `{ runId, level: 'info'\|'warn'\|'error', stage, message }` |
| `pipeline_progress` | `{ runId, stage, current, total, percent }` |

> 型別定義喺 `sse.service.ts` 的 `SsePayloads`。改合約要即刻通知 A。

## 後端用法（你其他 module）
```ts
constructor(private readonly sse: SseService) {}
this.sse.emit(SseEvent.HERMES_LOG, { runId, level:'info', stage:'search', message:'…' });
```

## 已驗證
- Leads 改狀態 → 前端即時收到 `lead_update`（end-to-end 測試通過）。
- 已接入 Leads（取代原 NOOP_EMITTER）。
