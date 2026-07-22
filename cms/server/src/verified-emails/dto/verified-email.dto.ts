import { IsEmail, IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
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
}
