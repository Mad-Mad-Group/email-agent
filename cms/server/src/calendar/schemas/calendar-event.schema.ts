import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CalendarEventDocument = HydratedDocument<CalendarEvent>;

@Schema({
  collection: 'calendar_events',
  timestamps: false,
  versionKey: false,
})
export class CalendarEvent {
  @Prop({ index: true })
  event_id: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ required: true, type: Date })
  start: Date;

  @Prop({ type: Date })
  end?: Date;

  @Prop({ type: Boolean, default: false })
  all_day: boolean;

  @Prop({ type: String, default: 'other', index: true })
  type: 'meeting' | 'follow_up' | 'deadline' | 'other';

  @Prop({ index: true })
  lead_id?: string;

  @Prop()
  company_name?: string;

  @Prop()
  color?: string;

  @Prop({ type: String })
  created_at: string;

  @Prop({ type: String })
  updated_at?: string;
}

export const CalendarEventSchema = SchemaFactory.createForClass(CalendarEvent);
