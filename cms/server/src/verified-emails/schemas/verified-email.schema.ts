import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VerifiedEmailDocument = HydratedDocument<VerifiedEmail>;

/**
 * Verified Email Pool — 經驗證嘅 email 地址共用池。
 * 觸發條件：
 *   1. 對方回覆 ≥2 次 → auto_reply_count
 *   2. AI 判斷第一次回覆係人工寫嘅 → ai_check
 *   3. 用戶/admin 手動標記 → manual
 */
@Schema({
  collection: 'verified_emails',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false,
})
export class VerifiedEmail {
  @Prop({ required: true, index: true })
  email: string;

  @Prop({ required: true, index: true })
  company_name: string;

  /** email domain，e.g. "abc.com" */
  @Prop({ index: true })
  domain: string;

  /** 邊個用戶最初搵到呢個 email */
  @Prop({ index: true })
  source_user_id: string;

  /** 來源 lead 嘅 _id */
  @Prop()
  source_lead_id: string;

  /** 驗證方式 */
  @Prop({ required: true, enum: ['auto_reply_count', 'ai_check', 'manual'] })
  verification_method: string;

  /** 收到嘅回覆次數 */
  @Prop({ default: 0 })
  reply_count: number;

  /** 被其他用戶匹配使用嘅次數 */
  @Prop({ default: 0 })
  match_count: number;

  /** active / revoked */
  @Prop({ default: 'active', enum: ['active', 'revoked'] })
  status: string;

  /** 備註 */
  @Prop()
  notes: string;
}

export const VerifiedEmailSchema = SchemaFactory.createForClass(VerifiedEmail);

// 複合 unique：同一個 email + company 只存一次
VerifiedEmailSchema.index({ email: 1, company_name: 1 }, { unique: true });
