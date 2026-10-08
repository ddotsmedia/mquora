import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as Record<string, unknown> | undefined;

    if (!user) {
      throw new ForbiddenException('Admin access required');
    }

    const role = user.role as string;
    if (role !== 'ADMIN' && role !== 'MODERATOR') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
