import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { assertInternalSecret } from '../shared/internal-secret';

/**
 * For auth endpoints, throttle by email plus the visitor's IP.
 * The web server calls the API from one shared IP, so the visitor's real IP is forwarded in
 * X-Client-IP. It is only trusted when the request also carries the internal secret, so
 * outsiders cannot pick their own IP. Keying on both means an attacker cannot lock a
 * victim's email out from their own address.
 */
@Injectable()
export class EmailThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const body = req['body'] as Record<string, unknown> | undefined;
    const email = body?.['email'];
    const ip = this.clientIp(req);
    if (typeof email === 'string' && email.length > 0) {
      return `email:${email.toLowerCase()}|ip:${ip}`;
    }
    // Fallback to IP if no email in body
    return ip;
  }

  private clientIp(req: Record<string, unknown>): string {
    const fallback = (req['ip'] as string | undefined) || 'unknown';
    const headers = (req['headers'] as Record<string, string | undefined> | undefined) ?? {};
    const forwarded = headers['x-client-ip'];
    if (!forwarded) return fallback;
    try {
      assertInternalSecret(headers['x-internal-secret']);
    } catch {
      return fallback;
    }
    return forwarded.slice(0, 64);
  }
}
