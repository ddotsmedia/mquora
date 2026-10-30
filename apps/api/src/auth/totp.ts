import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'crypto';

// RFC 6238 time-based one-time passwords: SHA-1, 6 digits, 30-second steps.
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIOD_SECONDS = 30;
const DIGITS = 6;

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = ((value << 8) | byte) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str: string): Buffer {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of str.toUpperCase().replace(/=+$/, '')) {
    const idx = B32.indexOf(ch);
    if (idx === -1) throw new Error('Invalid base32 character');
    value = ((value << 5) | idx) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(key: Buffer, counter: number): string {
  const c = Buffer.alloc(8);
  c.writeBigUInt64BE(BigInt(counter));
  const h = createHmac('sha1', key).update(c).digest();
  const offset = h[h.length - 1] & 0x0f;
  const code = ((h[offset] & 0x7f) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3];
  return String(code % 10 ** DIGITS).padStart(DIGITS, '0');
}

export function newTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function otpauthUri(secret: string, label: string, issuer = 'askvyo'): string {
  const name = `${encodeURIComponent(issuer)}:${encodeURIComponent(label)}`;
  return `otpauth://totp/${name}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD_SECONDS}`;
}

/**
 * Checks a 6-digit code against the secret, allowing one step of clock drift either way.
 * Returns the matched time step, or null. Steps at or before lastStep are rejected so a code works once.
 */
export function matchTotp(secretB32: string, code: string, lastStep: number | null): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const key = base32Decode(secretB32);
  const step = Math.floor(Date.now() / 1000 / PERIOD_SECONDS);
  for (const candidate of [step, step - 1, step + 1]) {
    if (lastStep !== null && candidate <= lastStep) continue;
    const expected = Buffer.from(hotp(key, candidate));
    if (timingSafeEqual(expected, Buffer.from(code))) return candidate;
  }
  return null;
}

export function newBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const h = randomBytes(5).toString('hex');
    return `${h.slice(0, 5)}-${h.slice(5)}`;
  });
}

export function normalizeBackupCode(code: string): string {
  return code.toLowerCase().replace(/[\s-]/g, '');
}

// The secret is encrypted at rest with AES-256-GCM. The key comes from TOTP_ENCRYPTION_KEY (32 bytes, base64).
function encryptionKey(): Buffer {
  const raw = process.env.TOTP_ENCRYPTION_KEY;
  if (!raw) throw new Error('TOTP_ENCRYPTION_KEY is not set');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('TOTP_ENCRYPTION_KEY must be 32 bytes, base64 encoded');
  return key;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join('.');
}

export function decryptSecret(stored: string): string {
  const [version, iv, tag, data] = stored.split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unrecognised secret format');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}
