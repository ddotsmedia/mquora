// Single source of truth for the JWT signing secret (used by signing and verification).
// The insecure fallback is allowed only when NODE_ENV is explicitly "development".
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'development') {
    return 'dev-only-jwt-secret-do-not-use-in-production';
  }
  throw new Error('JWT_SECRET must be set to at least 32 characters (NODE_ENV is not "development")');
}
