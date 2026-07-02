import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AnalysisDocument = HydratedDocument<Analysis>;

/**
 * 對齊內網 `lead_scraper.analyses` collection（18 筆）。
 * 同 Python pipeline 共用。`lead_id` 連 leads.lead_id（字串）。
 */
@Schema({
  collection: 'analyses',
  strict: false,
  minimize: false,
  versionKey: false,
})
export class Analysis {
  @Prop({ index: true }) lead_id?: string;
  @Prop() analysis_type?: string; // 'full'
  @Prop() ai_summary?: string;
  @Prop() all_text?: string;
  @Prop() website_title?: string;
  @Prop({ type: [String], default: undefined }) emails_found?: string[];
  @Prop({ type: [String], default: undefined }) phones_found?: string[];
  @Prop({ type: String }) _analyzed_at?: string;
  @Prop({ type: String }) _summary_at?: string;
}

export const AnalysisSchema = SchemaFactory.createForClass(Analysis);
