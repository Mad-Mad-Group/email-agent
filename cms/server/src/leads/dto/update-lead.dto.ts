import {
  IsArray,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * 一般欄位更新（name / contact / notes 等）。
 * 注意：狀態（status）唔喺度改 —— 走 UpdateLeadStatusDto + service 狀態機，
 * 避免繞過合法轉移檢查。
 */
export class UpdateLeadDto {
  @IsOptional() @IsString() @MaxLength(200) company_name?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) industry_tags?: string[];
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() google_maps_url?: string;
  @IsOptional() @IsString() search_query?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) extra_emails?: string[];
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) extra_phones?: string[];
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsObject() social_media?: Record<string, string>;
  @IsOptional() @IsString() rating?: string;
  @IsOptional() @IsString() website_description?: string;
  @IsOptional() @IsString() lead_id?: string;
  @IsOptional() @IsString() user_id?: string;
}
