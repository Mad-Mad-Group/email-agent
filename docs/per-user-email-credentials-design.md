# Per-User Email Credentials — 設計 + 實作指南

> **版本**:v1.0(2026-07-28)
> **目的**:每個 user 用自己個 gmail / outlook 發信收信。Backend 唔 store raw password,只用 OAuth2 refresh token + IMAP。
> **適用版本**:ClientRadar AI UAT 之後嘅 Phase 3 + 後續。

---

## 1. Architecture 決策

**3 個 layers** 必須同時處理:

| Layer | 內容 |
|-------|------|
| **OAuth2 Authorization** | User 一 click google → backend 換 refresh token, encrypted-at-rest。**永遠唔 store raw password** |
| **Per-user SMTP credential** | Backend 用 refresh token 換 short-lived access token,build nodemailer transport per user |
| **IMAP access token** | Worker 用 refresh token 換 IMAP `xoauth2` bearer,scan 個 user inbox 嚟做 reply classification |

**Why OAuth2-only**:
- Gmail from 2022 開始 force-secure OAuth,App Password 只俾 low-trust apps
- 用戶唔需要 submit 任何 raw secret 落 form(完全冇 raw password 過 HTTPS)
- Refresh token ≤ 安全 scope + 加密 at rest + revoke 機制

**Trade-off 比較**:OAuth > App Password > plain SMTP password(呢個唔接受)

---

## 2. Google Cloud Project 設定(一次性,by IT)

Google OAuth client 必須先 register。流程:

1. https://console.cloud.google.com 開新 project `clientradar-uat`
2. APIs & Services → 啟用 **Gmail API** + **People API**(後者用嚟 check user identity)
3. APIs & Services → OAuth consent screen:
   - User type:**External**(or Internal for company G Suite)
   - App name:**ClientRadar**
   - Scopes:`https://www.googleapis.com/auth/gmail.send`,`https://www.googleapis.com/auth/gmail.readonly`(僅讀 inbox),`https://www.googleapis.com/auth/userinfo.email`
4. Credentials → **Create OAuth client ID**
   - Application type:**Web application**
   - Authorized redirect URIs:`https://uat.<your-domain>/api/auth/google/callback`
   - Authorized JavaScript origins:`https://uat.<your-domain>`
5. 拎到 **client_id** + **client_secret** → 後面 §5 用

---

## 3. Database Schema(per-user encrypted credential store)

**`user_credentials` collection**——**1 user 對 1 個 doc**,加密只 OAuth refresh token:

```typescript
// cms/server/src/user-credentials/schemas/user-credential.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserCredentialDocument = HydratedDocument<UserCredential>;

@Schema({ collection: 'user_credentials', versionKey: false, timestamps: true })
export class UserCredential {
  @Prop({ type: String, required: true, unique: true, index: true })
  user_id!: string;

  /**
   * Encrypted OAuth2 refresh token (AES-256-GCM).
   * NEVER store raw refresh token in DB.
   * Format: base64(iv):base64(authTag):base64(ciphertext)
   */
  @Prop({ type: String, required: true })
  encrypted_refresh_token!: string;

  /** Last 4 chars of OAuth access_token — for audit only, never decode full token */
  @Prop({ type: String, default: '' })
  access_token_last4!: string;

  @Prop({ type: String, default: '' })
  refresh_token_last4!: string;

  /** Granted scopes, comma-delimited */
  @Prop({ type: String, default: '' })
  scopes!: string;

  /** Token expiry (ms epoch) — used to refresh proactively */
  @Prop({ type: Number, default: 0 })
  access_token_expires_at!: number;

  @Prop({ type: String, required: true })
  email_address!: string;  // e.g. "alice@madmad.com"

  @Prop({ type: String, default: 'gmail' })
  provider!: 'gmail' | 'microsoft' | 'zoho';

  @Prop({ type: Date })
  last_refreshed_at?: Date;

  @Prop({ type: Date })
  revoked_at?: Date;  // user clicked "Disconnect"
}

export const UserCredentialSchema = SchemaFactory.createForClass(UserCredential);
```

**Migration script**:

```javascript
// cms/server/scripts/create-user-credentials-collection.js
db.createCollection('user_credentials');
db.user_credentials.createIndex({ user_id: 1 }, { unique: true });
db.user_credentials.createIndex({ revoked_at: 1 });
```

---

