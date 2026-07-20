import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ collection: 'users' })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: 'staff' })
  role: string;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ default: Date.now })
  created_at: Date;

  @Prop({ default: Date.now })
  updated_at: Date;

  @Prop({ default: null })
  deleted_at: Date;

  @Prop({
    type: Object,
    default: { email_on_complete: false, browser_on_complete: false, notification_email: '' },
  })
  notification_prefs: {
    email_on_complete: boolean;
    browser_on_complete: boolean;
    notification_email: string;
  };

  @Prop({ default: null })
  resetToken: string;

  @Prop({ default: null })
  resetTokenExpiry: Date;

  /* ── Company info (per-user, used by AI agent) ── */

  @Prop({ default: '' })
  companyName: string;

  @Prop({ default: '' })
  companyDescription: string;

  @Prop({ default: '' })
  companyWebsite: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});
