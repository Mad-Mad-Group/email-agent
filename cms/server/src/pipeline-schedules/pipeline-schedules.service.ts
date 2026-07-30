import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { PipelineSchedule, PipelineScheduleDocument } from './schemas/pipeline-schedule.schema';
import { CreatePipelineScheduleDto } from './dto/create-pipeline-schedule.dto';
import { UpdatePipelineScheduleDto } from './dto/update-pipeline-schedule.dto';
import { TasksService } from '../tasks/tasks.service';
import { HermesService } from '../hermes/hermes.service';
import { SKILL } from '../tasks/dto/task-status.enum';
import { SseEvent, SseService } from '../sse/sse.service';

@Injectable()
export class PipelineSchedulesService {
  private readonly logger = new Logger(PipelineSchedulesService.name);

  constructor(
    @InjectModel(PipelineSchedule.name)
    private readonly model: Model<PipelineScheduleDocument>,
    private readonly tasks: TasksService,
    private readonly hermes: HermesService,
    private readonly sse: SseService,
  ) {}

  // ── CRUD ────────────────────────────────────────

  async findAll(userId?: string) {
    const filter = userId ? { user_id: userId } : {};
    return this.model.find(filter).sort({ created_at: -1 }).lean().exec();
  }

  async findOne(id: string) {
    const doc = await this.model.findById(id).lean().exec();
    if (!doc) throw new NotFoundException('排程不存在');
    return doc;
  }

  async create(dto: CreatePipelineScheduleDto, userId: string) {
    const nextRun = dto.enabled !== false ? this.getNextRun(dto.cron) : null;
    return this.model.create({
      ...dto,
      user_id: userId,
      next_run_at: nextRun,
    });
  }