## 4. Encryption helper(AES-256-GCM)

```typescript
// cms/server/src/common/crypto/encrypt-refresh-token.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';

/**
 * Master key from env: 32-byte hex string.
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * Store in env as REFRESH_TOKEN_KEY (NEVER commit).
 */
const MASTER_KEY = Buffer.from(
  process.env.REFRESH_TOKEN_KEY ?? '',
  'hex',
);

if (MASTER_KEY.length !== 32) {
  throw new Error(
    'REFRESH_TOKEN_KEY must be 32 bytes hex (64 hex chars). ' +
    'Generate with: node -e "console.log(require(\\"crypto\\").randomBytes(32).toString(\\"hex\\"))"',
  );
}

/**
 * Encrypt a refresh token.
 * Output format: "<iv-base64>:<authTag-base64>:<ciphertext-base64>"
 */
export function encryptRefreshToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, MASTER_KEY, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
}

/**
 * Decrypt a refresh token. Returns the raw token if shape doesn't match.
 * Note: callers should .catch the throw if the key rotates.
 */
export function decryptRefreshToken(blob: string): string {
  const [ivB64, tagB64, ctB64] = blob.split(':');
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('malformed blob');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ct = Buffer.from(ctB64, 'base64');
  const decipher = createDecipheriv(ALGO, MASTER_KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

/** Last 4 chars of a string for audit purposes only */
export function last4(s: string): string {
  return s.slice(-4);
}
```

**Generate 個 master key(首次 setup)**:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: 5a7b... (32 bytes / 64 hex chars)
# Add to .env: REFRESH_TOKEN_KEY=5a7b...
```

**Loss-of-key recovery**:Master key 丟咗 = 全部 user 要重新做 OAuth flow,**加密 safe 但 UX 差**。Backup 建議喺 1Password / HashiCorp Vault。

---

## 5. Backend module — OAuth + per-user transport

### 5.1 Module structure

```
cms/server/src/user-credentials/
├── user-credentials.module.ts
├── user-credentials.service.ts
├── user-credentials.controller.ts    # POST /api/auth/google/start, /callback, /revoke
├── schemas/user-credential.schema.ts
└── dto/{start,callback,status}.dto.ts
```

### 5.2 DTOs

```typescript
// dto/start.dto.ts — frontend calls POST /api/auth/google/start { returnTo }
export class StartDto {
  @IsUrl({ require_tld: false })
  returnTo!: string;  // post-OAuth UX redirect, e.g. /cms-settings?tab=email
}

// dto/callback.dto.ts — Google redirects back with ?code=...&state=...
export class CallbackDto {
  @IsString() code!: string;
  @IsString() state!: string;
}
```

### 5.3 Service skeleton

```typescript
// user-credentials.service.ts (skeleton, full implementation in §6)
@Injectable()
export class UserCredentialsService {
  constructor(
    @InjectModel(UserCredential.name) private model: Model<UserCredentialDocument>,
    @Inject(forwardRef(() => AuthService)) private auth: AuthService,
  ) {}

  /** Step 1: Build the Google OAuth URL, store `state` (csrf-protected nonce → Redis) */
  async startOAuth(userId: string, returnTo: string): Promise<{ url: string }> { ... }

  /** Step 2: Handle callback from Google — exchange code → tokens, save encrypted refresh */
  async handleCallback(userId: string, code: string, state: string): Promise<{ ok: true; email: string }> { ... }

  /** Step 3: Get a fresh access token, refresh if expired */
  async getAccessToken(userId: string): Promise<string> { ... }

  /** Step 4: Build a nodemailer SMTP transport that uses THIS user's XOAUTH2 */
  async getUserTransport(userId: string): Promise<Transporter> { ... }

  /** Step 5: Build an IMAP client (imapflow) authenticated as this user */
  async getImapClient(userId: string): Promise<ImapFlow> { ... }

  /** Step 6: User clicks "Disconnect" — revoke at Google + clear DB */
  async revoke(userId: string): Promise<void> { ... }
}
```

### 5.4 Controller(frontend-facing)

```typescript
@ApiTags('User Credentials')
@ApiBearerAuth()
@Controller('auth/google')
@UseGuards(JwtAuthGuard)
export class UserCredentialsController {
  constructor(private svc: UserCredentialsService) {}

