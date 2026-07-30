import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Notification, NotificationDocument } from '../notifications/schemas/notification.schema';
import { SseEvent, SseService } from '../sse/sse.service';
import { EmailService } from '../email/email.service';

/** 同一種 alert 幾久內唔重複通知（避免每個 task 都彈一次） */
const ALERT_COOLDOWN_MS = 15 * 60_000;

export interface AgentQuotaAlert {
  /** 由 worker 讀返嚟嘅原始訊息（已截斷） */
  detail?: string;
  agent_id?: string;
  skill_id?: string;
}

/**
 * 系統級 alert。
 *
 * 目前只有一種：Hermes agent 撞到 API token / quota 上限。
 * 之前呢件事只會出現喺 worker 嘅 terminal log，冇人喺 CMS 睇得到 ——
 * 呢個 service 負責寫通知俾每個 admin、推 SSE、再 email 出去。
 */
@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  /** alert key → 最後一次發出嘅時間，做 cooldown */
  private readonly lastSent = new Map<string, number>();

  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(Notification.name)
    private readonly notifications: Model<NotificationDocument>,
    private readonly sse: SseService,
    private readonly email: EmailService,
  ) {}

  async agentQuotaExceeded(alert: AgentQuotaAlert): Promise<{ notified: number; throttled: boolean }> {
    const key = `agent_quota:${alert.agent_id ?? 'any'}`;
    const last = this.lastSent.get(key) ?? 0;
    if (Date.now() - last < ALERT_COOLDOWN_MS) {
      return { notified: 0, throttled: true };
    }
    this.lastSent.set(key, Date.now());

    const admins = await this.users
      .find({ role: { $in: ['admin', 'super_admin'] }, deleted_at: null })
      .select('_id email name')
      .lean()
      .exec();

    const title = 'AI Agent 已用盡 API 額度';
    const detail = (alert.detail ?? '').slice(0, 500);
    const message = [
      alert.agent_id ? `Agent：${alert.agent_id}` : null,
      alert.skill_id ? `Stage：${alert.skill_id}` : null,
      detail ? `訊息：${detail}` : null,
      '任務會失敗直到額度回復。',
    ].filter(Boolean).join('\n');

    // 逐個 admin 寫一條 —— notifications 嘅 userFilter 係按 user_id 隔離，
    // 寫一條「冇 user_id」嘅記錄唔一定人人見到，所以明確逐個寫。
    for (const admin of admins) {
      await this.notifications.create({
        title,
        message,
        type: 'system',
        user_id: String((admin as any)._id),
        title_key: 'notification.agentQuotaExceeded',
        message_key: 'notification.agentQuotaExceededMsg',
        message_params: {
          agent: alert.agent_id ?? '-',
          skill: alert.skill_id ?? '-',
          detail: detail || '-',
        },
        read: false,
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      });
    }

    this.sse.emit(SseEvent.NOTIFICATION, { title, type: 'system' });

    // Email 係 best-effort，寄唔到唔應該令 alert 失敗
    const html = `<p><strong>${title}</strong></p><pre style="white-space:pre-wrap">${message}</pre>`;
    for (const admin of admins) {
      const to = (admin as any).email;
      if (!to) continue;
      try {
        await this.email.sendMail(to, `[ClientRadar] ${title}`, html);
      } catch (e: any) {
        this.logger.warn(`quota alert mail failed to=${to}: ${e?.message ?? e}`);
      }
    }

    this.logger.warn(`agent quota alert sent to ${admins.length} admin(s): ${detail}`);
    return { notified: admins.length, throttled: false };
  }
}
