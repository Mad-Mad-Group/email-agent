import { Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { TaskStatus } from './task-status.enum';

export class EnqueueTaskDto {
  @IsString() skill_id: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsObject() params?: Record<string, unknown>;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() created_by?: string;
}

/** Hermes agent claim 下一個 pending task */
export class ClaimTaskDto {
  @IsString() agent_id: string;
  /** 只 claim 某 skill 嘅 task（唔傳 = 任何）*/
  @IsOptional() @IsString() skill_id?: string;
  /** 排除某啲 skill 嘅 task（逗號分隔，例如 "S4" 或 "S3,S4"）*/
  @IsOptional() @IsString() exclude_skills?: string;
}

export class CompleteTaskDto {
  @IsOptional() @IsObject() result?: Record<string, unknown>;
}

export class FailTaskDto {
  @IsOptional() @IsString() error?: string;
}

export class ListTasksQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() status?: TaskStatus;
  @IsOptional() @IsString() skill_id?: string;
}
