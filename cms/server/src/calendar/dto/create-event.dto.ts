import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsISO8601()
  start: string;

  @IsOptional()
  @IsISO8601()
  end?: string;

  @IsOptional()
  @IsBoolean()
  all_day?: boolean;

  @IsOptional()
  @IsIn(['meeting', 'follow_up', 'deadline', 'other'])
  type?: 'meeting' | 'follow_up' | 'deadline' | 'other';

  @IsOptional()
  @IsString()
  lead_id?: string;

  @IsOptional()
  @IsString()
  company_name?: string;

  @IsOptional()
  @IsString()
  color?: string;
}
