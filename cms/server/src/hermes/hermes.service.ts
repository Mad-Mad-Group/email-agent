import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { TasksService } from '../tasks/tasks.service';
import { TaskEvents } from '../tasks/task-events';
import { SKILL } from '../tasks/dto/task-status.enum';
import { TaskDocument } from '../tasks/schemas/task.schema';
import { SseEvent, SseService } from '../sse/sse.service';
import { Campaign, CampaignDocument } from './schemas/campaign.schema';
import { RunHermesDto } from './dto/run-hermes.dto';
import { EmailService } from '../email/email.service';

/** 每個 pipeline stage：用咩 skill + 下一個 stage 係咩 */
const STAGE_SKILL: Record<string, string> = {
  search: SKILL.SEARCH, // S1
  enrich: SKILL.ANALYZE, // S2
  analyze: SKILL.ANALYZE, // S2
  draft: SKILL.EMAIL_DRAFT, // S3
  send: SKILL.EMAIL_SEND, // S4
};
const STAGE_NEXT: Record<string, string | null> = {
  search: 'enrich', // 注意：search 完係 fan-out 去每個 lead，特別處理
  enrich: 'analyze',
  analyze: 'draft',
  draft: 'send',
  send: null, // 一條鏈完
};

/**
 * Hermes orchestrator（指揮）。
 * NestJS 唔做實際工作，只係：派第一個 search task → subscribe task 完成事件
 * → 自動派下一 stage，串成 search→enrich→analyze→draft→send 一條龍。
 * 真正每 stage 嘅工作由 Hermes agent claim 去做。
 */
@Injectable()
export class HermesService implements OnModuleInit {
  constructor(
    @InjectModel(Campaign.name)
    private readonly campaigns: Model<CampaignDocument>,
    private readonly tasks: TasksService,
    private readonly taskEvents: TaskEvents,
    private readonly sse: SseService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    // 監聽所有 task 完成；只處理屬於某 campaign 嘅
    this.taskEvents.completed$.subscribe((task) => {
      void this.onTaskCompleted(task).catch((e) =>
        this.log('error', task, `orchestrator error: ${e?.message ?? e}`),
      );
    });
    // 監聽 task 失敗 → 跳過該 lead，繼續 pipeline
    this.taskEvents.failed$.subscribe((task) => {
      void this.onTaskFailed(task).catch((e) =>
        this.log('error', task, `orchestrator fail-handler error: ${e?.message ?? e}`),
      );
    });
  }

