import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LeadDocument = HydratedDocument<Lead>;

/**
 * Lead schema —— 對齊公司內網 `lead_scraper.leads` collection 嘅【真實格式】。
 * （由現有 Python pipeline 寫入，NestJS 同佢共用同一份數據，所以 1:1 跟欄位名。）
 *
 * 重要約定：
 *  • snake_case 欄位名，`_` 前綴 = pipeline / 工作流 meta（Python 管）。
 *  • 日期一律係【字串】(ISO 或 "YYYY-MM-DD HH:MM:SS")，唔係 Date —— 唔好改型，會撞 Python。
 *  • strict:false → NestJS 唔會 strip 未宣告嘅欄位，保護 Python 寫入嘅 field。
 *  • 唔開 mongoose timestamps（Python 用自己嘅 _imported_at / _cleaned_at 字串）。
 *  • 兩個狀態欄：
 *      - `status`  = 外展 pipeline 狀態 (null=未聯絡 / contacted)  ← 狀態機管呢個
 *      - `_status` = 資料核查狀態 (unverified / ...)              ← 另一回事
 */
@Schema({
  collection: 'leads',
  strict: false, // 容忍 Python 寫入嘅其他 _ 欄位
  minimize: false,
  versionKey: false,
})
export class Lead {
  // ── 外部 id（Python 生成，非 _id）──
  @Prop({ index: true }) lead_id?: string;
  @Prop({ index: true }) user_id?: string; // e.g. "U-cd410cc8"，字串非 ObjectId

  // ── 身份 / 來源 ──
  @Prop({ required: true, trim: true, index: true }) company_name: string;
  @Prop({ type: [String], default: undefined }) industry_tags?: string[];
  @Prop({ index: true }) source?: string; // "Google Maps"
  @Prop() google_maps_url?: string;
  @Prop() search_query?: string;

  // ── 聯絡 ──
  @Prop({ trim: true, index: true }) email?: string;
  @Prop({ type: [String], default: undefined }) extra_emails?: string[];
  @Prop() phone?: string;
  @Prop({ type: [String], default: undefined }) extra_phones?: string[];
  @Prop() website?: string;
  @Prop() address?: string;
  @Prop({ type: Object }) social_media?: Record<string, string>;

  // ── 評分（注意：DB 存字串）──
  @Prop({ type: String }) rating?: string;

  // ── 網站研究 ──
  @Prop() website_description?: string;
  @Prop() _website_description?: string;
  @Prop() _website_services?: string;
  @Prop({ type: Boolean }) _website_researched?: boolean;

  // ── 外展 pipeline 狀態（狀態機管呢個；null = 未聯絡）──
  @Prop({ type: String, default: null, index: true }) status?: string | null;
  @Prop({ type: Boolean }) _email_sent?: boolean;
  @Prop({ type: String }) _email_sent_at?: string; // "2026-06-18 12:37:56"
  @Prop({ type: Boolean }) _no_reply?: boolean;
  @Prop({ type: Number }) _followup_count?: number;
  @Prop() _followup_draft?: string;

  // ── 資料核查狀態（同外展無關）──
  @Prop({ type: String, default: 'unverified', index: true }) _status?: string;

  // ── 工作流旗標 ──
  @Prop({ type: Boolean }) _has_analysis?: boolean;
  @Prop({ type: Boolean }) _has_email_draft?: boolean;
  @Prop({ type: Boolean }) _has_wa_message?: boolean;

  // ── Email 草稿（Email Draft Module 會用）──
  @Prop() email_draft?: string;

  // ── 合作建議（AI Analysis 回寫，cache 喺 lead 上）──
  @Prop() _collab_primary?: string;
  @Prop() _collab_pitch?: string;
  @Prop() _collab_reason?: string;
  @Prop({ type: [String], default: undefined }) _collab_services?: string[];
  @Prop({ type: String }) _collab_generated_at?: string;

  // ── WhatsApp ──
  @Prop() _wa_link?: string;
  @Prop() _wa_message?: string;

  // ── Python pipeline 時戳（字串，唔好改 Date）──
  @Prop({ type: String }) _imported_at?: string;
  @Prop({ type: String }) _cleaned_at?: string;
  @Prop({ type: String }) _analyzed_at?: string;

  // ── ⚠️ C 新增（additive）：soft delete 標記 ──
  // 現有數據冇此欄；Python 會忽略，安全。set 咗即代表已刪，list 自動排除。
  @Prop({ type: String, default: null, index: true }) _deleted_at?: string | null;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);

// 列表常用索引
LeadSchema.index({ _deleted_at: 1, status: 1 });
