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
import type { Transporter } from 'nodemailer';
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
  SUPPORTED_PROVIDERS,
  SupportedProvider,
} from './schemas/user-credential.schema';

/* ── Provider constants — only the things that actually differ. ──
 *  SMTP/IMAP hosts are hard-coded because they are constants for
 *  Gmail (smtp.gmail.com / imap.gmail.com) and Outlook (smtp.office365.com
 *  / outlook.office365.com). Storing them per-credential would be
 *  noise. Tokens are AES-256-GCM encrypted; no SMTP password is ever
 *  stored.
 * ────────────────────────────────────────────────────────────── */

interface ProviderConfig {
  label: string;
  /** true if OAuth is wired up (user can click "Connect"). */
  enabled: boolean;
  /** OAuth metadata. */
  clientIdEnv: string;
  clientSecretEnv: string;
  redirectEnv: string;
  /** Build the consent URL. */
  authorizeUrl: (clientId: string, redirect: string, state: string) => string;
  /** Exchange the auth code for tokens. Returns whatever the SDK provides. */
  exchangeToken: (cid: string, secret: string, redirect: string, code: string) => Promise<any>;
  /** Refresh an expired access token. */
  refreshToken: (cid: string, secret: string, refresh: string) => Promise<any>;
  /** Identify the user (return email). */
  whoAmI: (cid: string, secret: string, refresh: string) => Promise<string>;
}

const PROVIDER_CONFIG: Record<SupportedProvider, ProviderConfig> = {
  gmail: {
    label: 'Gmail',
    enabled: true,
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    redirectEnv: 'GOOGLE_REDIRECT_URI',
    authorizeUrl: (cid, redirect, state) =>
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      new URLSearchParams({
        client_id: cid,
        redirect_uri: redirect,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email',
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true',
        state,
      }).toString(),
    exchangeToken: async (cid, secret, redirect, code): Promise<any> => {
      const oauth2 = new google.auth.OAuth2(cid, secret, redirect);
      const { tokens } = await oauth2.getToken(code);
      return tokens;
    },
    refreshToken: async (cid, secret, refresh): Promise<any> => {
      const oauth2 = new google.auth.OAuth2(cid, secret, '');
      oauth2.setCredentials({ refresh_token: refresh });
      const { credentials } = await oauth2.refreshAccessToken();
      return credentials;
    },
    whoAmI: async (cid, secret, refresh): Promise<string> => {
      const oauth2 = new google.auth.OAuth2(cid, secret, '');
      oauth2.setCredentials({ refresh_token: refresh });
      const { data } = await google.oauth2({ version: 'v2', auth: oauth2 }).userinfo.get();
      return data.email!;
    },
  },
  outlook: {
    label: 'Outlook (Phase 2 — disabled)',
    enabled: false,
    clientIdEnv: 'MICROSOFT_CLIENT_ID',
    clientSecretEnv: 'MICROSOFT_CLIENT_SECRET',
    redirectEnv: 'MICROSOFT_REDIRECT_URI',
    authorizeUrl: () => '',
    exchangeToken: async () => ({}),
    refreshToken: async () => ({}),
    whoAmI: async () => '',
  },
};

/** Best-effort ephemeral state store for OAuth CSRF nonces. */
interface StateEntry {
  user_id: string;
  returnTo: string;
  provider: SupportedProvider;
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
  provider: SupportedProvider | null;
  email: string | null;
  lastRefreshedAt: Date | null;
}

@Injectable()
export class UserCredentialsService {
  private readonly logger = new Logger(UserCredentialsService.name);

  constructor(
    @InjectModel(UserCredential.name)
    private model: Model<UserCredentialDocument>,
    private readonly cfg: ConfigService,
  ) {}

  /** Step 1 — Build the Google consent URL. */
  async startOAuth(
    user_id: string,
    provider: SupportedProvider,
    returnTo: string,
  ): Promise<{ url: string; state: string }> {
    const cfg = PROVIDER_CONFIG[provider];
    if (!cfg.enabled) {
      throw new BadRequestException(`${provider} OAuth is not yet configured (set ${cfg.clientIdEnv})`);
    }
    purgeExpiredStates();
    const state = generateStateNonce();
    STATE_STORE.set(state, { user_id, returnTo, provider, createdAt: Date.now() });

    const clientId = this.cfg.get<string>(cfg.clientIdEnv) ?? '';
    const redirectUri =
      this.cfg.get<string>(cfg.redirectEnv) ??
      `http://localhost:4000/api/auth/email/${provider}/callback`;
    if (!clientId) {
      throw new InternalServerErrorException(`${cfg.clientIdEnv} not configured on server`);
    }
    return { url: cfg.authorizeUrl(clientId, redirectUri, state), state };
  }

