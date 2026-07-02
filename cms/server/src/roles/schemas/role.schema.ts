import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoleDocument = Role & Document;

@Schema({ collection: 'roles' })
export class Role {
  @Prop({ type: String, unique: true, required: true })
  name: string;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ type: Date, default: Date.now })
  created_at: Date;

  @Prop({ type: Date, default: Date.now })
  updated_at: Date;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
