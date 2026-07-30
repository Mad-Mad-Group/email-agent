import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PipelineScheduleDocument = PipelineSchedule & Document;

export type ScheduleType =
  | 'search'          // 定時搜尋新 leads（S1→S2→S3 全流程）
  | 'send_approved'   // 定時發送已審核郵件（S4）
  | 'reply_check'     // 定時回信檢查
  | 'followup'        // 定時跟進未回覆
  | 'full_pipeline';  // 自訂全流程（S1→S2→S3→S4）

@Schema({
  collection: 'pipeline_schedules',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false,
})
export class PipelineSchedule {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, index: true })
  type: ScheduleType;

  /** cron 表達式，例如 "0 9 * * 1-5"（週一至週五 9:00） */
  @Prop({ type: String, required: true })
  cron: string;

  /** pipeline 參數（search 需要 keyword/location/targetCount 等） */
  @Prop({ type: Object, default: {} })
  params: Record<string, any>;

  @Prop({ type: Boolean, default: true, index: true })
  enabled: boolean;

  @Prop({ type: String, required: true, index: true })
  user_id: string;

  @Prop({ type: Date, default: null })
  last_run_at: Date | null;

  @Prop({ type: Date, default: null })
  next_run_at: Date | null;

  /**
   * 派工結果，唔等於 pipeline 完成 —— search / full_pipeline 只係開一個
   * campaign 就 return（見 HermesService.run），實際進度睇 last_run_campaign_id。
   */
  @Prop({ type: String, default: null })
  last_run_status: 'dispatched' | 'failed' | null;

  @Prop({ type: String, default: null })
  last_run_error: string | null;

  /** 今次觸發開出嘅 campaign_id，俾前端追蹤實際進度；非 pipeline 類型為 null */
  @Prop({ type: String, default: null })
  last_run_campaign_id: string | null;
}

export const PipelineScheduleSchema = SchemaFactory.createForClass(PipelineSchedule);