  async update(id: string, dto: UpdatePipelineScheduleDto) {
    const existing = await this.model.findById(id);
    if (!existing) throw new NotFoundException('排程不存在');

    Object.assign(existing, dto);

    // 如果 cron 或 enabled 改變，重新計算 next_run_at
    if (dto.cron !== undefined || dto.enabled !== undefined) {
      existing.next_run_at = existing.enabled ? this.getNextRun(existing.cron) : null;
    }

    return existing.save();
  }

  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id);
    if (!doc) throw new NotFoundException('排程不存在');
    return { deleted: true };
  }

  async toggle(id: string) {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException('排程不存在');
    doc.enabled = !doc.enabled;
    doc.next_run_at = doc.enabled ? this.getNextRun(doc.cron) : null;
    return doc.save();
  }

  // ── 排程執行器（每分鐘檢查）──────────────────────

  @Cron('0 * * * * *') // 每分鐘第 0 秒
  async tick() {
    const now = new Date();
    const due = await this.model.find({
      enabled: true,
      next_run_at: { $lte: now },
    }).exec();

    if (due.length === 0) return;

    this.logger.log(`[scheduler] ${due.length} 個排程到期`);

    for (const schedule of due) {
      await this.runOnce(schedule, now);
      // 計算下一次執行時間
      schedule.next_run_at = this.getNextRun(schedule.cron);
      await schedule.save();
    }
  }

  /** 手動觸發一次 */
  async triggerNow(id: string) {
    const schedule = await this.model.findById(id);
    if (!schedule) throw new NotFoundException('排程不存在');
    await this.runOnce(schedule, new Date());
    await schedule.save();
    return schedule.toObject();
  }

  /**
   * 執行一次並更新狀態。派工前先廣播 SCHEDULE_UPDATE('triggered')，
   * 令前端即刻見到「執行中」而唔係等到派工完先有反應。
   */
  private async runOnce(schedule: PipelineScheduleDocument, now: Date) {
    const id = String(schedule._id);
    schedule.last_run_at = now;
    schedule.last_run_campaign_id = null;
    this.sse.emit(SseEvent.SCHEDULE_UPDATE, { id, action: 'triggered' });

    try {
      const campaignId = await this.execute(schedule);
      schedule.last_run_status = 'dispatched';
      schedule.last_run_error = null;
      schedule.last_run_campaign_id = campaignId;
      this.sse.emit(SseEvent.SCHEDULE_UPDATE, { id, action: 'dispatched', campaignId });
    } catch (e: any) {
      this.logger.error(`[scheduler] ${schedule.name} 執行失敗: ${e?.message}`);
      schedule.last_run_status = 'failed';
      schedule.last_run_error = e?.message || 'Unknown error';
      this.sse.emit(SseEvent.SCHEDULE_UPDATE, { id, action: 'failed' });
    }
  }

  // ── 根據類型執行對應 pipeline ──────────────────────

  /** @returns 開出嘅 campaign_id（search / full_pipeline），其他類型 null */
  private async execute(schedule: PipelineScheduleDocument): Promise<string | null> {
    const { type, params, user_id, name } = schedule;
    this.logger.log(`[scheduler] 執行 "${name}" (${type})`);

    this.sse.emit(SseEvent.HERMES_LOG, {
      runId: `schedule:${schedule._id}`,
      level: 'info',
      stage: 'scheduler',
      message: `定時排程 "${name}" 開始執行`,
    });

    switch (type) {
      case 'search': {
        // 啟動完整搜尋 pipeline（S1→S2→S3）
        const run = await this.hermes.run(
          {
            keyword: params.keyword || '',
            location: params.location || '',
            targetCount: params.targetCount || 5,
            mode: params.mode,
            sources: params.sources,
          },
          user_id,
        );
        return run.campaign_id;
      }

      case 'send_approved':
        // 派一個 S4 task 發送已審核郵件
        await this.tasks.enqueue({
          skill_id: SKILL.EMAIL_SEND,
          title: `[排程] ${name} — 發送已審核郵件`,
          params: { mode: 'send_approved', user_id, scheduled: true },
        });
        return null;

      case 'reply_check':
        // 派一個 S4 reply-check task
        await this.tasks.enqueue({
          skill_id: SKILL.EMAIL_SEND,
          title: `[排程] ${name} — 檢查回覆`,
          params: { mode: 'reply_check', user_id, scheduled: true },
        });
        return null;

      case 'followup':
        // 派一個 S4 check-followups task
        await this.tasks.enqueue({
          skill_id: SKILL.EMAIL_SEND,
          title: `[排程] ${name} — 跟進未回覆`,
          params: { mode: 'check_followups', user_id, scheduled: true },
        });
        return null;

      case 'full_pipeline': {
        // 啟動完整 pipeline（同 search 但可自訂參數）
        const run = await this.hermes.run(
          {
            keyword: params.keyword || '',
            location: params.location || '',
            targetCount: params.targetCount || 5,
            mode: params.mode,
            sources: params.sources,
          },
          user_id,
        );
        return run.campaign_id;
      }

      default:
        throw new Error(`未知的排程類型: ${type}`);
    }
  }

  // ── Cron 解析工具 ─────────────────────────────────

  /**
   * 簡易計算下一次 cron 執行時間。
   * 支援標準 5 欄位 cron：分 時 日 月 星期幾
   */
  getNextRun(cron: string, from?: Date): Date {
    const now = from || new Date();
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) {
      // fallback: 1 小時後
      return new Date(now.getTime() + 3600_000);
    }

    const [minExpr, hourExpr, domExpr, monExpr, dowExpr] = parts;

    // 從下一分鐘開始掃描，最多掃 7 天
    const candidate = new Date(now);
    candidate.setSeconds(0, 0);
    candidate.setMinutes(candidate.getMinutes() + 1);

    const limit = 7 * 24 * 60; // 最多掃 7 天 × 24 小時 × 60 分鐘
    for (let i = 0; i < limit; i++) {
      const m = candidate.getMinutes();
      const h = candidate.getHours();
      const dom = candidate.getDate();
      const mon = candidate.getMonth() + 1;
      const dow = candidate.getDay(); // 0=Sun

      if (
        this.matchField(minExpr, m, 0, 59) &&
        this.matchField(hourExpr, h, 0, 23) &&
        this.matchField(domExpr, dom, 1, 31) &&
        this.matchField(monExpr, mon, 1, 12) &&
        this.matchField(dowExpr, dow, 0, 6)
      ) {
        return candidate;
      }
      candidate.setMinutes(candidate.getMinutes() + 1);
    }

    // 搵唔到 → fallback 24 小時後
    return new Date(now.getTime() + 86400_000);
  }

  /**
   * 解析單個 cron 欄位。
   * 支援：萬用字元、步進、單一數字、範圍、範圍加步進、逗號分隔多值。
   */
  private matchField(expr: string, value: number, min: number, max: number): boolean {
    if (expr === '*') return true;

    return expr.split(',').some((part) => {
      // */n
      const stepMatch = part.match(/^\*\/(\d+)$/);
      if (stepMatch) {
        const step = parseInt(stepMatch[1], 10);
        return value % step === 0;
      }

      // n-m
      const rangeMatch = part.match(/^(\d+)-(\d+)$/);
      if (rangeMatch) {
        const lo = parseInt(rangeMatch[1], 10);
        const hi = parseInt(rangeMatch[2], 10);
        return value >= lo && value <= hi;
      }

      // n-m/s
      const rangeStepMatch = part.match(/^(\d+)-(\d+)\/(\d+)$/);
      if (rangeStepMatch) {
        const lo = parseInt(rangeStepMatch[1], 10);
        const hi = parseInt(rangeStepMatch[2], 10);
        const step = parseInt(rangeStepMatch[3], 10);
        return value >= lo && value <= hi && (value - lo) % step === 0;
      }

      // 純數字
      return parseInt(part, 10) === value;
    });
  }
}
