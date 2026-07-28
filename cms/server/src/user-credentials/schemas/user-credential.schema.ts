import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserCredentialDocument = HydratedDocument<UserCredential>;

@Schema({ collection: 'user_credentials', versionKey: false, timestamps: true })
export class UserCredential {
  @Prop({ type: String, required: true, unique: true, index: true })
  user_id!: string;

  /**
   * Encrypted OAuth2 refresh token (AES-256-GCM, see refresh-token-crypto.ts).
   * NEVER store the raw refresh token in the DB.
   * Cleared (set to '') when the user revokes the connection.
   */
  @Prop({ type: String, required: true, default: '' })
  encrypted_refresh_token!: string;

  /** Provider email address (e.g. "alice@madmad.com") — used as SMTP from-address. */
  @Prop({ type: String, required: true })
  email_address!: string;

  /** Last 4 chars of access token — audit log only. */
  @Prop({ type: String, default: '' })
  access_token_last4!: string;

  /** Last 4 chars of refresh token — audit log only. */
  @Prop({ type: String, default: '' })
  refresh_token_last4!: string;

  /** Comma-delimited scopes granted by the user. */
  @Prop({ type: String, default: '' })
  scopes!: string;

  /** Access token expiry (ms epoch). Refresh proactively when within 5 min. */
  @Prop({ type: Number, default: 0 })
  access_token_expires_at!: number;

  @Prop({ type: String, default: 'gmail' })
  provider!: 'gmail' | 'microsoft' | 'zoho';

  @Prop({ type: Date })
  last_refreshed_at?: Date;

  /** When the user clicks "Disconnect" or the OAuth flow is revoked externally. */
  @Prop({ type: Date, default: null })
  revoked_at?: Date | null;
}

export const UserCredentialSchema = SchemaFactory.createForClass(UserCredential);
