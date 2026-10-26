import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/** ADMIN-only guard — use on privileged endpoints (user export, feature flags, banning, audit log).
 *  For content moderation endpoints accessible to moderators too, use ModeratorGuard instead. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: string } | undefined;
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
