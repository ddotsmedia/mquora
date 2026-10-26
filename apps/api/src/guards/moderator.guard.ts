import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/** Allows ADMIN and COMMUNITY_MODERATOR — use on content-moderation endpoints. */
@Injectable()
export class ModeratorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: string } | undefined;
    if (!user || !['ADMIN', 'COMMUNITY_MODERATOR'].includes(user.role ?? '')) {
      throw new ForbiddenException('Moderator access required');
    }
    return true;
  }
}