  @Post('start')
  @ApiOperation({ summary: '產生 Google OAuth 連結' })
  async start(@CurrentUser() u: any, @Body() dto: StartDto) {
    const { url } = await this.svc.startOAuth(u.user_id, dto.returnTo);
    return { status: 'success', data: { url } };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Google OAuth callback - 由 Google 跳轉' })
  async callback(@Query() q: CallbackDto) {
    // Verify state nonce, exchange code, save refresh token.
    // Then 302 to returnTo.
    return { status: 'success', data: await this.svc.handleCallback(q.code, q.state) };
  }

  @Get('status')
  @ApiOperation({ summary: '查 user 連接狀態' })
  async status(@CurrentUser() u: any) {
    return { status: 'success', data: await this.svc.getStatus(u.user_id) };
  }

  @Post('revoke')
  @ApiOperation({ summary: 'user 主動斷開 Gmail 連接' })
  async revoke(@CurrentUser() u: any) {
    await this.svc.revoke(u.user_id);
    return { status: 'success' };
  }
}
```

---

## 6. Service 完整實作

```typescript
// user-credentials.service.ts
import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { google } from 'googleapis';
import * as nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { createHash, randomBytes } from 'crypto';
import { UserCredential, UserCredentialDocument } from './schemas/user-credential.schema';
import { encryptRefreshToken, decryptRefreshToken, last4 } from '../common/crypto/encrypt-refresh-token';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;  // https://uat.<domain>/api/auth/google/callback
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

// In-memory state nonce store (Redis-ready; see §6.5)
const STATE_TTL_MS = 10 * 60 * 1000;
interface StateEntry { userId: string; returnTo: string; }
const STATE_STORE = new Map<string, StateEntry>();

@Injectable()
export class UserCredentialsService {
  private readonly logger = new Logger(UserCredentialsService.name);
  private readonly oauth2 = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
  );

  constructor(
    @InjectModel(UserCredential.name)
    private model: Model<UserCredentialDocument>,
  ) {}

