import {
  IsArray,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * 新增 lead。欄位名對齊 DB `leads` collection（snake_case）。
 * `_` 前綴嘅 pipeline meta 欄唔喺度俾人手動建 —— 由 pipeline / scraper 寫。
 */
export class CreateLeadDto {
  @IsString()
  @MaxLength(200)
  company_name: string;

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

  /** lead 來源系統 id（如 scraper 提供）*/
  @IsOptional() @IsString() lead_id?: string;
  @IsOptional() @IsString() user_id?: string;
}
