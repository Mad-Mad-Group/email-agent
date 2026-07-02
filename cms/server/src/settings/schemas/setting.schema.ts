import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SettingDocument = Setting & Document;

@Schema({ collection: 'settings' })
export class Setting {
  @Prop({ type: String, unique: true, required: true })
  key: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  value: any;

  @Prop({ type: Date, default: Date.now })
  updated_at: Date;

  @Prop({ type: String, default: null })
  updated_by: string;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