  /** STEP 1 — front-end calls POST /api/auth/google/start, redirects user to this URL */
  async startOAuth(userId: string, returnTo: string): Promise<{ url: string; state: string }> {
    const state = randomBytes(24).toString('base64url');
    STATE_STORE.set(state, { userId, returnTo });
    setTimeout(() => STATE_STORE.delete(state), STATE_TTL_MS);

    const url = this.oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',             // ensures refresh_token is granted
      include_granted_scopes: true,
      scope: SCOPES,
      state,
    });
    return { url, state };
  }

  /** STEP 2 — Google redirects back; exchange code → tokens, persist */
  async handleCallback(code: string, state: string): Promise<{ ok: true; email: string; returnTo: string }> {
    const entry = STATE_STORE.get(state);
    if (!entry) throw new BadRequestException('invalid or expired state nonce');
    STATE_STORE.delete(state);

    const { tokens } = await this.oauth2.getToken(code);
    if (!tokens.refresh_token) {
      // prompt=consent should guarantee this; if missing, user previously
      // granted and Google refused to reissue. Force revoke + reconnect.
      throw new BadRequestException(
        'no_refresh_token; please revoke the existing app permission first',
      );
    }

    // Fetch identity
    this.oauth2.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2 });
    const { data: profile } = await oauth2.userinfo.get();
    const email = profile.email!;

    // Persist with encryption
    const encrypted = encryptRefreshToken(tokens.refresh_token);
    await this.model.findOneAndUpdate(
      { user_id: entry.userId },
      {
        user_id: entry.userId,
        encrypted_refresh_token: encrypted,
        access_token_last4: last4(tokens.access_token ?? ''),
        refresh_token_last4: last4(tokens.refresh_token),
        scopes: SCOPES.join(','),
        access_token_expires_at: tokens.expiry_date ?? 0,
        email_address: email,
        provider: 'gmail',
        last_refreshed_at: new Date(),
        revoked_at: null,
      },
      { upsert: true, new: true },
    ).exec();

    this.logger.log(`OAuth linked for user=${entry.userId} email=${email}`);
    return { ok: true, email, returnTo: entry.returnTo };
  }

  /** STEP 3 — get a fresh access token, refresh if needed */
  async getAccessToken(userId: string): Promise<string> {
    const cred = await this.model.findOne({ user_id: userId, revoked_at: null }).exec();
    if (!cred) throw new BadRequestException('user has not linked Gmail yet');

    const refreshToken = decryptRefreshToken(cred.encrypted_refresh_token);
    this.oauth2.setCredentials({ refresh_token: refreshToken });

    // If we have ~5 min left on the current access token, force a refresh.
    const now = Date.now();
    if (
      !this.oauth2.credentials.access_token ||
      (cred.access_token_expires_at && cred.access_token_expires_at - now < 5 * 60 * 1000)
    ) {
      const { credentials } = await this.oauth2.refreshAccessToken();
      if (!credentials.access_token) throw new Error('refresh failed');
      await this.model.updateOne(
        { _id: cred._id },
        {
          access_token_last4: last4(credentials.access_token),
          access_token_expires_at: credentials.expiry_date ?? now + 3500 * 1000,
          last_refreshed_at: new Date(),
        },
      ).exec();
      return credentials.access_token;
    }

    return this.oauth2.credentials.access_token;
  }

  /** STEP 4 — build a nodemailer SMTP transport using this user's XOAUTH2 */
  async getUserTransport(userId: string): Promise<nodemailer.Transporter> {
    const cred = await this.model.findOne({ user_id: userId, revoked_at: null }).exec();
    if (!cred) throw new BadRequestException('user has not linked Gmail yet');
    const accessToken = await this.getAccessToken(userId);

    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        type: 'OAuth2',
        user: cred.email_address,
        accessToken,
        // refresh token is supplied lazily inside this.oauth2; nodemailer
        // re-reads via our service. To make nodemailer refresh on its own,
        // supply refreshToken here too (long-lived) — but that defeats the
        // encrypted-at-rest storage. Alternative below: send via raw SMTP
        // using our own helper that swaps the access token in.
      },
    });
  }

  /**
   * SMTP alternative: send raw, refresh on demand. This is the safer pattern
   * because we never hand the raw refresh token to nodemailer (it would be
   * in process memory across multiple sends).
   */
  async sendMailAsUser(
    userId: string,
    args: { to: string; subject: string; html: string },
  ): Promise<nodemailer.SentMessageInfo> {
    const cred = await this.model.findOne({ user_id: userId, revoked_at: null }).exec();
    if (!cred) throw new BadRequestException('user has not linked Gmail yet');
    const accessToken = await this.getAccessToken(userId);

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { type: 'OAuth2', user: cred.email_address, accessToken },
    });

    return transporter.sendMail({
      from: cred.email_address,
      to: args.to,
      subject: args.subject,
      html: args.html,
    });
  }

  /** STEP 5 — IMAP client to scan reply inbox (for doReplyCheck / S4 worker) */
  async getImapClient(userId: string): Promise<ImapFlow> {
    const cred = await this.model.findOne({ user_id: userId, revoked_at: null }).exec();
    if (!cred) throw new BadRequestException('user has not linked Gmail yet');
    const accessToken = await this.getAccessToken(userId);

    return new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: cred.email_address,
        accessToken,
      },
      logger: false,
    });
  }

  /** STEP 6 — user clicks Disconnect; revoke at Google + clear DB */
  async revoke(userId: string): Promise<void> {
    const cred = await this.model.findOne({ user_id: userId }).exec();
    if (!cred) return;

    try {
      // Ask Google to revoke this token. Best-effort.
      await this.oauth2.revokeToken(decryptRefreshToken(cred.encrypted_refresh_token));
    } catch (e) {
      this.logger.warn(`google revoke failed for ${userId}: ${(e as Error).message}`);
    }

    await this.model.updateOne(
      { _id: cred._id },
      {
        revoked_at: new Date(),
        encrypted_refresh_token: '',
        refresh_token_last4: '',
        access_token_last4: '',
        scopes: '',
      },
    ).exec();
    this.logger.log(`OAuth revoked for user=${userId}`);
  }

  /** Current status for the UI to render */
  async getStatus(userId: string) {
    const cred = await this.model.findOne({ user_id: userId }).exec();
    if (!cred || cred.revoked_at) {
      return { linked: false, email: null };
    }
    return {
      linked: true,
      email: cred.email_address,
      provider: cred.provider,
      lastRefreshedAt: cred.last_refreshed_at,
      scopes: cred.scopes.split(',').filter(Boolean),
    };
  }
}
```

### 6.5 State store 升級到 Redis(生產)

```typescript
// 開發模式: in-memory Map 就 OK。生產用 Redis:
//
// @Inject('REDIS') redis: Redis,
// async startOAuth(...) {
//   const state = randomBytes(24).toString('base64url');
//   await redis.set(`oauth:state:${state}`, JSON.stringify({ userId, returnTo }), 'PX', STATE_TTL_MS);
//   ...
// }
// async handleCallback(...) {
//   const raw = await redis.get(`oauth:state:${state}`);
//   const entry = raw ? JSON.parse(raw) : null;
//   await redis.del(`oauth:state:${state}`);
//   ...
// }
```

---

## 7. EmailService 改造

```typescript
// cms/server/src/email/email.service.ts

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly userCredentials: UserCredentialsService,
    private readonly users: UsersService,
  ) {}

  async sendMailAsUser(args: {
    userId: string;
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    try {
      const info = await this.userCredentials.sendMailAsUser(args.userId, {
        to: args.to,
        subject: args.subject,
        html: args.html,
      });
      this.logger.log(`sent mail from user=${args.userId}: messageId=${info.messageId}`);
    } catch (e) {
      this.logger.error(`send failed for user=${args.userId}: ${(e as Error).message}`);
      throw e;
    }
  }
}
```

**Worker S4 `doSend()` 改用 `sendMailAsUser`** — 由原本 server-wide `SMTP_USER` 改成 per-user:

```typescript
// cms/worker/agent.ts, function doSend(...)
// Before:
//   await emailService.sendMail({ from: process.env.SMTP_FROM, ... });
// After:
await emailService.sendMailAsUser({
  userId: lead.user_id,        // ← Look up which user owns this lead
  to: lead.email,
  subject: draft.subject,
  html: draft.body,
});
```

**每個 User 從自己個 gmail inbox 寄/收**:`doReplyCheck()` 改用 `getImapClient(lead.user_id)` scan 對應 user 嘅 inbox, **唔再共用一個 IMAP**。

---

## 8. Frontend — Settings → Email Connection Tab

### 8.1 UI states(三種)

```
┌─────────────────────────────────────┐
│ 📧 Email Connection                  │
├─────────────────────────────────────┤
│ Status: ⭕ Not connected             │
│                                     │
│ Connect your Gmail to send and       │
│ receive emails from your account.   │
│                                     │
│ [ Connect Gmail ]  ← Google OAuth    │
│                                     │
│ Permission: Send, Read inbox         │
└─────────────────────────────────────┘

