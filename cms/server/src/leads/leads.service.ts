import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { Lead, LeadDocument } from './schemas/lead.schema';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import {
  LeadStatus,
  canTransition,
  normalizeStatus,
  toDbStatus,
} from './dto/lead-status.enum';
import { SseEvent, SseService } from '../sse/sse.service';

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name) private readonly leadModel: Model<LeadDocument>,
    // @Optional() 令單元測試/無 SSE 時都唔會炸
    @Optional() private readonly sse?: SseService,
  ) {}

  async create(dto: CreateLeadDto): Promise<LeadDocument> {
    const lead = await this.leadModel.create({
      ...dto,
      status: null, // null = NEW（同 Python 一致）
      _status: 'unverified',
    });
    this.sse?.emit(SseEvent.LEAD_UPDATE, { id: lead.id, action: 'created' });
    return lead;
  }

  /** 分頁列表（排除 soft-deleted）。controller 再包成 {status,data,total,page} */
  async findAll(q: ListLeadsQueryDto) {
    const filter: FilterQuery<LeadDocument> = { _deleted_at: null };

    if (q.status) {
      // NEW 喺 DB 係 null，要特別處理
      filter.status =
        q.status === LeadStatus.NEW ? { $in: [null, 'new'] } : q.status;
    }
    if (q.verification) filter._status = q.verification;
    if (q.industry) filter.industry_tags = q.industry;
    if (q.source) filter.source = q.source;
    if (q.search) {
      const rx = new RegExp(this.escapeRegex(q.search), 'i');
      filter.$or = [{ company_name: rx }, { email: rx }];
    }

    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const [items, total] = await Promise.all([
      this.leadModel
        .find(filter)
        .sort({ _imported_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.leadModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<LeadDocument> {
    this.assertObjectId(id);
    const lead = await this.leadModel
      .findOne({ _id: id, _deleted_at: null })
      .exec();
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(id: string, dto: UpdateLeadDto): Promise<LeadDocument> {
    const lead = await this.findOne(id);
    // 只 assign 有值嘅欄位，避免 undefined 覆寫現有資料
    const clean = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    );
    Object.assign(lead, clean);
    await lead.save();
    this.sse?.emit(SseEvent.LEAD_UPDATE, { id: lead.id, action: 'updated' });
    return lead;
  }

  /** 外展狀態轉移 —— 一定要查合法轉移表 */
  async changeStatus(
    id: string,
    dto: UpdateLeadStatusDto,
  ): Promise<LeadDocument> {
    const lead = await this.findOne(id);
    const current = normalizeStatus(lead.status);

    if (!canTransition(current, dto.status)) {
      throw new BadRequestException(
        `Invalid status transition: ${current} → ${dto.status}`,
      );
    }

    lead.status = toDbStatus(dto.status); // NEW → null
    if (dto.status === LeadStatus.CONTACTED && !lead._email_sent_at) {
      lead._email_sent_at = this.nowStamp();
      lead._email_sent = true;
    }
    await lead.save();

    this.sse?.emit(SseEvent.LEAD_UPDATE, {
      id: lead.id,
      action: 'status_changed',
      status: dto.status,
    });
    return lead;
  }

  /** mark-interested：推入 pending */
  markInterested(id: string) {
    return this.changeStatus(id, { status: LeadStatus.PENDING });
  }

  /**
   * 由 Search/Scraper 寫入新 lead。
   * 會自動生成 lead_id、去重（同 company_name + source 已存在就 skip 回 null）。
   */
  async createFromSearch(data: {
    company_name: string;
    source: string;
    search_query?: string;
    address?: string;
    phone?: string;
    website?: string;
    google_maps_url?: string;
    category?: string;
  }): Promise<LeadDocument | null> {
    const exists = await this.leadModel
      .exists({ company_name: data.company_name, source: data.source });
    if (exists) return null; // 去重

    const lead = await this.leadModel.create({
      lead_id: randomBytes(8).toString('hex'),
      company_name: data.company_name,
      source: data.source,
      search_query: data.search_query,
      address: data.address,
      phone: data.phone,
      website: data.website,
      google_maps_url: data.google_maps_url,
      industry_tags: data.category ? [data.category] : undefined,
      status: null, // NEW
      _status: 'unverified',
      _imported_at: this.nowStamp(),
    });
    this.sse?.emit(SseEvent.LEAD_UPDATE, { id: lead.id, action: 'created' });
    return lead;
  }

  /** AI Analysis 回寫合作建議到 lead 的 _collab_* 欄 */
  async applyCollab(
    id: string,
    collab: {
      primary?: string;
      pitch?: string;
      reason?: string;
      services?: string[];
    },
  ): Promise<LeadDocument> {
    const lead = await this.findOne(id);
    lead._collab_primary = collab.primary;
    lead._collab_pitch = collab.pitch;
    lead._collab_reason = collab.reason;
    lead._collab_services = collab.services;
    lead._collab_generated_at = this.nowStamp();
    lead._has_analysis = true;
    lead._analyzed_at = new Date().toISOString();
    await lead.save();
    this.sse?.emit(SseEvent.LEAD_UPDATE, { id: lead.id, action: 'updated' });
    return lead;
  }

  /**
   * 用外部 lead_id（非 _id）標記為已聯絡。Email 發送成功後由 Email Queue 調用。
   * 搵唔到對應 lead 都唔報錯（email_queue 可能指向已刪 lead）。
   */
  async markContactedByLeadId(leadId: string): Promise<void> {
    const lead = await this.leadModel.findOne({ lead_id: leadId }).exec();
    if (!lead) return;
    lead.status = toDbStatus(LeadStatus.CONTACTED);
    if (!lead._email_sent_at) {
      lead._email_sent_at = this.nowStamp();
      lead._email_sent = true;
    }
    await lead.save();
    this.sse?.emit(SseEvent.LEAD_UPDATE, {
      id: lead.id,
      action: 'status_changed',
      status: LeadStatus.CONTACTED,
    });
  }

  /** soft delete（additive _deleted_at 標記，Python 會忽略）*/
  async remove(id: string): Promise<void> {
    const lead = await this.findOne(id);
    lead._deleted_at = this.nowStamp();
    await lead.save();
    this.sse?.emit(SseEvent.LEAD_UPDATE, { id: lead.id, action: 'deleted' });
  }

  // ---- helpers ----
  /** 同 Python 一致格式 "YYYY-MM-DD HH:MM:SS" */
  private nowStamp(): string {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private assertObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }
  }
}
