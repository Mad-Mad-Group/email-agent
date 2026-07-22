import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { VerifiedEmail, VerifiedEmailDocument } from './schemas/verified-email.schema';
import { CreateVerifiedEmailDto, ListVerifiedEmailsQueryDto } from './dto/verified-email.dto';

@Injectable()
export class VerifiedEmailsService {
  private readonly logger = new Logger(VerifiedEmailsService.name);

  constructor(
    @InjectModel(VerifiedEmail.name) private readonly model: Model<VerifiedEmailDocument>,
  ) {}

  /** 分頁列表 */
  async findAll(q: ListVerifiedEmailsQueryDto) {
    const filter: FilterQuery<VerifiedEmailDocument> = {};
    if (q.status) filter.status = q.status;
    if (q.verification_method) filter.verification_method = q.verification_method;
    if (q.search) {
      const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ email: rx }, { company_name: rx }, { domain: rx }];
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

  /** 手動新增 verified email */
  async createManual(dto: CreateVerifiedEmailDto, userId: string): Promise<VerifiedEmailDocument> {
    const domain = dto.email.split('@')[1] || '';
    return this.model.create({
      email: dto.email,
      company_name: dto.company_name,
      domain,
      source_user_id: userId,
      source_lead_id: dto.source_lead_id,
      verification_method: 'manual',
      reply_count: 0,
      match_count: 0,
      status: 'active',
      notes: dto.notes,
    });
  }

  /**
   * 自動驗證 — 由 worker 調用。
   * 如果已存在就更新 reply_count；唔存在就新建。
   */
  async autoVerify(data: {
    email: string;
    company_name: string;
    source_user_id: string;
    source_lead_id: string;
    verification_method: 'auto_reply_count' | 'ai_check';
    reply_count: number;
  }): Promise<VerifiedEmailDocument> {
    const domain = data.email.split('@')[1] || '';
    const doc = await this.model.findOneAndUpdate(
      { email: data.email, company_name: data.company_name },
      {
        $set: {
          domain,
          source_user_id: data.source_user_id,
          source_lead_id: data.source_lead_id,
          verification_method: data.verification_method,
          reply_count: data.reply_count,
          status: 'active',
        },
      },
      { upsert: true, new: true },
    ).exec();
    this.logger.log(`Verified email: ${data.email} (${data.company_name}) via ${data.verification_method}`);
    return doc!;
  }

  /**
   * 用 company_name 匹配 verified pool。
   * 回傳所有 active 嘅 verified emails for 呢間公司。
   */
  async matchByCompany(companyName: string) {
    if (!companyName) return [];
    const rx = new RegExp(`^${companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    return this.model.find({ company_name: rx, status: 'active' }).lean().exec();
  }

  /** 匹配成功後 +1 match_count */
  async incrementMatchCount(id: string): Promise<void> {
    await this.model.findByIdAndUpdate(id, { $inc: { match_count: 1 } }).exec();
  }

  /** 刪除（hard delete） */
  async remove(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
  }

  /** 匯出全部 active verified emails */
  async exportAll() {
    return this.model.find({ status: 'active' }).sort({ created_at: -1 }).lean().exec();
  }

  /** 統計 */
  async stats() {
    const [total, active, methods] = await Promise.all([
      this.model.countDocuments().exec(),
      this.model.countDocuments({ status: 'active' }).exec(),
      this.model.aggregate([
        { $group: { _id: '$verification_method', count: { $sum: 1 } } },
      ]).exec(),
    ]);
    return { total, active, byMethod: methods };
  }
}
