import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * For auth endpoints (login, register), throttle by email rather than IP.
 * This prevents the web server's IP from exhausting the quota for all users —
 * the web container makes server-side auth calls on behalf of every user, so
 * all logins appear to come from the same Docker-internal IP.
 */
@Injectable()
export class EmailThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const body = req['body'] as Record<string, unknown> | undefined;
    const email = body?.['email'];
    if (typeof email === 'string' && email.length > 0) {
      return `email:${email.toLowerCase()}`;
    }
    // Fallback to IP if no email in body
    const ip = (req['ip'] as string | undefined) || 'unknown';
    return ip;
  }
}
