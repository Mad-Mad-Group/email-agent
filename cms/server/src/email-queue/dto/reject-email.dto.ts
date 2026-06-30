import { IsOptional, IsString } from 'class-validator';

export class RejectEmailDto {
  @IsOptional() @IsString() reason?: string;
}
