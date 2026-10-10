// Single source of truth for the JWT signing secret (used by signing and verification).
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set to at least 32 characters in production');
  }
  return 'dev-only-jwt-secret-do-not-use-in-production';
}
