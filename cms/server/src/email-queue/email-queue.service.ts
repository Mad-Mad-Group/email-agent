import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  EmailQueueItem,
  EmailQueueDocument,
} from './schemas/email-queue.schema';
import { ListEmailQueueQueryDto } from './dto/list-email-queue-query.dto';
import { EditEmailDto } from './dto/edit-email.dto';
import { RejectEmailDto } from './dto/reject-email.dto';
import {
  EmailStatus,
  canTransition,
  normalizeStatus,
} from './dto/email-status.enum';
import { EMAIL_SENDER } from './email-sender.interface';
import type { EmailSender } from './email-sender.interface';
import { LeadsService } from '../leads/leads.service';
import { SseEvent, SseService } from '../sse/sse.service';

@Injectable()
export class EmailQueueService {
  constructor(
    @InjectModel(EmailQueueItem.name)
    private readonly model: Model<EmailQueueDocument>,
    @Inject(EMAIL_SENDER) private readonly sender: EmailSender,
    @Optional() private readonly leads?: LeadsService,
    @Optional() private readonly sse?: SseService,
  ) {}

  async findAll(q: ListEmailQueueQueryDto, userId?: string) {
    const filter: FilterQuery<EmailQueueDocument> = {};
    if (userId) filter.user_id = userId;
    if (q.status) filter.status = q.status;
    if (q.search) {
      const rx = new RegExp(this.escapeRegex(q.search), 'i');
      filter.$or = [
        { company_name: rx },
        { to_email: rx },
        { subject: rx },
      ];
    }
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<EmailQueueDocument> {
    this.assertObjectId(id);
    const item = await this.model.findById(id).exec();
    if (!item) throw new NotFoundException('Email not found');
    return item;
  }

  /** 編輯草稿（只可喺 pending / approved）*/
  async edit(id: string, dto: EditEmailDto): Promise<EmailQueueDocument> {
    const item = await this.findOne(id);
    const status = normalizeStatus(item.status);
    if (status !== EmailStatus.PENDING && status !== EmailStatus.APPROVED) {
      throw new BadRequestException(`唔可以喺 ${status} 狀態編輯`);
    }
    if (dto.subject !== undefined) item.subject = dto.subject;
    if (dto.body !== undefined) item.body = dto.body;
    await item.save();
    this.sse?.emit(SseEvent.EMAIL_UPDATE, { id: item.id, action: 'updated', status: item.status });
    return item;
  }

  async approve(id: string) {
    const item = await this.transition(id, EmailStatus.APPROVED);
    this.sse?.emit(SseEvent.EMAIL_UPDATE, { id: item.id, action: 'status_changed', status: 'approved' });
    return item;
  }

  async reject(id: string, dto: RejectEmailDto): Promise<EmailQueueDocument> {
    const item = await this.transition(id, EmailStatus.REJECTED);
    if (dto.reason) item.error = { rejected_reason: dto.reason };
    await item.save();
    this.sse?.emit(SseEvent.EMAIL_UPDATE, { id: item.id, action: 'status_changed', status: 'rejected' });
    return item;
  }

  /** 發送：只可喺 approved。經 EmailSender（暫 fake），成功後標 lead = contacted */
  async send(id: string): Promise<EmailQueueDocument> {
    const item = await this.findOne(id);
    const status = normalizeStatus(item.status);
    if (!canTransition(status, EmailStatus.SENT)) {
      throw new BadRequestException(`${status} 唔可以直接發送（要先 approve）`);
    }
    if (!item.to_email) throw new BadRequestException('冇收件人 to_email');

    const result = await this.sender.send({
      to: item.to_email,
      subject: item.subject ?? '',
      body: item.body ?? '',
    });

    if (!result.ok) {
      item.status = EmailStatus.FAILED;
      item.error = { send_error: result.error ?? 'unknown' };
      await item.save();
      throw new BadRequestException(`發送失敗：${result.error ?? 'unknown'}`);
    }

    item.status = EmailStatus.SENT;
    item.sent_at = this.nowStamp();
    item.error = null;
    await item.save();

    this.sse?.emit(SseEvent.EMAIL_UPDATE, { id: item.id, action: 'status_changed', status: 'sent' });
    // 連動：對應 lead → contacted（+ SSE lead_update 由 LeadsService 發）
    if (item.lead_id && this.leads) {
      await this.leads.markContactedByLeadId(item.lead_id);
    }
    return item;
  }

  // ---- helpers ----
  private async transition(
    id: string,
    to: EmailStatus,
  ): Promise<EmailQueueDocument> {
    const item = await this.findOne(id);
    const from = normalizeStatus(item.status);
    if (!canTransition(from, to)) {
      throw new BadRequestException(`Invalid transition: ${from} → ${to}`);
    }
    item.status = to;
    await item.save();
    return item;
  }

  private nowStamp(): string {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
  }
  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  private assertObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid id');
  }
}
