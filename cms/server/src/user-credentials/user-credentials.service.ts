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
  AUTH_MODES,
  AuthMode,
} from './schemas/user-credential.schema';

/* ── Per-provider configuration: hosts, ports, OAuth URLs ─────────── */

interface ProviderConfig {
  label: string;
  /** true if this provider supports OAuth2 connect. */
  oauthSupported: boolean;
  /** SMTP defaults (used in password-auth mode). */
  smtp: { host: string; port: number; secure: boolean };
  /** IMAP defaults (used in both modes — IMAP is always app-password). */
  imap: { host: string; port: number };
  /** OAuth2 client_id/client_secret/issuer URL — read from env at boot. */
  oauth: {
    clientIdEnv: string;
    clientSecretEnv: string;
    redirectEnv: string;
    authorizeUrl: (clientId: string, redirect: string, state: string) => string;
    exchangeToken: (clientId: string, clientSecret: string, redirect: string, code: string) => Promise<{ refresh_token?: string; access_token?: string; expiry_date?: number }>;
    refreshToken: (clientId: string, clientSecret: string, refresh: string) => Promise<{ access_token?: string; expiry_date?: number }>;
    /** Identify endpoint — returns email. */
    whoAmI: (clientId: string, clientSecret: string, refresh: string) => Promise<string>;
  };
}

