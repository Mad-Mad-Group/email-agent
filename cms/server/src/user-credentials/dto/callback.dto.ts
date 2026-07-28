import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CallbackDto {
  @ApiProperty({ description: 'OAuth authorization code from provider redirect' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'CSRF nonce that must match the server-side state store' })
  @IsString()
  state!: string;

  /** Used when Microsoft returns it in the query (oauth2/v2.0 native). */
  @IsOptional()
  @IsString()
  error?: string;
}
