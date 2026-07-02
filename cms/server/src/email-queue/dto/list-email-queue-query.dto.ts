import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { EmailStatus } from './email-status.enum';

export class ListEmailQueueQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;

  @IsOptional() @IsEnum(EmailStatus) status?: EmailStatus;

  /** 模糊搜尋 company_name / to_email / subject */
  @IsOptional() @IsString() search?: string;
}
