import { IsEmail, IsString, MinLength, IsOptional, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'newpass123', minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'admin', description: '角色：staff / admin / super_admin' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: ['leads:read'], description: '權限列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
