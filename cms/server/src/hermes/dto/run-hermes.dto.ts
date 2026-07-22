import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RunHermesDto {
  @IsString() keyword: string;
  @IsString() location: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  targetCount = 5;

  @IsOptional()
  @IsString()
  mode?: 'normal' | 'old_website';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[];
}
