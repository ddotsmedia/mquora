import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

// Gate for endpoints only the web server may call (it holds the same secret via env).
// Fails closed: if the secret is not configured, the endpoint refuses every request.
export function assertInternalSecret(provided: string | undefined): void {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected || expected.length < 32) {
    throw new ServiceUnavailableException('Internal endpoint not configured');
  }
  const a = Buffer.from(provided ?? '', 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new UnauthorizedException();
  }
}
