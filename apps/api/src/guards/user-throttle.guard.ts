import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Rate-limits by authenticated user id so that one shared web-server IP never exhausts the quota
// for everyone. Must be listed after JwtAuthGuard so req.user is populated.
@Injectable()
export class UserThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req['user'] as { id?: string } | undefined;
    if (user?.id) return `user:${user.id}`;
    return `ip:${(req['ip'] as string | undefined) || 'unknown'}`;
  }
}
