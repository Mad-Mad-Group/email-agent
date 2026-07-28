import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class StartDto {
  @ApiProperty({
    description: 'Post-OAuth UX redirect path (e.g. /cms-settings?tab=email)',
    example: '/cms-settings?tab=email',
  })
  @IsString()
  returnTo!: string;
}
