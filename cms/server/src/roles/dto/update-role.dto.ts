import { IsString, IsArray, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'editor', description: '角色名稱' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: ['leads:read'], description: '權限列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
