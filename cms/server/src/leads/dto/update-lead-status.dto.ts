import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LeadStatus } from './lead-status.enum';

export class UpdateLeadStatusDto {
  @IsEnum(LeadStatus)
  status: LeadStatus;

  /** 可選備註，會 append 入 lead.notes */
  @IsOptional()
  @IsString()
  note?: string;
}