  /** Step 2 — Handle the OAuth callback. Save encrypted refresh token. */
  async handleCallback(
    code: string,
    state: string,
  ): Promise<{ ok: true; email: string; returnTo: string; provider: SupportedProvider }> {
    purgeExpiredStates();
    const entry = STATE_STORE.get(state);
    if (!entry) {
      throw new BadRequestException('invalid or expired state nonce — restart OAuth');
    }
    STATE_STORE.delete(state);

    const cfg = PROVIDER_CONFIG[entry.provider];
    const clientId = this.cfg.get<string>(cfg.clientIdEnv) ?? '';
    const clientSecret = this.cfg.get<string>(cfg.clientSecretEnv) ?? '';
    const redirectUri =
      this.cfg.get<string>(cfg.redirectEnv) ??
      `http://localhost:4000/api/auth/email/${entry.provider}/callback`;

    const tokens = await cfg.exchangeToken(clientId, clientSecret, redirectUri, code);
    if (!tokens.refresh_token) {
      throw new BadRequestException(
        `no refresh_token from ${entry.provider} — revoke existing app permission and reconnect`,
      );
    }
    const email = await cfg.whoAmI(clientId, clientSecret, tokens.refresh_token);
    if (!email) throw new InternalServerErrorException('provider did not return user email');

    const encrypted = encryptRefreshToken(tokens.refresh_token);
    await this.model
      .findOneAndUpdate(
        { user_id: entry.user_id },
        {
          user_id: entry.user_id,
          email_address: email,
          provider: entry.provider,
          auth_mode: 'oauth',
          encrypted_refresh_token: encrypted,
          credential_last4: last4(tokens.refresh_token),
          scopes: 'gmail.send gmail.readonly userinfo.email',
          access_token_expires_at: tokens.expiry_date ?? 0,
          last_refreshed_at: new Date(),
          revoked_at: null,
        },
        { upsert: true, new: true },
      )
      .exec();

    this.logger.log(`OAuth linked: user=${entry.user_id} provider=${entry.provider} email=${email}`);
    return { ok: true, email, returnTo: entry.returnTo, provider: entry.provider };
  }

  /** Per-user SMTP transport. Always XOAUTH2 — no password mode. */
  async smtpTransportForUser(user_id: string): Promise<Transporter> {
    const cred = await this.findActive(user_id);
    if (!cred) throw new NotFoundException('user has not linked an email account yet');
    const accessToken = await this.getAccessTokenInternal(cred);
    const cfg = smtpConfigFor(cred.provider);
    return nodemailer.createTransport({
      host: cfg.smtp.host,
      port: cfg.smtp.port,
      secure: cfg.smtp.secure,
      auth: { type: 'OAuth2', user: cred.email_address, accessToken },
    });
  }

  /** Per-user IMAP client (always XOAUTH2). */
  async imapClientForUser(user_id: string): Promise<ImapFlow> {
    const cred = await this.findActive(user_id);
    if (!cred) throw new NotFoundException('user has not linked an email account yet');
    const accessToken = await this.getAccessTokenInternal(cred);
    const cfg = smtpConfigFor(cred.provider);
    const { ImapFlow } = await import('imapflow');
    return new ImapFlow({
      host: cfg.imap.host,
      port: cfg.imap.port,
      secure: true,
      auth: { user: cred.email_address, accessToken },
      logger: false,
    });
  }

