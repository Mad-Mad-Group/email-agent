import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { LeadStatus } from './lead-status.enum';

export class ListLeadsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  /** 外展 pipeline 狀態 */
  @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;

  /** 資料核查狀態 (unverified / ...) */
  @IsOptional() @IsString() verification?: string;

  /** 按行業 tag 篩（industry_tags 包含此值）*/
  @IsOptional() @IsString() industry?: string;

  @IsOptional() @IsString() source?: string;

  /** 模糊搜尋 company_name / email */
  @IsOptional() @IsString() search?: string;
}
