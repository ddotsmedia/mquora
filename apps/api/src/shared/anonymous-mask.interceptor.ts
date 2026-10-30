import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

const ANONYMOUS_AUTHOR = { id: null, username: null, displayName: 'Anonymous', isVerified: false, reputationScore: 0 };

// Replaces the author of any anonymous question in a response, unless the viewer is that author.
// Admin routes are left alone so moderators still see who wrote a question.
function mask(value: unknown, viewerId: string | undefined): unknown {
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((v) => mask(v, viewerId));
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(obj)) out[key] = mask(v, viewerId);
    const author = obj.author as { id?: string | null } | undefined;
    if (obj.isAnonymous === true && author && typeof author === 'object' && author.id !== viewerId) {
      out.author = { ...ANONYMOUS_AUTHOR };
    }
    return out;
  }
  return value;
}

@Injectable()
export class AnonymousMaskInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ url?: string; user?: { id?: string } }>();
    if (req.url?.startsWith('/api/v1/admin')) return next.handle();
    const viewerId = req.user?.id;
    return next.handle().pipe(map((body) => mask(body, viewerId)));
  }
}
