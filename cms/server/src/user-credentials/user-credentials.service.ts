import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import * as nodemailer from 'nodemailer';
import type { ImapFlow } from 'imapflow';
import {
  encryptRefreshToken,
  decryptRefreshToken,
  last4,
  generateStateNonce,
} from '../common/crypto/refresh-token-crypto';
import {
  UserCredential,
  UserCredentialDocument,
} from './schemas/user-credential.schema';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

interface StateEntry {
  user_id: string;
  returnTo: string;
  createdAt: number;
}
const STATE_TTL_MS = 10 * 60 * 1000;
const STATE_STORE = new Map<string, StateEntry>();

function purgeExpiredStates() {
  const now = Date.now();
  for (const [k, v] of STATE_STORE.entries()) {
    if (now - v.createdAt > STATE_TTL_MS) STATE_STORE.delete(k);
  }
}

export interface ConnectionStatus {
  linked: boolean;
  email: string | null;
  provider: string;
  lastRefreshedAt: Date | null;
  scopes: string[];
}

@Injectable()
export class UserCredentialsService {
  private readonly logger = new Logger(UserCredentialsService.name);
  private readonly oauth2: OAuth2Client;

  constructor(
    @InjectModel(UserCredential.name)
    private model: Model<UserCredentialDocument>,
    private readonly cfg: ConfigService,
  ) {
    const clientId = this.cfg.get<string>('GOOGLE_CLIENT_ID') ?? '';
    const clientSecret = this.cfg.get<string>('GOOGLE_CLIENT_SECRET') ?? '';
    const redirectUri =
      this.cfg.get<string>('GOOGLE_REDIRECT_URI') ??
      'http://localhost:4000/api/auth/google/callback';

    if (!clientId || !clientSecret) {
      this.logger.warn(
        'GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not set. Per-user email features will fail until configured.',
      );
    }
    this.oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /** STEP 1 — Generate the Google consent URL the frontend redirects the user to. */
  async startOAuth(
    user_id: string,
    returnTo: string,
  ): Promise<{ url: string; state: string }> {
    purgeExpiredStates();
    const state = generateStateNonce();
    STATE_STORE.set(state, { user_id, returnTo, createdAt: Date.now() });
    const url = this.oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: true,
      scope: SCOPES,
      state,
    });
    return { url, state };
  }

  /**
   * STEP 2 — Exchange the auth code for tokens, fetch the user's email, save
   * the encrypted refresh token, and return the user identity for the redirect.
   */
  async handleCallback(
    code: string,
    state: string,
  ): Promise<{ ok: true; email: string; returnTo: string }> {
    purgeExpiredStates();
    const entry = STATE_STORE.get(state);
    if (!entry) {
      throw new BadRequestException('invalid or expired state nonce — restart OAuth');
    }
    STATE_STORE.delete(state);

    const { tokens } = await this.oauth2.getToken(code);
    if (!tokens.refresh_token) {
      // Google refuses to reissue refresh_token if user previously granted
      // without prompt=consent. Force the user to revoke at Google first.
      throw new BadRequestException(
        'no_refresh_token — revoke existing app permission at https://myaccount.google.com/permissions and reconnect',
      );
    }

    // Fetch identity
    this.oauth2.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2 });
    const { data: profile } = await oauth2.userinfo.get();
    const email = profile.email;
    if (!email) throw new InternalServerErrorException('google did not return user email');

    // Persist with encryption
    const encrypted = encryptRefreshToken(tokens.refresh_token);
    await this.model
      .findOneAndUpdate(
        { user_id: entry.user_id },
        {
          user_id: entry.user_id,
          encrypted_refresh_token: encrypted,
          email_address: email,
          access_token_last4: last4(tokens.access_token),
          refresh_token_last4: last4(tokens.refresh_token),
          scopes: SCOPES.join(','),
          access_token_expires_at: tokens.expiry_date ?? 0,
          provider: 'gmail',
          last_refreshed_at: new Date(),
          revoked_at: null,
        },
        { upsert: true, new: true },
      )
      .exec();

    this.logger.log(
      `OAuth linked: user=${entry.user_id} email=${email} refresh=…${last4(tokens.refresh_token)}`,
    );
    return { ok: true, email, returnTo: entry.returnTo };
  }

  /** STEP 3 — Return a fresh access token, refreshing proactively. */
  async getAccessToken(user_id: string): Promise<string> {
    const cred = await this.model
      .findOne({ user_id, revoked_at: null })
      .exec();
    if (!cred) {
      throw new NotFoundException('user has not linked Gmail yet');
    }
    const refreshToken = decryptRefreshToken(cred.encrypted_refresh_token);
    this.oauth2.setCredentials({ refresh_token: refreshToken });

    const now = Date.now();
    const cached = this.oauth2.credentials.access_token;
    const expiresAt = cred.access_token_expires_at ?? 0;

    if (cached && expiresAt - now > 5 * 60 * 1000) {
      return cached;
    }

    // Refresh
    const { credentials } = await this.oauth2.refreshAccessToken();
    if (!credentials.access_token) throw new Error('refresh produced no access_token');
    await this.model
      .updateOne(
        { _id: cred._id },
        {
          access_token_last4: last4(credentials.access_token),
          access_token_expires_at: credentials.expiry_date ?? now + 3500 * 1000,
          last_refreshed_at: new Date(),
        },
      )
      .exec();
    this.logger.debug(`refreshed access token for ${user_id} (…${last4(credentials.access_token)})`);
    return credentials.access_token;
  }

  /** Helper: look up a user credential document. Returns null when not linked / revoked. */
  async findActive(user_id: string): Promise<UserCredentialDocument | null> {
    return this.model.findOne({ user_id, revoked_at: null }).exec();
  }

  /** STEP 4 — Send an email *as* this user via SMTP XOAUTH2. */
  async sendMailAsUser(
    user_id: string,
    args: { to: string; subject: string; html: string },
  ): Promise<nodemailer.SentMessageInfo> {
    const cred = await this.findActive(user_id);
    if (!cred) throw new NotFoundException('user has not linked Gmail yet');
    const accessToken = await this.getAccessToken(user_id);

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { type: 'OAuth2', user: cred.email_address, accessToken },
    });

    try {
      return await transporter.sendMail({
        from: cred.email_address,
        to: args.to,
        subject: args.subject,
        html: args.html,
      });
    } finally {
      transporter.close();
    }
  }

  /** STEP 5 — Build an IMAP client authenticated via OAuth2 (for doReplyCheck). */
  async getImapClient(user_id: string): Promise<ImapFlow> {
    // Lazy import so the auth-server can boot without imapflow installed.
    const { ImapFlow } = await import('imapflow');
    const cred = await this.findActive(user_id);
    if (!cred) throw new NotFoundException('user has not linked Gmail yet');
    const accessToken = await this.getAccessToken(user_id);

    return new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: { user: cred.email_address, accessToken },
      logger: false,
    });
  }

  /** STEP 6 — User clicks "Disconnect" — revoke at Google + clear DB. */
  async revoke(user_id: string): Promise<void> {
    const cred = await this.model.findOne({ user_id }).exec();
    if (!cred) return;

    if (cred.encrypted_refresh_token) {
      try {
        await this.oauth2.revokeToken(decryptRefreshToken(cred.encrypted_refresh_token));
      } catch (e) {
        this.logger.warn(
          `google revoke best-effort failed for ${user_id}: ${(e as Error).message}`,
        );
      }
    }

    await this.model
      .updateOne(
        { _id: cred._id },
        {
          revoked_at: new Date(),
          encrypted_refresh_token: '',
          refresh_token_last4: '',
          access_token_last4: '',
          scopes: '',
        },
      )
      .exec();
    this.logger.log(`OAuth revoked for user=${user_id}`);
  }

  /** UI status: linked / not linked. */
  async getStatus(user_id: string): Promise<ConnectionStatus> {
    const cred = await this.findActive(user_id);
    if (!cred) {
      return { linked: false, email: null, provider: 'gmail', lastRefreshedAt: null, scopes: [] };
    }
    return {
      linked: true,
      email: cred.email_address,
      provider: cred.provider,
      lastRefreshedAt: cred.last_refreshed_at ?? null,
      scopes: cred.scopes.split(',').filter(Boolean),
    };
  }

  /** Allow seeding/rotation tools to set the env before binding the OAuth2 client. */
  static GenerateStateNonce = generateStateNonce;
}
