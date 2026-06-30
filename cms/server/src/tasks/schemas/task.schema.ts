import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TaskStatus } from '../dto/task-status.enum';

export type TaskDocument = HydratedDocument<Task>;

/**
 * 對齊內網 `lead_scraper.tasks` collection（真實格式，46 筆）。
 * 呢個係 NestJS ↔ Hermes agent 嘅【派工契約】：
 *   NestJS enqueue 一個 status=pending 嘅 task → Hermes agent claim(→running)
 *   → 做完寫 result + status=completed。日期係字串，strict:false。
 */
@Schema({
  collection: 'tasks',
  strict: false,
  minimize: false,
  versionKey: false,
})
export class Task {
  @Prop({ required: true, unique: true, index: true }) task_id: string; // "TASK-xxxx"
  @Prop() title?: string;
  @Prop({ index: true }) skill_id?: string; // S1/S2/S3/S4
  @Prop({ type: Object, default: {} }) params?: Record<string, unknown>;
  @Prop({ default: 'normal' }) priority?: string;
  @Prop({ type: Object, default: null }) deadline?: unknown;

  @Prop({ type: String, default: TaskStatus.PENDING, index: true })
  status: string;

  @Prop({ index: true }) assigned_agent_id?: string;
  @Prop() created_by?: string;

  @Prop({ type: Object, default: null }) result?: unknown;
  @Prop({ type: Object, default: null }) error?: unknown;

  @Prop({ type: String }) _created_at?: string;
  @Prop({ type: String }) _assigned_at?: string;
  @Prop({ type: String }) _updated_at?: string;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
TaskSchema.index({ status: 1, skill_id: 1, _created_at: 1 }); // claim 用
