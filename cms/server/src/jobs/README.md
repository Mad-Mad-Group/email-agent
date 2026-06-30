# Jobs Module（Person C）— 排程

`@nestjs/schedule` 定時 job。每個 job log start/result/error，idempotent。

## Jobs
| Job | 頻率 | 做咩 |
|---|---|---|
| `reap-stalled-tasks` | 每 10 分鐘 | 卡喺 running > 15 分鐘嘅 task（agent 死咗）→ requeue 返 pending |
| `check-replies` | 每 30 分鐘 | 派一個 S4 `reply_check` task 俾 agent 查回覆 |

## 手動觸發（ops / 測試）
```
POST /api/jobs/reap-stalled-tasks/run
POST /api/jobs/check-replies/run
```

## 設計
- `ScheduleModule.forRoot()` 喺 app.module 開。
- `reap-stalled-tasks` 對 enqueue 模式好重要：Hermes agent 中途死，task 唔會永遠卡住。
- 全部 idempotent（重複 run 無副作用）；reap 用 updateMany（batch）。

## 已驗證（對真 DB）
造一個 20 分鐘前嘅 running task → reap → requeued=1 + status 返 pending ✓
check-replies → 派到 S4 task ✓（測完已清走，真 46 tasks 不變）

## 等 B
controller 加 `@UseGuards(...)` + `@Permission('jobs.run')`（限 super admin）。
