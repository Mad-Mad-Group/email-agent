import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserCredentialDocument = HydratedDocument<UserCredential>;

/**
 * Per-user email credential — supports BOTH OAuth2 (Gmail/Outlook)
 * and username + app-password (Yahoo, Office365 w/ basic auth, custom SMTP).
 *
 * Storage rules:
 * - OAuth2: encrypted_refresh_token holds the refresh token, scopes track
 *   what was granted, smtp_* fields unused.
 * - App-password: encrypted_refresh_token holds the SMTP password (still
 *   AES-256-GCM encrypted-at-rest), auth_mode = 'password', the OAuth
 *   fields are null.
 *
 * Either path can be removed via revoke() → encrypted_refresh_token = ''.
 */
export const SUPPORTED_PROVIDERS = ['gmail', 'outlook', 'office365', 'yahoo', 'custom'] as const;
export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

export const AUTH_MODES = ['oauth', 'password'] as const;
export type AuthMode = (typeof AUTH_MODES)[number];

@Schema({ collection: 'user_credentials', versionKey: false, timestamps: true })
export class UserCredential {
  @Prop({ type: String, required: true, unique: true, index: true })
  user_id!: string;

  @Prop({ type: String, required: true })
  email_address!: string;

  @Prop({ type: String, required: true })
  provider!: SupportedProvider;

  @Prop({ type: String, required: true })
  auth_mode!: AuthMode;

  /**
   * AES-256-GCM encrypted credential blob. Format:
   *   "<iv-base64>:<authTag-base64>:<ciphertext-base64>"
   * Contents:
   *   - oauth:     refresh token (long-lived Google/MS refresh)
   *   - password:  SMTP password / app password (string)
   */
  @Prop({ type: String, required: true, default: '' })
  encrypted_refresh_token!: string;

  /** Last 4 chars of the credential — audit only, never the full secret. */
  @Prop({ type: String, default: '' })
  credential_last4!: string;

  /** OAuth-specific metadata (only populated when auth_mode='oauth'). */
  @Prop({ type: String, default: '' })
  scopes!: string;

  @Prop({ type: Number, default: 0 })
  access_token_expires_at!: number;

  /** App-password mode: SMTP connection details (only populated when auth_mode='password'). */
  @Prop({ type: String, default: '' })
  smtp_host!: string;

  @Prop({ type: Number, default: 0 })
  smtp_port!: number;

  @Prop({ type: Boolean, default: false })
  smtp_secure!: boolean;

  @Prop({ type: String, default: '' })
  smtp_username!: string;

  /** Gmail IMAP host (constant for Gmail: imap.gmail.com). Stored for completeness. */
  @Prop({ type: String, default: '' })
  imap_host!: string;

  /** Common IMAP port. Gmail: 993 (TLS). Outlook: 993. */
  @Prop({ type: Number, default: 0 })
  imap_port!: number;

  @Prop({ type: Date })
  last_refreshed_at?: Date;

  @Prop({ type: Date, default: null })
  revoked_at?: Date | null;
}

export const UserCredentialSchema = SchemaFactory.createForClass(UserCredential);
