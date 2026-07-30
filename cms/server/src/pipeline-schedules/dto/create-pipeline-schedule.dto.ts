import { IsString, IsOptional, IsBoolean, IsObject, IsIn } from 'class-validator';

const SCHEDULE_TYPES = ['search', 'send_approved', 'reply_check', 'followup', 'full_pipeline'] as const;

export class CreatePipelineScheduleDto {
  @IsString()
  name: string;

  @IsIn(SCHEDULE_TYPES)
  type: (typeof SCHEDULE_TYPES)[number];

  /** cron 表達式 */
  @IsString()
  cron: string;

  @IsOptional()
  @IsObject()
  params?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
