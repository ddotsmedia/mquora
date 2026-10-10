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
    const { bannedAt: _bannedAt, bannedUntil: _bannedUntil, ...actor } = user;
    return actor;
  }
}
