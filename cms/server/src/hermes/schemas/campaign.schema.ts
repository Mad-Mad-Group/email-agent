import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CampaignDocument = HydratedDocument<Campaign>;

/**
 * 對齊 `campaigns` collection（現 0 筆，由我哋定義）。
 * 一個 outreach run：搜尋 → 每個新 lead 串 enrich→analyze→draft→send。
 */
@Schema({
  collection: 'campaigns',
  strict: false,
  minimize: false,
  versionKey: false,
})
export class Campaign {
  @Prop({ required: true, unique: true, index: true }) campaign_id: string;
  @Prop() keyword?: string;
  @Prop() location?: string;
  @Prop() target_count?: number;
  @Prop() mode?: string;

  /** running | completed | failed */
  @Prop({ type: String, default: 'running', index: true }) status: string;
  /** 目前主 stage：search → fanout */
  @Prop() pipeline_stage?: string;

  /** 搜到嘅 lead（_id 字串）*/
  @Prop({ type: [String], default: [] }) lead_ids: string[];
  /** 已完成成條鏈（send 完）嘅 lead 數 */
  @Prop({ type: Number, default: 0 }) done_count: number;

  @Prop({ type: String }) _created_at?: string;
  @Prop({ type: String }) _updated_at?: string;
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);
