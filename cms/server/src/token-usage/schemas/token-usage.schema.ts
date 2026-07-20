import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TokenUsageDocument = HydratedDocument<TokenUsage>;

@Schema({ collection: 'token_usages', timestamps: false })
export class TokenUsage {
  @Prop({ index: true }) user_id: string;
  @Prop() task_id: string;
  @Prop() skill_id: string;
  @Prop({ default: 'MiniMax-M3' }) model: string;

  @Prop({ default: 0 }) prompt_tokens: number;
  @Prop({ default: 0 }) completion_tokens: number;
  @Prop({ default: 0 }) total_tokens: number;

  @Prop({ default: true }) estimated: boolean;
  @Prop({ default: Date.now }) created_at: Date;
}

export const TokenUsageSchema = SchemaFactory.createForClass(TokenUsage);