const PROVIDER_CONFIG: Record<SupportedProvider, ProviderConfig> = {
  gmail: {
    label: 'Gmail',
    oauthSupported: true,
    smtp: { host: 'smtp.gmail.com', port: 465, secure: true },
    imap: { host: 'imap.gmail.com', port: 993 },
    oauth: {
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
  },
  outlook: {
    label: 'Outlook (Microsoft)',
    oauthSupported: true,
    smtp: { host: 'smtp.office365.com', port: 587, secure: false }, // STARTTLS
    imap: { host: 'outlook.office365.com', port: 993 },
    oauth: {
      clientIdEnv: 'MICROSOFT_CLIENT_ID',
      clientSecretEnv: 'MICROSOFT_CLIENT_SECRET',
      redirectEnv: 'MICROSOFT_REDIRECT_URI',
      authorizeUrl: (cid, redirect, state) =>
        `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        new URLSearchParams({
          client_id: cid,
          redirect_uri: redirect,
          response_type: 'code',
          scope: 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access',
          response_mode: 'query',
          state,
        }).toString(),
      exchangeToken: async (cid, secret, redirect, code) => {
        const body = new URLSearchParams({
          client_id: cid,
          client_secret: secret,
          redirect_uri: redirect,
          code,
          grant_type: 'authorization_code',
        });
        const r = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });
        const j: any = await r.json();
        if (!r.ok) throw new Error(`MS token exchange failed: ${j.error_description ?? r.statusText}`);
        return { refresh_token: j.refresh_token, access_token: j.access_token, expiry_date: Date.now() + j.expires_in * 1000 };
      },
      refreshToken: async (cid, secret, refresh) => {
        const body = new URLSearchParams({
          client_id: cid,
          client_secret: secret,
          refresh_token: refresh,
          grant_type: 'refresh_token',
        });
        const r = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });
        const j: any = await r.json();
        if (!r.ok) throw new Error(`MS refresh failed: ${j.error_description ?? r.statusText}`);
        return { access_token: j.access_token, expiry_date: Date.now() + j.expires_in * 1000 };
      },
      whoAmI: async (cid, secret, refresh) => {
        const { access_token } = await (async () => PROVIDER_CONFIG.outlook.oauth.refreshToken(cid, secret, refresh))();
        const r = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const j: any = await r.json();
        return (j.mail ?? j.userPrincipalName) as string;
      },
    },
  },
  office365: {
    label: 'Office 365 (App Password)',
    oauthSupported: false,
    smtp: { host: 'smtp.office365.com', port: 587, secure: false },
    imap: { host: 'outlook.office365.com', port: 993 },
    oauth: {
      clientIdEnv: '', clientSecretEnv: '', redirectEnv: '',
      authorizeUrl: () => '',
      exchangeToken: async () => ({}),
      refreshToken: async () => ({}),
      whoAmI: async () => '',
    },
  },
  yahoo: {
    label: 'Yahoo Mail',
    oauthSupported: false,
    smtp: { host: 'smtp.mail.yahoo.com', port: 587, secure: false },
    imap: { host: 'imap.mail.yahoo.com', port: 993 },
    oauth: {
      clientIdEnv: '', clientSecretEnv: '', redirectEnv: '',
      authorizeUrl: () => '',
      exchangeToken: async () => ({}),
      refreshToken: async () => ({}),
      whoAmI: async () => '',
    },
  },
  custom: {
    label: 'Custom SMTP / IMAP',
    oauthSupported: false,
    smtp: { host: '', port: 587, secure: false },
    imap: { host: '', port: 993 },
    oauth: {
      clientIdEnv: '', clientSecretEnv: '', redirectEnv: '',
      authorizeUrl: () => '',
      exchangeToken: async () => ({}),
      refreshToken: async () => ({}),
      whoAmI: async () => '',
    },
  },
};

const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

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
  auth_mode: AuthMode | null;
  email: string | null;
  lastRefreshedAt: Date | null;
  scopes: string[];
  smtp: { host: string; port: number; secure: boolean } | null;
  imap: { host: string; port: number } | null;
}

@Injectable()
export class UserCredentialsService {
  private readonly logger = new Logger(UserCredentialsService.name);

  constructor(
    @InjectModel(UserCredential.name)
    private model: Model<UserCredentialDocument>,
    private readonly cfg: ConfigService,
  ) {}

  /* ── Step 1: startOAuth (Gmail or Outlook only) ─────────────────── */
  async startOAuth(
    user_id: string,
    provider: SupportedProvider,
    returnTo: string,
  ): Promise<{ url: string; state: string }> {
    const cfg = PROVIDER_CONFIG[provider];
    if (!cfg.oauthSupported) {
      throw new BadRequestException(`${provider} does not support OAuth — use app-password mode`);
    }
    purgeExpiredStates();
    const state = generateStateNonce();
    STATE_STORE.set(state, { user_id, returnTo, provider, createdAt: Date.now() });

    const clientId = this.cfg.get<string>(cfg.oauth.clientIdEnv) ?? '';
    const redirectUri =
      this.cfg.get<string>(cfg.oauth.redirectEnv) ??
      `http://localhost:4000/api/auth/email/${provider}/callback`;
    if (!clientId) throw new InternalServerErrorException(`${cfg.oauth.clientIdEnv} not configured`);

    const url = cfg.oauth.authorizeUrl(clientId, redirectUri, state);
    return { url, state };
  }

  /* ── Step 2: handleCallback ─────────────────────────────────────── */
  async handleCallback(
    code: string,
    state: string,
  ): Promise<{ ok: true; email: string; returnTo: string; provider: SupportedProvider }> {
    purgeExpiredStates();
    const entry = STATE_STORE.get(state);
    if (!entry) throw new BadRequestException('invalid or expired state nonce');
    STATE_STORE.delete(state);

    const cfg = PROVIDER_CONFIG[entry.provider];
    const clientId = this.cfg.get<string>(cfg.oauth.clientIdEnv) ?? '';
    const clientSecret = this.cfg.get<string>(cfg.oauth.clientSecretEnv) ?? '';
    const redirectUri =
      this.cfg.get<string>(cfg.oauth.redirectEnv) ??
      `http://localhost:4000/api/auth/email/${entry.provider}/callback`;

    const tokens = await cfg.oauth.exchangeToken(clientId, clientSecret, redirectUri, code);
    if (!tokens.refresh_token) {
      throw new BadRequestException(
        `no refresh_token from ${entry.provider} — revoke existing app permission and reconnect`,
      );
    }
    const email = await cfg.oauth.whoAmI(clientId, clientSecret, tokens.refresh_token);
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
          scopes:
            entry.provider === 'gmail'
              ? OAUTH_SCOPES.join(',')
              : 'graph.Mail.Send graph.Mail.Read graph.User.Read offline',
          access_token_expires_at: tokens.expiry_date ?? 0,
          smtp_host: cfg.smtp.host,
          smtp_port: cfg.smtp.port,
          smtp_secure: cfg.smtp.secure,
          smtp_username: email,
          imap_host: cfg.imap.host,
          imap_port: cfg.imap.port,
          last_refreshed_at: new Date(),
          revoked_at: null,
        },
        { upsert: true, new: true },
      )
      .exec();

    this.logger.log(
      `OAuth linked: user=${entry.user_id} provider=${entry.provider} email=${email}`,
    );
    return { ok: true, email, returnTo: entry.returnTo, provider: entry.provider };
  }

  /* ── Step 2b: connectPassword (non-OAuth providers) ────────────── */
  async connectPassword(
    user_id: string,
    args: {
      provider: SupportedProvider;
      email_address: string;
      smtp_host: string;
      smtp_port: number;
      smtp_secure: boolean;
      smtp_username: string;
      smtp_password: string;
      imap_host: string;
      imap_port: number;
    },
  ): Promise<{ ok: true; email: string }> {
    if (PROVIDER_CONFIG[args.provider].oauthSupported && args.provider !== 'office365' && args.provider !== 'yahoo') {
      // Gmail/Outlook prefer OAuth; warn if user picks password mode anyway.
      this.logger.warn(
        `${args.provider} supports OAuth. Password mode is less secure; encourage reconnect via OAuth.`,
      );
    }
    const encrypted = encryptRefreshToken(args.smtp_password);
    await this.model
      .findOneAndUpdate(
        { user_id },
        {
          user_id,
          email_address: args.email_address,
          provider: args.provider,
          auth_mode: 'password',
          encrypted_refresh_token: encrypted,
          credential_last4: last4(args.smtp_password),
          scopes: '',
          access_token_expires_at: 0,
          smtp_host: args.smtp_host,
          smtp_port: args.smtp_port,
          smtp_secure: args.smtp_secure,
          smtp_username: args.smtp_username,
          imap_host: args.imap_host,
          imap_port: args.imap_port,
          last_refreshed_at: new Date(),
          revoked_at: null,
        },
        { upsert: true, new: true },
      )
      .exec();
    this.logger.log(
      `Password-mode linked: user=${user_id} provider=${args.provider} email=${args.email_address}`,
    );
    return { ok: true, email: args.email_address };
  }

  /* ── Internal: get a fresh access_token (OAuth only) ────────────── */
  private async getAccessTokenInternal(cred: UserCredentialDocument): Promise<string> {
    if (cred.auth_mode !== 'oauth') {
      throw new Error('access_token not applicable for password-mode credentials');
    }
    const cfg = PROVIDER_CONFIG[cred.provider];
    const clientId = this.cfg.get<string>(cfg.oauth.clientIdEnv) ?? '';
    const clientSecret = this.cfg.get<string>(cfg.oauth.clientSecretEnv) ?? '';
    const refreshToken = decryptRefreshToken(cred.encrypted_refresh_token);

    const now = Date.now();
    if (cred.access_token_expires_at > now + 5 * 60 * 1000) {
      // Refresh via provider's refresh call (returns a fresh access_token + expiry).
      try {
        const { access_token, expiry_date } = await cfg.oauth.refreshToken(
          clientId,
          clientSecret,
          refreshToken,
        );
        if (!access_token) throw new Error('refresh did not yield access_token');
        await this.model.updateOne(
          { _id: cred._id },
          {
            access_token_expires_at: expiry_date ?? now + 3500 * 1000,
            last_refreshed_at: new Date(),
          },
        );
        return access_token;
      } catch (err) {
        // Fall through to re-fetch via direct call.
        this.logger.debug(`refresh token attempt failed for ${cred.user_id}: ${(err as Error).message}`);
      }
    }
    // Fallback: have the provider's whoAmI proxy (forces a refresh through the
    // exchange endpoint). For Google specifically we can use the sdk helper:
    if (cred.provider === 'gmail') {
      const oauth2 = new google.auth.OAuth2(clientId, clientSecret, '');
      oauth2.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await oauth2.refreshAccessToken();
      if (!credentials.access_token) throw new Error('gmail refresh yielded no access_token');
      await this.model.updateOne(
        { _id: cred._id },
        {
          access_token_expires_at: credentials.expiry_date ?? now + 3500 * 1000,
          last_refreshed_at: new Date(),
        },
      );
      return credentials.access_token;
    }
    throw new Error(`cannot refresh access token for ${cred.provider}`);
  }

  /** Per-user SMTP transport — works for both auth_mode='oauth' (XOAUTH2) and 'password' (PLAIN). */
  async smtpTransportForUser(user_id: string): Promise<Transporter> {
    const cred = await this.findActive(user_id);
    if (!cred) throw new NotFoundException('user has not linked an email account yet');

    let auth: nodemailer.SentMessageInfo['envelope'] extends never ? never : any;
    if (cred.auth_mode === 'oauth') {
      const accessToken = await this.getAccessTokenInternal(cred);
      auth = { type: 'OAuth2', user: cred.email_address, accessToken };
    } else {
      auth = { user: cred.smtp_username, pass: decryptRefreshToken(cred.encrypted_refresh_token) };
    }
    const transporter = nodemailer.createTransport({
      host: cred.smtp_host,
      port: cred.smtp_port,
      secure: cred.smtp_secure,
      auth,
    });
    return transporter;
  }

  /** Per-user IMAP client — IMAP is always app-password (Google/Microsoft). */
  async imapClientForUser(user_id: string): Promise<ImapFlow> {
    const cred = await this.findActive(user_id);
    if (!cred) throw new NotFoundException('user has not linked an email account yet');
    if (cred.auth_mode !== 'oauth') {
      // App-password mode: SMTP/IMAP password are the same.
      const { ImapFlow } = await import('imapflow');
      return new ImapFlow({
        host: cred.imap_host,
        port: cred.imap_port,
        secure: true,
        auth: { user: cred.smtp_username, pass: decryptRefreshToken(cred.encrypted_refresh_token) },
        logger: false,
      });
    }
    // OAuth mode: IMAP uses XOAUTH2 with the access_token.
    const accessToken = await this.getAccessTokenInternal(cred);
    const { ImapFlow } = await import('imapflow');
    return new ImapFlow({
      host: cred.imap_host,
      port: cred.imap_port,
      secure: true,
      auth: { user: cred.email_address, accessToken },
      logger: false,
    });
  }

  /** Send an email *as* this user — works regardless of auth_mode. */
  async sendMailAsUser(
    user_id: string,
    args: { to: string; subject: string; html: string },
  ): Promise<nodemailer.SentMessageInfo> {
    const cred = await this.findActive(user_id);
    if (!cred) throw new NotFoundException('user has not linked an email account yet');
    let auth: any;
    if (cred.auth_mode === 'oauth') {
      const accessToken = await this.getAccessTokenInternal(cred);
      auth = { type: 'OAuth2', user: cred.email_address, accessToken };
    } else {
      auth = { user: cred.smtp_username, pass: decryptRefreshToken(cred.encrypted_refresh_token) };
    }
    const transporter = nodemailer.createTransport({
      host: cred.smtp_host,
      port: cred.smtp_port,
      secure: cred.smtp_secure,
      auth,
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

  /** Lookup with proper null-handling. */
  async findActive(user_id: string): Promise<UserCredentialDocument | null> {
    return this.model.findOne({ user_id, revoked_at: null }).exec();
  }

  /** Revoke — clear encrypted blob + revocation timestamp. */
  async revoke(user_id: string): Promise<void> {
    const cred = await this.model.findOne({ user_id }).exec();
    if (!cred) return;
    if (cred.auth_mode === 'oauth' && cred.encrypted_refresh_token) {
      try {
        const cfg = PROVIDER_CONFIG[cred.provider];
        if (cfg.oauthSupported) {
          const clientId = this.cfg.get<string>(cfg.oauth.clientIdEnv) ?? '';
          const clientSecret = this.cfg.get<string>(cfg.oauth.clientSecretEnv) ?? '';
          // Microsoft token revocation
          if (cred.provider === 'outlook') {
            await fetch(
              `https://login.microsoftonline.com/common/oauth2/v2.0/revoke?token=${encodeURIComponent(decryptRefreshToken(cred.encrypted_refresh_token))}`,
              { method: 'POST' },
            );
          }
          // Google: keep best-effort silence on failure.
          if (cred.provider === 'gmail') {
            const oauth2 = new google.auth.OAuth2(clientId, clientSecret, '');
            await oauth2.revokeToken(decryptRefreshToken(cred.encrypted_refresh_token));
          }
        }
      } catch (e) {
        this.logger.warn(`revoke best-effort failed for ${user_id}: ${(e as Error).message}`);
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

  /** Status for the UI. */
  async getStatus(user_id: string): Promise<ConnectionStatus> {
    const cred = await this.findActive(user_id);
    if (!cred) {
      return {
        linked: false,
        provider: null,
        auth_mode: null,
        email: null,
        lastRefreshedAt: null,
        scopes: [],
        smtp: null,
        imap: null,
      };
    }
    return {
      linked: true,
      provider: cred.provider,
      auth_mode: cred.auth_mode,
      email: cred.email_address,
      lastRefreshedAt: cred.last_refreshed_at ?? null,
      scopes: cred.scopes.split(',').filter(Boolean),
      smtp: cred.smtp_host
        ? { host: cred.smtp_host, port: cred.smtp_port, secure: cred.smtp_secure }
        : null,
      imap: cred.imap_host ? { host: cred.imap_host, port: cred.imap_port } : null,
    };
  }

  /** Provider catalogue — used by the frontend dropdown. */
  listProviders() {
    return SUPPORTED_PROVIDERS.map((id) => ({
      id,
      label: PROVIDER_CONFIG[id].label,
      oauthSupported: PROVIDER_CONFIG[id].oauthSupported,
      defaultSmtp: PROVIDER_CONFIG[id].smtp,
      defaultImap: PROVIDER_CONFIG[id].imap,
    }));
  }

  /** Re-export helper for internal callers. */
  static GenerateStateNonce = generateStateNonce;
}
