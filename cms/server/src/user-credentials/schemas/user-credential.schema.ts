import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserCredentialDocument = HydratedDocument<UserCredential>;

/**
 * Per-user email credential — simplified to Gmail OAuth2 (Phase 1).
 *
 * The original design called for 5 providers × 2 auth modes. After
 * launch feedback we cut it back: every SDR uses Gmail or Outlook
 * through corporate IT, and App Password mode is a worse auth UX
 * than OAuth2 (which Gmail itself deprecates). Phase 2 will extend.
 *
 * Storage:
 *   - provider: 'gmail' | 'outlook'             — what OAuth flow to run
 *   - auth_mode: 'oauth'                       — only OAuth, by construction
 *   - encrypted_refresh_token: AES-256-GCM blob of the refresh token
 *
 * Cleared on revoke(). SMTP/IMAP hosts are constants (smtp.gmail.com
 * / imap.gmail.com) so we don't store them per-credential — see
 * PROVIDER_CONFIG in user-credentials.service.ts.
 */
export const SUPPORTED_PROVIDERS = ['gmail', 'outlook'] as const;
export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

@Schema({ collection: 'user_credentials', versionKey: false, timestamps: true })
export class UserCredential {
  @Prop({ type: String, required: true, unique: true, index: true })
  user_id!: string;

  @Prop({ type: String, required: true })
  email_address!: string;

  @Prop({ type: String, required: true })
  provider!: SupportedProvider;

  @Prop({ type: String, required: true, default: 'oauth' })
  auth_mode!: 'oauth';

  /**
   * AES-256-GCM encrypted credential blob. Format:
   *   "<iv-base64>:<authTag-base64>:<ciphertext-base64>"
   */
  @Prop({ type: String, required: true, default: '' })
  encrypted_refresh_token!: string;

  @Prop({ type: String, default: '' })
  credential_last4!: string;

  @Prop({ type: String, default: '' })
  scopes!: string;

  @Prop({ type: Number, default: 0 })
  access_token_expires_at!: number;

  @Prop({ type: Date })
  last_refreshed_at?: Date;

  @Prop({ type: Date, default: null })
  revoked_at?: Date | null;
}

export const UserCredentialSchema = SchemaFactory.createForClass(UserCredential);
