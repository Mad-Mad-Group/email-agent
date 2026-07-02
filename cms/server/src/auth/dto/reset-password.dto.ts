import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'abc123-reset-token' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'newpass456', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
