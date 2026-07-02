import { IsEmail, IsString, MinLength, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'staff', description: '角色：staff / admin / super_admin' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: ['leads:read', 'leads:write'], description: '權限列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
