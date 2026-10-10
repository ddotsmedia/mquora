import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

export const STAFF_ROLES = ['ADMIN', 'COMMUNITY_MODERATOR'] as const;

// Must run after JwtAuthGuard, which populates request.user.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: string } | undefined;
    if (!user || !STAFF_ROLES.includes(user.role as (typeof STAFF_ROLES)[number])) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
