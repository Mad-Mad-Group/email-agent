import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Per-user OAuth refresh token encryption.
 *
 * AES-256-GCM with a project-level master key from REFRESH_TOKEN_KEY env.
 * Output format: "<iv-base64>:<authTag-base64>:<ciphertext-base64>".
 *
 * The master key is 32-byte hex (64 hex chars). Generate with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * NEVER commit REFRESH_TOKEN_KEY to git. Add to gitignore'd .env. Back up
 * copies via 1Password / HashiCorp Vault — if lost, all users must
 * reconnect (data loss: zero; UX hit: requires re-consent).
 */
const ALGO = 'aes-256-gcm';

function masterKey(): Buffer {
  const hex = process.env.REFRESH_TOKEN_KEY ?? '';
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'REFRESH_TOKEN_KEY must be 64 hex chars (32 bytes). ' +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  return Buffer.from(hex, 'hex');
}

export function encryptRefreshToken(plain: string): string {
  const key = masterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
}

export function decryptRefreshToken(blob: string): string {
  if (!blob || !blob.includes(':')) throw new Error('malformed encrypted blob');
  const [ivB64, tagB64, ctB64] = blob.split(':');
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('malformed encrypted blob shape');
  const key = masterKey();
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ct = Buffer.from(ctB64, 'base64');
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

/** Last 4 chars of a secret — safe to log, never the full token. */
export function last4(s: string | null | undefined): string {
  if (!s) return '';
  return s.slice(-4);
}

/** Generate a CSRF nonce for OAuth state param. */
export function generateStateNonce(): string {
  return randomBytes(24).toString('base64url');
}