  /** Send an email as the user — convenience wrapper. */
  async sendMailAsUser(
    user_id: string,
    args: { to: string; subject: string; html: string },
  ): Promise<nodemailer.SentMessageInfo> {
    const cred = await this.findActive(user_id);
    if (!cred) throw new NotFoundException('user has not linked an email account yet');
    const accessToken = await this.getAccessTokenInternal(cred);
    const cfg = smtpConfigFor(cred.provider);
    const transporter = nodemailer.createTransport({
      host: cfg.smtp.host,
      port: cfg.smtp.port,
      secure: cfg.smtp.secure,
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

  /** Refresh OAuth access token if expired. Updates Mongo cache. */
  private async getAccessTokenInternal(cred: UserCredentialDocument): Promise<string> {
    const cfg = PROVIDER_CONFIG[cred.provider];
    if (!cfg.enabled) {
      throw new Error(`${cred.provider} OAuth not configured`);
    }
    const clientId = this.cfg.get<string>(cfg.clientIdEnv) ?? '';
    const clientSecret = this.cfg.get<string>(cfg.clientSecretEnv) ?? '';
    const refreshToken = decryptRefreshToken(cred.encrypted_refresh_token);

    const now = Date.now();
    if (cred.access_token_expires_at > now + 5 * 60 * 1000) {
      // Trust cached access token — refresh lazily on next send.
      const cached = await cfg.refreshToken(clientId, clientSecret, refreshToken);
      const accessToken = cached.access_token;
      const expiry = cached.expiry_date ?? now + 3500 * 1000;
      if (accessToken) {
        await this.model.updateOne(
          { _id: cred._id },
          { access_token_expires_at: expiry, last_refreshed_at: new Date() },
        );
        return accessToken;
      }
    }
    // Always refresh on every send — keeps code simple, costs 1 round-trip.
    const credentials = await cfg.refreshToken(clientId, clientSecret, refreshToken);
    if (!credentials.access_token) throw new Error('refresh did not yield access_token');
    await this.model.updateOne(
      { _id: cred._id },
      {
        access_token_expires_at: credentials.expiry_date ?? now + 3500 * 1000,
        last_refreshed_at: new Date(),
      },
    );
    this.logger.debug(`refreshed access token for ${cred.user_id}`);
    return credentials.access_token;
  }

  async findActive(user_id: string): Promise<UserCredentialDocument | null> {
    return this.model.findOne({ user_id, revoked_at: null }).exec();
  }

  async revoke(user_id: string): Promise<void> {
    const cred = await this.model.findOne({ user_id }).exec();
    if (!cred) return;

    if (cred.provider === 'gmail' && cred.encrypted_refresh_token) {
      try {
        const cfg = PROVIDER_CONFIG.gmail;
        const clientId = this.cfg.get<string>(cfg.clientIdEnv) ?? '';
        const clientSecret = this.cfg.get<string>(cfg.clientSecretEnv) ?? '';
        const oauth2 = new google.auth.OAuth2(clientId, clientSecret, '');
        await oauth2.revokeToken(decryptRefreshToken(cred.encrypted_refresh_token));
      } catch (e) {
        this.logger.warn(`google revoke best-effort failed for ${user_id}: ${(e as Error).message}`);
      }
    }

    await this.model.updateOne(
      { _id: cred._id },
      {
        revoked_at: new Date(),
        encrypted_refresh_token: '',
        credential_last4: '',
        scopes: '',
      },
    );
    this.logger.log(`Credential revoked for user=${user_id}`);
  }

  async getStatus(user_id: string): Promise<ConnectionStatus> {
    const cred = await this.findActive(user_id);
    if (!cred) {
      return { linked: false, provider: null, email: null, lastRefreshedAt: null };
    }
    return {
      linked: true,
      provider: cred.provider,
      email: cred.email_address,
      lastRefreshedAt: cred.last_refreshed_at ?? null,
    };
  }

  /** Provider catalogue — used by the frontend. Only enabled providers surface. */
  listProviders() {
    return SUPPORTED_PROVIDERS.map((id) => ({
      id,
      label: PROVIDER_CONFIG[id].label,
      enabled: PROVIDER_CONFIG[id].enabled,
    }));
  }

  /** Internal helper: SMTP/IMAP endpoints per provider. */
  static GenerateStateNonce = generateStateNonce;
}

function smtpConfigFor(provider: SupportedProvider): { smtp: { host: string; port: number; secure: boolean }; imap: { host: string; port: number } } {
  switch (provider) {
    case 'gmail':
      return {
        smtp: { host: 'smtp.gmail.com', port: 465, secure: true },
        imap: { host: 'imap.gmail.com', port: 993 },
      };
    case 'outlook':
      return {
        smtp: { host: 'smtp.office365.com', port: 587, secure: false }, // STARTTLS
        imap: { host: 'outlook.office365.com', port: 993 },
      };
  }
}
