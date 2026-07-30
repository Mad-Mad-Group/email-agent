import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVerifiedEmailDto {
  @IsEmail() email: string;
  @IsString() company_name: string;
  @IsOptional() @IsString() source_lead_id?: string;
  @IsOptional() @IsString() notes?: string;
}

export class ListVerifiedEmailsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(['active', 'revoked']) status?: string;
  @IsOptional() @IsString() verification_method?: string;

  /**
   * created_at 範圍，YYYY-MM-DD（含當日）。
   * created_at 由 mongoose timestamps 產生，係真正嘅 Date，
   * 所以 service 用 Date 物件比較（同 leads 嘅字串欄位唔同）。
   */
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateFrom must be YYYY-MM-DD' })
  dateFrom?: string;

  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateTo must be YYYY-MM-DD' })
  dateTo?: string;
}
