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

  /** 結構化動作 key（前端用 i18n 翻譯） */
  @Prop({ type: String })
  action?: string;

  /** 結構化參數（如 { name: 'XX', count: 3 }） */
  @Prop({ type: Object })
  action_params?: Record<string, any>;

  /** i18n title key（前端用 t(title_key, title_params) 翻譯） */
  @Prop({ type: String })
  title_key?: string;

  /** i18n title 參數（如 { company: 'XX', count: 3 }） */
  @Prop({ type: Object })
  title_params?: Record<string, any>;

  /** i18n message key */
  @Prop({ type: String })
  message_key?: string;

  /** i18n message 參數 */
  @Prop({ type: Object })
  message_params?: Record<string, any>;

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