  /** 啟動一條 pipeline */
  async run(dto: RunHermesDto, userId?: string) {
    const campaignId = `CAMP-${randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();
    await this.campaigns.create({
      campaign_id: campaignId,
      keyword: dto.keyword,
      location: dto.location,
      target_count: dto.targetCount,
      status: 'running',
      pipeline_stage: 'search',
      lead_ids: [],
      done_count: 0,
      _created_at: now,
      _updated_at: now,
    });

    const task = await this.enqueueStage('search', campaignId, {
      keyword: dto.keyword,
      location: dto.location,
      target_count: dto.targetCount,
      user_id: userId,
    });

    this.sse.emit(SseEvent.HERMES_LOG, {
      runId: campaignId,
      level: 'info',
      stage: 'search',
      message: `Pipeline 開始：${dto.keyword} ${dto.location}`,
    });
    return { campaign_id: campaignId, first_task: task.task_id };
  }

  /** 核心：一個 task 完成 → 決定 + 派下一 stage */
  private async onTaskCompleted(task: TaskDocument) {
    const params = (task.params ?? {}) as Record<string, any>;
    const campaignId = params.campaign_id as string | undefined;
    const stage = params.pipeline_stage as string | undefined;
    if (!campaignId || !stage) return; // 唔屬 pipeline，唔理

    const campaign = await this.campaigns
      .findOne({ campaign_id: campaignId })
      .exec();
    if (!campaign || campaign.status !== 'running') return;

    const result = (task.result ?? {}) as Record<string, any>;

    if (stage === 'search') {
      // 搜尋完 → fan-out：為每個新 lead 開一條 enrich→…→send 鏈
      const leadIds: string[] = result.lead_object_ids ?? [];
      campaign.lead_ids = leadIds;
      campaign.pipeline_stage = 'per_lead';
      campaign._updated_at = new Date().toISOString();
      await campaign.save();

      this.progress(campaignId, 'search→enrich', 0, leadIds.length);
      const userId = params.user_id as string | undefined;
      for (const leadId of leadIds) {
        await this.enqueueStage('enrich', campaignId, { lead_object_id: leadId, user_id: userId });
      }
      if (leadIds.length === 0) await this.finish(campaign, '搜尋 0 結果');
      return;
    }

    // per-lead stage：派下一個
    const next = STAGE_NEXT[stage];
    if (next) {
      await this.enqueueStage(next, campaignId, {
        lead_object_id: params.lead_object_id,
        user_id: params.user_id,
      });
    } else {
      // send 完 = 一條鏈完（用 $inc 原子操作，支援多 worker 併發）
      const updated = await this.campaigns.findOneAndUpdate(
        { campaign_id: campaignId, status: 'running' },
        { $inc: { done_count: 1 }, $set: { _updated_at: new Date().toISOString() } },
        { new: true },
      ).exec();
      if (!updated) return;
      this.progress(
        campaignId,
        'pipeline',
        updated.done_count,
        updated.lead_ids.length,
      );
      if (updated.done_count >= updated.lead_ids.length) {
        await this.finish(updated, '全部 lead 完成');
      }
    }
  }

  /** 某個 stage 失敗 → 跳過該 lead 嘅剩餘 stages，繼續其他 lead */
  private async onTaskFailed(task: TaskDocument) {
    const params = (task.params ?? {}) as Record<string, any>;
    const campaignId = params.campaign_id as string | undefined;
    const stage = params.pipeline_stage as string | undefined;
    if (!campaignId || !stage) return;

    const campaign = await this.campaigns
      .findOne({ campaign_id: campaignId })
      .exec();
    if (!campaign || campaign.status !== 'running') return;

    const errorMsg = (task as any).error || 'unknown error';
    this.sse.emit(SseEvent.HERMES_LOG, {
      runId: campaignId,
      level: 'error',
      stage,
      message: `Stage [${stage}] 失敗，跳過此 lead：${errorMsg}`,
    });

    if (stage === 'search') {
      // search 失敗 = 成條 pipeline 冇嘢做
      await this.finish(campaign, `搜尋失敗：${errorMsg}`);
      return;
    }

    // per-lead stage 失敗：當呢個 lead 做完（跳過），check 是否全部 lead 都完咗
    // 用 $inc 原子操作，支援多 worker 併發
    const updated = await this.campaigns.findOneAndUpdate(
      { campaign_id: campaignId, status: 'running' },
      { $inc: { done_count: 1 }, $set: { _updated_at: new Date().toISOString() } },
      { new: true },
    ).exec();
    if (!updated) return;
    this.progress(
      campaignId,
      'pipeline',
      updated.done_count,
      updated.lead_ids.length,
    );
    if (updated.done_count >= updated.lead_ids.length) {
      await this.finish(updated, '全部 lead 處理完畢（部分可能失敗）');
    }
  }

  private async enqueueStage(
    stage: string,
    campaignId: string,
    extra: Record<string, unknown> = {},
  ): Promise<TaskDocument> {
    return this.tasks.enqueue({
      skill_id: STAGE_SKILL[stage],
      title: `[${campaignId}] ${stage}`,
      params: { campaign_id: campaignId, pipeline_stage: stage, ...extra },
    });
  }

  private async finish(campaign: CampaignDocument, why: string) {
    campaign.status = 'completed';
    campaign._updated_at = new Date().toISOString();
    await campaign.save();
    this.sse.emit(SseEvent.HERMES_LOG, {
      runId: campaign.campaign_id,
      level: 'info',
      stage: 'complete',
      message: `Pipeline 完成（${why}）`,
    });
    // ponytail: best-effort email notify. Wrapped in try/catch so SMTP failure
    // can't undo the status save. Notify uses fixed dev inbox from .env.
    void this.notifyCompletion(campaign, why).catch((e) =>
      this.sse.emit(SseEvent.HERMES_LOG, {
        runId: campaign.campaign_id,
        level: 'warn',
        stage: 'notify',
        message: `Email 通知失敗：${e?.message ?? e}`,
      }),
    );
  }

  /**
   * ponytail: best-effort completion email. Reads SMTP_TO from env (defaults
   * to .env SMTP_FROM target), sends a one-shot summary. Never throws.
   */
  private async notifyCompletion(campaign: CampaignDocument, why: string): Promise<void> {
    const to = this.config.get<string>('SMTP_TO') || 's1165449@s.eduhk.hk';
    const subject = `[Lead Scraper] 搜尋完成：${campaign.keyword} ${campaign.location} (${campaign.lead_ids.length} leads)`;
    const html = `
      <h2>Pipeline 完成</h2>
      <ul>
        <li><b>Campaign ID</b>: ${campaign.campaign_id}</li>
        <li><b>關鍵字</b>: ${campaign.keyword}</li>
        <li><b>地點</b>: ${campaign.location}</li>
        <li><b>目標數量</b>: ${campaign.target_count}</li>
        <li><b>找到 Leads</b>: ${campaign.lead_ids.length}</li>
        <li><b>完成時間</b>: ${campaign._updated_at}</li>
        <li><b>備註</b>: ${why}</li>
      </ul>
      <p>👉 <a href="http://localhost:5173/cms-search">睇結果</a></p>
    `;
    await this.email.sendMail(to, subject, html);
  }

  async getCampaign(id: string) {
    return this.campaigns.findOne({ campaign_id: id }).lean().exec();
  }

  private progress(runId: string, stage: string, current: number, total: number) {
    this.sse.emit(SseEvent.PIPELINE_PROGRESS, {
      runId,
      stage,
      current,
      total,
      percent: total ? Math.round((current / total) * 100) : 100,
    });
  }
  private log(level: 'info' | 'warn' | 'error', task: TaskDocument, msg: string) {
    this.sse.emit(SseEvent.HERMES_LOG, {
      runId: (task.params as any)?.campaign_id ?? task.task_id,
      level,
      stage: 'orchestrator',
      message: msg,
    });
  }
}
