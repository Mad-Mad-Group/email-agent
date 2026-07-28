import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class TestEmailDto {
  @ApiProperty({ description: 'Recipient of the test email (defaults to self)', example: 'alice@madmad.com' })
  @IsEmail()
  to!: string;
}
