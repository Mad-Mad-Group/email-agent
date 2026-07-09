import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({
  collection: 'notifications',
  timestamps: false,
  versionKey: false,
})
export class Notification {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  message?: string;

  /** 所屬用戶 */
  @Prop({ type: String, index: true })
  user_id?: string;

  /** 通知類型：lead / email / campaign / task / system */
  @Prop({ type: String, default: 'system', index: true })
  type: 'lead' | 'email' | 'campaign' | 'task' | 'system';

  /** 關聯 ID（如 lead_id, task_id 等） */
  @Prop()
  ref_id?: string;

  @Prop({ type: Boolean, default: false, index: true })
  read: boolean;

  /** 前端「刪除」= 隱藏，唔係真刪 */
  @Prop({ type: Boolean, default: false })
  hidden: boolean;

  @Prop({ type: String })
  created_at: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
