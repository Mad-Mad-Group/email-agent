import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
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

  /**
   * 匯入日期範圍，YYYY-MM-DD（含當日）。
   * 對應 _imported_at —— 注意佢係 String 而唔係 Date，而且格式混用
   * ("2026-07-19 09:32:58" 同 ISO 兩種都有)，所以只接受日期部分，
   * 由 service 做字典序比較。
   */
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateFrom must be YYYY-MM-DD' })
  dateFrom?: string;

  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateTo must be YYYY-MM-DD' })
  dateTo?: string;
}
