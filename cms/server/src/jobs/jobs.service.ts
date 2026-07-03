import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TasksService } from '../tasks/tasks.service';
import { SKILL } from '../tasks/dto/task-status.enum';
import { SseEvent, SseService } from '../sse/sse.service';

/** 卡喺 running 超過幾耐先 requeue（分鐘）*/
const STALLED_MINUTES = 15;
/** 卡喺 pending 超過幾耐先 reset _created_at（分鐘）。防 worker 死咗期間堆積 */
const STALE_PENDING_MINUTES = 30;

/**
 * 排程 jobs。每個 job：log start / result / error，idempotent。
 * 真正觸發係 @Cron；亦可經 JobsController 手動 run（ops / 測試）。
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly tasks: TasksService,
    private readonly sse: SseService,
  ) {}

  /** 每 10 分鐘：reap 卡死嘅 task */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async reapStalledTasks(): Promise<{ requeued: number }> {
    return this.runJob('reap-stalled-tasks', async () => {
      const n = await this.tasks.requeueStalled(STALLED_MINUTES);
      return { requeued: n };
    });
  }

  /** 每 10 分鐘：reset 卡咗太耐嘅 pending task。防 worker 死咗期間堆積 */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async requeueOldPending(): Promise<{ refreshed: number }> {
    return this.runJob('requeue-old-pending', async () => {
      const n = await this.tasks.requeueOldPending(STALE_PENDING_MINUTES);
      return { refreshed: n };
    });
  }

  /* ── Demo Mode：10s 自動 check replies ── */
  private _demoMode = false;
  private _demoTimer: ReturnType<typeof setInterval> | null = null;

  get demoMode() { return this._demoMode; }

  toggleDemoMode(): { demoMode: boolean } {
    this._demoMode = !this._demoMode;
    if (this._demoMode) {
      this.logger.log('[demo] 開啟 Demo 模式 — 每 10 秒 check replies');
      this._demoTimer = setInterval(() => {
        this.checkReplies().catch(() => {});
      }, 10_000);
    } else {
      this.logger.log('[demo] 關閉 Demo 模式 — 恢復 30 分鐘 cron');
      if (this._demoTimer) { clearInterval(this._demoTimer); this._demoTimer = null; }
    }
    return { demoMode: this._demoMode };
  }

  /** 每 30 分鐘：派一個 S4 reply-check task 俾 agent 查回覆 */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkReplies(): Promise<{ task_id: string }> {
    return this.runJob('check-replies', async () => {
      const task = await this.tasks.enqueue({
        skill_id: SKILL.EMAIL_SEND, // S4 發送+回覆+跟進
        title: '定時檢查回覆',
        params: { mode: 'reply_check' },
      });
      return { task_id: task.task_id };
    });
  }

  /** 每日一次：檢查超過 5 日冇回覆嘅 leads，派 followup task */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async checkFollowups(): Promise<{ task_id: string }> {
    return this.runJob('check-followups', async () => {
      const task = await this.tasks.enqueue({
        skill_id: SKILL.EMAIL_SEND,
        title: '定時檢查跟進',
        params: { mode: 'check_followups' },
      });
      return { task_id: task.task_id };
    });
  }

  /** 手動觸發（JobsController 用）*/
  async run(name: string) {
    switch (name) {
      case 'reap-stalled-tasks':
        return this.reapStalledTasks();
      case 'requeue-old-pending':
        return this.requeueOldPending();
      case 'check-replies':
        return this.checkReplies();
      case 'check-followups':
        return this.checkFollowups();
      default:
        throw new Error(`Unknown job: ${name}`);
    }
  }

  /** 包一層：統一 log start/result/error + SSE */
  private async runJob<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startedAt = Date.now();
    this.logger.log(`[job:${name}] start`);
    try {
      const result = await fn();
      const ms = Date.now() - startedAt;
      this.logger.log(`[job:${name}] done in ${ms}ms ${JSON.stringify(result)}`);
      this.sse.emit(SseEvent.HERMES_LOG, {
        runId: `job:${name}`,
        level: 'info',
        stage: 'job',
        message: `${name} 完成 ${JSON.stringify(result)}`,
      });
      return result;
    } catch (e: any) {
      this.logger.error(`[job:${name}] error: ${e?.message ?? e}`);
      this.sse.emit(SseEvent.HERMES_LOG, {
        runId: `job:${name}`,
        level: 'error',
        stage: 'job',
        message: `${name} 失敗：${e?.message ?? e}`,
      });
      throw e;
    }
  }
}
