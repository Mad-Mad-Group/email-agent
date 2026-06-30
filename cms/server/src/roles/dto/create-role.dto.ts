import { IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'editor', description: '角色名稱' })
  @IsString()
  name: string;

  @ApiProperty({ example: ['leads:read', 'leads:write'], description: '權限列表' })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
