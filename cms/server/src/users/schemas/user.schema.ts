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
    default: { email_on_complete: false, browser_on_complete: false },
  })
  notification_prefs: {
    email_on_complete: boolean;
    browser_on_complete: boolean;
  };

  @Prop({ default: null })
  resetToken: string;

  @Prop({ default: null })
  resetTokenExpiry: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});