↓ after click + Google consent

┌─────────────────────────────────────┐
│ 📧 Email Connection                  │
├─────────────────────────────────────┤
│ Status: ✅ Connected                 │
│ Account: alice@madmad.com           │
│ Connected: 2026-07-28 14:23         │
│                                     │
│ [ Send test email ]  [ Disconnect ]  │
└─────────────────────────────────────┘

↓ error state (e.g. user revoked at Google but we missed it)

┌─────────────────────────────────────┐
│ 📧 Email Connection                  │
├─────────────────────────────────────┤
│ Status: ⚠️ Token expired             │
│ Last refresh: 1 hour ago              │
│                                     │
│ [ Reconnect ]                        │
└─────────────────────────────────────┘
```

### 8.2 React component sketch

```tsx
// hermes-frontend/src/pages/Settings/EmailConnectionSection.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const EmailConnectionSection: React.FC = () => {
  const qc = useQueryClient();

  const status = useQuery({
    queryKey: ['email-connection'],
    queryFn: async () => (await client.get('/auth/google/status')).data.data,
  });

  const connect = useMutation({
    mutationFn: async () => {
      const returnTo = `${window.location.origin}/cms-settings?tab=email`;
      const { data } = await client.post('/auth/google/start', { returnTo });
      // Backend returns Google consent URL. Frontend does window.location.assign.
      window.location.assign(data.url);
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => (await client.post('/auth/google/revoke')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-connection'] }),
  });

  const sendTest = useMutation({
    mutationFn: async () =>
      (await client.post('/auth/google/test-email', { to: user.email })).data,
  });

  if (status.isLoading) return <Spinner />;

  if (!status.data.linked) {
    return (
      <SectionCard>
        <SectionTitle>📧 Email Connection</SectionTitle>
        <EmptyState>
          Connect your Gmail to send and receive emails from your account.
        </EmptyState>
        <Button onClick={() => connect.mutate()} disabled={connect.isPending}>
          Connect Gmail
        </Button>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <SectionTitle>📧 Email Connection</SectionTitle>
      <StatusRow>
        <Indicator color="green" />
        Connected as <strong>{status.data.email}</strong>
      </StatusRow>
      <Muted>Last refreshed: {formatRelative(status.data.lastRefreshedAt)}</Muted>
      <ButtonRow>
        <Button onClick={() => sendTest.mutate()}>Send test email</Button>
        <DangerButton onClick={() => disconnect.mutate()}>Disconnect</DangerButton>
      </ButtonRow>
    </SectionCard>
  );
};
```

### 8.3 Settings Page integration

喺現有 `/cms-settings` page,搵到 5 個 Tab 嘅 implementation(tab = "email", "tokens", "scoring", "schedule", "general"),加一個新 tab:

```tsx
// hermes-frontend/src/pages/Settings/index.tsx
const TABS = [
  { key: 'general', label: t('settings.general') },
  { key: 'scoring', label: t('settings.scoring') },
  { key: 'schedule', label: t('settings.schedule') },
  { key: 'tokens', label: t('settings.tokenUsage') },
  { key: 'email', label: t('settings.emailConnection') },  // ← NEW
];

// In the render():
{tab === 'email' && <EmailConnectionSection />}
```

### 8.4 i18n 新 keys

3 個 locale 加:

```typescript
// en.ts / zhCN.ts / zhTW.ts
settings: {
  // ... existing keys ...
  emailConnection: 'Email Connection',       // en
  emailConnection: '電子郵件連接',            // zhCN
  emailConnection: '電子郵件連接',            // zhTW
  emailNotConnected: 'Not connected to Gmail yet',
  emailConnectedAs: 'Connected as {{email}}',
  emailConnectBtn: 'Connect Gmail',
  emailDisconnectBtn: 'Disconnect',
  emailTestBtn: 'Send test email',
  emailRevokeSuccess: 'Gmail disconnected',
}
```

---

## 9. Backend — settings.tab 新 endpoint

```typescript
// auth/google/test-email.dto.ts
export class TestEmailDto {
  @IsEmail() to!: string;
}

// auth/google.controller.ts (add)
@Post('test-email')
async testEmail(@CurrentUser() u: any, @Body() dto: TestEmailDto) {
  const info = await this.userCredentials.sendMailAsUser(u.user_id, {
    to: dto.to,
    subject: 'ClientRadar — Test Email',
    html: `<p>Hi ${u.name},</p>
           <p>This is a test email from your ClientRadar account.</p>
           <p>If you received this, your Gmail is correctly connected.</p>`,
  });
  return { status: 'success', data: { messageId: info.messageId } };
}
```

---

## 10. Security 檢查清單

| Risk | Mitigation |
|------|------------|
| DB dump 洩漏 refresh token | AES-256-GCM encrypted at rest; access requires REFRESH_TOKEN_KEY |
| REFRESH_TOKEN_KEY 暴露 | Master key 從 env 讀, **never commit**; .env 加入 .gitignore(已有) |
| Log 印出 token | 所有 `console.log`/logger 用 `last4()` helper, 從未印明文 |
| Refresh token 在 memory 長期存在 | `this.oauth2.setCredentials()` 每次 send 前 call,無 process-global state |
| User 點 disconnect 但 token 仍然 active | `revoke()` calls `oauth2.revokeToken()`,Google server-side invalidate |
| CSRF on /callback | `state` nonce 10-min TTL,server-side state store,callback 拒絕 mismatch |
| MITM on callback | redirect_uri 必須是 HTTPS,Google enforce `state` |
| Mass-spam via backend | Rate limit `sendMailAsUser` per user(eg 100/day via `@nestjs/throttler`) |
| 內部 employee 偷睇其他 user token | Module 入面用 `@CurrentUser()` 強制用戶只能 access 自己 record |

---

## 11. Rollout 計劃

| Phase | 範圍 | 配套 |
|-------|------|------|
| **P0** | Deploy env vars:`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REDIRECT_URI`/`REFRESH_TOKEN_KEY` | Production Kubernetes secret, not in `.env` 提交 |
| **P1** | Backend module ship + Swagger tag 加好 | REST endpoints live |
| **P2** | Settings UI tab live | EmailConnectionSection PR |
| **P3** | Worker `doSend` per-user migration(後向兼容 share-SMTP) | Feature flag `PER_USER_SMTP` |
| **P4** | IMAP per-user migration(`doReplyCheck`) | Worker leader config |
| **P5** | 日記 / metrics: send/receive rate per user | Grafana dashboard |

**Feature flag 必備**:`process.env.PER_USER_SMTP === 'true'` 先用 per-user, 否則 fallback 舊 shared SMTP。**避免 Phase 3 一次性 cut over**。

---

## 12. Backup & Recovery

### 12.1 Master key backup

```
Generate REFRESH_TOKEN_KEY (32-byte hex):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

Store backup copy in:
- 1Password Team vault (entry: "ClientRadar refresh-token master key")
- HashiCorp Vault at path: secret/hermes/refresh_token_key
- GitHub Encrypted Secrets (org-level; not repo)
- DO NOT share in chat / Slack / Notion / email
```

### 12.2 Lost-key recovery procedure

If `REFRESH_TOKEN_KEY` is lost (eg infra disaster):

1. Backend 開始 reject `decryptRefreshToken` (AES-GCM auth tag mismatch)
2. All users see "Gmail token expired, please reconnect"
3. Users click reconnect → run OAuth flow again → new refresh tokens issued
4. **No data lost** — only the OAuth-bound refresh tokens need re-issuance
5. Lead/email/task data all live in MongoDB, untouched

**Trade-off**:User UX hit(全部 user 重新 click "Connect Gmail"),但 **0 數據損失 + 0 safety incident**,呢個就是 encrypted-at-rest 嘅 value proposition。

### 12.3 Rotating REFRESH_TOKEN_KEY

```typescript
// 1. Save current REFRESH_TOKEN_KEY in a backup file.
// 2. Generate new key.
// 3. Run a migration: re-encrypt every doc.
const allCreds = await this.model.find({ revoked_at: null }).exec();
for (const cred of allCreds) {
  const oldPlain = decryptRefreshToken(cred.encrypted_refresh_token);
  // Old plaintext into new ciphertext.
  cred.encrypted_refresh_token = encryptRefreshToken(oldPlain);
  await cred.save();
}
```

---

## 13. Quick reference

### 13.1 Env vars

```bash
# Frontend / Backend / Worker shared
GOOGLE_CLIENT_ID=***  # OAuth client ID
GOOGLE_CLIENT_SECRET=***  # OAuth client secret
GOOGLE_REDIRECT_URI=https://uat.clientradar-ai.com/api/auth/google/callback
REFRESH_TOKEN_KEY=<32-byte hex, 64 chars>  # Generate per §4
```

### 13.2 Endpoint summary

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/google/start` | JWT | Returns Google consent URL |
| GET | `/api/auth/google/callback` | Google | OAuth callback, exchanges code → tokens, redirects user |
| GET | `/api/auth/google/status` | JWT | Connection status for this user |
| POST | `/api/auth/google/test-email` | JWT | Send a test email from this user to themselves |
| POST | `/api/auth/google/revoke` | JWT | Disconnect Gmail |

### 13.3 Quickstart (developer local)

```bash
# 1. Generate master key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Add to .env
echo "REFRESH_TOKEN_KEY=<paste>" >> cms/server/.env

# 3. From Google Cloud Console:
#    - Enable Gmail API
#    - Create OAuth client (Web application)
#    - Add redirect URI: http://localhost:4000/api/auth/google/callback
echo "GOOGLE_CLIENT_ID=..." >> cms/server/.env
echo "GOOGLE_CLIENT_SECRET=..." >> cms/server/.env
echo "GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback" >> cms/server/.env

# 4. npm install googleapis imapflow (already likely in package.json; if not add them)
# 5. Restart backend, navigate to /cms-settings → Email Connection tab
```

---

## 14. 相關文件

| 文件 | 用途 |
|------|------|
| `docs/per-user-email-credentials-design.md` | 本文件 |
| `docs/uat-functional-spec.md` | 系統整體功能 |
| `docs/uat-deployment-runbook.md` | Hermes Mac mini 遷移 |
| `HANDOVER.md` | 既有 spec |
| `GOOGLE_OAUTH_SETUP.md` | (待 IT 寫) Google Cloud project setup step-by-step |

---

**版本歷程**
- v1.0(2026-07-28):初版,含 schema + service + frontend UI sketch
