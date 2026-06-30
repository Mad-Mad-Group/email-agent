import { IsOptional, IsString } from 'class-validator';

/** 編輯草稿（只可改 subject / body，且只喺 pending/approved 狀態）*/
export class EditEmailDto {
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() body?: string;
}
