import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldpass123' })
  @IsString()
  oldPassword: string;

  @ApiProperty({ example: 'newpass456', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
