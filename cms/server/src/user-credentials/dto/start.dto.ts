import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { SUPPORTED_PROVIDERS } from '../schemas/user-credential.schema';

export class StartDto {
  @ApiProperty({
    description: 'Provider to connect via OAuth',
    enum: SUPPORTED_PROVIDERS,
    example: 'gmail',
  })
  @IsString()
  @IsIn([...SUPPORTED_PROVIDERS])
  provider!: (typeof SUPPORTED_PROVIDERS)[number];

  @ApiProperty({
    description: 'Post-OAuth UX redirect path (e.g. /cms-settings?tab=emailConnection)',
    example: '/cms-settings?tab=emailConnection',
  })
  @IsString()
  returnTo!: string;
}
