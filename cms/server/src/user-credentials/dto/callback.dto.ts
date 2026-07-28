import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CallbackDto {
  @ApiProperty({ description: 'OAuth authorization code from Google redirect' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'CSRF nonce that must match the server-side state store' })
  @IsString()
  state!: string;
}
