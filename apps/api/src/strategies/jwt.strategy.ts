import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaClient } from '@prisma/client';
import { getJwtSecret } from '../shared/jwt-secret';
import { isBanned } from '../shared/ban';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private prisma = new PrismaClient();

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: Record<string, unknown>) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub as string },
      select: { id: true, email: true, username: true, role: true, deletedAt: true, bannedAt: true, bannedUntil: true },
    });
    if (!user || user.deletedAt || isBanned(user)) return null;

    // Tokens issued after the session feature carry a session id: reject them once that session
    // is logged out or rotated out. Older tokens without one remain valid until they expire (15 min).
    // TODO: remove the sid-less bypass after 2026-12-01 — all live tokens will have sid by then.
    const sid = typeof payload.sid === 'string' ? payload.sid : undefined;
    if (sid) {
      const session = await this.prisma.session.findUnique({ where: { id: sid }, select: { userId: true, expiresAt: true } });
      if (!session || session.userId !== user.id || session.expiresAt < new Date()) return null;
    }

    const { bannedAt: _bannedAt, bannedUntil: _bannedUntil, ...actor } = user;
    return { ...actor, sid };
  }
}
