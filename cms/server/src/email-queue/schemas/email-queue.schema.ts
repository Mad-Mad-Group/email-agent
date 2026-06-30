import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EmailStatus } from '../dto/email-status.enum';

export type EmailQueueDocument = HydratedDocument<EmailQueueItem>;

/**
 * 對齊內網 `lead_scraper.email_queue` collection（真實格式）。
 * 同 Python pipeline 共用。日期係字串，唔開 mongoose timestamps，strict:false。
 *
 * `lead_id` = 對應 leads collection 嘅【lead_id 字串欄】（非 _id）。
 */
@Schema({
  collection: 'email_queue',
  strict: false,
  minimize: false,
  versionKey: false,
})
export class EmailQueueItem {
  @Prop({ index: true }) email_id?: string; // 外部 id "17e5827f"
  @Prop({ index: true }) lead_id?: string; // 連 leads.lead_id
  @Prop({ index: true }) user_id?: string;

  @Prop() company_name?: string;
  @Prop() to_email?: string;
  @Prop() subject?: string;
  @Prop() body?: string;

  @Prop({ type: String, default: EmailStatus.PENDING, index: true })
  status: string;

  @Prop({ type: String }) created_at?: string; // "YYYY-MM-DD HH:MM:SS"
  @Prop({ type: String }) sent_at?: string;
  @Prop({ type: Object, default: null }) error?: unknown;
}

export const EmailQueueSchema = SchemaFactory.createForClass(EmailQueueItem);
EmailQueueSchema.index({ status: 1, created_at: -1 });
