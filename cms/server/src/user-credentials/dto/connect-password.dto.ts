import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsInt, IsIn, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { SUPPORTED_PROVIDERS } from '../schemas/user-credential.schema';

/**
 * Username + App Password SMTP/IMAP connection (non-OAuth providers,
 * or OAuth fallback). Used by Yahoo / Office365 with basic auth + custom SMTP.
 */
export class ConnectPasswordDto {
  @ApiProperty({ enum: SUPPORTED_PROVIDERS, example: 'office365' })
  @IsString()
  @IsIn([...SUPPORTED_PROVIDERS])
  provider!: (typeof SUPPORTED_PROVIDERS)[number];

  @ApiProperty({ example: 'alice@madmad.com' })
  @IsEmail()
  email_address!: string;

  /* SMTP */

  @ApiProperty({ example: 'smtp.office365.com', description: 'Required. Auto-filled for known providers server-side; user supplies for provider=custom.' })
  @ValidateIf((o) => o.provider === 'custom')
  @IsString()
  smtp_host!: string;

  @ApiProperty({ example: 587, minimum: 1, maximum: 65535 })
  @IsInt()
  @Min(1)
  @Max(65535)
  smtp_port!: number;

  @ApiProperty({ default: false, description: 'true = SMTPS (port 465); false = STARTTLS' })
  @IsBoolean()
  smtp_secure!: boolean;

  @ApiProperty({ example: 'alice@madmad.com' })
  @IsString()
  smtp_username!: string;

  @ApiProperty({ description: 'App password (Yahoo/Office) or SMTP password. Encrypted at rest with AES-256-GCM. Length ≤ 256 to bound ciphertext.', maxLength: 256 })
  @IsString()
  @MaxLength(256)
  smtp_password!: string;

  /* IMAP */

  @ApiProperty({ example: 'outlook.office365.com', description: 'Required. Auto-filled for known providers server-side; user supplies for provider=custom.' })
  @ValidateIf((o) => o.provider === 'custom')
  @IsString()
  imap_host!: string;

  @ApiProperty({ example: 993 })
  @IsInt()
  @Min(1)
  @Max(65535)
  imap_port!: number;
}
